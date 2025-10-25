import { Ionicons } from "@expo/vector-icons";
import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query, updateDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../firebase/firebaseConfig";

export default function ResourcesScreen({ resources: propResources }) {
  const [localResources, setLocalResources] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedResources, setSelectedResources] = useState({});
  const [hoveredResourceId, setHoveredResourceId] = useState(null);
  const [reportsModalVisible, setReportsModalVisible] = useState(false);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [reports, setReports] = useState([]);
  const [comments, setComments] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [viewedItems, setViewedItems] = useState({}); // Track which items have been viewed for reports/comments separately
  const [activeDeleteItem, setActiveDeleteItem] = useState(null); // Track which item has active delete icon
  const [uploaderProfiles, setUploaderProfiles] = useState({}); // Store uploader profile data

  // Use props if provided, otherwise use local state
  const resources = Array.isArray(propResources) ? propResources : localResources;

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
    // If props are provided, don't fetch data locally
    if (Array.isArray(propResources)) {
      return;
    }
    
    // Resources
    const rQ = query(collection(db, 'resources'), orderBy('uploadedAt', 'desc'));
    const rUnsub = onSnapshot(rQ, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLocalResources(list);
    });
    
    return () => { 
      try { rUnsub(); } catch {} 
    };
  }, [propResources]);

  // Fetch uploader profile data when resources change
  useEffect(() => {
    const fetchUploaderProfiles = async () => {
      // Ensure resources is an array before using map
      const resourceArray = Array.isArray(resources) ? resources : [];
      const uniqueUploaderIds = [...new Set(resourceArray.map(resource => resource.uploadedBy).filter(Boolean))];
      const newProfiles = { ...uploaderProfiles };
      let updated = false;

      for (const uploaderId of uniqueUploaderIds) {
        if (uploaderId && !newProfiles[uploaderId]) {
          try {
            const userDoc = await getDoc(doc(db, "users", uploaderId));
            if (userDoc.exists()) {
              newProfiles[uploaderId] = userDoc.data();
              updated = true;
            }
          } catch (error) {
            console.error("Error fetching uploader profile:", error);
          }
        }
      }

      if (updated) {
        setUploaderProfiles(newProfiles);
      }
    };

    // Ensure resources is an array before checking length
    if (Array.isArray(resources) && resources.length > 0) {
      fetchUploaderProfiles();
    }
  }, [resources]);

  const getSubjectColor = (subject) => {
    const colors = [
      COLORS.primary,
      COLORS.secondary,
      COLORS.accent,
      COLORS.success,
      "#EC4899", // Pink
      "#06B6D4", // Cyan
    ];
    const index = Math.abs(subject?.charCodeAt(0) || 0) % colors.length;
    return colors[index];
  };

  // Compute unread counts based on last seen counters on the item
  const getUnreadCounts = (item) => {
    const totalReports = Number(item?.reports) || 0;
    const seenReports = Number(item?.adminReportsSeenCount) || 0;
    const totalComments = Number(item?.comments) || 0;
    const seenComments = Number(item?.adminCommentsSeenCount) || 0;
    return {
      unreadReports: Math.max(0, totalReports - seenReports),
      unreadComments: Math.max(0, totalComments - seenComments),
    };
  };

  const toggleSelectResource = (resourceId) => {
    setSelectedResources((prev) => ({
      ...prev,
      [resourceId]: !prev[resourceId],
    }));
  };

  const deleteResource = async (resource) => {
    const confirmed = confirm(`Delete "${resource.fileName || resource.title || 'this resource'}"?`);
    if (!confirmed) return;
    
    try {
      await deleteDoc(doc(db, "resources", resource.id));
      console.log("✅ Resource deleted:", resource.id);
    } catch (e) {
      console.error("❌ Delete error:", e);
    }
  };

  const deleteSelectedResources = async () => {
    const selectedIds = Object.keys(selectedResources).filter((id) => selectedResources[id]);
    if (selectedIds.length === 0) {
      alert("No resources selected!");
      return;
    }
    const confirmed = confirm(`Delete ${selectedIds.length} selected resources?`);
    if (!confirmed) return;

    // Ensure resources is an array before using find
    if (!Array.isArray(resources)) return;

    for (const id of selectedIds) {
      const resource = resources.find((r) => r.id === id);
      if (resource) await deleteResource(resource);
    }
    setSelectedResources({});
    setSelectionMode(false);
  };

  // Function to fetch and display reports for a resource
  const openItemReports = async (type, id, title) => {
    try {
      setSelectedItem({ type, id, title });
      setReportsLoading(true);
      setReportsModalVisible(true);
      
      const collectionName = type === "video" ? "videos" : "resources";
      const reportsQuery = query(
        collection(db, collectionName, id, "reports"),
        orderBy("createdAt", "desc")
      );
      
      const snapshot = await getDocs(reportsQuery);
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setReports(list);
      
      // Update the adminReportsSeenCount to match the total reports count
      // This ensures the red dot disappears when admin views the reports
      const itemRef = doc(db, collectionName, id);
      await updateDoc(itemRef, {
        adminReportsSeenCount: list.length
      });
    } catch (e) {
      console.error("Error loading reports", e);
    } finally {
      setReportsLoading(false);
    }
  };

  // Function to fetch and display comments for a resource
  const openItemComments = async (type, id, title) => {
    try {
      setSelectedItem({ type, id, title });
      setCommentsLoading(true);
      setCommentsModalVisible(true);
      
      const collectionName = type === "video" ? "videos" : "resources";
      const commentsQuery = query(
        collection(db, collectionName, id, "comments"),
        orderBy("createdAt", "desc")
      );
      
      const snapshot = await getDocs(commentsQuery);
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setComments(list);
      
      // Update the adminCommentsSeenCount to match the total comments count
      // This ensures the red dot disappears when admin views the comments
      const itemRef = doc(db, collectionName, id);
      await updateDoc(itemRef, {
        adminCommentsSeenCount: list.length
      });
    } catch (e) {
      console.error("Error loading comments", e);
    } finally {
      setCommentsLoading(false);
    }
  };

  // Function to delete a specific report
  const deleteReport = async (reportId) => {
    try {
      if (!selectedItem) return;
      
      const collectionName = selectedItem.type === "video" ? "videos" : "resources";
      await deleteDoc(doc(db, collectionName, selectedItem.id, "reports", reportId));
      
      // Refresh reports list
      const updatedReports = reports.filter(report => report.id !== reportId);
      setReports(updatedReports);
      
      // Note: We don't update adminReportsSeenCount when deleting because
      // the admin has already seen those reports. The count represents
      // how many reports the admin has viewed, not how many currently exist.
    } catch (e) {
      console.error("Error deleting report", e);
    }
  };

  // Function to delete a specific comment
  const deleteComment = async (commentId) => {
    try {
      if (!selectedItem) return;
      
      const collectionName = selectedItem.type === "video" ? "videos" : "resources";
      await deleteDoc(doc(db, collectionName, selectedItem.id, "comments", commentId));
      
      // Refresh comments list
      const updatedComments = comments.filter(comment => comment.id !== commentId);
      setComments(updatedComments);
      
      // Note: We don't update adminCommentsSeenCount when deleting because
      // the admin has already seen those comments. The count represents
      // how many comments the admin has viewed, not how many currently exist.
    } catch (e) {
      console.error("Error deleting comment", e);
    }
  };

  const filteredResources = resources.filter((resource) => {
    if (!searchQuery) return true;
    return (
      (resource.fileName &&
        resource.fileName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (resource.title &&
        resource.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (resource.subject &&
        resource.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (resource.content &&
        resource.content.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const renderResourceItem = ({ item, index }) => {
    const displayTitle = item.fileName || item.title || "Untitled Resource";
    const firstLetter = (item.subject || "R").charAt(0).toUpperCase();
    const isSelected = !!selectedResources[item.id];
    const isHovered = hoveredResourceId === item.id;
    const subjectColor = getSubjectColor(item.subject || "General");
    const { unreadReports, unreadComments } = getUnreadCounts(item);
    const itemViewed = viewedItems[item.id] || {};
    const hasUnreadReports = !itemViewed.reports && unreadReports > 0;
    const hasUnreadComments = !itemViewed.comments && unreadComments > 0;
    
    // Get uploader profile data
    const uploaderProfile = item.uploadedBy ? uploaderProfiles[item.uploadedBy] : null;
    const uploaderName = uploaderProfile?.fullName || uploaderProfile?.email || item.uploadedByName || "Unknown User";
    const profileImage = uploaderProfile?.profileImage;

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
            styles.resourceRow,
            pressed && { opacity: 0.95, transform: [{ scale: 0.99 }] },
            isSelected && styles.resourceRowSelected,
          ]}
          onPress={() => {
            if (selectionMode) {
              toggleSelectResource(item.id);
            } else {
              // Show delete icon only for this item
              setActiveDeleteItem(item.id);
            }
          }}
          onMouseEnter={() => setHoveredResourceId(item.id)}
          onMouseLeave={() => setHoveredResourceId(null)}
        >
          {/* Checkbox */}
          {selectionMode && (
            <TouchableOpacity
              onPress={() => toggleSelectResource(item.id)}
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

          <View style={styles.resourceInfo}>
            <Text style={styles.resourceTitle} numberOfLines={1}>
              {displayTitle}
            </Text>
            <Text style={styles.resourceSubject} numberOfLines={1}>
              {item.subject || "General"}
            </Text>
            {/* Uploader profile photo and name */}
            <View style={styles.uploaderContainer}>
              {profileImage ? (
                <Image 
                  source={{ uri: profileImage }} 
                  style={styles.uploaderAvatar}
                />
              ) : (
                <View style={[styles.uploaderAvatar, styles.uploaderAvatarPlaceholder]}>
                  <Text style={styles.uploaderAvatarText}>
                    {uploaderName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={styles.uploaderName} numberOfLines={1}>
                {uploaderName}
              </Text>
            </View>
            <View style={styles.resourceStats}>
              <View style={styles.statItem}>
                <Ionicons name="eye-outline" size={12} color={COLORS.textSecondary} />
                <Text style={styles.statText}>{item.views || 0}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="heart-outline" size={12} color={COLORS.textSecondary} />
                <Text style={styles.statText}>{item.likes || 0}</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons (always visible on hover or in selection mode) */}
          {(isHovered || selectionMode || hasUnreadReports || hasUnreadComments || activeDeleteItem === item.id) && !selectionMode && (
            <View style={styles.actionButtons}>
              {/* Show report icon - no red dot if viewed */}
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  openItemReports('resource', item.id, displayTitle);
                }}
                style={styles.actionButton}
              >
                <Ionicons name="flag-outline" size={16} color={COLORS.error} />
                {hasUnreadReports && (
                  <View style={styles.actionBadge}>
                    <Text style={styles.actionBadgeText}>{unreadReports}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Show comment icon - no red dot if viewed */}
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  openItemComments('resource', item.id, displayTitle);
                }}
                style={styles.actionButton}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={COLORS.primary} />
                {hasUnreadComments && (
                  <View style={styles.actionBadge}>
                    <Text style={styles.actionBadgeText}>{unreadComments}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Show delete icon only for active item */}
              {activeDeleteItem === item.id && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    deleteResource(item);
                  }}
                  style={styles.actionButton}
                >
                  <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}></View>

      {/* White Content Card with Animation */}
      <Animated.View
        style={[
          styles.contentCard,
          {
            opacity,
            transform: [{ translateY: scrollY }],
          },
        ]}
      >
        {/* Count Badge */}
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{filteredResources.length} resources</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={COLORS.primary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or subject..."
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
              style={styles.bulkDeleteButton}
            >
              <Ionicons name="albums-outline" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={styles.bulkDeleteText}>Bulk Delete</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.selectionActionRow}>
            <TouchableOpacity
              onPress={() => {
                setSelectionMode(false);
                setSelectedResources({});
              }}
              style={styles.cancelButton}
            >
              <Ionicons name="close-circle-outline" size={16} color={COLORS.secondary} style={{ marginRight: 6 }} />
              <Text style={styles.cancelButtonText}>Cancel Selection</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Resource List */}
        <FlatList
          data={filteredResources}
          keyExtractor={(item) => item.id}
          renderItem={renderResourceItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="document-text-outline" size={44} color={COLORS.primary} />
              </View>
              <Text style={styles.emptyTitle}>No resources found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? "Try a different search term" : "Resources will appear here"}
              </Text>
            </View>
          }
        />

        {/* Fixed Bottom Delete Button */}
        {selectionMode && Object.values(selectedResources).some(Boolean) && (
          <View style={styles.bottomButtonContainer}>
            <TouchableOpacity
              onPress={deleteSelectedResources}
              style={styles.confirmDeleteButton}
            >
              <Ionicons name="trash" size={16} color={COLORS.error} />
              <Text style={styles.confirmDeleteText}>
                Delete Selected ({Object.values(selectedResources).filter(Boolean).length})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* Reports Modal */}
      <Modal
        visible={reportsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setReportsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reports for {selectedItem?.title || "Resource"}</Text>
              <TouchableOpacity onPress={() => setReportsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {reportsLoading ? (
              <Text style={styles.loadingText}>Loading reports...</Text>
            ) : reports.length === 0 ? (
              <Text style={styles.emptyText}>No reports found.</Text>
            ) : (
              <ScrollView style={styles.modalContent}>
                {reports.map((report) => (
                  <View key={report.id} style={styles.reportItem}>
                    <View style={styles.reportHeader}>
                      <Text style={styles.reportUser}>{report.userName || report.userId || "User"}</Text>
                      <TouchableOpacity onPress={() => deleteReport(report.id)}>
                        <Ionicons name="trash-outline" size={20} color="#ff3b30" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.reportReason}>{report.reason || "No reason provided"}</Text>
                    <Text style={styles.reportDate}>
                      {report.createdAt?.toDate ? report.createdAt.toDate().toLocaleString() : "Unknown date"}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Comments Modal */}
      <Modal
        visible={commentsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCommentsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comments for {selectedItem?.title || "Resource"}</Text>
              <TouchableOpacity onPress={() => setCommentsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {commentsLoading ? (
              <Text style={styles.loadingText}>Loading comments...</Text>
            ) : comments.length === 0 ? (
              <Text style={styles.emptyText}>No comments found.</Text>
            ) : (
              <ScrollView style={styles.modalContent}>
                {comments.map((comment) => (
                  <View key={comment.id} style={styles.commentItem}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentUser}>{comment.userName || comment.userId || "User"}</Text>
                      <TouchableOpacity onPress={() => deleteComment(comment.id)}>
                        <Ionicons name="trash-outline" size={20} color="#ff3b30" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.commentText}>{comment.text || "No comment text"}</Text>
                    <Text style={styles.commentDate}>
                      {comment.createdAt?.toDate ? comment.createdAt.toDate().toLocaleString() : "Unknown date"}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
  bulkDeleteButton: {
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
  bulkDeleteText: {
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
  resourceRow: {
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
  resourceRowSelected: {
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
  iconCircle: {
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
  iconText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  resourceInfo: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textMain,
    marginBottom: 3,
  },
  resourceSubject: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
    marginBottom: 6,
  },
  uploaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  uploaderAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  uploaderAvatarPlaceholder: {
    backgroundColor: COLORS.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  uploaderAvatarText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  uploaderName: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  resourceStats: {
    flexDirection: "row",
    gap: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    position: "relative",
  },
  actionBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: COLORS.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#fff",
  },
  actionBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
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
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxWidth: 600,
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalContent: {
    padding: 16,
  },
  loadingText: {
    padding: 16,
    textAlign: 'center',
    color: '#6B7280',
  },
  emptyText: {
    padding: 16,
    textAlign: 'center',
    color: '#6B7280',
  },
  reportItem: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportUser: {
    fontWeight: '600',
    color: '#111827',
  },
  reportReason: {
    color: '#374151',
    marginBottom: 8,
  },
  reportDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  commentItem: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentUser: {
    fontWeight: '600',
    color: '#111827',
  },
  commentText: {
    color: '#374151',
    marginBottom: 8,
  },
  commentDate: {
    fontSize: 12,
    color: '#6B7280',
  },
});