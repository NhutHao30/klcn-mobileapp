import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { soundService } from '@/services/soundService';

interface FloatingNotificationProps {
  visible: boolean;
  title?: string;
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  onClose: () => void;
}

export default function FloatingNotification({
  visible,
  title = 'Thông báo 🥐',
  message,
  type = 'success',
  onClose,
}: FloatingNotificationProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      // Play notification chime sound through speaker!
      soundService.playSuccessSound();

      // Slide down animation
      Animated.spring(slideAnim, {
        toValue: 50,
        useNativeDriver: true,
        bounciness: 8,
      }).start();

      // Auto hide after 3.5 seconds
      const timer = setTimeout(() => {
        hide();
      }, 3500);

      return () => clearTimeout(timer);
    } else {
      hide();
    }
  }, [visible]);

  const hide = () => {
    Animated.timing(slideAnim, {
      toValue: -120,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  if (!visible) return null;

  const getTypeConfig = () => {
    switch (type) {
      case 'success': return { icon: 'checkmark-circle-outline', color: '#10b981' };
      case 'warning': return { icon: 'warning-outline', color: '#f59e0b' };
      case 'error': return { icon: 'alert-circle-outline', color: '#ef4444' };
      default: return { icon: 'notifications-outline', color: '#3b82f6' };
    }
  };

  const config = getTypeConfig();

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          transform: [{ translateY: slideAnim }],
          backgroundColor: colors.cardBg,
          borderColor: colors.cardBorder,
        }
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: config.color + '15' }]}>
        <Ionicons name={config.icon as any} size={24} color={config.color} />
      </View>

      <View style={styles.textContainer}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        <ThemedText style={styles.message} numberOfLines={2}>{message}</ThemedText>
      </View>

      <TouchableOpacity style={styles.closeBtn} onPress={hide}>
        <Ionicons name="close" size={18} color={colors.icon} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    opacity: 0.7,
    lineHeight: 16,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
});
