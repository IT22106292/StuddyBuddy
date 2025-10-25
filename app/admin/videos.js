import { Ionicons } from "@expo/vector-icons";
import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query, updateDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  Linking,
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

export default function VideosScreen({ videos: propVideos }) {
  const [localVideos, setLocalVideos] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedVideos, setSelectedVideos] = useState({});
  const [hoveredVideoId, setHoveredVideoId] = useState(null);
  const [editVideo, setEditVideo] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [reportsModalVisible, setReportsModalVisible] = useState(false);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [reports, setReports] = useState([]);
  const [comments, setComments] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [viewedItems, setViewedItems] = useState({});
  const [activeDeleteItem, setActiveDeleteItem] = useState(null);
  const [uploaderProfiles, setUploaderProfiles] = useState({});

  // Use props if provided, otherwise use local state
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
    // If props are provided, don't fetch data locally
    if (Array.isArray(propVideos)) {
      return;
    }
    
    // Videos
    const vQ = query(collection(db, 'videos'), orderBy('uploadedAt', 'desc'));
    const vUnsub = onSnapshot(vQ, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLocalVideos(list);
    });
    
    return () => { 
      try { vUnsub(); } catch {} 
    };
  }, [propVideos]);

  // Fetch uploader profile data when videos change
  useEffect(() => {
    const fetchUploaderProfiles = async () => {
      // Ensure videos is an array before using map
      const videoArray = Array.isArray(videos) ? videos : [];
      const uniqueUploaderIds = [...new Set(videoArray.map(video => video.uploadedBy).filter(Boolean))];
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

    // Ensure videos is an array before checking length
    if (Array.isArray(videos) && videos.length > 0) {
      fetchUploaderProfiles();
    }
  }, [videos]);

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

  const toggleSelectVideo = (videoId) => {
    setSelectedVideos((prev) => ({
      ...prev,
      [videoId]: !prev[videoId],
    }));
  };

  const deleteVideo = async (video) => {
    const confirmed = confirm(`Delete "${video.title || 'this video'}"?`);
    if (!confirmed) return;
    
    try {
      await deleteDoc(doc(db, "videos", video.id));
      console.log("✅ Video deleted:", video.id);
    } catch (e) {
      console.error("❌ Delete error:", e);
    }
  };

  const deleteSelectedVideos = async () => {
    const selectedIds = Object.keys(selectedVideos).filter((id) => selectedVideos[id]);
    if (selectedIds.length === 0) {
      alert("No videos selected!");
      return;
    }
    const confirmed = confirm(`Delete ${selectedIds.length} selected videos?`);
    if (!confirmed) return;

    // Ensure videos is an array before using find
    if (!Array.isArray(videos)) return;

    for (const id of selectedIds) {
      const video = videos.find((v) => v.id === id);
      if (video) await deleteVideo(video);
    }
    setSelectedVideos({});
    setSelectionMode(false);
  };

  const saveVideoEdits = async () => {
    try {
      if (!editVideo?.id) return;
      setEditSaving(true);
      await updateDoc(doc(db, 'videos', editVideo.id), {
        title: String(editVideo.title || '').trim(),
        description: String(editVideo.description || '').trim(),
        subject: String(editVideo.subject || '').trim(),
        updatedAt: new Date(),
      });
      setEditVideo(null);
    } catch (e) {
      console.error('Failed to save changes');
    } finally {
      setEditSaving(false);
    }
  };

  // Function to fetch and display reports for a video
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

  // Function to fetch and display comments for a video
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
      
      const updatedReports = reports.filter(report => report.id !== reportId);
      setReports(updatedReports);
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
      
      const updatedComments = comments.filter(comment => comment.id !== commentId);
      setComments(updatedComments);
    } catch (e) {
      console.error("Error deleting comment", e);
    }
  };

  const filteredVideos = videos.filter((video) => {
    if (!searchQuery) return true;
    return (
      (video.title &&
        video.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (video.subject &&
        video.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (video.description &&
        video.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (video.content &&
        video.content.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const renderVideoItem = ({ item, index }) => {
    const displayTitle = item.title || "Untitled Video";
    const isSelected = !!selectedVideos[item.id];
    const isHovered = hoveredVideoId === item.id;
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
            styles.videoRow,
            pressed && { opacity: 0.95, transform: [{ scale: 0.99 }] },
            isSelected && styles.videoRowSelected,
          ]}
          onPress={() => {
            if (selectionMode) {
              toggleSelectVideo(item.id);
            } else {
              setActiveDeleteItem(item.id);
            }
          }}
          onMouseEnter={() => setHoveredVideoId(item.id)}
          onMouseLeave={() => setHoveredVideoId(null)}
        >
          {/* Checkbox */}
          {selectionMode && (
            <TouchableOpacity
              onPress={() => toggleSelectVideo(item.id)}
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

          <View style={styles.videoInfo}>
            <Text style={styles.videoTitle} numberOfLines={1}>
              {displayTitle}
            </Text>
            <Text style={styles.videoSubject} numberOfLines={1}>
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
            <View style={styles.videoStats}>
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

          {/* Action Buttons */}
          {(isHovered || selectionMode || hasUnreadReports || hasUnreadComments || activeDeleteItem === item.id) && !selectionMode && (
            <View style={styles.actionButtons}>
              {/* Report icon */}
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  openItemReports('video', item.id, displayTitle);
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

              {/* Comment icon */}
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  openItemComments('video', item.id, displayTitle);
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

              {/* Open video URL */}
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  try { 
                    if (item.videoUrl) Linking.openURL(item.videoUrl); 
                  } catch {} 
                }}
                style={styles.actionButton}
              >
                <Ionicons name="open-outline" size={16} color={COLORS.primary} />
              </TouchableOpacity>

              {/* Edit icon */}
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  setEditVideo(item);
                }}
                style={styles.actionButton}
              >
                <Ionicons name="create-outline" size={16} color={COLORS.secondary} />
              </TouchableOpacity>

              {/* Delete icon - only for active item */}
              {activeDeleteItem === item.id && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    deleteVideo(item);
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
          <Text style={styles.countText}>{filteredVideos.length} videos</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={COLORS.primary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by title or subject..."
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
                setSelectedVideos({});
              }}
              style={styles.cancelButton}
            >
              <Ionicons name="close-circle-outline" size={16} color={COLORS.secondary} style={{ marginRight: 6 }} />
              <Text style={styles.cancelButtonText}>Cancel Selection</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Video List */}
        <FlatList
          data={filteredVideos}
          keyExtractor={(item) => item.id}
          renderItem={renderVideoItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="videocam-outline" size={44} color={COLORS.primary} />
              </View>
              <Text style={styles.emptyTitle}>No videos found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? "Try a different search term" : "Videos will appear here"}
              </Text>
            </View>
          }
        />

        {/* Fixed Bottom Delete Button */}
        {selectionMode && Object.values(selectedVideos).some(Boolean) && (
          <View style={styles.bottomButtonContainer}>
            <TouchableOpacity
              onPress={deleteSelectedVideos}
              style={styles.confirmDeleteButton}
            >
              <Ionicons name="trash" size={16} color={COLORS.error} />
              <Text style={styles.confirmDeleteText}>
                Delete Selected ({Object.values(selectedVideos).filter(Boolean).length})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* Edit Video Modal */}
      <Modal
        visible={!!editVideo}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditVideo(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Video</Text>
              <TouchableOpacity onPress={() => setEditVideo(null)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <TextInput
                style={styles.input}
                placeholder="Title"
                value={editVideo?.title || ''}
                onChangeText={text => setEditVideo({...editVideo, title: text})}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Subject"
                value={editVideo?.subject || ''}
                onChangeText={text => setEditVideo({...editVideo, subject: text})}
              />
              
              <TextInput
                style={[styles.input, { height: 80 }]}
                placeholder="Description"
                value={editVideo?.description || ''}
                onChangeText={text => setEditVideo({...editVideo, description: text})}
                multiline
              />
              
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.cancelBtn} 
                  onPress={() => setEditVideo(null)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.saveBtn, editSaving && styles.disabledBtn]} 
                  onPress={saveVideoEdits}
                  disabled={editSaving}
                >
                  <Text style={styles.saveBtnText}>
                    {editSaving ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

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
              <Text style={styles.modalTitle}>Reports for {selectedItem?.title || "Video"}</Text>
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
              <Text style={styles.modalTitle}>Comments for {selectedItem?.title || "Video"}</Text>
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
  videoRow: {
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
  videoRowSelected: {
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
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textMain,
    marginBottom: 3,
  },
  videoSubject: {
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
  videoStats: {
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
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    color: '#111827',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  cancelBtnText: {
    color: '#111827',
    fontWeight: '600',
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  disabledBtn: {
    opacity: 0.6,
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