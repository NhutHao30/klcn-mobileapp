import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';

const MOCK_INVENTORY = [
  { id: '1', name: 'Bột mì đa dụng', sku: 'ING-001', stock: 150, unit: 'kg', status: 'normal' },
  { id: '2', name: 'Đường cát trắng', sku: 'ING-002', stock: 5, unit: 'kg', status: 'low' },
  { id: '3', name: 'Trứng gà', sku: 'ING-003', stock: 500, unit: 'quả', status: 'normal' },
  { id: '4', name: 'Sữa tươi', sku: 'ING-004', stock: 0, unit: 'lít', status: 'out' },
];

const MOCK_TRANSFERS = [
  { id: 'TR-101', date: '10/08/2026', from: 'Kho Tổng', to: 'CH Quận 1', status: 'completed' },
  { id: 'TR-102', date: '11/08/2026', from: 'CH Quận 1', to: 'CH Quận 3', status: 'pending' },
];

export default function AdminInventory() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('ledger'); // 'ledger' or 'transfer'

  return (
    <ThemedView style={styles.container}>
      <View style={{ paddingTop: 40, paddingBottom: 16, backgroundColor: colors.headerBg, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>Kho hàng & Điều chuyển</ThemedText>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { borderBottomColor: colors.icon + '20' }]}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'ledger' && { borderBottomColor: colors.tint, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('ledger')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'ledger' && { color: colors.tint, fontWeight: 'bold' }]}>
            Sổ cái kho
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'transfer' && { borderBottomColor: colors.tint, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('transfer')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'transfer' && { color: colors.tint, fontWeight: 'bold' }]}>
            Điều chuyển
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Header Actions */}
      <View style={[styles.headerActions, { borderBottomColor: colors.icon + '20' }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.icon + '15' }]}>
          <Ionicons name="search" size={20} color={colors.icon} style={styles.searchIcon} />
          <TextInput 
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Tìm kiếm..."
            placeholderTextColor={colors.icon}
          />
        </View>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.tint }]}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {activeTab === 'ledger' ? (
          MOCK_INVENTORY.map(item => (
            <View key={item.id} style={[styles.card, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
              <View style={styles.cardHeader}>
                <ThemedText style={styles.itemName}>{item.name}</ThemedText>
                <View style={[styles.statusBadge, { backgroundColor: item.status === 'normal' ? '#10b98120' : item.status === 'low' ? '#f59e0b20' : '#ef444420' }]}>
                  <ThemedText style={[styles.statusText, { color: item.status === 'normal' ? '#10b981' : item.status === 'low' ? '#f59e0b' : '#ef4444' }]}>
                    {item.status === 'normal' ? 'Đủ' : item.status === 'low' ? 'Sắp hết' : 'Hết hàng'}
                  </ThemedText>
                </View>
              </View>
              <ThemedText style={styles.itemSku}>SKU: {item.sku}</ThemedText>
              <View style={styles.stockRow}>
                <ThemedText style={styles.stockLabel}>Tồn kho:</ThemedText>
                <ThemedText style={[styles.stockValue, { color: item.status === 'out' ? '#ef4444' : colors.text }]}>
                  {item.stock} {item.unit}
                </ThemedText>
              </View>
            </View>
          ))
        ) : (
          MOCK_TRANSFERS.map(item => (
            <View key={item.id} style={[styles.card, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
              <View style={styles.cardHeader}>
                <ThemedText style={styles.itemName}>Phiếu: {item.id}</ThemedText>
                <View style={[styles.statusBadge, { backgroundColor: item.status === 'completed' ? '#10b98120' : '#f59e0b20' }]}>
                  <ThemedText style={[styles.statusText, { color: item.status === 'completed' ? '#10b981' : '#f59e0b' }]}>
                    {item.status === 'completed' ? 'Hoàn thành' : 'Đang xử lý'}
                  </ThemedText>
                </View>
              </View>
              <ThemedText style={styles.itemSku}>Ngày: {item.date}</ThemedText>
              <View style={styles.transferPath}>
                <View style={styles.pathNode}>
                  <Ionicons name="location" size={16} color={colors.icon} />
                  <ThemedText style={styles.pathText}>{item.from}</ThemedText>
                </View>
                <Ionicons name="arrow-forward" size={16} color={colors.tint} />
                <View style={styles.pathNode}>
                  <Ionicons name="location" size={16} color={colors.icon} />
                  <ThemedText style={styles.pathText}>{item.to}</ThemedText>
                </View>
              </View>
            </View>
          ))
        )}
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
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 16,
    opacity: 0.7,
  },
  headerActions: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
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
  itemSku: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 12,
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 12,
  },
  stockLabel: {
    fontSize: 14,
  },
  stockValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transferPath: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 12,
  },
  pathNode: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pathText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
  },
});
