import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { db } from '../firebase/firebaseConfig';

export default function AskQuestionScreen() {
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState('general');
  const [isUrgent, setIsUrgent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const auth = getAuth();

  const categories = [
    { value: 'general', label: 'General', icon: 'help-circle-outline' },
    { value: 'upload', label: 'Upload Issues', icon: 'cloud-upload-outline' },
    { value: 'account', label: 'Account', icon: 'person-outline' },
    { value: 'tutor', label: 'Tutoring', icon: 'school-outline' },
    { value: 'technical', label: 'Technical', icon: 'settings-outline' },
    { value: 'moderation', label: 'Moderation', icon: 'shield-outline' }
  ];

  const handleSubmitQuestion = async () => {
    if (!question.trim()) {
      Alert.alert('Error', 'Please enter your question');
      return;
    }

    if (!auth.currentUser) {
      Alert.alert('Error', 'You must be logged in to ask a question');
      return;
    }

    setSubmitting(true);

    try {
      // Get current user data
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};

      // Submit question to Firestore
      const questionData = {
        userId: auth.currentUser.uid,
        userName: userData.fullName || userData.name || 'Anonymous User',
        userEmail: userData.email || auth.currentUser.email || 'No email',
        question: question.trim(),
        category,
        priority: isUrgent ? 'high' : 'medium',
        status: 'pending', // pending, ai_replied, answered, resolved
        isUrgent,
        createdAt: serverTimestamp(), // Use Firestore server timestamp
        aiResponse: null,
        adminResponse: null
      };

      console.log('Submitting question data:', questionData);
      const docRef = await addDoc(collection(db, 'userQuestions'), questionData);
      console.log('Question submitted with ID:', docRef.id);

      Alert.alert(
        'Question Submitted!', 
        'Your question has been submitted successfully. You will receive a response soon.',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );

    } catch (error) {
      console.error('Error submitting question:', error);
      Alert.alert('Error', 'Failed to submit question. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#8b5cf6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ask a Question</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>What can we help you with?</Text>
          <Text style={styles.sectionSubtitle}>
            Our AI will provide an instant response, and admin staff will follow up if needed.
          </Text>

          {/* Question Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Your Question *</Text>
            <TextInput
              style={styles.questionInput}
              placeholder="Type your question here... Be as specific as possible for better assistance."
              value={question}
              onChangeText={setQuestion}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>{question.length}/500</Text>
          </View>

          {/* Category Selection */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Category</Text>
            <Text style={styles.inputHint}>Select the most relevant category</Text>
            <View style={styles.categoryGrid}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryCard,
                    category === cat.value && styles.categoryCardActive
                  ]}
                  onPress={() => setCategory(cat.value)}
                >
                  <Ionicons 
                    name={cat.icon} 
                    size={24} 
                    color={category === cat.value ? '#8b5cf6' : '#6b7280'} 
                  />
                  <Text style={[
                    styles.categoryText,
                    category === cat.value && styles.categoryTextActive
                  ]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Urgency Toggle */}
          <View style={styles.inputSection}>
            <TouchableOpacity 
              style={styles.urgencyToggle}
              onPress={() => setIsUrgent(!isUrgent)}
            >
              <Ionicons 
                name={isUrgent ? "alert-circle" : "alert-circle-outline"} 
                size={24} 
                color={isUrgent ? "#ef4444" : "#6b7280"} 
              />
              <View style={styles.urgencyText}>
                <Text style={[styles.urgencyLabel, isUrgent && styles.urgencyLabelActive]}>
                  Mark as Urgent
                </Text>
                <Text style={styles.urgencyHint}>
                  Only for issues that prevent you from using the platform
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.submitButton, { opacity: submitting ? 0.6 : 1 }]}
            onPress={handleSubmitQuestion}
            disabled={submitting}
          >
            {submitting ? (
              <Text style={styles.submitButtonText}>Submitting...</Text>
            ) : (
              <>
                <Ionicons name="send" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Submit Question</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Help Text */}
          <View style={styles.helpSection}>
            <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
            <Text style={styles.helpText}>
              Our AI assistant will provide an immediate response. For complex issues, 
              admin staff will follow up personally within 24 hours.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  questionInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    height: 120,
    backgroundColor: '#f9fafb',
  },
  characterCount: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 4,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  categoryCard: {
    width: '31%',
    margin: '1.5%',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
  },
  categoryCardActive: {
    backgroundColor: '#ede9fe',
    borderColor: '#8b5cf6',
  },
  categoryText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#8b5cf6',
    fontWeight: '600',
  },
  urgencyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  urgencyText: {
    marginLeft: 12,
    flex: 1,
  },
  urgencyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  urgencyLabelActive: {
    color: '#ef4444',
  },
  urgencyHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: '#8b5cf6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  helpSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
  },
  helpText: {
    fontSize: 12,
    color: '#0369a1',
    marginLeft: 8,
    lineHeight: 16,
    flex: 1,
  },
});