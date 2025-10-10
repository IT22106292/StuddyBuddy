import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase/firebaseConfig";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  useEffect(() => {
    // Check if user has seen onboarding
    const checkOnboardingStatus = async () => {
      try {
        const onboardingSeen = await AsyncStorage.getItem('@onboarding_seen');
        setHasSeenOnboarding(onboardingSeen === 'true');
      } catch (error) {
        console.log('Error checking onboarding status:', error);
      }
    };
    
    checkOnboardingStatus();
    
    // Configure Firebase Auth persistence for React Native
    const initAuth = async () => {
      try {
        // For React Native, persistence is handled automatically by Firebase
        // but we can store additional user info in AsyncStorage if needed
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
          // Create user profile if it doesn't exist (for Google sign-in users)
          if (currentUser) {
            try {
              const userDoc = await getDoc(doc(db, "users", currentUser.uid));
              if (!userDoc.exists()) {
                // Create initial profile for Google sign-in users
                const initialProfile = {
                  email: currentUser.email || '',
                  fullName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
                  subjects: [],
                  expertiseLevel: 'beginner',
                  isTutor: false,
                  rating: 0,
                  studentsCount: 0,
                  createdAt: new Date(),
                  profileComplete: true
                };
                
                await setDoc(doc(db, "users", currentUser.uid), initialProfile);
              }
            } catch (error) {
              console.error("Error creating user profile:", error);
            }
          }
          
          setUser(currentUser);
          setLoading(false);
          
          // Store user authentication state in AsyncStorage for additional persistence
          try {
            if (currentUser) {
              await AsyncStorage.setItem('@user_authenticated', 'true');
            } else {
              await AsyncStorage.removeItem('@user_authenticated');
            }
          } catch (error) {
            console.log('AsyncStorage error:', error);
          }
        });
        return unsubscribe;
      } catch (error) {
        console.error('Auth initialization error:', error);
        setLoading(false);
      }
    };

    const unsubscribe = initAuth();
    return () => {
      if (unsubscribe && typeof unsubscribe.then === 'function') {
        unsubscribe.then(unsub => unsub && unsub());
      } else if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, hasSeenOnboarding, setHasSeenOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}