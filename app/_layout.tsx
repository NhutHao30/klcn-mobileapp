import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { LanguageProvider } from '@/context/LanguageContext';
import { CustomThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';

// Bỏ qua các cảnh báo/thông báo hệ thống không ảnh hưởng chức năng trên dev client
LogBox.ignoreLogs([
  'Unable to activate keep awake',
  'activate keep awake',
  'Encountered two children with the same key',
]);

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <CartProvider>
        <CustomThemeProvider>
          <LanguageProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <Stack screenOptions={{ animation: 'slide_from_right' }}>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="(customer)" options={{ headerShown: false }} />
                <Stack.Screen name="(admin)" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
              </Stack>
              <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            </ThemeProvider>
          </LanguageProvider>
        </CustomThemeProvider>
      </CartProvider>
    </AuthProvider>
  );
}
