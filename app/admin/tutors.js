import { Ionicons } from "@expo/vector-icons";
import { collection, deleteDoc, doc, getDocs, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { db } from "../../firebase/firebaseConfig";

export default function TutorsScreen({ tutors: propTutors, resources: propResources, videos: propVideos }) {
  const [localTutors, setLocalTutors] = useState([]);
  const [localResources, setLocalResources] = useState([]);
  const [localVideos, setLocalVideos] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredTutorId, setHoveredTutorId] = useState(null);
  
  // Use props if provided, otherwise use local state
  const tutors = Array.isArray(propTutors) ? propTutors : localTutors;
  const resources = Array.isArray(propResources) ? propResources : localResources;
  const videos = Array.isArray(propVideos) ? propVideos : localVideos;
  
  // Animation values
  const scrollY = useRef(new Animated.Value(300)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Animate on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(scrollY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Fetch data if props are not provided (for standalone usage)
  useEffect(() => {
    const unsubscribes = [];
    
    // Resources - always fetch if not provided as props
    if (!Array.isArray(propResources)) {
      console.log("Fetching resources data locally");
      const rUnsub = onSnapshot(collection(db, 'resources'), (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        console.log("Resources data updated:", list.length);
        setLocalResources(list);
      });
      unsubscribes.push(rUnsub);
    } else {
      console.log("Using resources data from props");
    }
    
    // Videos - always fetch if not provided as props
    if (!Array.isArray(propVideos)) {
      console.log("Fetching videos data locally");
      const vUnsub = onSnapshot(collection(db, 'videos'), (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        console.log("Videos data updated:", list.length);
        setLocalVideos(list);
      });
      unsubscribes.push(vUnsub);
    } else {
      console.log("Using videos data from props");
    }
    
    // Tutors - fetch if not provided as props
    if (!Array.isArray(propTutors)) {
      console.log("Fetching tutors data locally");
      const uUnsub = onSnapshot(collection(db, 'users'), (snap) => {
        const list = snap.docs.map(d => {
          const data = d.data();
          return { id: d.id, ...data };
        });
        console.log("Users data updated:", list.length);
        // Filter for tutors for consistency with admin dashboard
        const tutorList = list.filter(u => !!u.isTutor);
        console.log("Tutors data updated:", tutorList.length);
        setLocalTutors(tutorList);
      });
      unsubscribes.push(uUnsub);
    } else {
      console.log("Using tutors data from props");
    }
    
    // Return cleanup function
    return () => { 
      console.log("Cleaning up subscriptions");
      unsubscribes.forEach(unsub => {
        try { unsub(); } catch {} 
      });
    };
  }, [propTutors, propResources, propVideos]);

  const getAvatarColor = (key) => {
    const colors = [
      COLORS.primary,
      COLORS.secondary,
      COLORS.accent,
      COLORS.success,
      "#EC4899",
      "#06B6D4",
    ];
    const index = Math.abs(key?.charCodeAt(0) || 0) % colors.length;
    return colors[index];
  };

  const deleteTutor = async (user) => {
    console.log('🗑️ Delete tutor clicked for:', user.email || user.id);
    const confirmed = window.confirm(`Delete ${user.email || user.id}? This removes their profile and related references.`);
    if (!confirmed) return;

    try {
      const uid = user.id;

      try { await deleteDoc(doc(db, 'helpdeskHelpers', uid)); } catch {}
      try { await deleteDoc(doc(db, 'helpdeskApplicants', uid)); } catch {}

      try {
        const conSnap = await getDocs(query(collection(db, 'connections'), where('tutorId','==', uid)));
        for (const d of conSnap.docs) await deleteDoc(doc(db, 'connections', d.id));
      } catch (e) {
        console.warn('⚠️ Error deleting connections:', e);
      }

      try {
        const idxSnap = await getDocs(collection(db, 'chatsIndex', uid, 'rooms'));
        for (const d of idxSnap.docs) await deleteDoc(doc(db, 'chatsIndex', uid, 'rooms', d.id));
      } catch (e) {
        console.warn('⚠️ Error deleting chat rooms:', e);
      }

      await deleteDoc(doc(db, 'users', uid));
      console.log('✅ Tutor deleted successfully');
    } catch (e) {
      console.error('❌ Delete tutor error:', e);
    }
  };

  const toggleTutor = async (userId, value) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isTutor: value });
    } catch (e) {
      console.error("Failed to update tutor status:", e);
    }
  };

  // Helper function to count tutor's content (resources and videos)
  const getTutorContentCount = (tutorId) => {
    // Ensure we have arrays before filtering
    const resourceArray = Array.isArray(resources) ? resources : [];
    const videoArray = Array.isArray(videos) ? videos : [];
    
    const resourceCount = resourceArray.filter(resource => resource.uploadedBy === tutorId).length;
    const videoCount = videoArray.filter(video => video.uploadedBy === tutorId).length;
    
    return resourceCount + videoCount;
  };

  // Ensure tutors is an array before using filter
  const filteredTutors = Array.isArray(tutors) ? tutors.filter(tutor => {
    if (!searchQuery) return true;
    return (
      (tutor.name && tutor.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tutor.fullName && tutor.fullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tutor.email && tutor.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tutor.id && tutor.id.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }) : [];

  const renderTutorItem = ({ item }) => {
    const displayName = item.name || item.fullName || "Unknown";
    const firstLetter = displayName.charAt(0).toUpperCase();
    const isHovered = hoveredTutorId === item.id;
    const avatarColor = getAvatarColor(displayName);
    
    // Debugging: Log data availability
    console.log("Tutor item:", item.id);
    console.log("Resources array length:", Array.isArray(resources) ? resources.length : "Not an array");
    console.log("Videos array length:", Array.isArray(videos) ? videos.length : "Not an array");

    const itemOpacity = opacity.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    const itemTranslateY = scrollY.interpolate({
      inputRange: [0, 300],
      outputRange: [0, 300],
    });

    return (
      <Animated.View
        style={{
          opacity: itemOpacity,
          transform: [{ translateY: itemTranslateY }],
        }}
      >
        <Pressable
          style={({ pressed }) => [
            styles.tutorRow,
            pressed && { opacity: 0.95, transform: [{ scale: 0.99 }] },
          ]}
          onMouseEnter={() => setHoveredTutorId(item.id)}
          onMouseLeave={() => setHoveredTutorId(null)}
        >
          {/* Profile Photo or Initials */}
          <View style={[styles.avatarCircle, { backgroundColor: avatarColor }]}>
            {item.profileImage && 
             !item.profileImage.startsWith('blob:') && 
             !item.profileImage.startsWith('file://') && 
             !item.profileImage.startsWith('/') ? (
              <Image 
                source={{ uri: item.profileImage }} 
                style={styles.profileImage}
                onError={async (error) => {
                  console.log("Image load error for tutor", item.id, "URL:", item.profileImage, "Error:", error);
                  // If there's an error loading the image, remove the invalid URL from the database
                  try {
                    console.log(`Removing invalid URL for tutor ${item.id}:`, item.profileImage);
                    await updateDoc(doc(db, "users", item.id), { profileImage: null });
                    console.log(`Successfully removed invalid URL for tutor ${item.id}`);
                  } catch (updateError) {
                    console.error(`Error removing invalid URL for tutor ${item.id}:`, updateError);
                  }
                }}
                onLoad={() => {
                  console.log("Image loaded successfully for tutor", item.id, "URL:", item.profileImage);
                }}
              />
            ) : (
              <Text style={styles.avatarText}>{firstLetter}</Text>
            )}
          </View>

          <View style={styles.tutorInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.tutorEmail} numberOfLines={1}>
                {displayName}
              </Text>
              <View style={styles.tutorBadge}>
                <Ionicons name="school" size={8} color="#fff" style={{ marginRight: 2 }} />
                <Text style={styles.tutorBadgeText}>TUTOR</Text>
              </View>
            </View>
            <Text style={styles.tutorName} numberOfLines={1}>
              {item.email || item.id}
            </Text>
            <Text style={styles.tutorContentCount} numberOfLines={1}>
              {getTutorContentCount(item.id)} content items
            </Text>
          </View>

          {/* Hover Delete Button */}
          {isHovered && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                deleteTutor(item);
              }}
              style={styles.hoverDeleteButton}
            >
              <Ionicons name="trash-outline" size={16} color={COLORS.error} />
            </TouchableOpacity>
          )}
        </Pressable>
      </Animated.View>
    );
  };

  // Show loading state if data is not ready
  if (!Array.isArray(tutors) || !Array.isArray(resources) || !Array.isArray(videos)) {
    console.log("Data not ready:", {
      tutors: Array.isArray(tutors),
      resources: Array.isArray(resources),
      videos: Array.isArray(videos)
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}></View>

      <Animated.View 
        style={[
          styles.contentCard,
          {
            opacity,
            transform: [{ translateY: scrollY }],
          }
        ]}
      >
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{filteredTutors.length} tutors</Text>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={COLORS.primary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tutors by name or email..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => setSearchQuery("")} 
              style={styles.clearSearchButton}
            >
              <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Show loading message if data is not ready */}
        {!Array.isArray(tutors) || !Array.isArray(resources) || !Array.isArray(videos) ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Loading...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredTutors}
            keyExtractor={(item) => item.id}
            renderItem={renderTutorItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="school-outline" size={44} color={COLORS.primary} />
                </View>
                <Text style={styles.emptyTitle}>No tutors found</Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery ? "Try a different search term" : "Tutors will appear here"}
                </Text>
              </View>
            }
          />
        )}
      </Animated.View>
    </View>
  );
}

const COLORS = {
  primary: "#3B82F6",
  darkBlue: "#1E40AF",
  secondary: "#8B5CF6",
  accent: "#F59E0B",
  success: "#22C55E",
  error: "#EF4444",
  bg: "#E8EBF7",
  bgSecondary: "#E5E7EB",
  card: "#FFFFFF",
  cardGlass: "rgba(255, 255, 255, 0.7)",
  textMain: "#111827",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  shadow: "#9CA3AF",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  contentCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    marginTop: -20,
    marginHorizontal: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -5 },
    elevation: 10,
  },
  countBadge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.bg,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  countText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textMain,
    fontWeight: "500",
  },
  clearSearchButton: {
    padding: 4,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  tutorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    position: "relative",
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  tutorInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  tutorEmail: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
    flex: 1,
  },
  tutorName: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
    fontWeight: "500",
  },
  tutorContentCount: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "400",
  },
  tutorBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  tutorBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  hoverDeleteButton: {
    position: "absolute",
    bottom: 4,
    right: 8,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    shadowColor: COLORS.error,
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    zIndex: 10,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderWidth: 2,
    borderColor: "rgba(59, 130, 246, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textMain,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    fontWeight: "500",
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 21,
  },
});
