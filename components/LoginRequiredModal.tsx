import React from 'react';
import { StyleSheet, View, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/AuthContext';

interface LoginRequiredModalProps {
  visible: boolean;
  onClose: () => void;
  actionText?: string;
}

export default function LoginRequiredModal({ visible, onClose, actionText = 'thực hiện thao tác này' }: LoginRequiredModalProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { logout } = useAuth();

  const handleLoginNow = async () => {
    onClose();
    try {
      if (logout) {
        await logout();
      }
    } catch (e) {}

    router.replace('/login');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          {/* TOP LOCK ICON BADGE */}
          <View style={[styles.iconCircle, { backgroundColor: colors.tint + '18' }]}>
            <Ionicons name="lock-closed-outline" size={32} color={colors.tint} />
          </View>

          {/* TITLE & SUBTITLE */}
          <ThemedText style={styles.title}>Yêu cầu đăng nhập 🔒</ThemedText>
          <ThemedText style={styles.message}>
            Vui lòng đăng nhập tài khoản Givral Bakery để {actionText} và lưu trữ dữ liệu của bạn.
          </ThemedText>

          {/* ACTION BUTTONS */}
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.btn, styles.cancelBtn, { borderColor: colors.cardBorder }]}
              onPress={onClose}
            >
              <ThemedText style={[styles.cancelText, { color: colors.text }]}>Để sau</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.btn, styles.loginBtn, { backgroundColor: colors.tint }]}
              onPress={handleLoginNow}
            >
              <Ionicons name="log-in-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
              <ThemedText style={styles.loginText}>Đăng nhập ngay</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    opacity: 0.75,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  cancelBtn: {
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
  },
  loginBtn: {
    elevation: 2,
  },
  loginText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
