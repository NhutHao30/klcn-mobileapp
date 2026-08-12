import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function NotificationsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [orderAlerts, setOrderAlerts] = useState(true);
  const [inventoryAlerts, setInventoryAlerts] = useState(true);
  const [systemAlerts, setSystemAlerts] = useState(false);

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Cài đặt thông báo</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <ThemedText style={styles.sectionTitle}>Kênh nhận thông báo</ThemedText>
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <View style={[styles.settingIconBg, { backgroundColor: colors.iconBg }]}>
                <Ionicons name="phone-portrait-outline" size={20} color={colors.tint} />
              </View>
              <View>
                <ThemedText style={styles.settingTitle}>Thông báo đẩy (Push)</ThemedText>
                <ThemedText style={styles.settingDesc}>Nhận thông báo trực tiếp trên thiết bị</ThemedText>
              </View>
            </View>
            <Switch 
              value={pushEnabled} 
              onValueChange={setPushEnabled}
              trackColor={{ false: colors.cardBorder, true: colors.tint + '80' }}
              thumbColor={pushEnabled ? colors.tint : '#f4f3f4'}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <View style={[styles.settingIconBg, { backgroundColor: colors.iconBg }]}>
                <Ionicons name="mail-outline" size={20} color={colors.tint} />
              </View>
              <View>
                <ThemedText style={styles.settingTitle}>Thông báo qua Email</ThemedText>
                <ThemedText style={styles.settingDesc}>Gửi báo cáo và cảnh báo về email</ThemedText>
              </View>
            </View>
            <Switch 
              value={emailEnabled} 
              onValueChange={setEmailEnabled}
              trackColor={{ false: colors.cardBorder, true: colors.tint + '80' }}
              thumbColor={emailEnabled ? colors.tint : '#f4f3f4'}
            />
          </View>
        </View>

        <ThemedText style={styles.sectionTitle}>Loại thông báo</ThemedText>
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <ThemedText style={styles.settingTitle}>Đơn hàng mới</ThemedText>
            </View>
            <Switch 
              value={orderAlerts} 
              onValueChange={setOrderAlerts}
              trackColor={{ false: colors.cardBorder, true: colors.tint + '80' }}
              thumbColor={orderAlerts ? colors.tint : '#f4f3f4'}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <ThemedText style={styles.settingTitle}>Cảnh báo tồn kho</ThemedText>
            </View>
            <Switch 
              value={inventoryAlerts} 
              onValueChange={setInventoryAlerts}
              trackColor={{ false: colors.cardBorder, true: colors.tint + '80' }}
              thumbColor={inventoryAlerts ? colors.tint : '#f4f3f4'}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <ThemedText style={styles.settingTitle}>Cập nhật hệ thống</ThemedText>
            </View>
            <Switch 
              value={systemAlerts} 
              onValueChange={setSystemAlerts}
              trackColor={{ false: colors.cardBorder, true: colors.tint + '80' }}
              thumbColor={systemAlerts ? colors.tint : '#f4f3f4'}
            />
          </View>

        </View>

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
