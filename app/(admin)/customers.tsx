import React, { useState } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

// Mock data
const MOCK_CUSTOMERS = [
  { id: '1', name: 'John Doe', email: 'john@example.com', phone: '+1 234 567 8900', orders: 12, spent: 450.50 },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', phone: '+1 234 567 8901', orders: 5, spent: 120.00 },
  { id: '3', name: 'Alice Johnson', email: 'alice@example.com', phone: '+1 234 567 8902', orders: 24, spent: 1250.75 },
  { id: '4', name: 'Bob Brown', email: 'bob@example.com', phone: '+1 234 567 8903', orders: 1, spent: 15.00 },
];

export default function AdminCustomers() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const renderCustomer = ({ item }: { item: typeof MOCK_CUSTOMERS[0] }) => (
    <View style={[styles.customerCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
      <View style={[styles.avatarContainer, { backgroundColor: colors.tint + '20' }]}>
        <ThemedText style={[styles.avatarText, { color: colors.tint }]}>
          {item.name.charAt(0)}
        </ThemedText>
      </View>
      
      <View style={styles.customerInfo}>
        <ThemedText style={styles.customerName}>{item.name}</ThemedText>
        <View style={styles.contactRow}>
          <Ionicons name="mail-outline" size={14} color={colors.icon} style={styles.contactIcon} />
          <ThemedText style={styles.contactText}>{item.email}</ThemedText>
        </View>
        <View style={styles.contactRow}>
          <Ionicons name="call-outline" size={14} color={colors.icon} style={styles.contactIcon} />
          <ThemedText style={styles.contactText}>{item.phone}</ThemedText>
        </View>
      </View>

      <View style={styles.statsColumn}>
        <View style={styles.statItem}>
          <ThemedText style={styles.statLabel}>Orders</ThemedText>
          <ThemedText style={styles.statValue}>{item.orders}</ThemedText>
        </View>
        <View style={styles.statItem}>
          <ThemedText style={styles.statLabel}>Spent</ThemedText>
          <ThemedText style={[styles.statValue, { color: colors.tint }]}>${item.spent.toFixed(2)}</ThemedText>
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
        <ThemedText style={styles.headerTitle}>Khách hàng</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.headerActions, { borderBottomColor: colors.icon + '20' }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.icon + '15' }]}>
          <Ionicons name="search" size={20} color={colors.icon} style={styles.searchIcon} />
          <TextInput 
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search customers..."
            placeholderTextColor={colors.icon}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={[styles.filterButton, { backgroundColor: colors.icon + '15' }]}>
          <Ionicons name="options" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={MOCK_CUSTOMERS.filter(c => 
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.email.toLowerCase().includes(searchQuery.toLowerCase())
        )}
        keyExtractor={item => item.id}
        renderItem={renderCustomer}
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
  customerCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactIcon: {
    marginRight: 6,
  },
  contactText: {
    fontSize: 12,
    opacity: 0.7,
  },
  statsColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  statItem: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
