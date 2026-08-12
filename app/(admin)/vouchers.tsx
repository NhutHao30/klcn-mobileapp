import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';

const MOCK_VOUCHERS = [
  { id: '1', code: 'SUMMER26', type: 'percent', value: 20, status: 'active', usageCount: 45, maxUsage: 100, expiry: '2026-08-31' },
  { id: '2', code: 'NEWCUSTOMER', type: 'fixed', value: 5, status: 'active', usageCount: 12, maxUsage: 50, expiry: '2026-12-31' },
  { id: '3', code: 'FLASH SALE', type: 'percent', value: 50, status: 'expired', usageCount: 200, maxUsage: 200, expiry: '2026-07-15' },
];

export default function AdminVouchers() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('active');

  const filteredVouchers = MOCK_VOUCHERS.filter(v => 
    activeTab === 'all' ? true : v.status === activeTab
  );

  return (
    <ThemedView style={styles.container}>
      <View style={{ paddingTop: 40, paddingBottom: 16, backgroundColor: colors.headerBg, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>Khuyến mãi & Voucher</ThemedText>
      </View>

      {/* Header Actions */}
      <View style={[styles.headerActions, { borderBottomColor: colors.icon + '20' }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.icon + '15' }]}>
          <Ionicons name="search" size={20} color={colors.icon} style={styles.searchIcon} />
          <TextInput 
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Tìm mã voucher..."
            placeholderTextColor={colors.icon}
          />
        </View>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.tint }]}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { borderBottomColor: colors.icon + '20' }]}>
        {['active', 'expired', 'all'].map(tab => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tab, activeTab === tab && { borderBottomColor: colors.tint, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab)}
          >
            <ThemedText style={[styles.tabText, activeTab === tab && { color: colors.tint, fontWeight: 'bold' }]}>
              {tab === 'active' ? 'Đang chạy' : tab === 'expired' ? 'Đã hết hạn' : 'Tất cả'}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {filteredVouchers.map(voucher => (
          <View key={voucher.id} style={[styles.voucherCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
            <View style={styles.voucherLeft}>
              <View style={[styles.voucherValueBox, { backgroundColor: voucher.status === 'active' ? colors.gold + '20' : colors.icon + '20' }]}>
                <ThemedText style={[styles.voucherValue, { color: voucher.status === 'active' ? colors.gold : colors.icon }]}>
                  {voucher.type === 'percent' ? `${voucher.value}%` : `$${voucher.value}`}
                </ThemedText>
                <ThemedText style={styles.voucherType}>
                  {voucher.type === 'percent' ? 'Giảm' : 'Giảm'}
                </ThemedText>
              </View>
            </View>
            
            <View style={styles.voucherRight}>
              <View style={styles.voucherHeaderRow}>
                <ThemedText style={styles.voucherCode}>{voucher.code}</ThemedText>
                <View style={[styles.statusBadge, { backgroundColor: voucher.status === 'active' ? '#10b98120' : '#ef444420' }]}>
                  <ThemedText style={[styles.statusText, { color: voucher.status === 'active' ? '#10b981' : '#ef4444' }]}>
                    {voucher.status === 'active' ? 'Active' : 'Expired'}
                  </ThemedText>
                </View>
              </View>
              
              <View style={styles.progressSection}>
                <View style={styles.progressTextRow}>
                  <ThemedText style={styles.progressText}>Đã dùng: {voucher.usageCount}/{voucher.maxUsage}</ThemedText>
                  <ThemedText style={styles.progressText}>HSD: {voucher.expiry}</ThemedText>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: colors.icon + '20' }]}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { backgroundColor: colors.tint, width: `${(voucher.usageCount / voucher.maxUsage) * 100}%` }
                    ]} 
                  />
                </View>
              </View>
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
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    opacity: 0.7,
  },
  listContent: {
    padding: 16,
  },
  voucherCard: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  voucherLeft: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.05)',
    borderStyle: 'dashed',
  },
  voucherValueBox: {
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voucherValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  voucherType: {
    fontSize: 10,
    opacity: 0.8,
  },
  voucherRight: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  voucherHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  voucherCode: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
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
  progressSection: {
    marginTop: 12,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressText: {
    fontSize: 11,
    opacity: 0.6,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
