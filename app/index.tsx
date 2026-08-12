import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { biometricService } from '@/services/biometricService';

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleAuth = () => {
    // For now, bypass auth and go directly to admin dashboard
    router.replace('/(admin)');
  };

  const handleCustomerApp = () => {
    router.replace('/(customer)');
  };

  const handleBiometricLogin = async () => {
    const result = await biometricService.authenticate('Đăng nhập Dola Bakery bằng Vân tay / FaceID');
    if (result.success) {
      router.replace('/(customer)');
    } else if (result.error && result.error !== 'User cancelled' && result.error !== 'user_cancel') {
      Alert.alert('Thông báo', 'Xác thực vân tay không thành công hoặc đã bị hủy.');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={[styles.logoCircle, { backgroundColor: colors.tint + '15' }]}>
            <Ionicons name="restaurant" size={60} color={colors.tint} />
          </View>
          <ThemedText style={[styles.title, { color: colors.tint }]}>DOLA BAKERY</ThemedText>
          <ThemedText style={styles.subtitle}>
            {isLogin ? 'Thế giới bánh ngọt tươi ngon mỗi ngày' : 'Đăng ký tài khoản Khách hàng'}
          </ThemedText>
        </View>

        {/* Quick Customer Storefront Entrance */}
        <TouchableOpacity 
          style={[styles.customerGuestBtn, { borderColor: colors.tint }]}
          onPress={handleCustomerApp}
        >
          <Ionicons name="storefront-outline" size={20} color={colors.tint} style={{ marginRight: 8 }} />
          <ThemedText style={[styles.customerGuestText, { color: colors.tint }]}>
            Vào cửa hàng mua sắm (Khách)
          </ThemedText>
        </TouchableOpacity>

        {/* Biometric Fingerprint / FaceID Login Button */}
        <TouchableOpacity 
          style={[styles.biometricBtn, { backgroundColor: colors.tint + '15', borderColor: colors.tint + '40' }]}
          onPress={handleBiometricLogin}
        >
          <Ionicons name="finger-print-outline" size={24} color={colors.tint} style={{ marginRight: 10 }} />
          <ThemedText style={[styles.biometricText, { color: colors.tint }]}>
            Đăng nhập bằng Vân tay / FaceID
          </ThemedText>
        </TouchableOpacity>

        <View style={styles.orDivider}>
          <View style={[styles.dividerLine, { backgroundColor: colors.icon + '30' }]} />
          <ThemedText style={styles.orText}>HOẶC ĐĂNG NHẬP</ThemedText>
          <View style={[styles.dividerLine, { backgroundColor: colors.icon + '30' }]} />
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          {!isLogin && (
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={colors.icon} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Họ và tên"
                placeholderTextColor={colors.icon}
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={colors.icon} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Email hoặc Tên đăng nhập"
              placeholderTextColor={colors.icon}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.icon} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Mật khẩu"
              placeholderTextColor={colors.icon}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.icon} />
            </TouchableOpacity>
          </View>

          {isLogin && (
            <TouchableOpacity style={styles.forgotPassword}>
              <ThemedText style={[styles.forgotText, { color: colors.tint }]}>Quên mật khẩu?</ThemedText>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.submitButton, { backgroundColor: colors.tint }]}
            onPress={handleAuth}
          >
            <ThemedText style={styles.submitText}>
              {isLogin ? 'ĐĂNG NHẬP ADMIN / CỬA HÀNG' : 'ĐĂNG KÝ TÀI KHOẢN'}
            </ThemedText>
          </TouchableOpacity>

          <View style={styles.switchMode}>
            <ThemedText style={styles.switchText}>
              {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
            </ThemedText>
            <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
              <ThemedText style={[styles.switchAction, { color: colors.tint }]}>
                {isLogin ? ' Đăng ký ngay' : ' Đăng nhập'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  customerGuestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  customerGuestText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  biometricText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  orText: {
    marginHorizontal: 12,
    fontSize: 12,
    fontWeight: 'bold',
    opacity: 0.5,
  },
  formSection: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 8,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  submitButton: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  switchMode: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  switchText: {
    opacity: 0.7,
  },
  switchAction: {
    fontWeight: 'bold',
  },
});
