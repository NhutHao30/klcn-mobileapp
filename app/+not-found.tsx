import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/AuthContext';

export default function NotFoundScreen() {
  const pathname = usePathname();
  const router = useRouter();
  const { loginWithToken } = useAuth();
  const [processingAuth, setProcessingAuth] = useState(false);

  useEffect(() => {
    const checkDeepLinkAuth = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        const targetUrl = initialUrl || pathname;
        if (targetUrl && (targetUrl.includes('token=') || targetUrl.includes('google-auth'))) {
          setProcessingAuth(true);
          const parsed = Linking.parse(targetUrl);
          const token = (parsed.queryParams?.token as string) || null;
          if (token) {
            const res = await loginWithToken(token);
            if (res.success) {
              if (res.isStaff) {
                router.replace('/(admin)/' as any);
              } else {
                router.replace('/(customer)/' as any);
              }
              return;
            }
          }
        }
      } catch (e) {
        console.error('Error handling deep link in not-found:', e);
      } finally {
        setProcessingAuth(false);
      }
    };

    checkDeepLinkAuth();
  }, [pathname]);

  if (processingAuth) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#d39e00" />
        <ThemedText style={styles.text}>Đang xử lý đăng nhập Google...</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>Không tìm thấy màn hình</ThemedText>
      <ThemedText style={styles.text}>Đường dẫn không tồn tại hoặc đã thay đổi.</ThemedText>
      <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(customer)/' as any)}>
        <ThemedText style={styles.btnText}>Về trang chủ</ThemedText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#0f172a',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
  },
  btn: {
    backgroundColor: '#d39e00',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
