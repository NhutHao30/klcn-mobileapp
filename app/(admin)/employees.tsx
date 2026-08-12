import React, { useState } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

// Mock data
const MOCK_EMPLOYEES = [
  { id: 'EMP-001', name: 'Michael Scott', role: 'Manager', shift: 'Morning', status: 'Active' },
  { id: 'EMP-002', name: 'Dwight Schrute', role: 'Baker', shift: 'Morning', status: 'Active' },
  { id: 'EMP-003', name: 'Jim Halpert', role: 'Cashier', shift: 'Afternoon', status: 'On Leave' },
  { id: 'EMP-004', name: 'Pam Beesly', role: 'Cashier', shift: 'Morning', status: 'Active' },
  { id: 'EMP-005', name: 'Ryan Howard', role: 'Delivery', shift: 'Evening', status: 'Inactive' },
];

export default function AdminEmployees() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Active': return '#10b981';
      case 'On Leave': return '#f59e0b';
      case 'Inactive': return '#ef4444';
      default: return colors.text;
    }
  };

  const getRoleIcon = (role: string) => {
    switch(role) {
      case 'Manager': return 'briefcase';
      case 'Baker': return 'restaurant';
      case 'Cashier': return 'calculator';
      case 'Delivery': return 'bicycle';
      default: return 'person';
    }
  };

  const renderEmployee = ({ item }: { item: typeof MOCK_EMPLOYEES[0] }) => (
    <View style={[styles.employeeCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
      <View style={styles.cardHeader}>
        <View style={styles.nameRoleContainer}>
          <ThemedText style={styles.employeeName}>{item.name}</ThemedText>
          <View style={styles.roleContainer}>
            <Ionicons name={getRoleIcon(item.role)} size={14} color={colors.icon} style={styles.roleIcon} />
            <ThemedText style={styles.roleText}>{item.role}</ThemedText>
          </View>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-vertical" size={20} color={colors.icon} />
        </TouchableOpacity>
      </View>
      
      <View style={[styles.cardFooter, { borderTopColor: colors.icon + '20' }]}>
        <View style={styles.shiftContainer}>
          <Ionicons name="time-outline" size={16} color={colors.tint} style={styles.shiftIcon} />
          <ThemedText style={styles.shiftText}>Shift: {item.shift}</ThemedText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
          <ThemedText style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
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
        <ThemedText style={styles.headerTitle}>Nhân viên</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.headerActions, { borderBottomColor: colors.icon + '20' }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.icon + '15' }]}>
          <Ionicons name="search" size={20} color={colors.icon} style={styles.searchIcon} />
          <TextInput 
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search employees..."
            placeholderTextColor={colors.icon}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.tint }]}>
          <Ionicons name="person-add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={MOCK_EMPLOYEES.filter(e => 
          e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.role.toLowerCase().includes(searchQuery.toLowerCase())
        )}
        keyExtractor={item => item.id}
        renderItem={renderEmployee}
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
  employeeCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  nameRoleContainer: {
    flex: 1,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleIcon: {
    marginRight: 6,
  },
  roleText: {
    fontSize: 14,
    opacity: 0.7,
  },
  moreButton: {
    padding: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  shiftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shiftIcon: {
    marginRight: 6,
  },
  shiftText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});
