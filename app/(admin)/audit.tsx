import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const AUDIT_LOGS = [
  { id: '1', action: 'Đăng nhập hệ thống', user: 'Admin Dola', role: 'Quản lý', time: '10:45 AM - 12/08/2026', type: 'login' },
  { id: '2', action: 'Cập nhật giá sản phẩm "Bánh Kem Dâu"', user: 'Staff An', role: 'Nhân viên', time: '09:30 AM - 12/08/2026', type: 'edit' },
  { id: '3', action: 'Xóa đơn hàng #DH1094', user: 'Manager Binh', role: 'Quản lý', time: '15:20 PM - 11/08/2026', type: 'delete' },
  { id: '4', action: 'Thêm mới mã khuyến mãi "SUMMER26"', user: 'Admin Dola', role: 'Quản lý', time: '14:00 PM - 11/08/2026', type: 'add' },
  { id: '5', action: 'Đăng xuất', user: 'Staff An', role: 'Nhân viên', time: '18:00 PM - 10/08/2026', type: 'logout' },
  { id: '6', action: 'Tạo đơn hàng mới #DH1095', user: 'Staff An', role: 'Nhân viên', time: '17:30 PM - 10/08/2026', type: 'add' },
];

export default function AuditScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const getIconForType = (type: string) => {
    switch (type) {
      case 'login': return { name: 'log-in-outline', color: '#3b82f6' };
      case 'logout': return { name: 'log-out-outline', color: '#64748b' };
      case 'add': return { name: 'add-circle-outline', color: '#10b981' };
      case 'edit': return { name: 'create-outline', color: '#f59e0b' };
      case 'delete': return { name: 'trash-outline', color: '#ef4444' };
      default: return { name: 'document-text-outline', color: '#64748b' };
    }
  };

  const renderLogItem = ({ item }: { item: any }) => {
    const iconConfig = getIconForType(item.type);
    
    return (
      <View style={[styles.logCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
        <View style={[styles.iconWrapper, { backgroundColor: iconConfig.color + '15' }]}>
          <Ionicons name={iconConfig.name as any} size={24} color={iconConfig.color} />
        </View>
        
        <View style={styles.logInfo}>
          <ThemedText style={styles.logAction} numberOfLines={2}>{item.action}</ThemedText>
          <View style={styles.logMeta}>
            <ThemedText style={styles.logUser}>{item.user}</ThemedText>
            <ThemedText style={styles.dotSeparator}>•</ThemedText>
            <ThemedText style={styles.logTime}>{item.time}</ThemedText>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Nhật ký hoạt động</ThemedText>
        <View style={styles.headerRight}>
          <TouchableOpacity>
            <Ionicons name="filter-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={AUDIT_LOGS}
        keyExtractor={(item) => item.id}
        renderItem={renderLogItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
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
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
  },
  logCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: 'center',
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  logInfo: {
    flex: 1,
  },
  logAction: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  logMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logUser: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  dotSeparator: {
    fontSize: 12,
    marginHorizontal: 6,
    opacity: 0.5,
  },
  logTime: {
    fontSize: 12,
    opacity: 0.6,
  },
});
