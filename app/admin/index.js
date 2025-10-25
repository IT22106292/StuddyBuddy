import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { deleteApp, initializeApp } from "firebase/app";
import { getAuth, signOut, createUserWithEmailAndPassword } from "firebase/auth";
import { collection, getDocs, limit, onSnapshot, orderBy, query, where, setDoc, doc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Alert, Animated, Dimensions, Easing, Modal, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import app, { db } from "../../firebase/firebaseConfig";
import FAQAutomationScreen from "./faq-automation";
import OverviewScreen from "./overview";
import ReportsScreen from "./reports";
import RequestsScreen from "./requests";
import ResourcesScreen from "./resources";
import TutorsScreen from "./tutors";
import UsersScreen from "./users";
import VideosScreen from "./videos";

const { width: screenWidth } = Dimensions.get('window');
const isMobile = screenWidth < 768;

export default function AdminDashboardScreen() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [resources, setResources] = useState([]);
  const [videos, setVideos] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarAnim = new Animated.Value(0);
  const [closeButtonRotation] = useState(new Animated.Value(0));
  const [tabAnimations] = useState({
    overview: new Animated.Value(0),
    users: new Animated.Value(0),
    tutors: new Animated.Value(0),
    resources: new Animated.Value(0),
    videos: new Animated.Value(0),
  });

  // Admin Registration State
  const [registerAdminVisible, setRegisterAdminVisible] = useState(false);
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regPosition, setRegPosition] = useState("");
  const [regPhone, setRegPhone] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const uid = getAuth().currentUser?.uid;
        if (!uid) { setIsAdmin(false); return; }
        const snap = await getDocs(query(collection(db, 'users'), where('__name__','==', uid), limit(1)));
        if (!snap.empty) {
          const data = snap.docs[0].data() || {};
          setIsAdmin(!!data.isAdmin);
          setAdminName(data.name || data.fullName || 'Admin');
        } else {
          setIsAdmin(false);
        }
      } catch { 
        setIsAdmin(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    
    // Users
    const uUnsub = onSnapshot(collection(db, 'users'), async (snap) => {
      const list = snap.docs.map(d => {
        const data = d.data();
        console.log(`User ${d.id} profile image URL:`, data.profileImage);
        return { id: d.id, ...data };
      });
      console.log("Users data updated:", list);
      setUsers(list);
      setTutors(list.filter(u => !!u.isTutor));
      
      for (const user of list) {
        if (user.profileImage && user.profileImage.startsWith('blob:')) {
          console.warn(`User ${user.id} has a blob URL which needs to be fixed:`, user.profileImage);
        }
      }
    });
    
    // Resources
    const rQ = query(collection(db, 'resources'), orderBy('uploadedAt', 'desc'), limit(100));
    const rUnsub = onSnapshot(rQ, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setResources(list);
    });
    
    // Videos
    const vQ = query(collection(db, 'videos'), orderBy('uploadedAt', 'desc'), limit(200));
    const vUnsub = onSnapshot(vQ, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setVideos(list);
    });
    
    return () => { 
      try { uUnsub(); } catch {} 
      try { rUnsub(); } catch {} 
      try { vUnsub(); } catch {} 
    };
  }, [isAdmin]);

  // Animate sidebar
  useEffect(() => {
    Animated.timing(sidebarAnim, {
      toValue: sidebarOpen ? 1 : 0,
      duration: 300,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, [sidebarOpen]);

  // Handle close button with rotation animation
  const handleCloseSidebar = () => {
    Animated.timing(closeButtonRotation, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setSidebarOpen(false);
      closeButtonRotation.setValue(0);
    });
  };

  // Animate tab changes
  useEffect(() => {
    Object.keys(tabAnimations).forEach((tab) => {
      Animated.spring(tabAnimations[tab], {
        toValue: activeTab === tab ? 1 : 0,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }).start();
    });
  }, [activeTab]);

  // Admin Registration Function
  const registerNewAdmin = async () => {
    try {
      const email = regEmail.trim().toLowerCase();
      const password = regPassword;
      const name = regName.trim();
      const position = regPosition.trim();
      const phone = regPhone.trim();
      
      if (!email || !email.includes('@')) { Alert.alert('Invalid', 'Enter a valid email'); return; }
      if (!password || password.length < 6) { Alert.alert('Invalid', 'Password must be at least 6 characters'); return; }
      if (!name) { Alert.alert('Required', 'Enter name'); return; }
      if (!position) { Alert.alert('Required', 'Enter position'); return; }
      if (!phone) { Alert.alert('Required', 'Enter phone number'); return; }

      const temp = initializeApp(app.options, 'admin-create');
      const tempAuth = getAuth(temp);
      const cred = await createUserWithEmailAndPassword(tempAuth, email, password);
      const uid = cred.user.uid;
      
      await setDoc(doc(db, 'users', uid), {
        email, name, position, phone,
        isAdmin: true,
        isTutor: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }, { merge: true });
      
      try { await tempAuth.signOut(); } catch {}
      try { await deleteApp(temp); } catch {}
      
      Alert.alert('Success', 'Admin account created');
      setRegisterAdminVisible(false);
      setRegEmail(""); setRegPassword(""); setRegName(""); setRegPosition(""); setRegPhone("");
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to create admin');
    }
  };

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => { try { if (router.canGoBack?.()) { router.back(); } else { router.replace('/home'); } } catch { try { router.push('/home'); } catch {} } }}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Admin Dashboard</Text>
            <Text style={styles.subtitle}>Manage platform</Text>
          </View>
          <TouchableOpacity onPress={async () => { try { await signOut(getAuth()); router.replace('/signin'); } catch { router.replace('/signin'); } }} style={{ marginLeft: 12 }}>
            <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Define bottom navigation items
  const bottomNavItems = [
    { id: 'overview', icon: 'home-outline', label: 'Home' },
    { id: 'users', icon: 'people-outline', label: 'Users' },
    { id: 'tutors', icon: 'school-outline', label: 'Tutors' },
    { id: 'resources', icon: 'document-text-outline', label: 'Resources' },
    { id: 'videos', icon: 'videocam-outline', label: 'Videos' },
  ];

  // Define sidebar items with minimal icons
  const sidebarItems = [
    { id: 'reports', icon: 'stats-chart', label: 'Reports' },
    { id: 'requests', icon: 'mail-unread', label: 'Requests' },
    { id: 'faq-automation', icon: 'chatbubbles', label: 'FAQ' },
  ];

  // Calculate sidebar position and scale
  const sidebarPosition = sidebarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-116, 0],
  });

  const sidebarOpacity = sidebarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const sidebarScale = sidebarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1],
  });

  // Calculate close button rotation
  const closeRotation = closeButtonRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => { try { if (router.canGoBack?.()) { router.back(); } else { router.replace('/home'); } } catch { try { router.push('/home'); } catch {} } }}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{adminName}</Text>
        </View>

        {/* Admin Register Button */}
        <TouchableOpacity 
          style={styles.adminRegisterButton} 
          onPress={() => setRegisterAdminVisible(true)}
        >
          <Ionicons name="person-add" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Sidebar toggle button */}
        {!sidebarOpen && (
          <TouchableOpacity 
            style={styles.sidebarToggle} 
            onPress={() => setSidebarOpen(true)}
          >
            <Ionicons 
              name="grid-outline" 
              size={24} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          onPress={async () => { 
            try { await signOut(getAuth()); router.replace('/signin'); } 
            catch { router.replace('/signin'); } 
          }} 
          style={{ marginLeft: 12 }}
        >
          <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Main Content Area with Sidebar */}
      <View style={styles.mainContent}>
        {/* Minimal Sidebar */}
        <Animated.View 
          style={[
            styles.sidebar, 
            { 
              transform: [
                { translateX: sidebarPosition },
                { scale: sidebarScale }
              ],
              opacity: sidebarOpacity,
            }
          ]}
        >
          {/* Close button */}
          {sidebarOpen && (
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={handleCloseSidebar}
              activeOpacity={0.7}
            >
              <Animated.View style={{ transform: [{ rotate: closeRotation }] }}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </Animated.View>
            </TouchableOpacity>
          )}

          <View style={styles.sidebarCard}>
            {/* Sidebar Header */}
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarHeaderText}>TOOLS</Text>
            </View>
            
            {/* Divider */}
            <View style={styles.sidebarDivider} />
            
            {/* Sidebar Content */}
            <View style={styles.sidebarContent}>
              {sidebarItems.map((item, index) => {
                const isActive = activeTab === item.id;
                return (
                  <View key={item.id} style={styles.sidebarItemWrapper}>
                    <TouchableOpacity
                      style={styles.sidebarItem}
                      onPress={() => {
                        setActiveTab(item.id);
                        setSidebarOpen(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.sidebarIconContainer,
                        isActive && styles.activeSidebarIcon
                      ]}>
                        <Ionicons
                          name={item.icon}
                          size={22}
                          color={isActive ? "#FFFFFF" : "#64748B"}
                        />
                      </View>
                      <Text style={[
                        styles.sidebarLabel,
                        isActive && styles.activeSidebarLabel
                      ]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        </Animated.View>

        {/* Overlay for closing sidebar when tapping outside */}
        {sidebarOpen && (
          <TouchableOpacity 
            style={styles.overlay} 
            onPress={() => setSidebarOpen(false)} 
            activeOpacity={1}
          />
        )}

        {/* Main Content */}
        <View style={styles.content}>
          {activeTab === 'overview' && <OverviewScreen users={users.filter(u => !u.isAdmin)} tutors={tutors} resources={resources} videos={videos} />}
          {activeTab === 'reports' && <ReportsScreen users={users} />}
          {activeTab === 'requests' && <RequestsScreen />}
          {activeTab === 'users' && <UsersScreen users={users.filter(u => !u.isAdmin && !u.isTutor)} onBackPress={() => setActiveTab('overview')} />}
          {activeTab === 'tutors' && <TutorsScreen tutors={tutors} resources={resources} videos={videos} />}
          {activeTab === 'resources' && <ResourcesScreen resources={resources} />}
          {activeTab === 'videos' && <VideosScreen videos={videos} />}
          {activeTab === 'faq-automation' && <FAQAutomationScreen />}
        </View>
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        {bottomNavItems.map((item) => {
          const isActive = activeTab === item.id;
          const scale = tabAnimations[item.id].interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1.05],
          });
          const translateY = tabAnimations[item.id].interpolate({
            inputRange: [0, 1],
            outputRange: [0, -8],
          });
          
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.navItem}
              onPress={() => setActiveTab(item.id)}
              activeOpacity={0.7}
            >
              <Animated.View
                style={[
                  styles.navIconContainer,
                  isActive && styles.activeCircle,
                  {
                    transform: [{ scale }, { translateY }],
                  },
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={isActive ? 26 : 24}
                  color={isActive ? "#FFFFFF" : "#94A3B8"}
                />
              </Animated.View>
              <Text style={[styles.navLabel, isActive && styles.activeNavLabel]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Admin Register Modal */}
      <Modal visible={registerAdminVisible} transparent onRequestClose={() => setRegisterAdminVisible(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Register New Admin</Text>
            <TextInput 
              placeholder="Full name" 
              value={regName} 
              onChangeText={setRegName} 
              style={styles.input} 
            />
            <TextInput 
              placeholder="Position" 
              value={regPosition} 
              onChangeText={setRegPosition} 
              style={styles.input} 
            />
            <TextInput 
              placeholder="Phone number" 
              value={regPhone} 
              onChangeText={setRegPhone} 
              style={styles.input} 
              keyboardType="phone-pad" 
            />
            <TextInput 
              placeholder="Email" 
              value={regEmail} 
              onChangeText={setRegEmail} 
              style={styles.input} 
              autoCapitalize="none" 
              keyboardType="email-address" 
            />
            <TextInput 
              placeholder="Password (min 6 chars)" 
              value={regPassword} 
              onChangeText={setRegPassword} 
              style={styles.input} 
              secureTextEntry 
            />
            <View style={styles.modalActions}>
              <TouchableOpacity 
                onPress={() => setRegisterAdminVisible(false)} 
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={registerNewAdmin} 
                style={styles.modalSubmitBtn}
              >
                <Text style={styles.modalSubmitText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#F1F5F9",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: "#3B82F6",
    zIndex: 10,
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
  headerContent: {
    flex: 1,
  },
  title: { 
    fontSize: 24, 
    fontWeight: "800",
    color: "#FFFFFF",
  },
  subtitle: { 
    fontSize: 14, 
    color: "#E5E7EB", 
    marginTop: 4,
  },
  adminRegisterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  sidebarToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  warn: { 
    color: "#EF4444", 
    paddingHorizontal: 16, 
    marginTop: 16,
    fontSize: 14,
    fontWeight: "500",
  },
  mainContent: {
    flex: 1,
    position: 'relative',
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 72,
    zIndex: 100,
    paddingVertical: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: -12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#3B82F6",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
    zIndex: 110,
  },
  sidebarCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopRightRadius: 32,
    borderBottomRightRadius: 32,
    marginLeft: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 4, height: 0 },
    elevation: 8,
    overflow: 'visible',
    borderRightWidth: 1,
    borderRightColor: 'rgba(59, 130, 246, 0.1)',
  },
  sidebarHeader: {
    paddingHorizontal: 8,
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  sidebarHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  sidebarDivider: {
    height: 2,
    width: 24,
    backgroundColor: '#3B82F6',
    alignSelf: 'center',
    marginBottom: 16,
    borderRadius: 1,
  },
  sidebarContent: {
    flex: 1,
    paddingTop: 8,
    paddingBottom: 12,
    alignItems: 'center',
    position: 'relative',
  },
  sidebarItemWrapper: {
    alignItems: 'center',
    width: '100%',
    marginVertical: 4,
  },
  sidebarItem: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  sidebarIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    marginBottom: 4,
  },
  activeSidebarIcon: {
    backgroundColor: '#3B82F6',
    shadowColor: "#3B82F6",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  sidebarLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  activeSidebarLabel: {
    color: '#3B82F6',
    fontWeight: '700',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 90,
  },
  content: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 64, 175, 0.95)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: isMobile ? 25 : 15,
    paddingTop: 16,
    height: isMobile ? 90 : 80,
    shadowColor: "#1E40AF",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 25,
    borderTopWidth: 1,
    borderTopColor: 'rgba(59, 130, 246, 0.3)',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  navIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  activeCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#3B82F6',
    shadowColor: '#60A5FA',
    shadowOpacity: 0.8,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 15,
    borderWidth: 2,
    borderColor: 'rgba(147, 197, 253, 0.3)',
  },
  navLabel: {
    fontSize: 10,
    color: '#93C5FD',
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  activeNavLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  modalWrap: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  modalCancelText: {
    color: "#6B7280",
    fontWeight: "600",
    fontSize: 14,
  },
  modalSubmitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: "#3B82F6",
  },
  modalSubmitText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});