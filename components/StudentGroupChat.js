import { Ionicons } from '@expo/vector-icons';
import {
    addDoc,
    collection,
    doc,
    getDoc,
    limit,
    onSnapshot,
    query,
    serverTimestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { auth, db } from '../firebase/firebaseConfig';

export default function StudentGroupChat({ visible, onClose, studentId }) {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);

  useEffect(() => {
    if (visible && studentId) {
      fetchStudentGroups();
    }
  }, [visible, studentId]);

  useEffect(() => {
    if (selectedGroup) {
      fetchMessages();
      fetchGroupMembers(selectedGroup.id);
    }
  }, [selectedGroup]);

  const fetchStudentGroups = async () => {
    try {
      const groupsQuery = query(
        collection(db, 'groupChats'),
        where('studentIds', 'array-contains', studentId)
      );
      
      const unsubscribe = onSnapshot(groupsQuery, (snapshot) => {
        const groupsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // Sort locally instead of using orderBy to avoid index requirement
        groupsList.sort((a, b) => {
          const aTime = a.updatedAt?.toDate?.() || new Date(0);
          const bTime = b.updatedAt?.toDate?.() || new Date(0);
          return bTime - aTime;
        });
        setGroups(groupsList);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error fetching student groups:', error);
    }
  };

  const fetchMessages = async () => {
    if (!selectedGroup) return;
    
    try {
      const messagesQuery = query(
        collection(db, 'groupChats', selectedGroup.id, 'messages'),
        limit(50)
      );
      
      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const messagesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // Sort locally instead of using orderBy to avoid index requirement
        messagesList.sort((a, b) => {
          const aTime = a.timestamp?.toDate?.() || new Date(0);
          const bTime = b.timestamp?.toDate?.() || new Date(0);
          return aTime - bTime; // Ascending order for messages
        });
        setMessages(messagesList);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !selectedGroup) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', studentId));
      const displayName = userDoc.exists() ? (userDoc.data().fullName || userDoc.data().name || userDoc.data().displayName || 'Student') : (auth.currentUser?.displayName || 'Student');
      await addDoc(collection(db, 'groupChats', selectedGroup.id, 'messages'), {
        text: message.trim(),
        senderId: studentId,
        senderName: displayName,
        senderType: 'student',
        timestamp: serverTimestamp(),
        type: 'message'
      });

      // Update group's last activity
      await updateDoc(doc(db, 'groupChats', selectedGroup.id), {
        updatedAt: serverTimestamp(),
        lastMessage: message.trim(),
        lastMessageTime: serverTimestamp()
      });

      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const fetchGroupMembers = async (groupId) => {
    try {
      console.log('Fetching group members for group:', groupId);
      const groupDoc = await getDoc(doc(db, 'groupChats', groupId));
      if (groupDoc.exists()) {
        const groupData = groupDoc.data();
        console.log('Group data:', groupData);
        const members = [];
        
        // Add tutor
        members.push({
          id: groupData.tutorId,
          name: groupData.tutorName,
          type: 'tutor',
          role: 'Admin'
        });
        
        // Add students
        for (let i = 0; i < groupData.studentIds.length; i++) {
          members.push({
            id: groupData.studentIds[i],
            name: groupData.studentNames[i] || 'Unknown Student',
            type: 'student',
            role: 'Member'
          });
        }
        
        console.log('Members array:', members);
        setGroupMembers(members);
      } else {
        console.log('Group document does not exist');
      }
    } catch (error) {
      console.error('Error fetching group members:', error);
    }
  };

  const handleStudentLeaveGroup = async () => {
    Alert.alert(
      'Leave Group',
      `Are you sure you want to leave this group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Student leaving group:', studentId);
              console.log('Current group:', selectedGroup);
              
              const updatedStudentIds = selectedGroup.studentIds.filter(id => id !== studentId);
              const updatedStudentNames = selectedGroup.studentNames.filter((_, index) => 
                selectedGroup.studentIds[index] !== studentId
              );
              
              console.log('Updated student IDs:', updatedStudentIds);
              console.log('Updated student names:', updatedStudentNames);
              
              // Simple approach - just update the group document
              await updateDoc(doc(db, 'groupChats', selectedGroup.id), {
                studentIds: updatedStudentIds,
                studentNames: updatedStudentNames,
                updatedAt: serverTimestamp()
              });
              
              // Add system message about student leaving
              await addDoc(collection(db, 'groupChats', selectedGroup.id, 'messages'), {
                text: `${auth.currentUser?.displayName || 'Student'} left the group`,
                senderId: studentId,
                senderName: auth.currentUser?.displayName || 'Student',
                senderType: 'student',
                timestamp: serverTimestamp(),
                type: 'system'
              });
              
              // Update local groups list immediately
              setGroups(prev => prev.map(g => 
                g.id === selectedGroup.id 
                  ? { ...g, studentIds: updatedStudentIds, studentNames: updatedStudentNames }
                  : g
              ));
              
              // Close modals and go back to groups list
              setShowGroupModal(false);
              setSelectedGroup(null);
              
              Alert.alert('Success', 'You have left the group.');
            } catch (error) {
              console.error('Error leaving group:', error);
              Alert.alert('Error', 'Failed to leave the group.');
            }
          }
        }
      ]
    );
  };

  const renderGroupItem = ({ item }) => (
    <TouchableOpacity
      style={styles.groupItem}
      onPress={() => {
        setSelectedGroup(item);
        setShowGroupModal(true);
      }}
    >
      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{item.name}</Text>
        <Text style={styles.groupMeta}>
          Created by {item.tutorName}
        </Text>
        {item.lastMessage && (
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  const renderMessage = ({ item }) => {
    // Handle system messages differently
    if (item.type === 'system') {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={styles.systemMessageText}>{item.text}</Text>
          <Text style={styles.systemMessageTime}>
            {item.timestamp?.toDate?.()?.toLocaleTimeString() || 'Now'}
          </Text>
        </View>
      );
    }

    return (
      <View style={[
        styles.messageContainer,
        item.senderId === studentId ? styles.studentMessage : styles.otherMessage
      ]}>
        <Text style={styles.senderName}>{item.senderName}</Text>
        <Text style={styles.messageText}>{item.text}</Text>
        <Text style={styles.messageTime}>
          {item.timestamp?.toDate?.()?.toLocaleTimeString() || 'Now'}
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Group Chats</Text>
        </View>

        {/* Groups List */}
        <FlatList
          data={groups}
          renderItem={renderGroupItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.groupsList}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No group chats yet</Text>
              <Text style={styles.emptySubtext}>Your tutor will add you to group chats</Text>
            </View>
          }
        />

        {/* Group Chat Modal */}
        <Modal
          visible={showGroupModal}
          animationType="slide"
          onRequestClose={() => setShowGroupModal(false)}
        >
          <SafeAreaView style={styles.container}>
            <View style={styles.chatHeader}>
              <TouchableOpacity
                onPress={() => setShowGroupModal(false)}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color="#007AFF" />
              </TouchableOpacity>
              <View style={styles.chatHeaderInfo}>
                <Text style={styles.chatHeaderTitle}>{selectedGroup?.name}</Text>
                <Text style={styles.chatHeaderSubtitle}>
                  Created by {selectedGroup?.tutorName}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowGroupInfoModal(true)}
                style={styles.groupInfoButton}
              >
                <Ionicons name="information-circle-outline" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              style={styles.messagesList}
              inverted
            />

            <View style={styles.messageInputContainer}>
              <TextInput
                style={styles.messageInput}
                placeholder="Type a message..."
                value={message}
                onChangeText={setMessage}
                multiline
              />
              <TouchableOpacity
                style={styles.sendButton}
                onPress={sendMessage}
                disabled={!message.trim()}
              >
                <Ionicons name="send" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>

        {/* Group Info Modal */}
        <Modal
          visible={showGroupInfoModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowGroupInfoModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Group Info</Text>
                <TouchableOpacity onPress={() => setShowGroupInfoModal(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionTitle}>Group Members ({groupMembers.length})</Text>
              <FlatList
                data={groupMembers}
                renderItem={({ item }) => (
                  <View style={styles.memberItem}>
                    <View style={styles.memberInfo}>
                      <View style={styles.memberAvatar}>
                        <Text style={styles.memberAvatarText}>{item.name.charAt(0)}</Text>
                      </View>
                      <View style={styles.memberDetails}>
                        <Text style={styles.memberName}>{item.name}</Text>
                        <Text style={styles.memberRole}>{item.role}</Text>
                      </View>
                    </View>
                  </View>
                )}
                keyExtractor={(item) => item.id}
                style={styles.membersList}
              />

              {/* Leave Group Button for Students */}
              <TouchableOpacity
                style={styles.leaveGroupButton}
                onPress={handleStudentLeaveGroup}
              >
                <Text style={styles.leaveGroupButtonText}>Leave Group</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  backButton: {
    padding: 8,
  },
  groupsList: {
    padding: 16,
  },
  groupItem: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  groupMeta: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  chatHeaderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  chatHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  chatHeaderSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  groupInfoButton: {
    padding: 8,
  },
  messagesList: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  studentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 16,
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  messageTime: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    padding: 12,
    marginRight: 12,
    maxHeight: 100,
  },
  sendButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#555',
  },
  membersList: {
    width: '100%',
    marginBottom: 20,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  memberRole: {
    fontSize: 12,
    color: '#666',
  },
  leaveGroupButton: {
    backgroundColor: '#FF4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  leaveGroupButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  systemMessageText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  systemMessageTime: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
});
