import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert, useColorScheme } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';

export default function GoogleAuthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string; error?: string; google?: string }>();
  const { loginWithToken } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [statusText, setStatusText] = useState('Đang hoàn tất đăng nhập Google...');

  useEffect(() => {
    let isMounted = true;

    const handleGoogleCallback = async () => {
      const token = params.token;
      const error = params.error;

      if (error) {
        if (isMounted) setStatusText('Đăng nhập Google bị hủy hoặc có lỗi xảy ra.');
        Alert.alert('Đăng nhập thất bại', 'Xác thực Google bị hủy hoặc có lỗi xảy ra.');
        setTimeout(() => {
          if (isMounted) router.replace('/login');
        }, 1200);
        return;
      }

      if (token) {
        if (isMounted) setStatusText('Xác thực thành công! Đang tải dữ liệu...');
        try {
          const res = await loginWithToken(token);
          if (res.success) {
            if (res.isStaff) {
              router.replace('/(admin)/' as any);
            } else {
              router.replace('/(customer)/' as any);
            }
            return;
          } else {
            if (isMounted) setStatusText(res.error || 'Lỗi lấy thông tin người dùng.');
            Alert.alert('Lỗi đăng nhập', res.error || 'Không thể đăng nhập bằng tài khoản Google.');
          }
        } catch (e: any) {
          if (isMounted) setStatusText(e?.message || 'Lỗi kết nối máy chủ.');
          Alert.alert('Lỗi', e?.message || 'Có lỗi xảy ra khi nạp thông tin tài khoản.');
        }
      } else {
        if (isMounted) setStatusText('Không tìm thấy mã xác thực Google.');
      }

      setTimeout(() => {
        if (isMounted) router.replace('/login');
      }, 1500);
    };

    handleGoogleCallback();

    return () => {
      isMounted = false;
    };
  }, [params.token, params.error]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.tint} />
      <ThemedText style={[styles.statusText, { color: colors.text }]}>{statusText}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

