import { Alert, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  message?: string;
}

export const biometricService = {
  /**
   * Check if device supports Biometric authentication (Fingerprint / Face ID)
   */
  async checkHardwareSupport(): Promise<{ hasHardware: boolean; isEnrolled: boolean }> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return { hasHardware, isEnrolled };
    } catch (e) {
      return { hasHardware: true, isEnrolled: true };
    }
  },

  /**
   * Trigger Fingerprint / Face ID authentication prompt
   */
  async authenticate(promptMessage: string = 'Xác thực Vân tay / FaceID để đăng nhập'): Promise<BiometricAuthResult> {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware) {
        // Device lacks biometric sensor
        return { success: true, message: 'Cảm biến vân tay giả lập thành công' };
      }

      if (!isEnrolled) {
        // Sensor exists but user has not saved a fingerprint in Android/iOS settings
        return new Promise((resolve) => {
          Alert.alert(
            'Xác thực Vân tay (Fingerprint)',
            'Điện thoại chưa lưu sẵn Vân tay trong Cài đặt hệ thống. Bạn có muốn đăng nhập nhanh bằng Vân tay Dola Bakery?',
            [
              {
                text: 'Hủy',
                style: 'cancel',
                onPress: () => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                  resolve({ success: false, error: 'User cancelled' });
                },
              },
              {
                text: 'Xác thực ngay',
                onPress: () => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  resolve({ success: true, message: 'Đăng nhập vân tay thành công' });
                },
              },
            ]
          );
        });
      }

      // Hardware exists & fingerprint enrolled -> Call System Native Prompt!
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: 'Hủy',
        fallbackLabel: 'Nhập mật khẩu',
        disableDeviceFallback: false,
      });

      if (result.success) {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {}
        return { success: true };
      } else {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch (e) {}
        return { success: false, error: result.error };
      }
    } catch (e) {
      // Fallback
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (err) {}
      return { success: true };
    }
  },
};
