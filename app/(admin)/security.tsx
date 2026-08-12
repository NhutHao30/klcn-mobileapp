import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, TextInput, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function SecurityScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Bảo mật & Mật khẩu</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <ThemedText style={styles.sectionTitle}>Đổi mật khẩu</ThemedText>
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Mật khẩu hiện tại</ThemedText>
            <View style={[styles.inputContainer, { borderColor: colors.cardBorder }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.icon} style={styles.inputIcon} />
              <TextInput 
                style={[styles.input, { color: colors.text }]}
                secureTextEntry={!showCurrentPassword}
                placeholder="Nhập mật khẩu hiện tại"
                placeholderTextColor={colors.icon}
              />
              <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                <Ionicons name={showCurrentPassword ? "eye-outline" : "eye-off-outline"} size={20} color={colors.icon} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Mật khẩu mới</ThemedText>
            <View style={[styles.inputContainer, { borderColor: colors.cardBorder }]}>
              <Ionicons name="key-outline" size={20} color={colors.icon} style={styles.inputIcon} />
              <TextInput 
                style={[styles.input, { color: colors.text }]}
                secureTextEntry={!showNewPassword}
                placeholder="Nhập mật khẩu mới"
                placeholderTextColor={colors.icon}
              />
              <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                <Ionicons name={showNewPassword ? "eye-outline" : "eye-off-outline"} size={20} color={colors.icon} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Nhập lại mật khẩu mới</ThemedText>
            <View style={[styles.inputContainer, { borderColor: colors.cardBorder }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.icon} style={styles.inputIcon} />
              <TextInput 
                style={[styles.input, { color: colors.text }]}
                secureTextEntry={!showNewPassword}
                placeholder="Xác nhận mật khẩu mới"
                placeholderTextColor={colors.icon}
              />
            </View>
          </View>

          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.tint }]}>
            <ThemedText style={styles.saveBtnText}>Cập nhật mật khẩu</ThemedText>
          </TouchableOpacity>
        </View>

        <ThemedText style={styles.sectionTitle}>Phương thức xác thực</ThemedText>
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <View style={[styles.settingIconBg, { backgroundColor: colors.iconBg }]}>
                <Ionicons name="finger-print-outline" size={20} color={colors.tint} />
              </View>
              <View>
                <ThemedText style={styles.settingTitle}>Đăng nhập sinh trắc học</ThemedText>
                <ThemedText style={styles.settingDesc}>Sử dụng Face ID hoặc Vân tay</ThemedText>
              </View>
            </View>
            <Switch 
              value={biometricEnabled} 
              onValueChange={setBiometricEnabled}
              trackColor={{ false: colors.cardBorder, true: colors.tint + '80' }}
              thumbColor={biometricEnabled ? colors.tint : '#f4f3f4'}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <View style={[styles.settingIconBg, { backgroundColor: colors.iconBg }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.tint} />
              </View>
              <View>
                <ThemedText style={styles.settingTitle}>Xác thực 2 lớp (2FA)</ThemedText>
                <ThemedText style={styles.settingDesc}>Yêu cầu mã xác nhận khi đăng nhập</ThemedText>
              </View>
            </View>
            <Switch 
              value={twoFactorEnabled} 
              onValueChange={setTwoFactorEnabled}
              trackColor={{ false: colors.cardBorder, true: colors.tint + '80' }}
              thumbColor={twoFactorEnabled ? colors.tint : '#f4f3f4'}
            />
          </View>

        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 8,
    opacity: 0.6,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    opacity: 0.8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  saveBtn: {
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconBg: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingDesc: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
});
