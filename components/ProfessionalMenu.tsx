import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, Modal, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { GlobalStyles } from '../constants/GlobalStyles';

const { width, height } = Dimensions.get('window');

interface ProfessionalMenuProps {
  visible: boolean;
  onClose: () => void;
  userProfile?: any;
  onNavigate: (route: string) => void;
  onLogout: () => void;
}

export const ProfessionalMenu: React.FC<ProfessionalMenuProps> = ({
  visible,
  onClose,
  userProfile,
  onNavigate,
  onLogout,
}) => {
  const menuItems = [
    {
      icon: 'person-outline',
      title: 'Profile',
      subtitle: 'View and edit your profile',
      route: '/profile',
      color: Colors.light.primary,
    },
    {
      icon: 'book-outline',
      title: 'Quizzes',
      subtitle: 'Take practice quizzes',
      route: '/quizzes',
      color: Colors.light.success,
    },
    {
      icon: 'chatbubbles-outline',
      title: 'Messages',
      subtitle: 'Chat with tutors and students',
      route: '/chat-menu',
      color: Colors.light.info,
    },
    {
      icon: 'notifications-outline',
      title: 'Notifications',
      subtitle: 'View your notifications',
      route: '/notifications',
      color: Colors.light.warning,
    },
    ...(userProfile?.isAdmin ? [{
      icon: 'settings-outline' as any,
      title: 'Admin Panel',
      subtitle: 'Manage the platform',
      route: '/admin',
      color: Colors.light.accent,
    }] : []),
    {
      icon: 'help-circle-outline',
      title: 'Help & Support',
      subtitle: 'Get help and support',
      route: '/help',
      color: Colors.light.textSecondary,
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
      }}>
        <View style={{
          backgroundColor: Colors.light.surface,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingTop: 20,
          paddingHorizontal: 20,
          paddingBottom: 40,
          maxHeight: height * 0.8,
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
            paddingHorizontal: 4,
          }}>
            <Text style={[GlobalStyles.heading3, {
              color: Colors.light.text,
              marginBottom: 0,
            }]}>
              Menu
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: Colors.light.backgroundSecondary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="close" size={20} color={Colors.light.icon} />
            </TouchableOpacity>
          </View>

          {/* User Info */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: Colors.light.backgroundSecondary,
            borderRadius: 16,
            padding: 16,
            marginBottom: 24,
          }}>
            <View style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: Colors.light.primary,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}>
              <Ionicons name="person" size={24} color={Colors.light.textInverse} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[GlobalStyles.heading4, {
                color: Colors.light.text,
                marginBottom: 2,
              }]}>
                {userProfile?.fullName || 'User'}
              </Text>
              <Text style={[GlobalStyles.bodySmall, {
                color: Colors.light.textSecondary,
              }]}>
                {userProfile?.isTutor ? 'Tutor' : 'Student'} • {userProfile?.email}
              </Text>
            </View>
          </View>

          {/* Menu Items */}
          <View style={{ marginBottom: 24 }}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  onNavigate(item.route);
                  onClose();
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 16,
                  paddingHorizontal: 4,
                  borderBottomWidth: index < menuItems.length - 1 ? 1 : 0,
                  borderBottomColor: Colors.light.border,
                }}
              >
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: item.color + '20',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 16,
                }}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[GlobalStyles.body, {
                    color: Colors.light.text,
                    fontWeight: '600',
                    marginBottom: 2,
                  }]}>
                    {item.title}
                  </Text>
                  <Text style={[GlobalStyles.bodySmall, {
                    color: Colors.light.textSecondary,
                  }]}>
                    {item.subtitle}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.light.icon} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            onPress={() => {
              onLogout();
              onClose();
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: Colors.light.error + '10',
              borderRadius: 12,
              paddingVertical: 16,
              paddingHorizontal: 20,
            }}
          >
            <Ionicons name="log-out-outline" size={20} color={Colors.light.error} style={{ marginRight: 8 }} />
            <Text style={[GlobalStyles.body, {
              color: Colors.light.error,
              fontWeight: '600',
            }]}>
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default ProfessionalMenu;