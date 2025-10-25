import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where
} from "firebase/firestore";
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

export default function UsersScreen({ users: propUsers, onBackPress }) {
  const [localUsers, setLocalUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState({});
  const [hoveredUserId, setHoveredUserId] = useState(null);
  
  // Use props if provided, otherwise use local state
  const users = Array.isArray(propUsers) ? propUsers : localUsers;
  
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
      },
    )]).start();
  }, []);

  // Fetch data if props are not provided (for standalone usage)
  useEffect(() => {
    // If props are provided, don't fetch data locally
    if (Array.isArray(propUsers)) {
      return;
    }
    
    // Users - fetch all users and filter out admins and tutors locally
    const uUnsub = onSnapshot(collection(db, 'users'), (snap) => {
      const list = snap.docs.map(d => {
        const data = d.data();
        return { id: d.id, ...data };
      });
      // Filter out admins and tutors for consistency with admin dashboard
      // Added defensive check for u to prevent errors with undefined objects
      setLocalUsers(list.filter(u => u && !u.isAdmin && !u.isTutor));
    });
    
    return () => { 
      try { uUnsub(); } catch {} 
    };
  }, [propUsers]);

  // Check for and clean up invalid profile image URLs when component mounts
  useEffect(() => {
    const cleanUpInvalidUrls = async () => {
      try {
        // Ensure users is an array before using forEach
        if (!Array.isArray(users)) return;
        
        let usersToUpdate = [];
        
        // Find users with invalid profile image URLs
        users.forEach(user => {
          if (user.profileImage && 
              (user.profileImage.startsWith('blob:') || 
               user.profileImage.startsWith('file://') ||
               user.profileImage.startsWith('/'))) {
            usersToUpdate.push(user);
          }
        });
        
        // Update users with invalid URLs
        for (const user of usersToUpdate) {
          console.log(`Cleaning up invalid URL for user ${user.id}:`, user.profileImage);
          try {
            await updateDoc(doc(db, "users", user.id), { profileImage: null });
            console.log(`Successfully cleaned up URL for user ${user.id}`);
          } catch (error) {
            console.error(`Error cleaning up URL for user ${user.id}:`, error);
          }
        }
        
        if (usersToUpdate.length > 0) {
          console.log(`Cleaned up ${usersToUpdate.length} invalid profile image URLs`);
        }
      } catch (error) {
        console.error("Error in automatic cleanup:", error);
      }
    };
    
    cleanUpInvalidUrls();
  }, [users]);

  const getAvatarColor = (key) => {
    const colors = [
      COLORS.primary,
      COLORS.secondary,
      COLORS.accent,
      COLORS.success,
      "#EC4899", // Pink
      "#06B6D4", // Cyan
    ];
    const index = Math.abs(key?.charCodeAt(0) || 0) % colors.length;
    return colors[index];
  };

  const toggleSelectUser = (userId) => {
    setSelectedUsers((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const deleteStudent = async (user) => {
    const confirmed = confirm(`Delete ${user.email || user.id}?`);
    if (!confirmed) return;
    try {
      const uid = user.id;
      await deleteDoc(doc(db, "users", uid));
      await deleteDoc(doc(db, "helpdeskApplicants", uid)).catch(() => {});
      await deleteDoc(doc(db, "helpdeskHelpers", uid)).catch(() => {});

      const conSnap = await getDocs(
        query(collection(db, "connections"), where("studentId", "==", uid))
      );
      conSnap.forEach(
        async (d) => await deleteDoc(doc(db, "connections", d.id)).catch(() => {})
      );

      const idxSnap = await getDocs(collection(db, "chatsIndex", uid, "rooms"));
      idxSnap.forEach(
        async (d) =>
          await deleteDoc(doc(db, "chatsIndex", uid, "rooms", d.id)).catch(() => {})
      );

      console.log("✅ User deleted:", uid);
    } catch (e) {
      console.error("❌ Delete error:", e);
    }
  };

  const deleteSelectedUsers = async () => {
    const selectedIds = Object.keys(selectedUsers).filter((id) => selectedUsers[id]);
    if (selectedIds.length === 0) {
      alert("No users selected!");
      return;
    }
    const confirmed = confirm(`Delete ${selectedIds.length} selected users?`);
    if (!confirmed) return;

    // Ensure users is an array before using find
    if (!Array.isArray(users)) return;

    for (const id of selectedIds) {
      const user = users.find((u) => u.id === id);
      if (user) await deleteStudent(user);
    }
    setSelectedUsers({});
    setSelectionMode(false);
  };

  // Ensure users is an array before using filter
  const filteredUsers = Array.isArray(users) ? users.filter((user) => {
    if (!searchQuery) return true;
    return (
      (user.name &&
        user.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.fullName &&
        user.fullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.email &&
        user.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.id && user.id.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }) : [];

  const renderUserItem = ({ item, index }) => {
    const displayName = item.name || item.fullName || "Unknown";
    const firstLetter = displayName.charAt(0).toUpperCase();
    const isSelected = !!selectedUsers[item.id];
    const isHovered = hoveredUserId === item.id;
    const avatarColor = getAvatarColor(displayName);
    
    // Debugging: Log the profile image URL
    console.log(`User ${item.id} profile image:`, item.profileImage);
    
    // Check if the profile image URL is a blob URL
    if (item.profileImage && item.profileImage.startsWith('blob:')) {
      console.warn(`User ${item.id} has a blob URL which won't work after refresh:`, item.profileImage);
    }

    // Staggered animation for each item
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
            styles.userRow,
            pressed && { opacity: 0.95, transform: [{ scale: 0.99 }] },
            isSelected && styles.userRowSelected,
          ]}
          onPress={() => selectionMode && toggleSelectUser(item.id)}
          onMouseEnter={() => setHoveredUserId(item.id)}
          onMouseLeave={() => setHoveredUserId(null)}
        >
          {/* Checkbox */}
          {selectionMode && (
            <TouchableOpacity
              onPress={() => toggleSelectUser(item.id)}
              style={[
                styles.checkbox,
                isSelected && { 
                  backgroundColor: COLORS.primary,
                  borderColor: COLORS.primary,
                },
              ]}
            >
              {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
            </TouchableOpacity>
          )}

          {/* Profile Photo or Initials */}
          <View
            style={[
              styles.avatarCircle,
              { backgroundColor: avatarColor },
            ]}
          >
            {item.profileImage && 
             !item.profileImage.startsWith('blob:') && 
             !item.profileImage.startsWith('file://') && 
             !item.profileImage.startsWith('/') ? (
              <Image 
                source={{ uri: item.profileImage }} 
                style={styles.profileImage}
                onError={async (error) => {
                  console.log("Image load error for user", item.id, "URL:", item.profileImage, "Error:", error);
                  // If there's an error loading the image, remove the invalid URL from the database
                  try {
                    console.log(`Removing invalid URL for user ${item.id}:`, item.profileImage);
                    await updateDoc(doc(db, "users", item.id), { profileImage: null });
                    console.log(`Successfully removed invalid URL for user ${item.id}`);
                  } catch (updateError) {
                    console.error(`Error removing invalid URL for user ${item.id}:`, updateError);
                  }
                }}
                onLoad={() => {
                  console.log("Image loaded successfully for user", item.id, "URL:", item.profileImage);
                }}
              />
            ) : (
              <Text style={styles.avatarText}>{firstLetter}</Text>
            )}
          </View>

          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userEmail} numberOfLines={1}>
                {displayName}
              </Text>
              {item.isTutor && (
                <View style={styles.tutorBadge}>
                  <Ionicons name="school" size={8} color="#fff" style={{ marginRight: 2 }} />
                  <Text style={styles.tutorBadgeText}>TUTOR</Text>
                </View>
              )}
            </View>
            <Text style={styles.userName} numberOfLines={1}>
              {item.email || item.id}
            </Text>
            <Text style={styles.userJoinDate} numberOfLines={1}>
              {(item.createdAt?.toDate?.() || item.joinDate?.toDate?.() || new Date()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          </View>

          {/* Hover Delete Button */}
          {isHovered && !selectionMode && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                deleteStudent(item);
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

  return (
    <View style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}> 
      </View>

      {/* White Content Card with Animation */}
      <Animated.View 
        style={[
          styles.contentCard,
          {
            opacity,
            transform: [{ translateY: scrollY }],
          }
        ]}
      >
        {/* Count Badge */}
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{filteredUsers.length} users</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={COLORS.primary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearSearchButton}>
              <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Action Buttons Row */}
        {!selectionMode ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={() => setSelectionMode(true)}
              style={styles.deleteUsersButton}
            >
              <Ionicons name="albums-outline" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={styles.deleteUsersText}>Bulk Delete</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.selectionActionRow}>
            <TouchableOpacity
              onPress={() => {
                setSelectionMode(false);
                setSelectedUsers({});
              }}
              style={styles.cancelButton}
            >
              <Ionicons name="close-circle-outline" size={16} color={COLORS.secondary} style={{ marginRight: 6 }} />
              <Text style={styles.cancelButtonText}>Cancel Selection</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* User List */}
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="people-outline" size={44} color={COLORS.primary} />
              </View>
              <Text style={styles.emptyTitle}>No users found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? "Try a different search term" : "Users will appear here"}
              </Text>
            </View>
          }
        />

        {/* Fixed Bottom Delete Button */}
        {selectionMode && Object.values(selectedUsers).some(Boolean) && (
          <View style={styles.bottomButtonContainer}>
            <TouchableOpacity
              onPress={deleteSelectedUsers}
              style={styles.confirmDeleteButton}
            >
              <Ionicons name="trash" size={16} color={COLORS.error} />
              <Text style={styles.confirmDeleteText}>
                Delete Selected ({Object.values(selectedUsers).filter(Boolean).length})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const COLORS = {
  primary: "#3B82F6",       // Main Blue
  darkBlue: "#1E40AF",      // Pressed state
  secondary: "#8B5CF6",     // Soft Purple
  accent: "#F59E0B",        // Warm Yellow/Orange
  success: "#22C55E",       // Green
  error: "#EF4444",         // Red
  bg: "#E8EBF7",            // Light blue-gray background
  bgSecondary: "#E5E7EB",   // Secondary background
  card: "#FFFFFF",          // White cards
  cardGlass: "rgba(255, 255, 255, 0.7)", // Glass effect
  textMain: "#111827",      // Main text
  textSecondary: "#6B7280", // Secondary text
  border: "#E5E7EB",        // Border color
  shadow: "#9CA3AF",        // Shadow color
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textMain,
    fontWeight: "500",
  },
  clearSearchButton: { padding: 4 },
  actionRow: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  deleteUsersButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  deleteUsersText: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  selectionActionRow: {
    flexDirection: "column",
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 8,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.3)",
    shadowColor: COLORS.secondary,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  cancelButtonText: {
    color: COLORS.secondary,
    fontWeight: "700",
    fontSize: 14,
  },
  bottomButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -3 },
    elevation: 5,
  },
  confirmDeleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    shadowColor: COLORS.error,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  confirmDeleteText: {
    color: COLORS.error,
    fontWeight: "700",
    fontSize: 14,
  },
  listContainer: { 
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
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
  userRowSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
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
    overflow: "hidden",
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 21,
  },
  avatarText: { 
    color: "#FFFFFF", 
    fontSize: 17, 
    fontWeight: "800",
  },
  userInfo: { 
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  userEmail: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textMain,
    flex: 1,
  },
  userName: { 
    fontSize: 12, 
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  userJoinDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "400",
    marginTop: 2,
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
    top: 6,
    right: 6,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    shadowColor: COLORS.error,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
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
});