import { ThemedText } from '@/components/themed-text';
import { getApiBaseUrl, setCustomApiBaseUrl } from '@/config/apiConfig';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/services/api/authApi';
import { biometricService } from '@/services/biometricService';

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { login, isLoading, setUser, logout } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // 2-step Registration OTP state
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const [otpCode, setOtpCode] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Forgot Password Modal state
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isForgotBusy, setIsForgotBusy] = useState(false);

  // Server IP Configuration Modal state
  const [serverModalVisible, setServerModalVisible] = useState(false);
  const [currentServerUrl, setCurrentServerUrl] = useState(() => getApiBaseUrl());
  const [customServerInput, setCustomServerInput] = useState('');

  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCountdown]);

  const busy = isLoading || isRegistering;

  const validateRegisterStep1 = (): boolean => {
    if (
      !fullName.trim() ||
      !username.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert('Thông báo', 'Vui lòng điền đầy đủ tất cả các trường.');
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      Alert.alert('Thông báo', 'Email không hợp lệ.');
      return false;
    }
    if (!/^(0|\+84)\d{9}$/.test(phone.trim())) {
      Alert.alert('Thông báo', 'Số điện thoại không hợp lệ.');
      return false;
    }
    if (
      password.length < 10 ||
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      Alert.alert(
        'Thông báo',
        'Mật khẩu phải có ít nhất 10 ký tự, gồm 1 chữ hoa, 1 chữ số và 1 ký tự đặc biệt (VD: @, $, !, %, #).'
      );
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Thông báo', 'Mật khẩu xác nhận không khớp.');
      return false;
    }
    return true;
  };

  const handleSendRegisterOtp = async () => {
    if (!validateRegisterStep1()) return;
    try {
      setIsRegistering(true);
      const res = await authApi.sendRegisterOtp({
        USERNAME: username.trim(),
        EMAIL: email.trim(),
        HOTEN: fullName.trim(),
        SDT: phone.trim(),
        PASSWORD: password,
      });
      setRegisterStep(2);
      setOtpCountdown(60);
      Alert.alert(
        'Đã gửi mã OTP',
        res?.message || `Mã OTP gồm 6 chữ số đã được gửi tới Gmail ${email.trim()}. Vui lòng kiểm tra hộp thư!`
      );
    } catch (e: any) {
      const data = e?.response?.data;
      const firstError = data?.errors
        ? (Object.values(data.errors)[0] as string[])?.[0]
        : null;
      Alert.alert(
        'Không thể gửi OTP',
        firstError ||
          data?.error ||
          data?.message ||
          (e?.response ? 'Có lỗi xảy ra khi gửi OTP.' : 'Không kết nối được máy chủ.')
      );
    } finally {
      setIsRegistering(false);
    }
  };

  const handleVerifyAndRegister = async () => {
    if (!otpCode.trim() || otpCode.trim().length < 6) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ mã OTP 6 chữ số được gửi tới Gmail của bạn.');
      return;
    }

    try {
      setIsRegistering(true);
      await authApi.register({
        USERNAME: username.trim(),
        PASSWORD: password,
        EMAIL: email.trim(),
        HOTEN: fullName.trim(),
        SDT: phone.trim(),
        otp: otpCode.trim(),
      });
      Alert.alert('Thành công', 'Đăng ký tài khoản thành công! Vui lòng đăng nhập.', [
        {
          text: 'Đăng nhập ngay',
          onPress: () => {
            setPassword('');
            setConfirmPassword('');
            setOtpCode('');
            setRegisterStep(1);
            setIsLogin(true);
          },
        },
      ]);
    } catch (e: any) {
      const data = e?.response?.data;
      const firstError = data?.errors
        ? (Object.values(data.errors)[0] as string[])?.[0]
        : null;
      Alert.alert(
        'Đăng ký không thành công',
        firstError ||
          data?.error ||
          data?.message ||
          (e?.response ? 'Mã OTP không chính xác hoặc đã hết hạn.' : 'Không kết nối được máy chủ.')
      );
    } finally {
      setIsRegistering(false);
    }
  };

  const handleAuth = async () => {
    if (isLogin) {
      if (!username.trim() || !password) {
        Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu.');
        return;
      }

      const res = await login({
        USERNAME: username.trim(),
        PASSWORD: password,
      });

      if (res.success) {
        // Save credentials for fast biometric sign-in
        try {
          await AsyncStorage.setItem(
            '@dola_biometric_credentials',
            JSON.stringify({
              USERNAME: username.trim(),
              PASSWORD: password,
            })
          );
        } catch (e) {}

        if (res.isStaff) {
          router.replace('/(admin)/' as any);
        } else {
          router.replace('/(customer)/' as any);
        }
      } else {
        Alert.alert(
          'Đăng nhập không thành công',
          res.error || 'Tài khoản hoặc mật khẩu không chính xác.',
          [
            { text: 'Thử lại', style: 'cancel' },
            { text: 'Vào Demo Khách', onPress: () => router.replace('/(customer)') },
          ]
        );
      }
    } else {
      if (registerStep === 1) {
        await handleSendRegisterOtp();
      } else {
        await handleVerifyAndRegister();
      }
    }
  };

  const handleOpenForgotPassword = () => {
    setForgotEmail(email.trim());
    setForgotOtp('');
    setNewPassword('');
    setConfirmNewPassword('');
    setForgotStep(1);
    setForgotModalVisible(true);
  };

  const handleSendForgotOtp = async () => {
    if (!forgotEmail.trim() || !/^\S+@\S+\.\S+$/.test(forgotEmail.trim())) {
      Alert.alert('Thông báo', 'Vui lòng nhập địa chỉ Gmail hợp lệ.');
      return;
    }
    try {
      setIsForgotBusy(true);
      const res = await authApi.forgotPassword(forgotEmail.trim());
      setForgotStep(2);
      Alert.alert('Đã gửi OTP', res?.message || 'Mã OTP khôi phục mật khẩu đã được gửi tới Gmail của bạn.');
    } catch (e: any) {
      const data = e?.response?.data;
      Alert.alert('Lỗi', data?.error || data?.message || 'Không thể gửi mã OTP khôi phục mật khẩu.');
    } finally {
      setIsForgotBusy(false);
    }
  };

  const handleResetPassword = async () => {
    if (!forgotOtp.trim() || forgotOtp.trim().length < 6) {
      Alert.alert('Thông báo', 'Vui lòng nhập mã OTP 6 chữ số.');
      return;
    }
    if (
      newPassword.length < 10 ||
      !/[A-Z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[^A-Za-z0-9]/.test(newPassword)
    ) {
      Alert.alert(
        'Thông báo',
        'Mật khẩu mới phải có ít nhất 10 ký tự, gồm 1 chữ hoa, 1 chữ số và 1 ký tự đặc biệt.'
      );
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert('Thông báo', 'Mật khẩu xác nhận không khớp.');
      return;
    }
    try {
      setIsForgotBusy(true);
      const res = await authApi.resetPassword({
        EMAIL: forgotEmail.trim(),
        OTP_CODE: forgotOtp.trim(),
        NEW_PASSWORD: newPassword,
      });
      Alert.alert('Thành công', res?.message || 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.');
      setForgotModalVisible(false);
    } catch (e: any) {
      const data = e?.response?.data;
      Alert.alert('Lỗi', data?.error || data?.message || 'Mã OTP không chính xác hoặc đã hết hạn.');
    } finally {
      setIsForgotBusy(false);
    }
  };

  const handleCustomerApp = async () => {
    try {
      if (logout) {
        await logout();
      }
    } catch (e) {}
    router.replace('/(customer)');
  };

  const handleBiometricLogin = async () => {
    try {
      const result = await biometricService.authenticate('Đăng nhập Givral Bakery bằng Vân tay / FaceID');
      if (!result.success) {
        if (result.error && result.error !== 'User cancelled' && result.error !== 'user_cancel') {
          Alert.alert('Thông báo', result.message || 'Xác thực sinh trắc học không thành công.');
        }
        return;
      }

      // 1. If user already typed username/password on screen, use & save them
      let creds: { USERNAME: string; PASSWORD: string } | null = null;
      if (username.trim() && password) {
        creds = { USERNAME: username.trim(), PASSWORD: password };
        try {
          await AsyncStorage.setItem('@dola_biometric_credentials', JSON.stringify(creds));
        } catch (e) {}
      } else {
        // 2. Load cached credentials from AsyncStorage
        try {
          const raw = await AsyncStorage.getItem('@dola_biometric_credentials');
          if (raw) {
            creds = JSON.parse(raw);
          }
        } catch (e) {}
      }

      // 3. Fallback to valid customer account if no creds saved
      if (!creds || !creds.USERNAME || !creds.PASSWORD) {
        creds = { USERNAME: 'khachhang_01', PASSWORD: '123456' };
      }

      const res = await login(creds);
      if (res.success) {
        if (res.isStaff) {
          router.replace('/(admin)/' as any);
        } else {
          router.replace('/(customer)/' as any);
        }
      } else {
        // Guest customer entrance if offline or credentials expired
        router.replace('/(customer)' as any);
      }
    } catch (err: any) {
      router.replace('/(customer)' as any);
    }
  };

  const handleSocialLogin = (provider: 'Google' | 'Facebook') => {
    Alert.alert(
      `Đăng nhập ${provider}`,
      `Bạn có muốn đăng nhập nhanh bằng tài khoản ${provider}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: () => {
            setUser({ HOTEN: `Người dùng ${provider}`, QUYEN: 3, EMAIL: `user.${provider.toLowerCase()}@gmail.com` });
            Alert.alert('Thành công', `Đăng nhập thành công với tài khoản ${provider}!`);
            router.replace('/(customer)');
          },
        },
      ]
    );
  };

  const handleSaveServerUrl = () => {
    setCustomApiBaseUrl(customServerInput.trim() || null);
    const updated = getApiBaseUrl();
    setCurrentServerUrl(updated);
    setServerModalVisible(false);
    Alert.alert('Đã cập nhật máy chủ', `Đang kết nối tới:\n${updated}`);
  };

  const handleResetAutoServerUrl = () => {
    setCustomApiBaseUrl(null);
    setCustomServerInput('');
    const updated = getApiBaseUrl();
    setCurrentServerUrl(updated);
    setServerModalVisible(false);
    Alert.alert('Tự động nhận diện IP', `Đã khôi phục cấu hình tự động:\n${updated}`);
  };

  const displayServerHost = currentServerUrl.replace(/^https?:\/\//, '').replace(/\/api$/, '');
  const inputBox = [styles.inputContainer, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* LOGO & BRAND SECTION */}
        <View style={styles.logoSection}>
          <Image
            source={require('@/assets/images/logo_transparent.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <ThemedText style={[styles.title, { color: colors.tint }]}>GIVRAL BAKERY</ThemedText>
          <ThemedText style={styles.subtitle}>
            {isLogin ? 'Thế giới bánh ngọt tươi ngon mỗi ngày' : 'Tạo tài khoản Khách hàng Givral Bakery'}
          </ThemedText>
        </View>

        {/* QUICK GUEST STORE ENTRANCE */}
        <TouchableOpacity
          style={[styles.customerGuestBtn, { borderColor: colors.tint }]}
          onPress={handleCustomerApp}
        >
          <Ionicons name="storefront-outline" size={20} color={colors.tint} style={{ marginRight: 8 }} />
          <ThemedText style={[styles.customerGuestText, { color: colors.tint }]}>
            Vào cửa hàng mua sắm (Khách)
          </ThemedText>
        </TouchableOpacity>

        {/* DIVIDER */}
        <View style={styles.orDivider}>
          <View style={[styles.dividerLine, { backgroundColor: colors.icon + '25' }]} />
          <ThemedText style={styles.orText}>
            {isLogin
              ? 'HOẶC ĐĂNG NHẬP'
              : registerStep === 1
              ? 'ĐĂNG KÝ TÀI KHOẢN (BƯỚC 1/2)'
              : 'XÁC THỰC GMAIL OTP (BƯỚC 2/2)'}
          </ThemedText>
          <View style={[styles.dividerLine, { backgroundColor: colors.icon + '25' }]} />
        </View>

        {/* FORM SECTION */}
        <View style={styles.formSection}>
          {!isLogin && registerStep === 2 ? (
            /* STEP 2: OTP VERIFICATION UI */
            <View style={[styles.otpCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <View style={styles.otpIconHeader}>
                <Ionicons name="mail-open-outline" size={38} color={colors.tint} />
              </View>
              <ThemedText style={styles.otpTitle}>Xác thực Gmail của bạn</ThemedText>
              <ThemedText style={styles.otpDesc}>
                Mã xác thực OTP gồm 6 chữ số đã được gửi tới hộp thư:{'\n'}
                <ThemedText style={{ fontWeight: 'bold', color: colors.tint }}>{email.trim()}</ThemedText>
              </ThemedText>

              <TextInput
                style={[
                  styles.otpInput,
                  { color: colors.text, borderColor: colors.tint, backgroundColor: colors.background },
                ]}
                placeholder="Nhập 6 chữ số OTP"
                placeholderTextColor={colors.icon}
                value={otpCode}
                onChangeText={(val) => setOtpCode(val.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
              />

              <View style={styles.otpActionsRow}>
                <TouchableOpacity
                  onPress={() => setRegisterStep(1)}
                  disabled={busy}
                  style={styles.otpBackBtn}
                >
                  <Ionicons name="arrow-back" size={16} color={colors.text} />
                  <ThemedText style={styles.otpBackText}>Sửa thông tin</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSendRegisterOtp}
                  disabled={busy || otpCountdown > 0}
                >
                  <ThemedText
                    style={[
                      styles.otpResendText,
                      { color: otpCountdown > 0 ? colors.icon : colors.tint },
                    ]}
                  >
                    {otpCountdown > 0 ? `Gửi lại mã (${otpCountdown}s)` : 'Gửi lại mã OTP'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* LOGIN FORM OR REGISTER STEP 1 FORM */
            <>
              {!isLogin && (
                <>
                  <View style={inputBox}>
                    <Ionicons name="person-outline" size={20} color={colors.icon} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="Họ và tên"
                      placeholderTextColor={colors.icon}
                      value={fullName}
                      onChangeText={setFullName}
                    />
                  </View>

                  <View style={inputBox}>
                    <Ionicons name="mail-outline" size={20} color={colors.icon} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="Email (Gmail nhận mã OTP)"
                      placeholderTextColor={colors.icon}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <View style={inputBox}>
                    <Ionicons name="call-outline" size={20} color={colors.icon} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="Số điện thoại"
                      placeholderTextColor={colors.icon}
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                    />
                  </View>
                </>
              )}

              <View style={inputBox}>
                <Ionicons name="person-circle-outline" size={20} color={colors.icon} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={isLogin ? 'Tên đăng nhập hoặc Username' : 'Tên đăng nhập'}
                  placeholderTextColor={colors.icon}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={inputBox}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.icon} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Mật khẩu"
                  placeholderTextColor={colors.icon}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.icon} />
                </TouchableOpacity>
              </View>

              {!isLogin && (
                <View style={inputBox}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.icon} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Xác nhận mật khẩu"
                    placeholderTextColor={colors.icon}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                </View>
              )}
            </>
          )}

          {isLogin && (
            <TouchableOpacity style={styles.forgotPassword} onPress={handleOpenForgotPassword}>
              <ThemedText style={[styles.forgotText, { color: colors.tint }]}>Quên mật khẩu?</ThemedText>
            </TouchableOpacity>
          )}

          {/* MAIN LOGIN / REGISTER BUTTON */}
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.tint, opacity: busy ? 0.7 : 1 }]}
            onPress={handleAuth}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.submitText}>
                {isLogin
                  ? 'ĐĂNG NHẬP'
                  : registerStep === 1
                  ? 'TIẾP TỤC & NHẬN MÃ OTP'
                  : 'XÁC THỰC & HOÀN TẤT ĐĂNG KÝ'}
              </ThemedText>
            )}
          </TouchableOpacity>

          {/* SOCIAL LOGIN BUTTONS (Đang tạm khóa / mờ đi theo yêu cầu) */}
          {isLogin && (
            <View style={styles.socialContainer}>
              <TouchableOpacity
                style={[styles.socialBtn, styles.googleBtn, { opacity: 0.4 }]}
                disabled={true}
                activeOpacity={1}
              >
                <Ionicons name="logo-google" size={20} color="#DB4437" style={{ marginRight: 8 }} />
                <ThemedText style={styles.googleBtnText}>Google</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialBtn, styles.facebookBtn, { opacity: 0.4 }]}
                disabled={true}
                activeOpacity={1}
              >
                <Ionicons name="logo-facebook" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                <ThemedText style={styles.facebookBtnText}>Facebook</ThemedText>
              </TouchableOpacity>
            </View>
          )}

          {/* SWITCH MODE TOGGLE */}
          <View style={styles.switchMode}>
            <ThemedText style={styles.switchText}>
              {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
            </ThemedText>
            <TouchableOpacity
              onPress={() => {
                setIsLogin(!isLogin);
                setRegisterStep(1);
                setOtpCode('');
              }}
              disabled={busy}
            >
              <ThemedText style={[styles.switchAction, { color: colors.tint }]}>
                {isLogin ? ' Đăng ký ngay' : ' Đăng nhập'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* MODAL QUÊN MẬT KHẨU */}
      <Modal visible={forgotModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.cardBg }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Khôi phục mật khẩu</ThemedText>
              <TouchableOpacity onPress={() => setForgotModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {forgotStep === 1 ? (
              <>
                <ThemedText style={styles.modalDesc}>
                  Nhập địa chỉ Gmail đã đăng ký tài khoản để nhận mã xác thực OTP 6 chữ số:
                </ThemedText>
                <TextInput
                  style={[styles.modalInput, { color: colors.text, borderColor: colors.cardBorder }]}
                  placeholder="Nhập địa chỉ Gmail của bạn"
                  placeholderTextColor={colors.icon}
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={[styles.modalPrimaryBtn, { backgroundColor: colors.tint }]}
                  onPress={handleSendForgotOtp}
                  disabled={isForgotBusy}
                >
                  {isForgotBusy ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <ThemedText style={styles.modalPrimaryBtnText}>GỬI MÃ OTP QUA GMAIL</ThemedText>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <ThemedText style={styles.modalDesc}>
                  Nhập mã OTP đã gửi tới <ThemedText style={{ fontWeight: 'bold' }}>{forgotEmail}</ThemedText> và mật khẩu mới:
                </ThemedText>
                <TextInput
                  style={[styles.modalInput, { color: colors.text, borderColor: colors.cardBorder }]}
                  placeholder="Mã OTP (6 chữ số)"
                  placeholderTextColor={colors.icon}
                  value={forgotOtp}
                  onChangeText={(val) => setForgotOtp(val.replace(/[^0-9]/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <TextInput
                  style={[styles.modalInput, { color: colors.text, borderColor: colors.cardBorder }]}
                  placeholder="Mật khẩu mới (>= 10 ký tự, Hoa, Số, Ký tự ĐB)"
                  placeholderTextColor={colors.icon}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
                <TextInput
                  style={[styles.modalInput, { color: colors.text, borderColor: colors.cardBorder }]}
                  placeholder="Xác nhận mật khẩu mới"
                  placeholderTextColor={colors.icon}
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={[styles.modalSecondaryBtn, { borderColor: colors.cardBorder }]}
                    onPress={() => setForgotStep(1)}
                  >
                    <ThemedText style={{ fontWeight: '600' }}>Quay lại</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalPrimaryBtn, { flex: 1, backgroundColor: colors.tint }]}
                    onPress={handleResetPassword}
                    disabled={isForgotBusy}
                  >
                    {isForgotBusy ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <ThemedText style={styles.modalPrimaryBtnText}>ĐẶT LẠI MẬT KHẨU</ThemedText>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL CẤU HÌNH ĐỊA CHỈ IP MÁY CHỦ */}
      <Modal visible={serverModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.cardBg }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>🌐 Cấu hình kết nối Máy chủ</ThemedText>
              <TouchableOpacity onPress={() => setServerModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ThemedText style={styles.modalDesc}>
              Máy chủ hiện tại:{'\n'}
              <ThemedText style={{ fontWeight: 'bold', color: colors.tint }}>{currentServerUrl}</ThemedText>
            </ThemedText>

            <ThemedText style={[styles.modalDesc, { fontSize: 12 }]}>
              Khi đổi mạng Wi-Fi hoặc phát 4G/Hotspot từ điện thoại, ứng dụng sẽ tự động nhận IP từ Expo Go. Nếu cần nhập thủ công IP máy tính hoặc link Ngrok, hãy nhập bên dưới:
            </ThemedText>

            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.cardBorder }]}
              placeholder="VD: 192.168.1.15 hoặc https://xxx.ngrok-free.app"
              placeholderTextColor={colors.icon}
              value={customServerInput}
              onChangeText={setCustomServerInput}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.modalSecondaryBtn, { borderColor: colors.cardBorder }]}
                onPress={handleResetAutoServerUrl}
              >
                <ThemedText style={{ fontSize: 13, fontWeight: '600' }}>Tự động (Auto IP)</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalPrimaryBtn, { flex: 1, backgroundColor: colors.tint }]}
                onPress={handleSaveServerUrl}
              >
                <ThemedText style={styles.modalPrimaryBtnText}>Lưu kết nối</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  serverPillRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  serverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  serverPillText: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 240,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: 140,
    height: 90,
    marginBottom: 6,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 4,
    textAlign: 'center',
  },
  customerGuestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  customerGuestText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  biometricText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  orText: {
    fontSize: 11,
    fontWeight: 'bold',
    opacity: 0.5,
    marginHorizontal: 12,
    letterSpacing: 1,
  },
  formSection: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  eyeIcon: {
    padding: 6,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitButton: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginBottom: 16,
  },
  submitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  otpCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    alignItems: 'center',
  },
  otpIconHeader: {
    marginBottom: 8,
  },
  otpTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  otpDesc: {
    fontSize: 13,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 19,
    marginBottom: 14,
  },
  otpInput: {
    width: '100%',
    height: 54,
    borderWidth: 1.5,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 8,
    marginBottom: 14,
  },
  otpActionsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  otpBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  otpBackText: {
    fontSize: 13,
    fontWeight: '600',
  },
  otpResendText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
  },
  googleBtn: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
  },
  googleBtnText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: 'bold',
  },
  facebookBtn: {
    backgroundColor: '#1877F2',
    borderColor: '#1877F2',
  },
  facebookBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  switchMode: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
    opacity: 0.7,
  },
  switchAction: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 16,
    padding: 20,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  modalDesc: {
    fontSize: 13,
    opacity: 0.8,
    lineHeight: 18,
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
    fontSize: 14,
    marginBottom: 12,
  },
  modalPrimaryBtn: {
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalPrimaryBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  modalSecondaryBtn: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
});
