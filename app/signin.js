import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { GoogleAuthProvider, signInWithCredential, signInWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { AnimatedAppIcon } from "../components/AnimatedAppIcon";
import { GalaxyAnimation } from "../components/GalaxyAnimation";
import { LoadingScreen } from "../components/LoadingScreen";
import { GalaxyColors } from "../constants/GalaxyColors";
import { GlobalStyles } from "../constants/GlobalStyles";
import { auth, db } from "../firebase/firebaseConfig";

// Import Google Auth module - we'll handle errors during initialization
import * as Google from "expo-auth-session/providers/google";

const { width, height } = Dimensions.get('window');

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  
  // Google Auth state - always initialize but handle platform differences
  const [googleAuthState, setGoogleAuthState] = useState({
    request: null,
    response: null,
    promptAsync: null,
    initialized: false,
    error: null
  });

  // Initialize WebBrowser for Google Auth
  useEffect(() => {
    if (Platform.OS !== 'web') {
      WebBrowser.maybeCompleteAuthSession();
    }
  }, []);

  // Initialize Google Auth
  useEffect(() => {
    const initializeGoogleAuth = async () => {
      if (Platform.OS !== 'web') {
        try {
          console.log('Initializing Google Auth for mobile platform');
          
          // Log environment variables for debugging
          console.log('Google OAuth Environment Variables:');
          console.log('Web Client ID:', process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'Using default client ID');
          console.log('iOS Client ID:', process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || 'Not set');
          console.log('Android Client ID:', process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || 'Not set');
          
          // Create the auth request
          const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
            clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '234882778415-qo2oe5ehans3gpajht9dl4mljqodjq1r.apps.googleusercontent.com',
            iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '234882778415-435cmvbqsea5e64cejjegm8nkjs26vd6.apps.googleusercontent.com',
            androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '234882778415-435cmvbqsea5e64cejjegm8nkjs26vd6.apps.googleusercontent.com',
            redirectUri: process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI || 'http://localhost:8081/signin',
            useProxy: true,
            scopes: ['openid', 'profile', 'email'],
          });
          
          setGoogleAuthState({
            request,
            response,
            promptAsync,
            initialized: true,
            error: null
          });
          
          console.log('Google Auth initialized successfully');
        } catch (error) {
          console.log('Google Auth initialization error:', error);
          setGoogleAuthState({
            request: null,
            response: null,
            promptAsync: null,
            initialized: false,
            error: error.message || 'Failed to initialize Google Auth'
          });
        }
      }
    };
    
    initializeGoogleAuth();
  }, []);

  // Handle Google Auth response
  useEffect(() => {
    const handleGoogleResponse = async () => {
      if (Platform.OS !== 'web' && googleAuthState.response) {
        console.log('Google Auth response:', googleAuthState.response);
        
        if (googleAuthState.response?.type === 'success') {
          const { id_token } = googleAuthState.response.params;
          const credential = GoogleAuthProvider.credential(id_token);
          
          signInWithCredential(auth, credential)
            .then(async (userCredential) => {
              // Successfully signed in
              console.log('Google Sign-In successful');
              
              // Check if user is admin
              const user = userCredential.user;
              const userDoc = await getDoc(doc(db, "users", user.uid));
              const userData = userDoc.data();
              
              setTimeout(() => {
                setGoogleAuthState(prev => ({...prev, response: null}));
                setShowLoadingScreen(false);
                setIsLoading(false);
                if (userData && userData.isAdmin) {
                  router.replace("/admin");
                } else {
                  router.replace("/home");
                }
              }, 1000);
            })
            .catch(error => {
              console.error('Google sign-in error:', error);
              setError(`Failed to sign in with Google: ${error.message || 'Unknown error'}`);
              setGoogleAuthState(prev => ({...prev, response: null}));
              setShowLoadingScreen(false);
              setIsLoading(false);
            });
        } else if (googleAuthState.response?.type === 'error') {
          // Handle error
          console.error('Google Sign-In error:', googleAuthState.response.params);
          
          if (googleAuthState.response.params?.error === 'redirect_uri_mismatch') {
            setError("Google Sign-In failed: Redirect URI mismatch. Please add http://localhost:8081/signin to your Google Cloud Console authorized redirect URIs.");
          } else {
            setError(`Google Sign-In failed: ${googleAuthState.response.params?.error_description || 'Unknown error'}`);
          }
          
          setGoogleAuthState(prev => ({...prev, response: null}));
          setShowLoadingScreen(false);
          setIsLoading(false);
        } else if (googleAuthState.response?.type === 'dismiss') {
          // Handle dismissal
          setError("Google Sign-In was cancelled or dismissed.");
          setGoogleAuthState(prev => ({...prev, response: null}));
          setShowLoadingScreen(false);
          setIsLoading(false);
        }
      }
    };
    
    handleGoogleResponse();
  }, [googleAuthState.response]);

  const handleSignIn = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setError("");
    setShowLoadingScreen(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check if email is verified
      if (!user.emailVerified) {
        // Sign out the user and redirect to verification page
        await signOut(auth);
        setTimeout(() => {
          setShowLoadingScreen(false);
          setIsLoading(false);
          router.replace("/email-verification");
        }, 1000);
        return;
      }

      // Check if user is admin
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
      
      // Keep loading screen for smooth transition
      setTimeout(() => {
        if (userData && userData.isAdmin) {
          router.replace("/admin");
        } else {
          router.replace("/home");
        }
      }, 1000);
    } catch (err) {
      setError("Invalid email or password");
      setShowLoadingScreen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    // Different implementation for web and mobile
    if (Platform.OS === 'web') {
      // Web implementation using Firebase
      try {
        setIsLoading(true);
        setError("");
        setShowLoadingScreen(true);
        
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        
        // Check if user is admin
        const user = result.user;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        
        setTimeout(() => {
          setShowLoadingScreen(false);
          setIsLoading(false);
          if (userData && userData.isAdmin) {
            router.replace("/admin");
          } else {
            router.replace("/home");
          }
        }, 1000);
      } catch (error) {
        console.error('Google Sign-In error:', error);
        setError(`Failed to sign in with Google: ${error.message || 'Unknown error'}`);
        setShowLoadingScreen(false);
        setIsLoading(false);
      }
    } else {
      // Mobile implementation using expo-auth-session
      if (!googleAuthState.initialized) {
        setError("Google Sign-In is not properly configured. Please check that you have added the SHA-1 certificate fingerprint to your Google Cloud Console OAuth 2.0 client configuration.");
        Alert.alert('Configuration Error', 'Google Sign-In is not properly configured. Please check that you have added the SHA-1 certificate fingerprint to your Google Cloud Console OAuth 2.0 client configuration.');
        return;
      }
      
      if (!googleAuthState.request || !googleAuthState.promptAsync) {
        setError("Google Sign-In is not available right now. Please try again.");
        Alert.alert('Initialization Error', 'Google Sign-In is not available right now. Please try again.');
        return;
      }
      
      // Clear any previous errors
      setError("");
      
      // Show loading state
      setIsLoading(true);
      setShowLoadingScreen(true);
      
      try {
        console.log('Initiating Google Sign-In with request:', googleAuthState.request);
        const result = await googleAuthState.promptAsync();
        console.log('Google Sign-In result:', result);
        
        // Update the response in state so the useEffect can handle it
        setGoogleAuthState(prev => ({
          ...prev,
          response: result
        }));
        
        if (result?.type === 'dismiss') {
          setError("Google Sign-In was cancelled or dismissed.");
          setIsLoading(false);
          setShowLoadingScreen(false);
        } else if (result?.type === 'error') {
          console.error('Google Sign-In error:', result.params);
          
          // Handle specific error cases
          if (result.params?.error === 'idp_claimed') {
            setError("Google Sign-In failed: Invalid client ID configuration. Please verify your SHA-1 certificate fingerprint in Google Cloud Console.");
          } else {
            setError(`Google Sign-In failed: ${result.params?.error_description || 'Unknown error'}`);
          }
          
          setIsLoading(false);
          setShowLoadingScreen(false);
        }
      } catch (error) {
        console.error('Google Sign-In error:', error);
        setError(`Failed to initiate Google Sign-In: ${error.message || 'Unknown error'}`);
        setIsLoading(false);
        setShowLoadingScreen(false);
      }
    }
  };

  // For mobile devices, we'll stack the image and form vertically
  const isMobile = width < 768;

  return (
    <SafeAreaView style={GlobalStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor={GalaxyColors.light.primary} />
      
      {isMobile ? (
        // Mobile layout - stacked with image at top
        <>
          {/* Image Header for Mobile */}
          <View style={styles.mobileImageHeader}>
            <Image 
              source={require('../assets/images/signinImg.png')} 
              style={styles.mobileSignupImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={[GalaxyColors.light.gradientStart, GalaxyColors.light.gradientEnd]}
              style={styles.overlayGradient}
            />
            <GalaxyAnimation style={styles.galaxyAnimation} />
            <View style={styles.mobileHeaderContent}>
              <AnimatedAppIcon size={80} showAnimation={true} />
              <Text style={styles.welcomeTitle}>Welcome Back!</Text>
              <Text style={styles.welcomeSubtitle}>Sign in to continue your learning journey</Text>
            </View>
          </View>

          <ScrollView 
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formContainer}>
              <View style={GlobalStyles.form}>
                {error ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name="warning" size={20} color={GalaxyColors.light.error} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <View style={styles.inputContainer}>
                  <Text style={GlobalStyles.inputLabel}>Email Address</Text>
                  <View style={[
                    styles.inputWrapper,
                    emailFocused && styles.inputFocused,
                    error && styles.inputError
                  ]}>
                    <Ionicons name="mail-outline" size={20} color={emailFocused ? GalaxyColors.light.primary : GalaxyColors.light.icon} style={styles.inputIcon} />
                    <TextInput
                      placeholder="Enter your email"
                      placeholderTextColor={GalaxyColors.light.inputPlaceholder}
                      value={email}
                      onChangeText={setEmail}
                      style={styles.textInput}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                    />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={GlobalStyles.inputLabel}>Password</Text>
                  <View style={[
                    styles.inputWrapper,
                    passwordFocused && styles.inputFocused,
                    error && styles.inputError
                  ]}>
                    <Ionicons name="lock-closed-outline" size={20} color={passwordFocused ? GalaxyColors.light.primary : GalaxyColors.light.icon} style={styles.inputIcon} />
                    <TextInput
                      placeholder="Enter your password"
                      placeholderTextColor={GalaxyColors.light.inputPlaceholder}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      style={styles.textInput}
                      autoCapitalize="none"
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.passwordToggle}
                    >
                      <Ionicons
                        name={showPassword ? "eye-outline" : "eye-off-outline"}
                        size={20}
                        color={GalaxyColors.light.icon}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[GlobalStyles.buttonLarge, isLoading && styles.buttonDisabled]}
                  onPress={handleSignIn}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <View style={styles.loadingContainer}>
                      <Ionicons name="refresh" size={20} color={GalaxyColors.light.textInverse} style={styles.loadingIcon} />
                      <Text style={GlobalStyles.buttonText}>Signing In...</Text>
                    </View>
                  ) : (
                    <Text style={GlobalStyles.buttonText}>Sign In</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.dividerContainer}>
                  <View style={styles.divider} />
                  <Text style={styles.dividerText}>or continue with</Text>
                  <View style={styles.divider} />
                </View>

                <TouchableOpacity
                  style={styles.googleButton}
                  onPress={handleGoogleSignIn}
                  disabled={isLoading || (Platform.OS !== 'web' && !googleAuthState.initialized)}
                >
                  <Ionicons name="logo-google" size={20} color="#DB4437" />
                  <Text style={styles.googleButtonText}>Sign in with Google</Text>
                </TouchableOpacity>
                
                {/* Show Google Auth initialization error */}
                {Platform.OS !== 'web' && googleAuthState.error && (
                  <View style={styles.infoContainer}>
                    <Text style={styles.infoText}>
                      Google Auth Error: {googleAuthState.error}
                    </Text>
                  </View>
                )}
                
                {error && error.includes('400') && (
                  <View style={styles.infoContainer}>
                    <Text style={styles.infoText}>
                      Having trouble with Google Sign-In? Check the troubleshooting guide for solutions.
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={GlobalStyles.buttonSecondary}
                  onPress={() => router.push("/signup")}
                >
                  <Text style={GlobalStyles.buttonSecondaryText}>Create New Account</Text>
                </TouchableOpacity>

                {/* Forgot Password Link */}
                <TouchableOpacity
                  style={styles.forgotPasswordButton}
                  onPress={() => router.push("/forgot-password")}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  Don't have an account?{" "}
                  <Text 
                    style={styles.linkText}
                    onPress={() => router.push("/signup")}
                  >
                    Sign Up
                  </Text>
                </Text>
              </View>
            </View>
          </ScrollView>
        </>
      ) : (
        // Desktop layout - two columns
        <View style={styles.twoColumnContainer}>
          {/* Left Column - Signup Image */}
          <View style={styles.imageColumn}>
            <Image 
              source={require('../assets/images/signinImg.png')} 
              style={styles.signupImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={[GalaxyColors.light.gradientStart, GalaxyColors.light.gradientEnd]}
              style={styles.overlayGradient}
            />
            <GalaxyAnimation style={styles.galaxyAnimation} />
           
          </View>

          {/* Right Column - Form */}
          <View style={styles.formColumn}>
            <ScrollView 
              style={styles.scrollContainer}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formContainer}>
                <View style={GlobalStyles.form}>
                  <View style={styles.logoContainer}>
                    <AnimatedAppIcon size={60} showAnimation={true} />
                    <Text style={styles.formTitle}>Welcome Back!</Text>
                    <Text style={styles.formSubtitle}>Sign in to continue your learning journey</Text>
                  </View>

                  {error ? (
                    <View style={styles.errorContainer}>
                      <Ionicons name="warning" size={20} color={GalaxyColors.light.error} />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}

                  <View style={styles.inputContainer}>
                    <Text style={GlobalStyles.inputLabel}>Email Address</Text>
                    <View style={[
                      styles.inputWrapper,
                      emailFocused && styles.inputFocused,
                      error && styles.inputError
                    ]}>
                      <Ionicons name="mail-outline" size={20} color={emailFocused ? GalaxyColors.light.primary : GalaxyColors.light.icon} style={styles.inputIcon} />
                      <TextInput
                        placeholder="Enter your email"
                        placeholderTextColor={GalaxyColors.light.inputPlaceholder}
                        value={email}
                        onChangeText={setEmail}
                        style={styles.textInput}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        onFocus={() => setEmailFocused(true)}
                        onBlur={() => setEmailFocused(false)}
                      />
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={GlobalStyles.inputLabel}>Password</Text>
                    <View style={[
                      styles.inputWrapper,
                      passwordFocused && styles.inputFocused,
                      error && styles.inputError
                    ]}>
                      <Ionicons name="lock-closed-outline" size={20} color={passwordFocused ? GalaxyColors.light.primary : GalaxyColors.light.icon} style={styles.inputIcon} />
                      <TextInput
                        placeholder="Enter your password"
                        placeholderTextColor={GalaxyColors.light.inputPlaceholder}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        style={styles.textInput}
                        autoCapitalize="none"
                        onFocus={() => setPasswordFocused(true)}
                        onBlur={() => setPasswordFocused(false)}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.passwordToggle}
                      >
                        <Ionicons
                          name={showPassword ? "eye-outline" : "eye-off-outline"}
                          size={20}
                          color={GalaxyColors.light.icon}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[GlobalStyles.buttonLarge, isLoading && styles.buttonDisabled]}
                    onPress={handleSignIn}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <View style={styles.loadingContainer}>
                        <Ionicons name="refresh" size={20} color={GalaxyColors.light.textInverse} style={styles.loadingIcon} />
                        <Text style={GlobalStyles.buttonText}>Signing In...</Text>
                      </View>
                    ) : (
                      <Text style={GlobalStyles.buttonText}>Sign In</Text>
                    )}
                  </TouchableOpacity>

                  <View style={styles.dividerContainer}>
                    <View style={styles.divider} />
                    <Text style={styles.dividerText}>or continue with</Text>
                    <View style={styles.divider} />
                  </View>

                  <TouchableOpacity
                    style={styles.googleButton}
                    onPress={handleGoogleSignIn}
                    disabled={isLoading}
                  >
                    <Ionicons name="logo-google" size={20} color="#DB4437" />
                    <Text style={styles.googleButtonText}>Sign in with Google</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={GlobalStyles.buttonSecondary}
                    onPress={() => router.push("/signup")}
                  >
                    <Text style={GlobalStyles.buttonSecondaryText}>Create New Account</Text>
                  </TouchableOpacity>

                  {/* Forgot Password Link */}
                  <TouchableOpacity
                    style={styles.forgotPasswordButton}
                    onPress={() => router.push("/forgot-password")}
                  >
                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                  <Text style={styles.footerText}>
                    Don't have an account?{" "}
                    <Text 
                      style={styles.linkText}
                      onPress={() => router.push("/signup")}
                    >
                      Sign Up
                    </Text>
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {/* Loading Screen Overlay */}
      <LoadingScreen 
        visible={showLoadingScreen}
        message="Signing you in..."
        onComplete={() => setShowLoadingScreen(false)}
      />
    </SafeAreaView>
  );
}

const styles = {
  // Mobile-specific styles
  mobileImageHeader: {
    height: 280,
    position: 'relative',
  },
  
  mobileSignupImage: {
    width: '100%',
    height: '100%',
  },
  
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  
  overlayGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  
  mobileHeaderContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  
  // Two-column layout styles
  twoColumnContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  
  imageColumn: {
    flex: 1,
    minHeight: height,
  },
  
  signupImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  
  formColumn: {
    flex: 1,
    backgroundColor: GalaxyColors.light.backgroundSecondary,
  },
  
  formTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: GalaxyColors.light.text,
    marginTop: 16,
    textAlign: 'center',
  },
  
  formSubtitle: {
    fontSize: 16,
    color: GalaxyColors.light.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
  },
  
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: GalaxyColors.light.textInverse,
    marginBottom: 8,
    textAlign: 'center',
  },
  
  welcomeSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
  },
  
  scrollContainer: {
    flex: 1,
    backgroundColor: GalaxyColors.light.backgroundSecondary,
  },
  
  scrollContent: {
    paddingTop: 20,
  },
  
  formContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${GalaxyColors.light.error}15`,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: GalaxyColors.light.error,
  },
  
  errorText: {
    color: GalaxyColors.light.error,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  
  inputContainer: {
    marginBottom: 20,
  },
  
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GalaxyColors.light.input,
    borderWidth: 1,
    borderColor: GalaxyColors.light.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    minHeight: 52,
  },
  
  inputFocused: {
    borderColor: GalaxyColors.light.primary,
    borderWidth: 2,
    shadowColor: GalaxyColors.light.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  
  inputError: {
    borderColor: GalaxyColors.light.error,
    borderWidth: 2,
  },
  
  inputIcon: {
    marginRight: 12,
  },
  
  textInput: {
    flex: 1,
    fontSize: 16,
    color: GalaxyColors.light.text,
    paddingVertical: 12,
  },
  
  passwordToggle: {
    padding: 4,
  },
  
  buttonDisabled: {
    backgroundColor: GalaxyColors.light.buttonDisabled,
    opacity: 0.7,
  },
  
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  loadingIcon: {
    marginRight: 8,
  },
  
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: GalaxyColors.light.border,
  },
  
  dividerText: {
    color: GalaxyColors.light.textSecondary,
    fontSize: 14,
    marginHorizontal: 16,
  },
  
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: GalaxyColors.light.border,
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 16,
    shadowColor: GalaxyColors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: GalaxyColors.light.text,
    marginLeft: 12,
  },
  
  footer: {
    alignItems: 'center',
    marginTop: 24,
  },
  
  footerText: {
    fontSize: 16,
    color: GalaxyColors.light.textSecondary,
  },
  
  linkText: {
    color: GalaxyColors.light.primary,
    fontWeight: '600',
  },
  
  infoContainer: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: GalaxyColors.light.primary,
  },
  
  infoText: {
    color: GalaxyColors.light.text,
    fontSize: 14,
    lineHeight: 20,
  },
  
  forgotPasswordButton: {
    alignItems: 'center',
    marginTop: 10,
  },
  
  forgotPasswordText: {
    color: GalaxyColors.light.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  
  galaxyAnimation: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  
  desktopHeaderContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
};