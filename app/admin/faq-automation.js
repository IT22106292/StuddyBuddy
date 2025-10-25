import { Ionicons } from "@expo/vector-icons";
import { deleteApp, initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, updateDoc, where } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Dimensions, FlatList, Modal, Pressable, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import app, { auth, db } from "../../firebase/firebaseConfig";

const { width: screenWidth } = Dimensions.get('window');
const isMobile = screenWidth < 768;

export default function AdminDashboardScreen() {
  const [users, setUsers] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [resources, setResources] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // FAQ & Automation state
  const [faqData, setFaqData] = useState({
    loading: false,
    userQuestions: [],
    aiResponses: [],
    resourceMatching: [],
    predictiveAnalytics: null,
    automationSettings: {
      autoReply: true,
      smartMatching: true,
      aiModerationEnabled: true,
      predictiveForecasting: true
    },
    lastUpdated: null
  });
  
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [customReply, setCustomReply] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [registerAdminVisible, setRegisterAdminVisible] = useState(false);
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regPosition, setRegPosition] = useState("");
  const [regPhone, setRegPhone] = useState("");
  
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
    const run = async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) { setIsAdmin(false); return; }
        const snap = await getDocs(query(collection(db, 'users'), where('__name__','==', uid), limit(1)));
        if (!snap.empty) {
          const data = snap.docs[0].data() || {};
          setIsAdmin(!!data.isAdmin);
        } else {
          setIsAdmin(false);
        }
      } catch { setIsAdmin(false); }
    };
    run();
  }, []);

  // FAQ & Automation Functions
  const generateFAQAutomation = async () => {
    setFaqData(prev => ({ ...prev, loading: true }));
    
    try {
      const currentTime = new Date();
      const userQuestions = await loadUserQuestions();
      const aiResponses = generateAIResponses(userQuestions);
      const resourceMatching = generateSmartResourceMatching();
      const predictiveAnalytics = generateResourceDemandForecast();
      
      setFaqData({
        loading: false,
        userQuestions,
        aiResponses,
        resourceMatching,
        predictiveAnalytics,
        automationSettings: {
          autoReply: true,
          smartMatching: true,
          aiModerationEnabled: true,
          predictiveForecasting: true
        },
        lastUpdated: currentTime
      });
      
      if (faqData.automationSettings?.autoReply) {
        await processAutoReplies(userQuestions, aiResponses);
      }
      
    } catch (error) {
      console.error('FAQ Automation generation failed:', error);
      setFaqData(prev => ({ ...prev, loading: false }));
    }
  };
  
  const loadUserQuestions = async () => {
    try {
      const questionsSnapshot = await getDocs(
        query(
          collection(db, 'userQuestions'),
          orderBy('createdAt', 'desc'),
          limit(50)
        )
      );
      
      const questions = [];
      questionsSnapshot.forEach((doc) => {
        questions.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        });
      });
      
      return questions;
    } catch (error) {
      console.error('Error loading user questions:', error);
      return [];
    }
  };
  
  const generateAIResponses = (questions) => {
    const aiKnowledgeBase = {
      mathematics: {
        patterns: ['math', 'algebra', 'geometry', 'calculus', 'equation', 'formula', 'solve', 'calculate'],
        responses: [
          'For mathematical problems, I recommend breaking down complex equations into smaller steps. Try using online tools like Wolfram Alpha or Khan Academy for step-by-step solutions.',
          'Mathematics can be challenging! Start with understanding the fundamental concepts before moving to complex problems. Practice regularly and don\'t hesitate to ask for help.',
          'For better math understanding: 1) Practice daily, 2) Use visual aids and diagrams, 3) Work through examples step-by-step, 4) Join study groups for collaborative learning.'
        ]
      },
      programming: {
        patterns: ['code', 'programming', 'javascript', 'python', 'html', 'css', 'algorithm', 'debug'],
        responses: [
          'Programming is all about practice and problem-solving! Start with simple projects, read documentation carefully, and don\'t be afraid to experiment with code.',
          'For coding help: 1) Break problems into smaller parts, 2) Use online IDEs for practice, 3) Read error messages carefully, 4) Join coding communities for support.',
        ]
      },
      study: {
        patterns: ['study', 'exam', 'test', 'preparation', 'notes', 'memory', 'concentration'],
        responses: [
          'Effective studying requires the right environment and techniques. Try the Pomodoro Technique, active recall, and spaced repetition for better retention.',
          'Study tips: 1) Create a consistent schedule, 2) Use active learning methods, 3) Take regular breaks, 4) Form study groups, 5) Practice with mock tests.',
        ]
      },
    };
    
    return questions.map(question => {
      if (question.status !== 'pending' && question.aiResponse) {
        return question.aiResponse;
      }
      
      const questionText = question.question.toLowerCase();
      const category = question.category?.toLowerCase() || 'general';
      
      let bestMatch = null;
      let highestScore = 0;
      
      Object.entries(aiKnowledgeBase).forEach(([categoryKey, categoryData]) => {
        let score = 0;
        if (category === categoryKey || category.includes(categoryKey)) score += 3;
        
        categoryData.patterns.forEach(pattern => {
          if (questionText.includes(pattern)) {
            score += 2;
            const words = questionText.split(' ');
            if (words.includes(pattern)) score += 1;
          }
        });
        
        if (score > highestScore) {
          highestScore = score;
          bestMatch = { category: categoryKey, data: categoryData, score: score };
        }
      });
      
      if (bestMatch && bestMatch.score >= 2) {
        const responses = bestMatch.data.responses;
        const selectedResponse = responses[Math.floor(Math.random() * responses.length)];
        
        return {
          questionId: question.id,
          message: selectedResponse,
          confidence: Math.min(0.95, 0.7 + (bestMatch.score * 0.05)),
          category: bestMatch.category,
          timestamp: new Date(),
          isAutoGenerated: true,
          matchingScore: bestMatch.score
        };
      }
      
      const fallbackResponses = {
        urgent: 'I understand this is urgent. Our support team has been notified and will prioritize your request.',
        general: 'Thank you for reaching out! Your question is important to us. Our team will review this carefully and provide guidance within 24 hours.'
      };
      
      let fallbackType = question.isUrgent ? 'urgent' : 'general';
      
      return {
        questionId: question.id,
        message: fallbackResponses[fallbackType],
        confidence: 0.6,
        category: 'general',
        timestamp: new Date(),
        isAutoGenerated: true,
        requiresHumanReview: true,
        fallbackType: fallbackType
      };
    }).filter(response => response !== null);
  };
  
  const processAutoReplies = async (questions, aiResponses) => {
    try {
      for (const question of questions) {
        const aiResponse = aiResponses.find(resp => resp.questionId === question.id);
        if (aiResponse && question.status === 'pending') {
          await updateDoc(doc(db, 'userQuestions', question.id), {
            status: 'ai_replied',
            aiResponse: {
              message: aiResponse.message,
              confidence: aiResponse.confidence,
              timestamp: new Date(),
              category: aiResponse.category,
              isAutoGenerated: true
            },
            updatedAt: new Date()
          });
          
          try {
            await addDoc(collection(db, 'notifications'), {
              userId: question.userId,
              type: 'question_answered',
              title: 'Your Question Was Answered',
              message: `System has responded to your question about "${question.question.substring(0, 50)}..."`,
              read: false,
              createdAt: new Date(),
              data: { questionId: question.id, questionText: question.question }
            });
          } catch (notifError) {
            console.warn('Failed to create notification:', notifError);
          }
        }
      }
      
      const updatedQuestions = questions.map(question => {
        const aiResponse = aiResponses.find(resp => resp.questionId === question.id);
        if (aiResponse && question.status === 'pending') {
          return {
            ...question,
            status: 'ai_replied',
            aiResponse: {
              message: aiResponse.message,
              confidence: aiResponse.confidence,
              timestamp: new Date(),
              category: aiResponse.category,
              isAutoGenerated: true
            }
          };
        }
        return question;
      });
      
      setFaqData(prev => ({ ...prev, userQuestions: updatedQuestions }));
      
    } catch (error) {
      console.error('Error processing auto-replies:', error);
    }
  };
  
  const sendCustomReply = async (questionId) => {
    if (!customReply.trim()) return;
    
    try {
      const adminResponse = {
        message: customReply.trim(),
        adminName: 'Admin Support',
        timestamp: new Date()
      };
      
      await updateDoc(doc(db, 'userQuestions', questionId), {
        status: 'answered',
        adminResponse,
        updatedAt: new Date()
      });
      
      const questionDoc = await getDoc(doc(db, 'userQuestions', questionId));
      const questionData = questionDoc.data();
      
      if (questionData) {
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: questionData.userId,
            type: 'admin_reply',
            title: 'Admin Response Received',
            message: `An admin has personally responded to your question about "${questionData.question.substring(0, 50)}..."`,
            read: false,
            createdAt: new Date(),
            data: { questionId, questionText: questionData.question }
          });
        } catch (notifError) {
          console.warn('Failed to create notification:', notifError);
        }
      }
      
      setFaqData(prev => ({
        ...prev,
        userQuestions: prev.userQuestions.map(q => 
          q.id === questionId ? { ...q, status: 'answered', adminResponse } : q
        )
      }));
      
      setSelectedQuestion(null);
      setCustomReply('');
      Alert.alert('Success', 'Your response has been sent to the user!');
      
    } catch (error) {
      console.error('Error sending admin reply:', error);
      Alert.alert('Error', 'Failed to send response. Please try again.');
    }
  };
  
  const markAsResolved = async (questionId) => {
    try {
      await updateDoc(doc(db, 'userQuestions', questionId), {
        status: 'resolved',
        resolvedAt: new Date(),
        updatedAt: new Date()
      });
      
      setFaqData(prev => ({
        ...prev,
        userQuestions: prev.userQuestions.map(q => 
          q.id === questionId ? { ...q, status: 'resolved' } : q
        )
      }));
      
    } catch (error) {
      console.error('Error marking as resolved:', error);
      Alert.alert('Error', 'Failed to mark as resolved. Please try again.');
    }
  };
  
  const escalateToHuman = async (questionId) => {
    try {
      await updateDoc(doc(db, 'userQuestions', questionId), {
        priority: 'high',
        isUrgent: true,
        status: 'pending',
        escalatedAt: new Date(),
        updatedAt: new Date()
      });
      
      setFaqData(prev => ({
        ...prev,
        userQuestions: prev.userQuestions.map(q => 
          q.id === questionId ? { ...q, priority: 'high', isUrgent: true, status: 'pending' } : q
        )
      }));
      
      Alert.alert('Escalated', 'Question has been escalated for human review.');
      
    } catch (error) {
      console.error('Error escalating question:', error);
      Alert.alert('Error', 'Failed to escalate question. Please try again.');
    }
  };
  
  const getFilteredQuestions = () => {
    if (!faqData.userQuestions) return [];
    
    let filtered = [];
    switch (filterCategory) {
      case 'pending':
        filtered = faqData.userQuestions.filter(q => q.status === 'pending');
        break;
      case 'answered':
        filtered = faqData.userQuestions.filter(q => q.status === 'answered' || q.status === 'resolved');
        break;
      case 'unanswered':
        filtered = faqData.userQuestions.filter(q => q.status === 'ai_replied');
        break;
      default:
        filtered = faqData.userQuestions;
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(q => 
        (q.question && q.question.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (q.userName && q.userName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (q.userEmail && q.userEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (q.category && q.category.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    return filtered;
  };
  
  const generateSmartResourceMatching = () => {
    return [];
  };
  
  const generateResourceDemandForecast = () => {
    return null;
  };


  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return COLORS.accent;
      case 'ai_replied': return COLORS.secondary;
      case 'answered': return COLORS.success;
      case 'resolved': return '#10b981';
      default: return COLORS.textSecondary;
    }
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getAvatarColor = (key) => {
    const colors = [COLORS.primary, COLORS.secondary, COLORS.accent, COLORS.success, "#EC4899", "#06B6D4"];
    const index = Math.abs(key?.charCodeAt(0) || 0) % colors.length;
    return colors[index];
  };

  const renderQuestionItem = ({ item }) => {
    const displayName = item.userName || "Unknown User";
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
        <View style={[styles.questionCard, item.isUrgent && styles.urgentQuestion]}>
          {/* Header with Avatar */}
          <View style={styles.questionHeader}>
            <View style={[styles.avatarCircle, { backgroundColor: avatarColor }]}>
              <Text style={styles.avatarText}>{firstLetter}</Text>
            </View>
            
            <View style={styles.questionUserInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.questionUserName} numberOfLines={1}>
                  {displayName}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                  <Text style={styles.statusText}>{item.status.replace('_', ' ').toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.questionUserEmail} numberOfLines={1}>
                {item.userEmail || item.userId}
              </Text>
              <View style={styles.metaRow}>
                <View style={styles.categoryBadge}>
                  <Ionicons name="pricetag" size={10} color={COLORS.secondary} />
                  <Text style={styles.categoryText}>{item.category || 'General'}</Text>
                </View>
                <Text style={styles.questionTime}>{getTimeAgo(item.createdAt)}</Text>
                {item.isUrgent && (
                  <View style={styles.urgentBadge}>
                    <Ionicons name="warning" size={10} color="#fff" />
                    <Text style={styles.urgentText}>URGENT</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Question Text */}
          <Text style={styles.questionText}>{item.question}</Text>

          {/* AI Response */}
          {item.aiResponse && (
            <View style={styles.aiResponseSection}>
              <View style={styles.responseHeader}>
                <Ionicons name="flash" size={14} color={COLORS.secondary} />
                <Text style={styles.responseLabel}>AI Response</Text>
                <Text style={styles.confidenceText}>
                  {(item.aiResponse.confidence * 100).toFixed(0)}% confidence
                </Text>
              </View>
              <Text style={styles.responseText}>{item.aiResponse.message}</Text>
            </View>
          )}

          {/* Admin Response */}
          {item.adminResponse && (
            <View style={styles.adminResponseSection}>
              <View style={styles.responseHeader}>
                <Ionicons name="shield-checkmark" size={14} color={COLORS.success} />
                <Text style={styles.responseLabel}>Admin Response</Text>
              </View>
              <Text style={styles.responseText}>{item.adminResponse.message}</Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.questionActions}>
            {item.status === 'pending' && (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => setSelectedQuestion(item)}
              >
                <Ionicons name="create-outline" size={14} color={COLORS.primary} />
                <Text style={styles.actionButtonText}>Reply</Text>
              </TouchableOpacity>
            )}
            
            {item.status === 'ai_replied' && (
              <>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}
                  onPress={() => markAsResolved(item.id)}
                >
                  <Ionicons name="checkmark-circle-outline" size={14} color={COLORS.success} />
                  <Text style={[styles.actionButtonText, { color: COLORS.success }]}>Resolve</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => setSelectedQuestion(item)}
                >
                  <Ionicons name="person-outline" size={14} color={COLORS.accent} />
                  <Text style={[styles.actionButtonText, { color: COLORS.accent }]}>Add Reply</Text>
                </TouchableOpacity>
              </>
            )}
            
            {(item.status === 'pending' || item.status === 'ai_replied') && (
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}
                onPress={() => escalateToHuman(item.id)}
              >
                <Ionicons name="warning-outline" size={14} color={COLORS.error} />
                <Text style={[styles.actionButtonText, { color: COLORS.error }]}>Escalate</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>
    );
  };

  const filteredQuestions = getFilteredQuestions();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
      </View>

      {isAdmin && (
        <>
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
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color={COLORS.primary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search questions, users, or categories..."
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

            {/* Filter Chips */}
            <View style={styles.filterContainer}>
              {['all', 'pending', 'answered', 'unanswered'].map(filter => (
                <TouchableOpacity
                  key={filter}
                  style={[styles.filterChip, filterCategory === filter && styles.filterChipActive]}
                  onPress={() => setFilterCategory(filter)}
                >
                  <Text style={[styles.filterChipText, filterCategory === filter && styles.filterChipTextActive]}>
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Action Button */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={generateFAQAutomation}
                disabled={faqData.loading}
                style={[styles.initializeButton, faqData.loading && { opacity: 0.6 }]}
              >
                <Ionicons name={faqData.loading ? "sync" : "construct-outline"} size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                <Text style={styles.initializeText}>
                  {faqData.loading ? 'Processing...' : 'Initialize Systems'}
                </Text>
              </TouchableOpacity>
              {faqData.lastUpdated && (
                <Text style={styles.lastUpdated}>
                  Updated: {faqData.lastUpdated.toLocaleTimeString()}
                </Text>
              )}
            </View>

            {/* Questions List */}
            <FlatList
              data={filteredQuestions}
              keyExtractor={(item) => item.id}
              renderItem={renderQuestionItem}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="chatbubble-outline" size={44} color={COLORS.primary} />
                  </View>
                  <Text style={styles.emptyTitle}>No questions found</Text>
                  <Text style={styles.emptySubtitle}>
                    {searchQuery ? "Try a different search term" : faqData.loading ? "Loading questions..." : "Questions will appear here"}
                  </Text>
                </View>
              }
            />
          </Animated.View>

          {/* Reply Modal */}
          {selectedQuestion && (
            <Modal visible={!!selectedQuestion} transparent onRequestClose={() => setSelectedQuestion(null)}>
              <View style={styles.modalWrap}>
                <View style={styles.replyModal}>
                  <View style={styles.replyModalHeader}>
                    <Text style={styles.replyModalTitle}>Reply to {selectedQuestion.userName}</Text>
                    <TouchableOpacity onPress={() => setSelectedQuestion(null)}>
                      <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.originalQuestion}>
                    <Text style={styles.originalQuestionLabel}>Original Question:</Text>
                    <Text style={styles.originalQuestionText}>{selectedQuestion.question}</Text>
                  </View>
                  
                  {selectedQuestion.aiResponse && (
                    <View style={styles.aiSuggestion}>
                      <Text style={styles.aiSuggestionLabel}>AI Suggested Response:</Text>
                      <Text style={styles.aiSuggestionText}>{selectedQuestion.aiResponse.message}</Text>
                    </View>
                  )}
                  
                  <TextInput
                    style={styles.replyInput}
                    placeholder="Type your custom response..."
                    value={customReply}
                    onChangeText={setCustomReply}
                    multiline
                    numberOfLines={6}
                  />
                  
                  <View style={styles.replyActions}>
                    <TouchableOpacity 
                      style={styles.replyCancel}
                      onPress={() => {
                        setSelectedQuestion(null);
                        setCustomReply('');
                      }}
                    >
                      <Text style={styles.replyCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.replySend, { opacity: customReply.trim() ? 1 : 0.5 }]}
                      onPress={() => sendCustomReply(selectedQuestion.id)}
                      disabled={!customReply.trim()}
                    >
                      <Ionicons name="send" size={16} color="#fff" />
                      <Text style={styles.replySendText}>Send Reply</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          )}
        </>
      )}
    </SafeAreaView>
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
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
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
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  filterChip: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  initializeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  initializeText: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  lastUpdated: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  questionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  urgentQuestion: {
    borderColor: COLORS.accent,
    borderWidth: 2,
    backgroundColor: "rgba(245, 158, 11, 0.05)",
  },
  questionHeader: {
    flexDirection: "row",
    marginBottom: 12,
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
  questionUserInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  questionUserName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textMain,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  questionUserEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 10,
    color: COLORS.secondary,
    marginLeft: 3,
    fontWeight: "600",
  },
  questionTime: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "400",
  },
  urgentBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  urgentText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fff",
    marginLeft: 2,
    letterSpacing: 0.5,
  },
  questionText: {
    fontSize: 14,
    color: COLORS.textMain,
    lineHeight: 20,
    marginBottom: 12,
    fontWeight: "500",
  },
  aiResponseSection: {
    backgroundColor: "rgba(139, 92, 246, 0.08)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.secondary,
  },
  adminResponseSection: {
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.success,
  },
  responseHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  responseLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMain,
    marginLeft: 4,
    flex: 1,
  },
  confidenceText: {
    fontSize: 10,
    color: COLORS.secondary,
    fontWeight: "600",
  },
  responseText: {
    fontSize: 13,
    color: COLORS.textMain,
    lineHeight: 18,
    fontWeight: "500",
  },
  questionActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.2)",
  },
  actionButtonText: {
    fontSize: 11,
    color: COLORS.primary,
    marginLeft: 4,
    fontWeight: "700",
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
    backgroundColor: COLORS.card,
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
    color: COLORS.textMain,
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    color: COLORS.textMain,
    backgroundColor: COLORS.bg,
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
    backgroundColor: COLORS.bg,
  },
  modalCancelText: {
    color: COLORS.textSecondary,
    fontWeight: "600",
    fontSize: 14,
  },
  modalSubmitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  modalSubmitText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  replyModal: {
    width: "100%",
    maxWidth: 500,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    maxHeight: "85%",
  },
  replyModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  replyModalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textMain,
  },
  originalQuestion: {
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  originalQuestionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  originalQuestionText: {
    fontSize: 14,
    color: COLORS.textMain,
    lineHeight: 20,
    fontWeight: "500",
  },
  aiSuggestion: {
    backgroundColor: "rgba(139, 92, 246, 0.08)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.secondary,
  },
  aiSuggestionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  aiSuggestionText: {
    fontSize: 13,
    color: COLORS.textMain,
    lineHeight: 18,
    fontWeight: "500",
  },
  replyInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    backgroundColor: COLORS.bg,
    minHeight: 120,
    textAlignVertical: "top",
    fontSize: 14,
    color: COLORS.textMain,
  },
  replyActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  replyCancel: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
  },
  replyCancelText: {
    color: COLORS.textSecondary,
    fontWeight: "600",
    fontSize: 14,
  },
  replySend: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  replySendText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    marginLeft: 6,
  },
});