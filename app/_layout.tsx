import React, { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import * as Linking from 'expo-linking';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { LanguageProvider } from '@/context/LanguageContext';
import { CustomThemeProvider } from '@/context/ThemeContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';

// Bỏ qua các cảnh báo/thông báo hệ thống không ảnh hưởng chức năng trên dev client
LogBox.ignoreLogs([
  'Unable to activate keep awake',
  'activate keep awake',
  'Encountered two children with the same key',
]);

function NavigationRoot() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { loginWithToken } = useAuth();

  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = event?.url;
      if (!url) return;
      if (url.includes('token=') || url.includes('google-auth')) {
        try {
          const parsed = Linking.parse(url);
          const token = (parsed.queryParams?.token as string) || null;
          if (token) {
            const res = await loginWithToken(token);
            if (res.success) {
              if (res.isStaff) {
                router.replace('/(admin)/' as any);
              } else {
                router.replace('/(customer)/' as any);
              }
            }
          }
        } catch (e) {
          console.error('Deep link auth error in NavigationRoot:', e);
        }
      }
    };

    const sub = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => sub.remove();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ animation: 'slide_from_right' }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="google-auth" options={{ headerShown: false }} />
        <Stack.Screen name="(customer)" options={{ headerShown: false }} />
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="+not-found" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <CustomThemeProvider>
          <LanguageProvider>
            <NavigationRoot />
          </LanguageProvider>
        </CustomThemeProvider>
      </CartProvider>
    </AuthProvider>
  );
}
