import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { Alert, Animated, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { auth, db } from "../firebase/firebaseConfig";

export default function HelpdeskAdminScreen() {
  const router = useRouter();
  const [apps, setApps] = useState([]);
  const [helpers, setHelpers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('applications');
  const [searchQuery, setSearchQuery] = useState("");
  
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

  useEffect(() => {
    const checkAdminAndLoadData = async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        
        const me = await getDoc(doc(db, "users", uid));
        const data = me.exists() ? me.data() : {};
        const admin = !!data.isAdmin || /\+admin/.test(auth.currentUser?.email || "");
        setIsAdmin(admin);
        
        if (!admin) return;
        
        const appsSnap = await getDocs(collection(db, "helpdeskApplicants"));
        const appsList = [];
        for (const d of appsSnap.docs) {
          const appData = d.data();
          let displayName = appData.name || appData.email || d.id;
          try {
            const userDoc = await getDoc(doc(db, "users", d.id));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              displayName = userData.fullName || userData.name || userData.displayName || appData.name || appData.email || d.id;
            }
          } catch (error) {
            console.log("Error fetching user data for applicant:", error);
          }
          
          appsList.push({ 
            id: d.id, 
            ...appData,
            name: displayName,
            appliedAt: appData.updatedAt || appData.createdAt
          });
        }
        appsList.sort((a, b) => {
          const timeA = a.appliedAt?.seconds || 0;
          const timeB = b.appliedAt?.seconds || 0;
          return timeB - timeA;
        });
        setApps(appsList);
        
        const helpersSnap = await getDocs(collection(db, "helpdeskHelpers"));
        const helpersList = [];
        for (const d of helpersSnap.docs) {
          const helperData = d.data();
          let displayName = helperData.name || helperData.email || d.id;
          try {
            const userDoc = await getDoc(doc(db, "users", d.id));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              displayName = userData.fullName || userData.name || userData.displayName || helperData.name || helperData.email || d.id;
            }
          } catch (error) {
            console.log("Error fetching user data for helper:", error);
          }
          
          helpersList.push({ 
            id: d.id, 
            ...helperData,
            name: displayName
          });
        }
        helpersList.sort((a, b) => {
          const timeA = a.approvedAt?.seconds || 0;
          const timeB = b.approvedAt?.seconds || 0;
          return timeB - timeA;
        });
        setHelpers(helpersList);
        
      } catch (error) {
        console.error("Error loading admin data:", error);
      }
    };
    checkAdminAndLoadData();
  }, []);

  const refreshData = async () => {
    setRefreshing(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid || !isAdmin) return;
      
      const appsSnap = await getDocs(collection(db, "helpdeskApplicants"));
      const appsList = [];
      for (const d of appsSnap.docs) {
        const appData = d.data();
        let displayName = appData.name || appData.email || d.id;
        try {
          const userDoc = await getDoc(doc(db, "users", d.id));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            displayName = userData.fullName || userData.name || userData.displayName || appData.name || appData.email || d.id;
          }
        } catch (error) {
          console.log("Error fetching user data for applicant:", error);
        }
        
        appsList.push({ 
          id: d.id, 
          ...appData,
          name: displayName,
          appliedAt: appData.updatedAt || appData.createdAt
        });
      }
      appsList.sort((a, b) => {
        const timeA = a.appliedAt?.seconds || 0;
        const timeB = b.appliedAt?.seconds || 0;
        return timeB - timeA;
      });
      setApps(appsList);
      
      const helpersSnap = await getDocs(collection(db, "helpdeskHelpers"));
      const helpersList = [];
      for (const d of helpersSnap.docs) {
        const helperData = d.data();
        let displayName = helperData.name || helperData.email || d.id;
        try {
          const userDoc = await getDoc(doc(db, "users", d.id));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            displayName = userData.fullName || userData.name || userData.displayName || helperData.name || helperData.email || d.id;
          }
        } catch (error) {
          console.log("Error fetching user data for helper:", error);
        }
        
        helpersList.push({ 
          id: d.id, 
          ...helperData,
          name: displayName
        });
      }
      helpersList.sort((a, b) => {
        const timeA = a.approvedAt?.seconds || 0;
        const timeB = b.approvedAt?.seconds || 0;
        return timeB - timeA;
      });
      setHelpers(helpersList);
      
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const approve = async (app) => {
    if (!isAdmin) return;
    try {
      let userFullName = app.name || app.email || "";
      try {
        const userDoc = await getDoc(doc(db, "users", app.id));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          userFullName = userData.fullName || userData.name || userData.displayName || app.name || app.email || "";
        }
      } catch (error) {
        console.log("Error fetching user data for helper:", error);
      }

      if (app.type === "subject_change") {
        await setDoc(doc(db, "helpdeskHelpers", app.id), {
          subjects: app.subjects || [],
          bio: app.bio || "",
          email: app.email || "",
          name: userFullName,
          highestQualification: app.highestQualification || "",
          yearsExperience: app.yearsExperience || 0,
        }, { merge: true });
        
        await updateDoc(doc(db, "helpdeskApplicants", app.id), { 
          status: "approved",
          approvedAt: new Date(),
          approvedBy: auth.currentUser?.uid
        });
        
        Alert.alert("Approved", `${userFullName}'s subject change request has been approved.`);
      } else {
        await setDoc(doc(db, "helpdeskHelpers", app.id), {
          subjects: app.subjects || [],
          bio: app.bio || "",
          email: app.email || "",
          name: userFullName,
          highestQualification: app.highestQualification || "",
          yearsExperience: app.yearsExperience || 0,
          rating: 0,
          approvedAt: new Date(),
          approvedBy: auth.currentUser?.uid,
        }, { merge: true });
        
        await setDoc(doc(db, "users", app.id), { isTutor: true }, { merge: true });
        
        await updateDoc(doc(db, "helpdeskApplicants", app.id), { 
          status: "approved",
          approvedAt: new Date(),
          approvedBy: auth.currentUser?.uid
        });
        
        Alert.alert("Approved", `${userFullName} has been approved as a helper and can now assist students.`);
      }
      
      refreshData();
    } catch (e) {
      console.error("Error approving application:", e);
      Alert.alert("Error", "Failed to approve application. Please try again.");
    }
  };

  const reject = async (app) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, "helpdeskApplicants", app.id), { 
        status: "rejected",
        rejectedAt: new Date(),
        rejectedBy: auth.currentUser?.uid
      });
      Alert.alert("Rejected", `${app.name || app.email}'s application has been rejected.`);
      refreshData();
    } catch (e) {
      console.error("Error rejecting application:", e);
      Alert.alert("Error", "Failed to reject application. Please try again.");
    }
  };

  const removeHelper = async (helper) => {
    if (!isAdmin) return;
    
    Alert.alert(
      "Remove Helper",
      `Are you sure you want to remove ${helper.name || helper.email} from the helpdesk? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "helpdeskHelpers", helper.id));
              await setDoc(doc(db, "users", helper.id), { isTutor: false }, { merge: true });
              
              try {
                await updateDoc(doc(db, "helpdeskApplicants", helper.id), { 
                  status: "removed",
                  removedAt: new Date(),
                  removedBy: auth.currentUser?.uid
                });
              } catch {}
              
              Alert.alert("Removed", `${helper.name || helper.email} has been removed from the helpdesk.`);
              refreshData();
            } catch (e) {
              console.error("Error removing helper:", e);
              Alert.alert("Error", "Failed to remove helper. Please try again.");
            }
          }
        }
      ]
    );
  };

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

  // Filter data based on search
  const filteredApps = apps.filter((app) => {
    if (!searchQuery) return true;
    return (
      (app.name && app.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (app.email && app.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (app.subjects && app.subjects.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())))
    );
  });

  const filteredHelpers = helpers.filter((helper) => {
    if (!searchQuery) return true;
    return (
      (helper.name && helper.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (helper.email && helper.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (helper.subjects && helper.subjects.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())))
    );
  });

  const renderApplication = ({ item, index }) => {
    const displayName = item.name || item.email || item.id;
    const firstLetter = displayName.charAt(0).toUpperCase();
    const avatarColor = getAvatarColor(displayName);

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
        <View style={styles.card}>
          <View style={[styles.avatarCircle, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{firstLetter}</Text>
          </View>
          
          <View style={styles.cardContent}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{displayName}</Text>
              {item.type === "subject_change" && (
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>CHANGE</Text>
                </View>
              )}
            </View>
            <Text style={styles.meta} numberOfLines={1}>{item.email}</Text>
            <Text style={styles.meta} numberOfLines={1}>
              {(item.subjects || []).join(", ")}
            </Text>
            
            {item.appliedAt && (
              <Text style={styles.date}>
                {new Date(item.appliedAt.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            )}
            
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { 
                backgroundColor: item.status === 'approved' ? 'rgba(34, 197, 94, 0.15)' : 
                               item.status === 'rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)' 
              }]}>
                <Text style={[styles.statusText, { 
                  color: item.status === 'approved' ? COLORS.success : 
                        item.status === 'rejected' ? COLORS.error : COLORS.primary 
                }]}>
                  {item.status || 'pending'}
                </Text>
              </View>
            </View>
          </View>

          {isAdmin && item.status === 'pending' && (
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.approveBtn} onPress={() => approve(item)}>
                <Ionicons name="checkmark" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => reject(item)}>
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  const renderHelper = ({ item, index }) => {
    const displayName = item.name || item.email || item.id;
    const firstLetter = displayName.charAt(0).toUpperCase();
    const avatarColor = getAvatarColor(displayName);

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
        <View style={styles.card}>
          <View style={[styles.avatarCircle, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{firstLetter}</Text>
          </View>
          
          <View style={styles.cardContent}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{displayName}</Text>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={10} color="#F59E0B" />
                <Text style={styles.ratingText}>{(item.rating || 0).toFixed(1)}</Text>
              </View>
            </View>
            <Text style={styles.meta} numberOfLines={1}>{item.email}</Text>
            <Text style={styles.meta} numberOfLines={1}>
              {(item.subjects || []).join(", ")}
            </Text>
            
            {item.approvedAt && (
              <Text style={styles.date}>
                Active since {new Date(item.approvedAt.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            )}
            
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                <Text style={[styles.statusText, { color: COLORS.success }]}>Active</Text>
              </View>
            </View>
          </View>

          {isAdmin && (
            <TouchableOpacity style={styles.deleteBtn} onPress={() => removeHelper(item)}>
              <Ionicons name="trash-outline" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    );
  };

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Helpdesk Admin</Text>
        </View>
        
        <View style={styles.noAccessContainer}>
          <View style={styles.noAccessIconCircle}>
            <Ionicons name="shield-outline" size={50} color={COLORS.primary} />
          </View>
          <Text style={styles.noAccessTitle}>Access Denied</Text>
          <Text style={styles.noAccessText}>
            You don't have admin privileges to access this page.
          </Text>
        </View>
      </View>
    );
  }

  const currentData = viewMode === 'applications' ? filteredApps : filteredHelpers;
  const pendingCount = apps.filter(app => app.status === 'pending').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Helpdesk Admin</Text>
      </View>

      <Animated.View 
        style={[
          styles.contentCard,
          {
            opacity,
            transform: [{ translateY: scrollY }],
          }
        ]}
      >
        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, viewMode === 'applications' && styles.activeTab]}
            onPress={() => setViewMode('applications')}
          >
            <Text style={[styles.tabText, viewMode === 'applications' && styles.activeTabText]}>
              Applications
            </Text>
            {pendingCount > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, viewMode === 'helpers' && styles.activeTab]}
            onPress={() => setViewMode('helpers')}
          >
            <Text style={[styles.tabText, viewMode === 'helpers' && styles.activeTabText]}>
              Helpers
            </Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{helpers.length}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={COLORS.primary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, or subject..."
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

        <FlatList
          data={currentData}
          keyExtractor={(item) => item.id}
          renderItem={viewMode === 'applications' ? renderApplication : renderHelper}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshData}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons 
                  name={viewMode === 'applications' ? 'document-text-outline' : 'people-outline'} 
                  size={44} 
                  color={COLORS.primary} 
                />
              </View>
              <Text style={styles.emptyTitle}>
                {viewMode === 'applications' ? 'No applications' : 'No active helpers'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {viewMode === 'applications' 
                  ? 'Tutor applications will appear here when submitted' 
                  : 'Approved helpers will appear here'
                }
              </Text>
            </View>
          }
        />
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
  textMain: "#111827",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
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
    paddingTop: 0,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -5 },
    elevation: 10,
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    gap: 6,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  activeTabText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  countBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    color: COLORS.textMain,
    fontSize: 11,
    fontWeight: "700",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 12,
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
  listContent: { 
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card, 
    borderRadius: 12, 
    padding: 12, 
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
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
  cardContent: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  name: { 
    fontSize: 14, 
    fontWeight: '700',
    color: COLORS.textMain,
    flex: 1,
  },
  meta: { 
    fontSize: 12, 
    color: COLORS.textSecondary, 
    fontWeight: "500",
    marginTop: 2,
  },
  date: { 
    fontSize: 11, 
    color: COLORS.textSecondary,
    fontWeight: "400",
    marginTop: 4,
  },
  statusRow: {
    marginTop: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  typeBadge: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  typeBadgeText: { 
    color: "#fff", 
    fontSize: 9, 
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  ratingText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: "700",
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  approveBtn: { 
    backgroundColor: COLORS.success,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.success,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  rejectBtn: {
    backgroundColor: COLORS.error,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.error,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  deleteBtn: {
    backgroundColor: COLORS.error,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.error,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  noAccessContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  noAccessIconCircle: {
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
  noAccessTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textMain,
    marginBottom: 6,
  },
  noAccessText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    fontWeight: "500",
    lineHeight: 20,
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