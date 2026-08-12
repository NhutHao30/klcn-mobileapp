import React from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const STORE_LOCATIONS = [
  {
    id: '1',
    name: 'Dola Bakery - Trụ Sở Chính Tân Phú',
    address: '140 Lê Trọng Tấn, P. Tây Thạnh, Q. Tân Phú, TP.HCM',
    phone: '0987.654.321',
    hours: '07:30 - 22:00',
    distance: '0.8 km',
  },
  {
    id: '2',
    name: 'Dola Bakery - Chi Nhánh Quận 1',
    address: '88 Nguyễn Trãi, P. Bến Thành, Quận 1, TP.HCM',
    phone: '0987.654.322',
    hours: '08:00 - 22:30',
    distance: '4.2 km',
  },
  {
    id: '3',
    name: 'Dola Bakery - Chi Nhánh Quận 3',
    address: '215 Võ Văn Tần, Phường 5, Quận 3, TP.HCM',
    phone: '0987.654.323',
    hours: '08:00 - 22:00',
    distance: '5.1 km',
  },
];

export default function CustomerStoresPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const callStore = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\./g, '')}`);
  };

  const renderStore = ({ item }: { item: typeof STORE_LOCATIONS[0] }) => (
    <View style={[styles.storeCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
      <View style={styles.storeHeader}>
        <Ionicons name="storefront-outline" size={24} color={colors.tint} style={{ marginRight: 10 }} />
        <ThemedText style={styles.storeName}>{item.name}</ThemedText>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

      <View style={styles.infoRow}>
        <Ionicons name="location-outline" size={18} color={colors.icon} style={{ marginRight: 8 }} />
        <ThemedText style={styles.infoText}>{item.address}</ThemedText>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="time-outline" size={18} color={colors.icon} style={{ marginRight: 8 }} />
        <ThemedText style={styles.infoText}>Mở cửa: {item.hours}</ThemedText>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="call-outline" size={18} color={colors.icon} style={{ marginRight: 8 }} />
        <ThemedText style={styles.infoText}>{item.phone}</ThemedText>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity 
          style={[styles.callBtn, { borderColor: colors.tint }]}
          onPress={() => callStore(item.phone)}
        >
          <Ionicons name="call" size={16} color={colors.tint} style={{ marginRight: 6 }} />
          <ThemedText style={[styles.callText, { color: colors.tint }]}>Gọi ngay</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.directionBtn, { backgroundColor: colors.tint }]}>
          <Ionicons name="navigate-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
          <ThemedText style={styles.directionText}>Chỉ đường ({item.distance})</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(customer)');
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Hệ thống cửa hàng</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={STORE_LOCATIONS}
        keyExtractor={item => item.id}
        renderItem={renderStore}
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
  listContent: {
    padding: 16,
  },
  storeCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    opacity: 0.8,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  callBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  directionBtn: {
    flex: 1.2,
    height: 40,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  directionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
