import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import ContentDistributionChart from "../../components/admin/ContentDistributionChart";
import MonthlyUserGrowthChart from "../../components/admin/MonthlyUserGrowthChart";
import UserGrowthChart from "../../components/admin/UserGrowthChart";
import UserRoleChart from "../../components/admin/UserRoleChart";
import { db } from "../../firebase/firebaseConfig";

const { width: screenWidth } = Dimensions.get('window');
const isMobile = screenWidth < 768;

export default function OverviewScreen({ users: propUsers, tutors: propTutors, resources: propResources, videos: propVideos }) {
  const router = useRouter();
  const [localUsers, setLocalUsers] = useState([]);
  const [localTutors, setLocalTutors] = useState([]);
  const [localResources, setLocalResources] = useState([]);
  const [localVideos, setLocalVideos] = useState([]);
  
  const users = Array.isArray(propUsers) ? propUsers : (Array.isArray(localUsers) ? localUsers : []);
  const tutors = Array.isArray(propTutors) ? propTutors : (Array.isArray(localTutors) ? localTutors : []);
  const resources = Array.isArray(propResources) ? propResources : (Array.isArray(localResources) ? localResources : []);
  const videos = Array.isArray(propVideos) ? propVideos : (Array.isArray(localVideos) ? localVideos : []);

  const scrollY = useRef(new Animated.Value(300)).current;
  const opacity = useRef(new Animated.Value(0)).current;

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
    if (propUsers && propTutors && propResources && propVideos) {
      return;
    }
    
    const uUnsub = onSnapshot(collection(db, 'users'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLocalUsers(list);
      
      // Improved tutor filtering - check multiple properties
      const tutorsList = list.filter(u => {
        return !!u.isTutor || u.role === 'tutor' || u.isTutor === true;
      });
      
      setLocalTutors(tutorsList);
    });
    
    const rQ = query(collection(db, 'resources'), orderBy('uploadedAt', 'desc'));
    const rUnsub = onSnapshot(rQ, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLocalResources(list);
    });
    
    const vQ = query(collection(db, 'videos'), orderBy('uploadedAt', 'desc'));
    const vUnsub = onSnapshot(vQ, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLocalVideos(list);
    });
    
    return () => { 
      try { uUnsub(); } catch {} 
      try { rUnsub(); } catch {} 
      try { vUnsub(); } catch {} 
    };
  }, [propUsers, propTutors, propResources, propVideos]);

  const getFilteredUsers = () => {
    if (!Array.isArray(users)) return [];
    // Return all users instead of filtering out falsy values
    return users;
  };

  const getStudentUsers = () => {
    if (!Array.isArray(users)) return [];
    // Return only non-tutor users
    return users.filter(u => !u.isTutor);
  };

  const getFilteredUsersCount = () => {
    return getFilteredUsers().length;
  };

  const getStudentUsersCount = () => {
    return getStudentUsers().length;
  };

  const calculateEngagementRate = () => {
    const totalUsers = getFilteredUsersCount();
    const activeUsers = getFilteredUsers().filter(u => {
      const lastSeen = u.lastLogin?.toDate?.() || new Date(0);
      const daysSinceLastSeen = (new Date() - lastSeen) / (1000 * 60 * 60 * 24);
      return daysSinceLastSeen <= 7;
    }).length;
    
    return totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
  };

  const calculateContentQuality = () => {
    const allContent = [...resources, ...videos];
    const totalEngagement = allContent.reduce((sum, item) => sum + (item.views || 0) + (item.likes || 0) * 2, 0);
    return allContent.length > 0 ? totalEngagement / allContent.length : 0;
  };

  const calculateContentEngagementRate = () => {
    const allContent = [...(Array.isArray(resources) ? resources : []), ...(Array.isArray(videos) ? videos : [])];
    if (allContent.length === 0) return 0;
    
    const viewedContent = allContent.filter(item => (item.views || 0) > 0);
    return (viewedContent.length / allContent.length) * 100;
  };

  const getMostRecentDate = (items, dateField) => {
    if (!Array.isArray(items) || items.length === 0) {
      return new Date();
    }
    
    const validItems = items.filter(item => item[dateField]);
    
    if (validItems.length === 0) {
      return new Date();
    }
    
    const mostRecent = validItems.reduce((latest, item) => {
      const itemDate = item[dateField]?.toDate?.() || item[dateField] || new Date(0);
      return itemDate > latest ? itemDate : latest;
    }, new Date(0));
    
    return mostRecent;
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  };

  const filteredUsers = getFilteredUsers();
  const filteredUsersCount = getFilteredUsersCount();
  const studentUsers = getStudentUsers();
  const studentUsersCount = getStudentUsersCount();
  
  // Debug the users being passed to the chart
  console.log('Overview users data:', {
    propUsersLength: propUsers ? propUsers.length : 0,
    localUsersLength: localUsers ? localUsers.length : 0,
    filteredUsersLength: filteredUsers ? filteredUsers.length : 0,
    studentUsersCount: studentUsersCount,
    sampleUsers: filteredUsers ? filteredUsers.slice(0, 3) : []
  });

  // Calculate metrics
  const contentEngagement = calculateContentEngagementRate();
  const contentQuality = calculateContentQuality();
  const likeRate = (([
    ...Array.isArray(resources) ? resources : [], 
    ...Array.isArray(videos) ? videos : []
  ].reduce((sum, item) => sum + (item.likes || 0), 0) / 
  Math.max([
    ...Array.isArray(resources) ? resources : [], 
    ...Array.isArray(videos) ? videos : []
  ].reduce((sum, item) => sum + (item.views || 0), 0), 1)) * 100);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        
      </View>

      <Animated.View
        style={[
          styles.contentCard,
          {
            opacity,
            transform: [{ translateY: scrollY }],
            // Removed marginTop from here
          },
        ]}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={{ marginTop: 3 }} // Add margin top only to the scroll view
        >
          {/* Summary Cards Grid */}
          <View style={styles.overviewGrid}>
            {/* Total Users Card */}
            <Animated.View style={[styles.overviewCard, styles.overviewCardPrimary, { opacity }]}>
              <View style={styles.cardTopSection}>
                <View style={styles.illustrationCircle}>
                  <Ionicons name="people" size={isMobile ? 24 : 28} color={COLORS.primary} />
                  <View style={[styles.decorativeElement1, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]} />
                  <View style={[styles.decorativeElement2, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]} />
                </View>
                <TouchableOpacity 
                  style={styles.arrowButton}
                  onPress={() => router.push('/admin/users')}
                >
                  <Ionicons name="arrow-forward" size={16} color={COLORS.textMain} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.cardTitle}>Total Students</Text>
              
              <View style={styles.dateContainer}>
                <Ionicons name="calendar-outline" size={11} color={COLORS.textSecondary} />
                <Text style={styles.dateText}>{formatDate(getMostRecentDate(studentUsers, 'createdAt'))}</Text>
              </View>
              
              <Text style={styles.cardDescription}>
                Building a thriving community with {studentUsersCount} active students
              </Text>
              
              <View style={styles.cardFooter}>
                <View style={styles.avatarGroup}>
                  {studentUsers.slice(0, 3).map((user, idx) => (
                    <View key={user.id} style={[styles.avatar, { marginLeft: idx > 0 ? -8 : 0, zIndex: 10 - idx }]}>
                      {user.profileImage ? (
                        <Image 
                          source={{ uri: user.profileImage }} 
                          style={styles.profileImage}
                        />
                      ) : (
                        <Text style={styles.avatarText}>
                          {(user.fullName || user.name || 'A')[0].toUpperCase()}
                        </Text>
                      )}
                    </View>
                  ))}
                  {studentUsersCount > 3 && (
                    <View style={[styles.avatar, styles.avatarMore, { marginLeft: -8, zIndex: 6 }]}>
                      <Text style={styles.avatarText}>+{studentUsersCount - 3}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBarTrack}>
                    <View style={[styles.progressBarFill, { width: '65%' }]} />
                  </View>
                  <Text style={styles.progressText}>{studentUsersCount}</Text>
                </View>
              </View>
            </Animated.View>
            
            {/* Active Tutors Card */}
            <Animated.View style={[styles.overviewCard, styles.overviewCardSuccess, { opacity }]}>
              <View style={styles.cardTopSection}>
                <View style={styles.illustrationCircle}>
                  <Ionicons name="school" size={isMobile ? 24 : 28} color={COLORS.secondary} />
                  <View style={[styles.decorativeElement1, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]} />
                  <View style={[styles.decorativeElement2, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]} />
                </View>
                <TouchableOpacity 
                  style={styles.arrowButton}
                  onPress={() => router.push('/admin/tutors')}
                >
                  <Ionicons name="arrow-forward" size={16} color={COLORS.textMain} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.cardTitle}>Active Tutors</Text>
              
              <View style={styles.dateContainer}>
                <Ionicons name="calendar-outline" size={11} color={COLORS.textSecondary} />
                <Text style={styles.dateText}>{formatDate(getMostRecentDate(tutors, 'createdAt'))}</Text>
              </View>
              
              <Text style={styles.cardDescription}>
                {Array.isArray(tutors) ? tutors.length : 0} dedicated educators creating quality content
              </Text>
              
              <View style={styles.cardFooter}>
                <View style={styles.avatarGroup}>
                  {Array.isArray(tutors) && tutors.slice(0, 3).map((tutor, idx) => (
                    <View key={tutor.id} style={[styles.avatar, styles.avatarPurple, { marginLeft: idx > 0 ? -8 : 0, zIndex: 10 - idx }]}>
                      {tutor.profileImage ? (
                        <Image 
                          source={{ uri: tutor.profileImage }} 
                          style={styles.profileImage}
                        />
                      ) : (
                        <Text style={styles.avatarText}>
                          {(tutor.fullName || tutor.name || 'T')[0].toUpperCase()}
                        </Text>
                      )}
                    </View>
                  ))}
                  {Array.isArray(tutors) && tutors.length > 3 && (
                    <View style={[styles.avatar, styles.avatarMore, { marginLeft: -8, zIndex: 6 }]}>
                      <Text style={styles.avatarText}>+{tutors.length - 3}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBarTrack}>
                    <View style={[styles.progressBarFill, { width: '85%', backgroundColor: COLORS.secondary }]} />
                  </View>
                  <Text style={styles.progressText}>{Array.isArray(tutors) ? tutors.length : 0}</Text>
                </View>
              </View>
            </Animated.View>
            
            {/* Resources Card */}
            <Animated.View style={[styles.overviewCard, styles.overviewCardWarning, { opacity }]}>
              <View style={styles.cardTopSection}>
                <View style={styles.illustrationCircle}>
                  <Ionicons name="document-text" size={isMobile ? 24 : 28} color={COLORS.accent} />
                  <View style={[styles.decorativeElement1, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]} />
                  <View style={[styles.decorativeElement2, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]} />
                </View>
                <TouchableOpacity 
                  style={styles.arrowButton}
                  onPress={() => router.push('/admin/resources')}
                >
                  <Ionicons name="arrow-forward" size={16} color={COLORS.textMain} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.cardTitle}>Resources</Text>
              
              <View style={styles.dateContainer}>
                <Ionicons name="calendar-outline" size={11} color={COLORS.textSecondary} />
                <Text style={styles.dateText}>{formatDate(getMostRecentDate(resources, 'uploadedAt'))}</Text>
              </View>
              
              <Text style={styles.cardDescription}>
                {Array.isArray(resources) ? resources.length : 0} documents with {Array.isArray(resources) ? resources.reduce((sum, r) => sum + (r.views || 0), 0) : 0} views
              </Text>
              
              <View style={styles.cardFooter}>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Ionicons name="eye" size={12} color={COLORS.accent} />
                    <Text style={styles.statText}>{Array.isArray(resources) ? resources.reduce((sum, r) => sum + (r.views || 0), 0) : 0}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="heart" size={12} color={COLORS.error} />
                    <Text style={styles.statText}>{Array.isArray(resources) ? resources.reduce((sum, r) => sum + (r.likes || 0), 0) : 0}</Text>
                  </View>
                </View>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBarTrack}>
                    <View style={[styles.progressBarFill, { width: '70%', backgroundColor: COLORS.accent }]} />
                  </View>
                  <Text style={styles.progressText}>{Array.isArray(resources) ? resources.length : 0}</Text>
                </View>
              </View>
            </Animated.View>
            
            {/* Videos Card */}
            <Animated.View style={[styles.overviewCard, styles.overviewCardInfo, { opacity }]}>
              <View style={styles.cardTopSection}>
                <View style={styles.illustrationCircle}>
                  <Ionicons name="videocam" size={isMobile ? 24 : 28} color={COLORS.success} />
                  <View style={[styles.decorativeElement1, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]} />
                  <View style={[styles.decorativeElement2, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]} />
                </View>
                <TouchableOpacity 
                  style={styles.arrowButton}
                  onPress={() => router.push('/admin/videos')}
                >
                  <Ionicons name="arrow-forward" size={16} color={COLORS.textMain} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.cardTitle}>Videos</Text>
              
              <View style={styles.dateContainer}>
                <Ionicons name="calendar-outline" size={11} color={COLORS.textSecondary} />
                <Text style={styles.dateText}>{formatDate(getMostRecentDate(videos, 'uploadedAt'))}</Text>
              </View>
              
              <Text style={styles.cardDescription}>
                {Array.isArray(videos) ? videos.length : 0} videos reaching {Array.isArray(videos) ? videos.reduce((sum, v) => sum + (v.views || 0), 0) : 0} learners
              </Text>
              
              <View style={styles.cardFooter}>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Ionicons name="eye" size={12} color={COLORS.success} />
                    <Text style={styles.statText}>{Array.isArray(videos) ? videos.reduce((sum, v) => sum + (v.views || 0), 0) : 0}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="heart" size={12} color={COLORS.error} />
                    <Text style={styles.statText}>{Array.isArray(videos) ? videos.reduce((sum, v) => sum + (v.likes || 0), 0) : 0}</Text>
                  </View>
                </View>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBarTrack}>
                    <View style={[styles.progressBarFill, { width: '90%', backgroundColor: COLORS.success }]} />
                  </View>
                  <Text style={styles.progressText}>{Array.isArray(videos) ? videos.length : 0}</Text>
                </View>
              </View>
            </Animated.View>
          </View>

          {/* Platform Health Stats - NEW DESIGN */}
          <View style={styles.performanceHealthContainer}>
            <Text style={styles.performanceHealthTitle}>Perform Health</Text>
            
            <View style={styles.healthMetricsContainer}>
              {/* Content Engagement */}
              <View style={styles.healthMetricItem}>
                <View style={styles.healthMetricLeft}>
                  <View style={[styles.healthIconBox, { backgroundColor: '#E8EAF6' }]}>
                    <Ionicons name="create-outline" size={20} color="#5C6BC0" />
                  </View>
                  <Text style={styles.healthMetricLabel}>Content engagement</Text>
                </View>
                <Text style={styles.healthMetricValue}>{contentEngagement.toFixed(1)}%</Text>
              </View>

              {/* Content Quality */}
              <View style={styles.healthMetricItem}>
                <View style={styles.healthMetricLeft}>
                  <View style={[styles.healthIconBox, { backgroundColor: '#F3E5F5' }]}>
                    <Ionicons name="book-outline" size={20} color="#9C27B0" />
                  </View>
                  <Text style={styles.healthMetricLabel}>Content Quality</Text>
                </View>
                <Text style={styles.healthMetricValue}>{contentQuality.toFixed(0)}</Text>
              </View>

              {/* Like Rate */}
              <View style={styles.healthMetricItem}>
                <View style={styles.healthMetricLeft}>
                  <View style={[styles.healthIconBox, { backgroundColor: '#E8EAF6' }]}>
                    <Ionicons name="layers-outline" size={20} color="#5C6BC0" />
                  </View>
                  <Text style={styles.healthMetricLabel}>Like Rate</Text>
                </View>
                <Text style={styles.healthMetricValue}>{likeRate.toFixed(0)}%</Text>
              </View>
            </View>
          </View>

          {/* Charts Section */}
          <View style={styles.chartsSection}>
            
            {/* Monthly User Growth Chart */}
            <MonthlyUserGrowthChart users={users} tutors={tutors} />
            
            {/* User Growth Chart */}
            <View style={styles.chartContainer}>
              <UserGrowthChart users={users} />
            </View>
            
            {/* Content Distribution Chart */}
            <View style={styles.chartContainer}>
              <ContentDistributionChart resources={resources} videos={videos} />
            </View>
            
            {/* User Role Chart */}
            <View style={styles.chartContainer}>
              <View style={styles.chartHeader}>
                <Ionicons name="people-circle-outline" size={20} color="#8B5CF6" />
                <Text style={styles.chartTitle}>User Roles</Text>
              </View>
              <UserRoleChart users={users} tutors={tutors} />
            </View>
          </View>
        </ScrollView>
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
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  contentCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    marginTop: -20,
    marginHorizontal: isMobile ? 12 : 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -5 },
    elevation: 10,
  },
  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: isMobile ? 12 : 16,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: isMobile ? 10 : 12,
  },
  overviewCard: {
    width: isMobile ? '48%' : '48%',
    backgroundColor: COLORS.card,
    borderRadius: isMobile ? 20 : 24,
    padding: isMobile ? 14 : 18,
    marginBottom: isMobile ? 0 : 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  overviewCardPrimary: {
    backgroundColor: '#FEF3E2',
  },
  overviewCardSuccess: {
    backgroundColor: '#F0E7FF',
  },
  overviewCardWarning: {
    backgroundColor: '#FFF4E6',
  },
  overviewCardInfo: {
    backgroundColor: '#E8F5E9',
  },
  cardTopSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: isMobile ? 12 : 16,
  },
  illustrationCircle: {
    width: isMobile ? 60 : 80,
    height: isMobile ? 60 : 80,
    borderRadius: isMobile ? 30 : 40,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  decorativeElement1: {
    position: 'absolute',
    width: isMobile ? 16 : 20,
    height: isMobile ? 16 : 20,
    borderRadius: isMobile ? 8 : 10,
    top: isMobile ? 8 : 10,
    right: isMobile ? 12 : 15,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  decorativeElement2: {
    position: 'absolute',
    width: isMobile ? 12 : 15,
    height: isMobile ? 12 : 15,
    borderRadius: isMobile ? 6 : 7.5,
    bottom: isMobile ? 12 : 15,
    left: isMobile ? 8 : 10,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
 arrowButton: {
    width: isMobile ? 32 : 36,
    height: isMobile ? 32 : 36,
    borderRadius: isMobile ? 16 : 18,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#000000',
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    transform: [{ rotate: '-45deg' }],
  },
  cardTitle: {
    fontSize: isMobile ? 10 : 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardMainTitle: {
    fontSize: isMobile ? 15 : 18,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: isMobile ? 6 : 8,
    lineHeight: isMobile ? 20 : 24,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: isMobile ? 8 : 10,
  },
  dateText: {
    fontSize: isMobile ? 10 : 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  cardDescription: {
    fontSize: isMobile ? 11 : 12,
    color: COLORS.textSecondary,
    lineHeight: isMobile ? 16 : 18,
    marginBottom: isMobile ? 12 : 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: isMobile ? 10 : 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
  },
  avatarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: isMobile ? 28 : 32,
    height: isMobile ? 28 : 32,
    borderRadius: isMobile ? 14 : 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: isMobile ? 14 : 16,
  },
  avatarPurple: {
    backgroundColor: COLORS.secondary,
  },
  avatarText: {
    fontSize: isMobile ? 10 : 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatarMore: {
    backgroundColor: COLORS.textSecondary,
  },
  progressContainer: {
    alignItems: 'flex-end',
  },
  progressBarTrack: {
    width: isMobile ? 50 : 60,
    height: isMobile ? 5 : 6,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: isMobile ? 10 : 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: isMobile ? 8 : 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    fontSize: isMobile ? 10 : 12,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  
  // NEW PERFORMANCE HEALTH STYLES
  performanceHealthContainer: {
    backgroundColor: '#FAFBFC',
    borderRadius: 16,
    padding: isMobile ? 18 : 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  performanceHealthTitle: {
    fontSize: isMobile ? 16 : 18,
    fontWeight: '700',
    color: '#7B68EE',
    marginBottom: 20,
    letterSpacing: 0.3,
  },
  healthMetricsContainer: {
    gap: 16,
  },
  healthMetricItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  healthMetricLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  healthIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthMetricLabel: {
    fontSize: isMobile ? 13 : 14,
    fontWeight: '500',
    color: '#9B9BA5',
    flex: 1,
  },
  healthMetricValue: {
    fontSize: isMobile ? 15 : 16,
    fontWeight: '600',
    color: '#9B9BA5',
    minWidth: 60,
    textAlign: 'right',
  },
  
  sectionTitle: {
    fontSize: isMobile ? 15 : 16,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 16,
  },
  chartsSection: {
    marginBottom: 24,
  },
  chartContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: isMobile ? 12 : 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  chartTitle: {
    fontSize: isMobile ? 13 : 14,
    fontWeight: '700',
    color: COLORS.textMain,
  },
});