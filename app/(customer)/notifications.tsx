import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from '@/services/notificationService';

const STORAGE_KEY = 'CUSTOMER_NOTIFICATION_SETTINGS';

export default function CustomerNotificationsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    pushEnabled: true,
    promoAlerts: true,
    orderStatusAlerts: true,
    newsAlerts: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      if (key === 'pushEnabled' && value) {
        const granted = await notificationService.requestPermission();
        if (!granted) {
          Alert.alert(
            'Quyền thông báo',
            'Vui lòng cấp quyền thông báo trong Cài đặt của điện thoại để nhận thông báo nổi trên màn hình.'
          );
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestNotification = async () => {
    try {
      const granted = await notificationService.requestPermission();
      if (!granted) {
        Alert.alert('Chưa cấp quyền', 'Vui lòng cho phép quyền thông báo trên điện thoại!');
        return;
      }
      await notificationService.sendLocalNotification(
        '🎂 Givral Bakery - Thông báo nổi',
        'Đây là thông báo nổi hoạt động trên điện thoại kể cả khi màn hình đang khóa!',
        { test: true },
        'orders'
      );
      Alert.alert('Thành công', 'Đã phát thông báo nổi! Bạn hãy nhìn lên thanh thông báo / màn hình khóa của điện thoại.');
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể phát thông báo lúc này.');
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Cài đặt thông báo</ThemedText>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => Alert.alert('Thông báo', 'Đã đồng bộ cài đặt thông báo cá nhân.')}
        >
          <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <ThemedText style={styles.sectionTitle}>Kênh nhận thông báo</ThemedText>
          <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.settingIconBg, { backgroundColor: colors.iconBg }]}>
                  <Ionicons name="phone-portrait-outline" size={20} color={colors.tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.settingTitle}>Thông báo ứng dụng (Push)</ThemedText>
                  <ThemedText style={styles.settingDesc}>Nhận thông báo trực tiếp trên điện thoại</ThemedText>
                </View>
              </View>
              <Switch
                value={settings.pushEnabled}
                onValueChange={(val) => updateSetting('pushEnabled', val)}
                trackColor={{ false: colors.cardBorder, true: colors.tint + '80' }}
                thumbColor={settings.pushEnabled ? colors.tint : '#f4f3f4'}
              />
            </View>
          </View>

          <ThemedText style={styles.sectionTitle}>Loại tin nhắn & Cảnh báo</ThemedText>
          <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingTitle}>Trạng thái đơn hàng</ThemedText>
              </View>
              <Switch
                value={settings.orderStatusAlerts}
                onValueChange={(val) => updateSetting('orderStatusAlerts', val)}
                trackColor={{ false: colors.cardBorder, true: colors.tint + '80' }}
                thumbColor={settings.orderStatusAlerts ? colors.tint : '#f4f3f4'}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingTitle}>Mã giảm giá & Khuyến mãi</ThemedText>
              </View>
              <Switch
                value={settings.promoAlerts}
                onValueChange={(val) => updateSetting('promoAlerts', val)}
                trackColor={{ false: colors.cardBorder, true: colors.tint + '80' }}
                thumbColor={settings.promoAlerts ? colors.tint : '#f4f3f4'}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingTitle}>Tin tức & Sản phẩm mới</ThemedText>
              </View>
              <Switch
                value={settings.newsAlerts}
                onValueChange={(val) => updateSetting('newsAlerts', val)}
                trackColor={{ false: colors.cardBorder, true: colors.tint + '80' }}
                thumbColor={settings.newsAlerts ? colors.tint : '#f4f3f4'}
              />
            </View>
          </View>

          {/* NÚT THỬ NGHIỆM THÔNG BÁO NỔI */}
          <TouchableOpacity
            style={[styles.testBtn, { backgroundColor: colors.tint }]}
            onPress={handleTestNotification}
          >
            <Ionicons name="notifications-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <ThemedText style={styles.testBtnText}>Thử nghiệm thông báo nổi (Banner)</ThemedText>
          </TouchableOpacity>
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16 },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 12, marginTop: 8, opacity: 0.6 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 24 },
  testBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, marginBottom: 30 },
  testBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  settingInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingIconBg: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  settingTitle: { fontSize: 16, fontWeight: 'bold' },
  settingDesc: { fontSize: 12, opacity: 0.6, marginTop: 2 },
  divider: { height: 1, marginVertical: 8 },
});
