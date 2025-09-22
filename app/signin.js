import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import {
  Dimensions,
  Image,
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
import { auth } from "../firebase/firebaseConfig";

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

  const handleSignIn = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setError("");
    setShowLoadingScreen(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Keep loading screen for smooth transition
      setTimeout(() => {
        router.replace("/home");
      }, 1000);
    } catch (err) {
      setError("Invalid email or password");
      setShowLoadingScreen(false);
    } finally {
      setIsLoading(false);
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
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.divider} />
                </View>

                <TouchableOpacity
                  style={GlobalStyles.buttonSecondary}
                  onPress={() => router.push("/signup")}
                >
                  <Text style={GlobalStyles.buttonSecondaryText}>Create New Account</Text>
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
                    <Text style={styles.dividerText}>or</Text>
                    <View style={styles.divider} />
                  </View>

                  <TouchableOpacity
                    style={GlobalStyles.buttonSecondary}
                    onPress={() => router.push("/signup")}
                  >
                    <Text style={GlobalStyles.buttonSecondaryText}>Create New Account</Text>
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