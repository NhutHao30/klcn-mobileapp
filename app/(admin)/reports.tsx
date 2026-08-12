import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const STAT_CARDS = [
  { id: 'revenue', title: 'Tổng doanh thu', value: '$24,500', trend: '+15%', isUp: true, icon: 'cash-outline' },
  { id: 'orders', title: 'Tổng đơn hàng', value: '1,240', trend: '+8%', isUp: true, icon: 'receipt-outline' },
  { id: 'customers', title: 'Khách hàng mới', value: '145', trend: '-2%', isUp: false, icon: 'people-outline' },
  { id: 'products', title: 'Sản phẩm đã bán', value: '3,890', trend: '+12%', isUp: true, icon: 'cube-outline' },
];

export default function AdminReports() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <View style={{ paddingTop: 40, paddingBottom: 16, backgroundColor: colors.headerBg, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>Báo cáo thống kê</ThemedText>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        
        {/* Time Filter */}
        <View style={styles.filterRow}>
          <ThemedText style={styles.filterTitle}>Tháng này</ThemedText>
          <TouchableOpacity style={[styles.filterButton, { backgroundColor: colors.icon + '15' }]}>
            <Ionicons name="calendar-outline" size={16} color={colors.text} />
            <ThemedText style={styles.filterButtonText}>Tháng 8, 2026</ThemedText>
            <Ionicons name="chevron-down" size={16} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {STAT_CARDS.map((stat) => (
            <View key={stat.id} style={[styles.statCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
              <View style={styles.statHeader}>
                <View style={[styles.statIconBg, { backgroundColor: colors.tint + '15' }]}>
                  <Ionicons name={stat.icon as any} size={20} color={colors.tint} />
                </View>
                <View style={[styles.trendBadge, { backgroundColor: stat.isUp ? '#10b98115' : '#ef444415' }]}>
                  <Ionicons name={stat.isUp ? "trending-up" : "trending-down"} size={12} color={stat.isUp ? "#10b981" : "#ef4444"} />
                  <ThemedText style={[styles.trendText, { color: stat.isUp ? "#10b981" : "#ef4444" }]}>{stat.trend}</ThemedText>
                </View>
              </View>
              <ThemedText style={styles.statTitle}>{stat.title}</ThemedText>
              <ThemedText style={styles.statValue}>{stat.value}</ThemedText>
            </View>
          ))}
        </View>

        {/* Chart Placeholder */}
        <View style={styles.chartSection}>
          <ThemedText style={styles.sectionTitle}>Doanh thu theo ngày</ThemedText>
          <View style={[styles.chartContainer, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
            {/* Fake Chart Bars */}
            <View style={styles.barsContainer}>
              {[40, 70, 45, 90, 60, 100, 80].map((height, index) => (
                <View key={index} style={styles.barColumn}>
                  <View style={[styles.bar, { height: `${height}%`, backgroundColor: colors.tint }]} />
                  <ThemedText style={styles.barLabel}>{index + 1} Aug</ThemedText>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Top Products Placeholder */}
        <View style={styles.topProductsSection}>
          <ThemedText style={styles.sectionTitle}>Sản phẩm bán chạy</ThemedText>
          <View style={[styles.listContainer, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
            {['Tiramisu', 'Croissant', 'Macaron'].map((item, index) => (
              <View key={index} style={[styles.listItem, index < 2 && { borderBottomWidth: 1, borderBottomColor: colors.icon + '20' }]}>
                <View style={styles.rankBadge}>
                  <ThemedText style={styles.rankText}>{index + 1}</ThemedText>
                </View>
                <View style={styles.listItemContent}>
                  <ThemedText style={styles.listItemTitle}>{item}</ThemedText>
                  <ThemedText style={styles.listItemSub}>{120 - index * 20} đã bán</ThemedText>
                </View>
                <ThemedText style={[styles.listItemValue, { color: colors.tint }]}>${(120 - index * 20) * 5}</ThemedText>
              </View>
            ))}
          </View>
        </View>

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
  content: {
    padding: 16,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  filterButtonText: {
    marginHorizontal: 8,
    fontSize: 14,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    width: (width - 32 - 16) / 2, // 2 columns
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  trendText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  statTitle: {
    fontSize: 13,
    opacity: 0.7,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  chartSection: {
    marginBottom: 24,
  },
  chartContainer: {
    height: 200,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    justifyContent: 'flex-end',
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: '100%',
  },
  barColumn: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    width: 30,
  },
  bar: {
    width: 16,
    borderRadius: 4,
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 10,
    opacity: 0.6,
  },
  topProductsSection: {
    marginBottom: 40,
  },
  listContainer: {
    borderRadius: 16,
    borderWidth: 1,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  listItemSub: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  listItemValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
