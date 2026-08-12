import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';

const MOCK_STORES = [
  { id: '1', name: 'Chi nhánh Trung tâm', address: '123 Lê Lợi, Quận 1, TP.HCM', phone: '0123.456.789', manager: 'Nguyễn Văn A', status: 'active', revenue: '$12,500' },
  { id: '2', name: 'Chi nhánh Quận 3', address: '456 Điện Biên Phủ, Quận 3, TP.HCM', phone: '0987.654.321', manager: 'Trần Thị B', status: 'active', revenue: '$8,200' },
  { id: '3', name: 'Chi nhánh Quận 7', address: '789 Nguyễn Văn Linh, Quận 7, TP.HCM', phone: '0345.678.910', manager: 'Lê Văn C', status: 'maintenance', revenue: '$0' },
];

export default function AdminStores() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <View style={{ paddingTop: 40, paddingBottom: 16, backgroundColor: colors.headerBg, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>Hệ thống Chi nhánh</ThemedText>
      </View>

      <View style={[styles.headerActions, { borderBottomColor: colors.icon + '20' }]}>
        <ThemedText style={styles.summaryText}>Tổng cộng: {MOCK_STORES.length} chi nhánh</ThemedText>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.tint }]}>
          <Ionicons name="add" size={20} color="#fff" />
          <ThemedText style={styles.addButtonText}>Thêm mới</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {MOCK_STORES.map(store => (
          <View key={store.id} style={[styles.card, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons name="storefront" size={24} color={colors.tint} style={styles.storeIcon} />
                <ThemedText style={styles.storeName}>{store.name}</ThemedText>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: store.status === 'active' ? '#10b98120' : '#f59e0b20' }]}>
                <ThemedText style={[styles.statusText, { color: store.status === 'active' ? '#10b981' : '#f59e0b' }]}>
                  {store.status === 'active' ? 'Hoạt động' : 'Bảo trì'}
                </ThemedText>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color={colors.icon} />
              <ThemedText style={styles.infoText}>{store.address}</ThemedText>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={16} color={colors.icon} />
              <ThemedText style={styles.infoText}>{store.phone}</ThemedText>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={16} color={colors.icon} />
              <ThemedText style={styles.infoText}>Quản lý: {store.manager}</ThemedText>
            </View>

            <View style={styles.footerRow}>
              <View>
                <ThemedText style={styles.footerLabel}>Doanh thu tháng</ThemedText>
                <ThemedText style={[styles.footerValue, { color: colors.tint }]}>{store.revenue}</ThemedText>
              </View>
              <TouchableOpacity style={[styles.editButton, { borderColor: colors.tint }]}>
                <ThemedText style={[styles.editButtonText, { color: colors.tint }]}>Chỉnh sửa</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    paddingHorizontal: 16,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  listContent: {
    padding: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeIcon: {
    marginRight: 8,
  },
  storeName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    opacity: 0.8,
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 12,
    marginTop: 8,
  },
  footerLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
  footerValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  editButtonText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
});
