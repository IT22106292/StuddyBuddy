import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Text, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { GlobalStyles } from '../constants/GlobalStyles';

const { width } = Dimensions.get('window');

interface ToastProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onHide?: () => void;
  position?: 'top' | 'bottom';
}

export const Toast: React.FC<ToastProps> = ({
  visible,
  message,
  type = 'info',
  duration = 3000,
  onHide,
  position = 'top'
}) => {
  const slideAnim = useRef(new Animated.Value(position === 'top' ? -100 : 100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: position === 'top' ? -100 : 100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onHide) onHide();
    });
  };

  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: Colors.light.success,
          icon: 'checkmark-circle',
          iconColor: Colors.light.textInverse,
        };
      case 'error':
        return {
          backgroundColor: Colors.light.error,
          icon: 'close-circle',
          iconColor: Colors.light.textInverse,
        };
      case 'warning':
        return {
          backgroundColor: Colors.light.warning,
          icon: 'warning',
          iconColor: Colors.light.textInverse,
        };
      default:
        return {
          backgroundColor: Colors.light.primary,
          icon: 'information-circle',
          iconColor: Colors.light.textInverse,
        };
    }
  };

  const config = getToastConfig();

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: 20,
          right: 20,
          zIndex: 1000,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
        position === 'top' ? { top: 60 } : { bottom: 100 },
      ]}
    >
      <View
        style={[
          {
            backgroundColor: config.backgroundColor,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          },
        ]}
      >
        <Ionicons
          name={config.icon as any}
          size={20}
          color={config.iconColor}
          style={{ marginRight: 12 }}
        />
        <Text
          style={[
            GlobalStyles.body,
            {
              color: config.iconColor,
              flex: 1,
              fontSize: 14,
              fontWeight: '500',
            },
          ]}
        >
          {message}
        </Text>
      </View>
    </Animated.View>
  );
};

export default Toast;