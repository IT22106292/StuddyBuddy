import React, { useRef, useState } from "react";
import { SafeAreaView, View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Constants from "expo-constants";

// This is a stub using fetch to Google Gemini's free API compatible endpoint.
// Replace GCP project and key with your own. Consider moving the key to env.
const readGeminiKey = () => {
  // Method 1: Environment variable (highest priority)
  if (process.env.EXPO_PUBLIC_GEMINI_API_KEY) {
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    console.log('🔑 [API KEY DEBUG] Found key in process.env.EXPO_PUBLIC_GEMINI_API_KEY');
    console.log('🔑 [API KEY DEBUG] API Key preview:', `${apiKey.substring(0, Math.min(10, apiKey.length))}...`);
    return apiKey;
  }
  
  // Method 2: Expo config
  if (Constants?.expoConfig?.extra?.EXPO_PUBLIC_GEMINI_API_KEY) {
    const apiKey = Constants.expoConfig.extra.EXPO_PUBLIC_GEMINI_API_KEY;
    console.log('🔑 [API KEY DEBUG] Found key in Constants.expoConfig.extra');
    console.log('🔑 [API KEY DEBUG] API Key preview:', `${apiKey.substring(0, Math.min(10, apiKey.length))}...`);
    return apiKey;
  }
  
  // Method 3: Manifest
  if (Constants?.manifest?.extra?.EXPO_PUBLIC_GEMINI_API_KEY) {
    const apiKey = Constants.manifest.extra.EXPO_PUBLIC_GEMINI_API_KEY;
    console.log('🔑 [API KEY DEBUG] Found key in Constants.manifest.extra');
    console.log('🔑 [API KEY DEBUG] API Key preview:', `${apiKey.substring(0, Math.min(10, apiKey.length))}...`);
    return apiKey;
  }
  
  // Method 4: Manifest2
  if (Constants?.manifest2?.extra?.EXPO_PUBLIC_GEMINI_API_KEY) {
    const apiKey = Constants.manifest2.extra.EXPO_PUBLIC_GEMINI_API_KEY;
    console.log('🔑 [API KEY DEBUG] Found key in Constants.manifest2.extra');
    console.log('🔑 [API KEY DEBUG] API Key preview:', `${apiKey.substring(0, Math.min(10, apiKey.length))}...`);
    return apiKey;
  }
  
  // Log debugging information if no key found
  console.log('🔑 [API KEY DEBUG] No API key found in any source');
  console.log('🔑 [API KEY DEBUG] Constants structure:', {
    hasConstants: !!Constants,
    hasExpoConfig: !!Constants?.expoConfig,
    hasExtra: !!Constants?.expoConfig?.extra,
    expoConfigExtraKeys: Constants?.expoConfig?.extra ? Object.keys(Constants.expoConfig.extra) : 'N/A',
    hasManifest: !!Constants?.manifest,
    manifestExtraKeys: Constants?.manifest?.extra ? Object.keys(Constants.manifest.extra) : 'N/A',
    hasManifest2: !!Constants?.manifest2,
    manifest2ExtraKeys: Constants?.manifest2?.extra ? Object.keys(Constants.manifest2.extra) : 'N/A',
  });
  
  return "";
};

async function fetchGeminiResponse(prompt) {
  const apiKey = readGeminiKey();
  if (!apiKey) {
    return "Gemini API key missing. Set EXPO_PUBLIC_GEMINI_API_KEY in app.json.";
  }
  
  console.log('🤖 [AI CHATBOT] Making API call to Gemini...');
  console.log('🤖 [AI CHATBOT] API Key found:', apiKey ? `Yes (${apiKey.length} chars)` : 'No');
  console.log('🤖 [AI CHATBOT] API Key preview:', apiKey ? `${apiKey.substring(0, Math.min(10, apiKey.length))}...` : 'None');
  
  // Use models that we know are available based on the list
  const configurations = [
    { version: 'v1beta', model: 'gemini-2.0-flash-001' },
    { version: 'v1beta', model: 'gemini-2.0-flash' },
    { version: 'v1beta', model: 'gemini-flash-latest' },
    { version: 'v1', model: 'gemini-2.0-flash-001' },
  ];
  
  for (const config of configurations) {
    console.log(`🤖 [AI CHATBOT] Trying ${config.version}/${config.model}...`);
    
    try {
      const url = `https://generativelanguage.googleapis.com/${config.version}/models/${config.model}:generateContent?key=${apiKey}`;
      
      const requestBody = {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7,
        }
      };
      
      console.log('🤖 [AI CHATBOT] Request URL:', url);
      console.log('🤖 [AI CHATBOT] Request Body:', JSON.stringify(requestBody, null, 2));
      
      const res = await fetch(url, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log('🤖 [AI CHATBOT] Response status:', res.status);
      console.log('🤖 [AI CHATBOT] Response headers:', Object.fromEntries(res.headers.entries()));
      
      // Handle different response status codes
      if (res.status === 400) {
        const errorText = await res.text();
        console.error('🤖 [AI CHATBOT] Bad Request (400):', errorText);
        return `❌ API Error (400): Bad Request. This might indicate an issue with the API key or request format.`;
      }
      
      if (res.status === 401) {
        console.error('🤖 [AI CHATBOT] Unauthorized (401): Invalid API key');
        return `❌ API Authentication Error (401): Invalid API key. Please verify your Gemini API key in app.json`;
      }
      
      if (res.status === 403) {
        console.error('🤖 [AI CHATBOT] Forbidden (403): API key lacks permissions');
        return `❌ API Permission Error (403): Your API key doesn't have permission to access this resource.`;
      }
      
      if (res.status === 429) {
        console.error('🤖 [AI CHATBOT] Rate Limited (429): Quota exceeded');
        return `⏳ API Rate Limit Exceeded (429): You've exceeded your quota. Try again later.`;
      }
      
      if (res.status >= 500) {
        console.error('🤖 [AI CHATBOT] Server Error:', res.status);
        return `❌ Server Error (${res.status}): The Gemini API is temporarily unavailable. Please try again later.`;
      }
      
      // Check content type
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const responseText = await res.text();
        console.error('🤖 [AI CHATBOT] Non-JSON response:', responseText);
        continue;
      }
      
      const data = await res.json();
      console.log('🤖 [AI CHATBOT] Parsed response:', JSON.stringify(data, null, 2));
      
      if (!res.ok) {
        console.error('🤖 [AI CHATBOT] API Error Details:', {
          status: res.status,
          statusText: res.statusText,
          response: data
        });
        
        // Handle specific error messages
        if (data.error) {
          return `❌ API Error: ${data.error.message || 'Unknown error occurred'}`;
        }
        
        return `❌ API Error (${res.status}): ${res.statusText || 'Unknown error'}`;
      }
      
      // Extract text from response
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      console.log('🤖 [AI CHATBOT] Extracted text:', text);
      
      if (text) {
        console.log(`🤖 [AI CHATBOT] SUCCESS with ${config.version}/${config.model}!`);
        return text;
      } else {
        console.log(`🤖 [AI CHATBOT] No text in response from ${config.version}/${config.model}, trying next...`);
        continue;
      }
      
    } catch (e) {
      console.error(`🤖 [AI CHATBOT] Network error with ${config.model}:`, e.message);
      console.error('🤖 [AI CHATBOT] Error stack:', e.stack);
      // Continue to next configuration
    }
  }
  
  // If all configurations failed, return helpful error
  return "❌ All Gemini models failed. Please check your API key and internet connection.";
}

export default function AIChatbotScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef(null);

  const send = async () => {
    if (!input.trim() || isLoading) return;
    
    console.log('🤖 [AI CHATBOT] Send function called with:', input.trim());
    
    const userMsg = { id: Date.now() + "_u", role: "user", text: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    
    // Scroll to bottom
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    
    try {
      // Get AI response
      const reply = await fetchGeminiResponse(userMsg.text);
      console.log('🤖 [AI CHATBOT] Received response:', reply);
      const aiMsg = { id: Date.now() + "_a", role: "ai", text: reply };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error('🤖 [AI CHATBOT] Error getting response:', error);
      const errorMsg = { id: Date.now() + "_e", role: "ai", text: "❌ Sorry, I encountered an error. Please try again." };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      // Scroll to bottom again
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  };

  const renderItem = ({ item }) => (
    <View style={[styles.msg, item.role === "user" ? styles.mine : styles.theirs]}>
      <Text style={styles.msgText}>{item.text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>🤖 AI Chatbot</Text>
        {isLoading && (
          <View style={styles.loadingIndicator}>
            <Text style={styles.loadingText}>Thinking...</Text>
          </View>
        )}
      </View>
      
      {messages.length === 0 && (
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>Welcome to Gemini AI Chatbot!</Text>
          
        </View>
      )}
      
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
      
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.inputRow}>
          <TextInput
            placeholder="Ask anything... (Press Enter to send)"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={send}
            onKeyPress={(e) => {
              if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            style={styles.input}
            multiline
            returnKeyType="send"
            blurOnSubmit={false}
            editable={!isLoading}
          />
          <TouchableOpacity onPress={send} style={[styles.sendBtn, isLoading && styles.sendBtnDisabled]} disabled={isLoading}>
            <Ionicons name={isLoading ? "hourglass" : "send"} size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  title: { 
    fontSize: 18, 
    fontWeight: "600", 
    color: "#333",
    flex: 1 
  },
  loadingIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#e3f2fd",
    borderRadius: 20,
    borderColor: "#bbdefb",
    borderWidth: 1,
  },
  loadingText: {
    fontSize: 13,
    color: "#1976d2",
    fontWeight: "600",
  },
  welcomeContainer: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    margin: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1976d2',
    marginBottom: 12,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  list: { padding: 16 },
  msg: {
    padding: 16, // Increased padding for better readability
    marginVertical: 6, // Increased vertical spacing
    borderRadius: 18, // More rounded corners
    maxWidth: "85%", // Slightly wider messages
    shadowColor: "#000", // Added subtle shadow for depth
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2, // For Android shadow
  },
  mine: {
    backgroundColor: "#007AFF", // User messages (blue)
    alignSelf: "flex-end",
  },
  theirs: {
    backgroundColor: "#f0f0f0", // AI messages (light gray)
    alignSelf: "flex-start",
  },
  msgText: {
    color: "#333", // Dark text for better visibility on both light and blue backgrounds
    fontSize: 16,
    lineHeight: 22, // Better line spacing for readability
  },
  inputRow: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#ffffff",
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    backgroundColor: "#f8f9fa",
    fontSize: 16,
    maxHeight: 120,
    color: "#333", // Added text color for better visibility
  },
  sendBtn: {
    backgroundColor: "#007AFF",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#a0a0a0",
  },
});