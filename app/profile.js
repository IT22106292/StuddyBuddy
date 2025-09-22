import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { sendPasswordResetEmail, signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs, orderBy, query, updateDoc, where } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import {
    Alert,
    Dimensions,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import * as Progress from 'react-native-progress';
import { auth, db } from "../firebase/firebaseConfig";

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({});
  const [likedItems, setLikedItems] = useState([]);
  const [likedLoading, setLikedLoading] = useState(true);
  const [commentedItems, setCommentedItems] = useState([]);
  const [commentedLoading, setCommentedLoading] = useState(true);
  const [escapeRoomProgress, setEscapeRoomProgress] = useState(null);
  const [escapeRoomLoading, setEscapeRoomLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
    fetchLikedItems();
    fetchCommentedItems();
    fetchEscapeRoomProgress();
  }, []);

  // Refresh escape room progress when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchEscapeRoomProgress();
    }, [])
  );

  const fetchUserProfile = async () => {
    try {
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (userDoc.exists()) {
        const profile = userDoc.data();
        setUserProfile(profile);
        setEditedProfile(profile);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), editedProfile);
      setUserProfile(editedProfile);
      setIsEditing(false);
      Alert.alert("Success", "Profile updated successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to update profile");
    }
  };

  const handlePasswordReset = async () => {
    try {
      if (!auth.currentUser?.email) {
        Alert.alert("Error", "No email associated with this account");
        return;
      }
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      Alert.alert("Email sent", "Check your inbox to reset the password.");
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to send reset email");
    }
  };

  const fetchLikedItems = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      
      const items = [];
      
      // Check resources likes - get all resources and check if user liked them
      const resourcesQuery = query(collection(db, "resources"), orderBy("uploadedAt", "desc"));
      const resourcesSnap = await getDocs(resourcesQuery);
      
      for (const resourceDoc of resourcesSnap.docs) {
        try {
          const likeDoc = await getDoc(doc(db, "resources", resourceDoc.id, "likes", uid));
          if (likeDoc.exists()) {
            const data = resourceDoc.data();
            items.push({
              id: resourceDoc.id,
              type: "resource",
              title: data.fileName || data.title || "Resource",
              subject: data.subject,
            });
          }
        } catch {}
      }
      
      // Check videos likes - get all videos and check if user liked them
      const videosQuery = query(collection(db, "videos"), orderBy("uploadedAt", "desc"));
      const videosSnap = await getDocs(videosQuery);
      
      for (const videoDoc of videosSnap.docs) {
        try {
          const likeDoc = await getDoc(doc(db, "videos", videoDoc.id, "likes", uid));
          if (likeDoc.exists()) {
            const data = videoDoc.data();
            items.push({
              id: videoDoc.id,
              type: "video",
              title: data.title || "Video",
              subject: data.subject,
            });
          }
        } catch {}
      }
      
      setLikedItems(items);
    } catch (e) {
      console.error("Error fetching liked items", e);
    } finally {
      setLikedLoading(false);
    }
  };

  const fetchCommentedItems = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      
      const items = [];
      
      // Check resources comments - get all resources and check if user commented
      const resourcesQuery = query(collection(db, "resources"), orderBy("uploadedAt", "desc"));
      const resourcesSnap = await getDocs(resourcesQuery);
      
      for (const resourceDoc of resourcesSnap.docs) {
        try {
          const commentsQuery = query(collection(db, "resources", resourceDoc.id, "comments"), where("userId", "==", uid));
          const commentsSnap = await getDocs(commentsQuery);
          if (!commentsSnap.empty) {
            const data = resourceDoc.data();
            items.push({
              id: resourceDoc.id,
              type: "resource",
              title: data.fileName || data.title || "Resource",
              subject: data.subject,
            });
          }
        } catch {}
      }
      
      // Check videos comments - get all videos and check if user commented
      const videosQuery = query(collection(db, "videos"), orderBy("uploadedAt", "desc"));
      const videosSnap = await getDocs(videosQuery);
      
      for (const videoDoc of videosSnap.docs) {
        try {
          const commentsQuery = query(collection(db, "videos", videoDoc.id, "comments"), where("userId", "==", uid));
          const commentsSnap = await getDocs(commentsQuery);
          if (!commentsSnap.empty) {
            const data = videoDoc.data();
            items.push({
              id: videoDoc.id,
              type: "video",
              title: data.title || "Video",
              subject: data.subject,
            });
          }
        } catch {}
      }
      
      setCommentedItems(items);
    } catch (e) {
      console.error("Error fetching commented items", e);
    } finally {
      setCommentedLoading(false);
    }
  };

  const fetchEscapeRoomProgress = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const escapeRoomDoc = await getDoc(doc(db, 'escapeRoom', userId));
      if (escapeRoomDoc.exists()) {
        setEscapeRoomProgress(escapeRoomDoc.data());
      } else {
        setEscapeRoomProgress({
          completedLevels: [],
          currentLevel: 1,
          totalPoints: 0,
          badges: []
        });
      }
    } catch (error) {
      console.error('Error fetching escape room progress:', error);
      setEscapeRoomProgress({
        completedLevels: [],
        currentLevel: 1,
        totalPoints: 0,
        badges: []
      });
    } finally {
      setEscapeRoomLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await signOut(auth);
            router.replace("/signin");
          },
        },
      ]
    );
  };

  if (!userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
          <Ionicons 
            name={isEditing ? "close" : "create-outline"} 
            size={24} 
            color="#007AFF" 
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userProfile.fullName?.charAt(0) || "U"}
            </Text>
          </View>
          <Text style={styles.name}>{userProfile.fullName}</Text>
          <Text style={styles.email}>{userProfile.email}</Text>
          {userProfile.isTutor && (
            <View style={styles.tutorBadge}>
              <Ionicons name="school" size={16} color="#4CAF50" />
              <Text style={styles.tutorText}>Tutor</Text>
            </View>
          )}
        </View>

        {/* Profile Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editedProfile.fullName}
                onChangeText={(text) => setEditedProfile({...editedProfile, fullName: text})}
                placeholder="Enter your full name"
              />
            ) : (
              <Text style={styles.fieldValue}>{userProfile.fullName}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Expertise Level</Text>
            {isEditing ? (
              <View style={styles.levelContainer}>
                {["beginner", "intermediate", "advanced"].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.levelButton,
                      editedProfile.expertiseLevel === level && styles.selectedLevel
                    ]}
                    onPress={() => setEditedProfile({...editedProfile, expertiseLevel: level})}
                  >
                    <Text style={[
                      styles.levelText,
                      editedProfile.expertiseLevel === level && styles.selectedLevelText
                    ]}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.fieldValue}>
                {userProfile.expertiseLevel?.charAt(0).toUpperCase() + userProfile.expertiseLevel?.slice(1)}
              </Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Subjects</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editedProfile.subjects?.join(", ")}
                onChangeText={(text) => setEditedProfile({...editedProfile, subjects: text.split(",").map(s => s.trim()).filter(s => s)})}
                placeholder="Enter subjects (comma separated)"
              />
            ) : (
              <View style={styles.subjectsContainer}>
                {userProfile.subjects?.map((subject, index) => (
                  <View key={index} style={styles.subjectTag}>
                    <Text style={styles.subjectText}>{subject}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userProfile.rating || 0}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userProfile.studentsCount || 0}</Text>
              <Text style={styles.statLabel}>Students</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {userProfile.subjects?.length || 0}
              </Text>
              <Text style={styles.statLabel}>Subjects</Text>
            </View>
          </View>
        </View>

        {/* Escape Room Progress Section */}
        {!escapeRoomLoading && escapeRoomProgress && (
          <View style={styles.section}>
            <View style={styles.escapeRoomHeader}>
              <Ionicons name="game-controller" size={24} color="#673AB7" />
              <Text style={styles.sectionTitle}>Escape Room Challenge</Text>
            </View>
            
            {/* Points and Streak Display */}
            <View style={styles.pointsDisplay}>
              <View style={styles.pointsContainer}>
                <Ionicons name="star" size={32} color="#FFD700" />
                <View style={styles.pointsInfo}>
                  <Text style={styles.pointsNumber}>{escapeRoomProgress.totalPoints}</Text>
                  <Text style={styles.pointsLabel}>Total Points</Text>
                </View>
              </View>
              
              <View style={styles.streakContainer}>
                <Ionicons name="flash" size={32} color="#FF6B35" />
                <View style={styles.streakInfo}>
                  <Text style={styles.streakNumber}>{escapeRoomProgress.currentStreak || 0}</Text>
                  <Text style={styles.streakLabel}>Current Streak</Text>
                </View>
              </View>
            </View>
            
            {/* Max Streak Achievement */}
            {escapeRoomProgress.maxStreak > 0 && (
              <View style={styles.maxStreakContainer}>
                <Ionicons name="trophy" size={20} color="#FFD700" />
                <Text style={styles.maxStreakText}>
                  Best Streak: {escapeRoomProgress.maxStreak} levels
                </Text>
              </View>
            )}

            {/* Progress Bar */}
            <View style={styles.progressSection}>
              <Text style={styles.progressTitle}>Level Progress</Text>
              <View style={styles.progressInfo}>
                <Text style={styles.progressText}>
                  {escapeRoomProgress.completedLevels.length} / 5 Levels Complete
                </Text>
                <Text style={styles.progressPercentage}>
                  {Math.round((escapeRoomProgress.completedLevels.length / 5) * 100)}%
                </Text>
              </View>
              <Progress.Bar
                progress={(escapeRoomProgress.completedLevels.length / 5)}
                width={width - 64}
                height={12}
                color="#673AB7"
                unfilledColor="#E0E0E0"
                borderWidth={0}
                borderRadius={6}
                style={styles.progressBar}
              />
            </View>

            {/* Badges Section */}
            {escapeRoomProgress.badges && escapeRoomProgress.badges.length > 0 && (
              <View style={styles.badgesSection}>
                <Text style={styles.badgesTitle}>Earned Badges</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.badgesContainer}>
                    {escapeRoomProgress.badges.map((badge, index) => (
                      <View key={index} style={styles.badgeItem}>
                        <Ionicons name="trophy" size={24} color="#FFD700" />
                        <Text style={styles.badgeText}>{badge}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Current Level Info */}
            <View style={styles.currentLevelContainer}>
              <Text style={styles.currentLevelTitle}>Next Challenge</Text>
              <Text style={styles.currentLevelText}>
                {escapeRoomProgress.currentLevel <= 5 
                  ? `Level ${escapeRoomProgress.currentLevel} Available`
                  : 'All Levels Complete! 🎉'
                }
              </Text>
            </View>
          </View>
        )}

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <TouchableOpacity style={styles.saveButton} onPress={handlePasswordReset}>
            <Text style={styles.saveButtonText}>Send Password Reset Email</Text>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        {isEditing && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Liked Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Liked</Text>
          {likedLoading ? (
            <Text>Loading...</Text>
          ) : likedItems.length === 0 ? (
            <Text style={styles.emptyText}>No likes yet.</Text>
          ) : (
            <View>
              {likedItems.map((it) => (
                <View key={`${it.type}-${it.id}`} style={styles.resourceCard}>
                  <View style={styles.resourceRow}>
                    <Ionicons name={it.type === 'video' ? 'play-circle' : 'document'} size={20} color={it.type === 'video' ? '#FF0000' : '#007AFF'} />
                    <View style={styles.resourceDetails}>
                      <Text style={styles.resourceTitle}>{it.title}</Text>
                      <Text style={styles.resourceMeta}>{it.subject}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Commented Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Commented</Text>
          {commentedLoading ? (
            <Text>Loading...</Text>
          ) : commentedItems.length === 0 ? (
            <Text style={styles.emptyText}>No comments yet.</Text>
          ) : (
            <View>
              {commentedItems.map((it) => (
                <View key={`${it.type}-${it.id}`} style={styles.resourceCard}>
                  <View style={styles.resourceRow}>
                    <Ionicons name={it.type === 'video' ? 'play-circle' : 'document'} size={20} color={it.type === 'video' ? '#FF0000' : '#007AFF'} />
                    <View style={styles.resourceDetails}>
                      <Text style={styles.resourceTitle}>{it.title}</Text>
                      <Text style={styles.resourceMeta}>{it.subject}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ff3b30" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "white",
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: "#666",
    marginBottom: 8,
  },
  tutorBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E8",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tutorText: {
    fontSize: 14,
    color: "#4CAF50",
    marginLeft: 4,
    fontWeight: "500",
  },
  section: {
    backgroundColor: "white",
    marginBottom: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: "#333",
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 16,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fafafa",
  },
  levelContainer: {
    flexDirection: "row",
  },
  levelButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginHorizontal: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    alignItems: "center",
  },
  selectedLevel: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  levelText: {
    fontSize: 12,
    color: "#666",
  },
  selectedLevelText: {
    color: "white",
    fontWeight: "600",
  },
  subjectsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  subjectTag: {
    backgroundColor: "#f0f8ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  subjectText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007AFF",
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  actions: {
    padding: 16,
  },
  saveButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  emptyText: {
    color: "#666",
  },
  resourceCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  resourceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  resourceDetails: {
    marginLeft: 10,
    flex: 1,
  },
  resourceTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  resourceMeta: {
    fontSize: 12,
    color: "#007AFF",
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    margin: 16,
    backgroundColor: "white",
    borderRadius: 8,
  },
  logoutText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#ff3b30",
    fontWeight: "500",
  },
  escapeRoomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  pointsDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E5F5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    flex: 1,
    marginRight: 8,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    flex: 1,
    marginLeft: 8,
  },
  pointsInfo: {
    marginLeft: 12,
    alignItems: 'center',
  },
  streakInfo: {
    marginLeft: 12,
    alignItems: 'center',
  },
  pointsNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#673AB7',
  },
  streakNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  pointsLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  streakLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  maxStreakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFDE7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  maxStreakText: {
    fontSize: 14,
    color: '#F57C00',
    fontWeight: '600',
    marginLeft: 6,
  },
  progressSection: {
    marginBottom: 20,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#673AB7',
  },
  progressBar: {
    alignSelf: 'center',
  },
  badgesSection: {
    marginBottom: 16,
  },
  badgesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  badgesContainer: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  badgeItem: {
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: '#FFF9C4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
    minWidth: 80,
  },
  badgeText: {
    fontSize: 12,
    color: '#333',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  currentLevelContainer: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  currentLevelTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 4,
  },
  currentLevelText: {
    fontSize: 14,
    color: '#333',
  },
});
