import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const ROLES = [
  { id: '1', name: 'Quản trị viên (Admin)', users: 2, color: '#ef4444', desc: 'Toàn quyền truy cập hệ thống' },
  { id: '2', name: 'Quản lý cửa hàng (Manager)', users: 5, color: '#f59e0b', desc: 'Quản lý nhân sự, đơn hàng, báo cáo' },
  { id: '3', name: 'Nhân viên bán hàng (Staff)', users: 12, color: '#3b82f6', desc: 'Tạo đơn, xem sản phẩm' },
  { id: '4', name: 'Nhân viên kho (Inventory)', users: 4, color: '#10b981', desc: 'Quản lý xuất nhập tồn kho' },
];

export default function RolesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const renderRoleCard = ({ item }: { item: any }) => {
    return (
      <View style={[styles.roleCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
        <View style={styles.roleHeader}>
          <View style={styles.roleTitleGroup}>
            <View style={[styles.roleDot, { backgroundColor: item.color }]} />
            <ThemedText style={styles.roleName}>{item.name}</ThemedText>
          </View>
          <View style={[styles.badge, { backgroundColor: item.color + '20' }]}>
            <ThemedText style={[styles.badgeText, { color: item.color }]}>{item.users} User</ThemedText>
          </View>
        </View>
        
        <ThemedText style={styles.roleDesc}>{item.desc}</ThemedText>
        
        <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
        
        <TouchableOpacity style={styles.actionBtn}>
          <ThemedText style={[styles.actionBtnText, { color: colors.tint }]}>Xem chi tiết quyền</ThemedText>
          <Ionicons name="chevron-forward" size={16} color={colors.tint} />
        </TouchableOpacity>
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
        <ThemedText style={styles.headerTitle}>Phân quyền</ThemedText>
        <TouchableOpacity style={styles.headerRight}>
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={ROLES}
        keyExtractor={(item) => item.id}
        renderItem={renderRoleCard}
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
  roleCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roleTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  roleDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  roleName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  roleDesc: {
    fontSize: 13,
    opacity: 0.7,
    marginTop: 4,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 4,
  },
});
