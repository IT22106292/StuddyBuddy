/**
 * Navigation utilities for consistent back button behavior across the app
 * Provides safe navigation methods that handle edge cases and routing errors
 */

// Safe navigation function that handles different scenarios
export const safeNavigateBack = (router, fallbackRoute = '/home') => {
  try {
    // Check if we can go back in navigation history
    if (router.canGoBack && router.canGoBack()) {
      router.back();
    } else {
      // If no history, go to fallback route (usually home)
      router.replace(fallbackRoute);
    }
  } catch (error) {
    console.warn('Navigation error, falling back to home:', error);
    // If router.back() fails, try fallback
    try {
      router.replace(fallbackRoute);
    } catch (fallbackError) {
      console.error('Fallback navigation also failed:', fallbackError);
      // Last resort - try to push to home
      try {
        router.push(fallbackRoute);
      } catch (finalError) {
        console.error('All navigation methods failed:', finalError);
      }
    }
  }
};

// Navigate to a specific route with error handling
export const safeNavigateTo = (router, route) => {
  try {
    router.push(route);
  } catch (error) {
    console.warn('Navigation to route failed:', route, error);
    // Try replace as fallback
    try {
      router.replace(route);
    } catch (replaceError) {
      console.error('Replace navigation also failed:', replaceError);
    }
  }
};

// Replace current route with error handling
export const safeReplace = (router, route) => {
  try {
    router.replace(route);
  } catch (error) {
    console.warn('Replace navigation failed:', route, error);
    // Try push as fallback
    try {
      router.push(route);
    } catch (pushError) {
      console.error('Push navigation also failed:', pushError);
    }
  }
};

// Navigation paths for common destinations
export const ROUTES = {
  HOME: '/home',
  SIGNIN: '/signin',
  SIGNUP: '/signup',
  PROFILE: '/profile',
  CHAT_MENU: '/chat-menu',
  GLOBAL_CHAT: '/global-chat',
  HELPDESK: '/helpdesk',
  HELPDESK_APPLY: '/helpdesk-apply',
  HELPDESK_ADMIN: '/helpdesk-admin',
  AI_CHATBOT: '/ai-chatbot-hf',
  ADMIN: '/admin',
  GAMES_MENU: '/games-menu',
  ESCAPE_ROOM: '/escape-room',
  QUIZ: '/quiz',
  QUIZZES: '/quizzes',
  SMART_MATCHING: '/smart-matching',
  ONBOARDING: '/onboarding',
};

// Get appropriate fallback route based on current route
export const getFallbackRoute = (currentRoute) => {
  // Chat-related screens fall back to chat menu
  if (currentRoute?.includes('chat') || currentRoute?.includes('helpdesk')) {
    return ROUTES.CHAT_MENU;
  }
  
  // Game-related screens fall back to games menu or home
  if (currentRoute?.includes('game') || currentRoute?.includes('quiz') || currentRoute?.includes('escape')) {
    return ROUTES.HOME; // Assuming games menu is accessible from home
  }
  
  // Admin screens fall back to admin dashboard
  if (currentRoute?.includes('admin')) {
    return ROUTES.ADMIN;
  }
  
  // Auth screens fall back to signin
  if (currentRoute?.includes('signin') || currentRoute?.includes('signup') || currentRoute?.includes('onboarding')) {
    return ROUTES.SIGNIN;
  }
  
  // Default fallback is home
  return ROUTES.HOME;
};

// Smart back navigation that uses context-aware fallbacks
export const smartNavigateBack = (router, currentRoute = null) => {
  const fallback = getFallbackRoute(currentRoute);
  safeNavigateBack(router, fallback);
};