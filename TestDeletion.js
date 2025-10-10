import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from './firebase/firebaseConfig';

const TestDeletion = () => {
  const [testResult, setTestResult] = useState('');

  const testDeleteForMe = async () => {
    try {
      // This is a test message ID - replace with a real one from your database
      const testMessageId = 'test-message-id';
      const currentUid = auth.currentUser?.uid;
      
      if (!currentUid) {
        setTestResult('Not authenticated');
        return;
      }
      
      // Try to mark a message as deleted for current user
      const messageRef = doc(db, "globalChat", testMessageId);
      await updateDoc(messageRef, {
        [`deletedBy.${currentUid}`]: true
      });
      
      setTestResult('Delete for me test successful');
    } catch (error) {
      console.error('Test error:', error);
      setTestResult(`Test failed: ${error.message}`);
    }
  };

  const testDeleteForEveryone = async () => {
    try {
      // This is a test message ID - replace with a real one from your database
      const testMessageId = 'test-message-id';
      const currentUid = auth.currentUser?.uid;
      
      if (!currentUid) {
        setTestResult('Not authenticated');
        return;
      }
      
      // Try to mark a message as deleted for everyone
      const messageRef = doc(db, "globalChat", testMessageId);
      await updateDoc(messageRef, {
        text: "This message was deleted",
        deletedForEveryone: true,
        deletedAt: serverTimestamp()
      });
      
      setTestResult('Delete for everyone test successful');
    } catch (error) {
      console.error('Test error:', error);
      setTestResult(`Test failed: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Deletion Test</Text>
      <Text style={styles.result}>{testResult}</Text>
      
      <TouchableOpacity style={styles.button} onPress={testDeleteForMe}>
        <Text style={styles.buttonText}>Test Delete for Me</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={testDeleteForEveryone}>
        <Text style={styles.buttonText}>Test Delete for Everyone</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  result: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 5,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default TestDeletion;