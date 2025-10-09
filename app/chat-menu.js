import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ImageBackground, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import GroupChat from "../components/GroupChat";
import StudentGroupChat from "../components/StudentGroupChat";
import { auth, db } from "../firebase/firebaseConfig";

export default function ChatMenuScreen() {
  const router = useRouter();
  const [isTutor, setIsTutor] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [groupChatVisible, setGroupChatVisible] = useState(false);
  const [studentGroupChatVisible, setStudentGroupChatVisible] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
          const data = snap.data();
          setIsTutor(!!data.isTutor);
          setIsAdmin(!!data.isAdmin || /\+admin/.test(auth.currentUser?.email || ""));
          setUserProfile(data);
        }
      } catch {}
    };
    run();
  }, []);

  return (
    <ImageBackground 
      source={require('../assets/images/chatImg.png')} 
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Chat Menu</Text>
        </View>

        <View style={styles.menuList}>
          {/* Group Chats */}
          <TouchableOpacity 
            style={styles.item} 
            onPress={() => {
              if (userProfile?.isTutor) {
                setGroupChatVisible(true);
              } else {
                setStudentGroupChatVisible(true);
              }
            }}
          >
            <View style={styles.itemLeft}>
              <Ionicons name="chatbubbles-outline" size={24} color="#007AFF" />
              <Text style={styles.itemText}>Group Chats</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          {/* Global Chat */}
          <TouchableOpacity style={styles.item} onPress={() => router.push("/global-chat")}>
            <View style={styles.itemLeft}>
              <Ionicons name="globe-outline" size={24} color="#34C759" />
              <Text style={styles.itemText}>Global Chat</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          {/* AI Chatbot */}
          <TouchableOpacity style={styles.item} onPress={() => router.push("/ai-chatbot")}>
            <View style={styles.itemLeft}>
              <Ionicons name="sparkles-outline" size={24} color="#7C4DFF" />
              <Text style={styles.itemText}>AI Chatbot</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          {/* Help Desk */}
          <TouchableOpacity style={styles.item} onPress={() => router.push("/helpdesk")}>
            <View style={styles.itemLeft}>
              <Ionicons name="help-buoy-outline" size={24} color="#FF9500" />
              <Text style={styles.itemText}>Help Desk</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>



          {isAdmin && (
            <TouchableOpacity style={styles.item} onPress={() => router.push("/helpdesk-admin")}>
              <View style={styles.itemLeft}>
                <Ionicons name="shield-checkmark-outline" size={24} color="#5856D6" />
                <Text style={styles.itemText}>Helpdesk Admin</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Group Chat Modal for Tutors */}
        <GroupChat 
          visible={groupChatVisible} 
          onClose={() => setGroupChatVisible(false)} 
          tutorId={auth.currentUser?.uid}
        />

        {/* Student Group Chat Modal */}
        <StudentGroupChat 
          visible={studentGroupChatVisible} 
          onClose={() => setStudentGroupChatVisible(false)} 
          studentId={auth.currentUser?.uid}
        />
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: { 
    flex: 1, 
    backgroundColor: "rgba(245, 245, 245, 0.85)" 
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  backButton: {
    marginRight: 16,
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#111" },
  menuList: { 
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  item: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemLeft: { flexDirection: "row", alignItems: "center" },
  itemText: { marginLeft: 10, fontSize: 16, color: "#111" },
});