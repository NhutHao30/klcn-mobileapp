import React, { useState } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const STATUS_TABS = ['Tất cả', 'Chờ xác nhận', 'Đang giao', 'Đã giao', 'Đã hủy'];

const MOCK_ORDERS = [
  { 
    id: 'DH-89201', 
    date: '12/08/2026 14:30', 
    status: 'Chờ xác nhận', 
    itemsCount: 3, 
    total: 294000, 
    items: ['Bánh Kem Dâu Tây Fresh (x1)', 'Bánh Mì Sừng Bò Croissant (x2)'] 
  },
  { 
    id: 'DH-88190', 
    date: '10/08/2026 09:15', 
    status: 'Đã giao', 
    itemsCount: 2, 
    total: 180000, 
    items: ['Bánh Su Kem Socola Bỉ (x2)'] 
  },
  { 
    id: 'DH-87102', 
    date: '05/08/2026 18:40', 
    status: 'Đã hủy', 
    itemsCount: 1, 
    total: 220000, 
    items: ['Bánh Tiramisu Phô Mai (x1)'] 
  },
];

export default function CustomerOrdersPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [selectedTab, setSelectedTab] = useState('Tất cả');

  const filteredOrders = MOCK_ORDERS.filter(order => {
    if (selectedTab === 'Tất cả') return true;
    return order.status === selectedTab;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Chờ xác nhận': return '#f59e0b';
      case 'Đang giao': return '#3b82f6';
      case 'Đã giao': return '#10b981';
      case 'Đã hủy': return '#ef4444';
      default: return colors.text;
    }
  };

  const renderOrder = ({ item }: { item: typeof MOCK_ORDERS[0] }) => (
    <View style={[styles.orderCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
      <View style={styles.orderHeader}>
        <View>
          <ThemedText style={styles.orderId}>{item.id}</ThemedText>
          <ThemedText style={styles.orderDate}>{item.date}</ThemedText>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
          <ThemedText style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

      <View style={styles.itemList}>
        {item.items.map((prod, idx) => (
          <ThemedText key={idx} style={styles.itemText}>• {prod}</ThemedText>
        ))}
      </View>

      <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

      <View style={styles.orderFooter}>
        <ThemedText style={styles.itemsCountText}>{item.itemsCount} sản phẩm</ThemedText>

        <View style={styles.totalRow}>
          <ThemedText style={styles.totalLabel}>Tổng tiền: </ThemedText>
          <ThemedText style={[styles.totalValue, { color: colors.tint }]}>
            {item.total.toLocaleString('vi-VN')}₫
          </ThemedText>
        </View>
      </View>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Đơn hàng của tôi</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      {/* STATUS TABS */}
      <View style={{ paddingVertical: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {STATUS_TABS.map(tab => {
            const isSelected = selectedTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.statusTab,
                  { backgroundColor: isSelected ? colors.tint : colors.cardBg, borderColor: colors.cardBorder }
                ]}
                onPress={() => setSelectedTab(tab)}
              >
                <ThemedText style={[styles.tabText, { color: isSelected ? '#fff' : colors.text }]}>
                  {tab}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={item => item.id}
        renderItem={renderOrder}
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
  tabScroll: {
    paddingHorizontal: 16,
  },
  statusTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  tabText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
  },
  orderCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  orderDate: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  itemList: {
    gap: 4,
  },
  itemText: {
    fontSize: 14,
    opacity: 0.8,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemsCountText: {
    fontSize: 13,
    opacity: 0.6,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
