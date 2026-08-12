import React, { useState } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

// Mock data
const MOCK_INVOICES = [
  { id: 'INV-001', customer: 'John Doe', date: '2026-08-11', total: 125.50, status: 'Completed' },
  { id: 'INV-002', customer: 'Jane Smith', date: '2026-08-11', total: 45.00, status: 'Pending' },
  { id: 'INV-003', customer: 'Alice Johnson', date: '2026-08-10', total: 89.99, status: 'Processing' },
  { id: 'INV-004', customer: 'Bob Brown', date: '2026-08-09', total: 210.00, status: 'Completed' },
  { id: 'INV-005', customer: 'Charlie Davis', date: '2026-08-09', total: 15.75, status: 'Cancelled' },
];

export default function AdminInvoices() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [searchQuery, setSearchQuery] = useState('');

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Completed': return '#10b981';
      case 'Pending': return '#f59e0b';
      case 'Processing': return '#3b82f6';
      case 'Cancelled': return '#ef4444';
      default: return colors.text;
    }
  };

  const renderInvoice = ({ item }: { item: typeof MOCK_INVOICES[0] }) => (
    <View style={[styles.invoiceCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
      <View style={styles.invoiceHeader}>
        <ThemedText style={styles.invoiceId}>{item.id}</ThemedText>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <ThemedText style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </ThemedText>
        </View>
      </View>
      
      <View style={styles.invoiceDetails}>
        <View style={styles.customerInfo}>
          <Ionicons name="person-outline" size={16} color={colors.icon} style={styles.detailIcon} />
          <ThemedText>{item.customer}</ThemedText>
        </View>
        <View style={styles.dateInfo}>
          <Ionicons name="calendar-outline" size={16} color={colors.icon} style={styles.detailIcon} />
          <ThemedText style={styles.dateText}>{item.date}</ThemedText>
        </View>
      </View>

      <View style={[styles.invoiceFooter, { borderTopColor: colors.icon + '20' }]}>
        <ThemedText style={styles.totalLabel}>Total Amount:</ThemedText>
        <ThemedText style={[styles.totalAmount, { color: colors.tint }]}>
          ${item.total.toFixed(2)}
        </ThemedText>
      </View>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={{ paddingTop: 40, backgroundColor: colors.headerBg }}>
        <ThemedText style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', padding: 16 }}>Đơn hàng</ThemedText>
      </View>
      <View style={[styles.headerActions, { borderBottomColor: colors.icon + '20' }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.icon + '15' }]}>
          <Ionicons name="search" size={20} color={colors.icon} style={styles.searchIcon} />
          <TextInput 
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by ID or Customer..."
            placeholderTextColor={colors.icon}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={[styles.filterButton, { backgroundColor: colors.icon + '15' }]}>
          <Ionicons name="filter" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={MOCK_INVOICES.filter(i => 
          i.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
          i.customer.toLowerCase().includes(searchQuery.toLowerCase())
        )}
        keyExtractor={item => item.id}
        renderItem={renderInvoice}
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
  headerActions: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  invoiceCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  invoiceId: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  invoiceDetails: {
    marginBottom: 16,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    marginRight: 8,
  },
  dateText: {
    opacity: 0.7,
  },
  invoiceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  totalLabel: {
    opacity: 0.7,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
