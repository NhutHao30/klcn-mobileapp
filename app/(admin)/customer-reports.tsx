import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { adminApi } from '@/services/api/adminApi';

export default function CustomerReportsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCount: 0,
    totalPoints: 0,
    totalSpent: 0,
    avgSpent: 0,
    rankCounts: {} as Record<string, number>,
  });
  const [topCustomers, setTopCustomers] = useState<any[]>([]);

  useEffect(() => {
    fetchCustomerStats();
  }, []);

  const fetchCustomerStats = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getCustomers();
      if (Array.isArray(res)) {
        const totalCount = res.length;
        const totalPoints = res.reduce((sum: number, c: any) => sum + (c.diemTichLuy || 0), 0);
        const totalSpent = res.reduce((sum: number, c: any) => sum + (Number(c.totalSpent) || 0), 0);
        const avgSpent = totalCount > 0 ? Math.round(totalSpent / totalCount) : 0;

        const rankCounts: Record<string, number> = {
          'Đồng': 0,
          'Bạc': 0,
          'Vàng': 0,
          'Kim Cương': 0,
          'Thách Đấu': 0
        };
        
        res.forEach((c: any) => {
          const rank = c.membershipRank || 'Đồng';
          rankCounts[rank] = (rankCounts[rank] || 0) + 1;
        });

        // Get Top 5 VIPs
        const sorted = [...res]
          .sort((a: any, b: any) => (Number(b.totalSpent) || 0) - (Number(a.totalSpent) || 0))
          .slice(0, 5)
          .map((c: any) => ({
            name: c.hoTen || 'Khách vãng lai',
            phone: c.sdt || 'N/A',
            spent: Number(c.totalSpent) || 0,
            rank: c.membershipRank || 'Đồng',
            orders: c.totalOrders || 0,
          }));

        setStats({
          totalCount,
          totalPoints,
          totalSpent,
          avgSpent,
          rankCounts,
        });
        setTopCustomers(sorted);
      }
    } catch (e) {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(admin)/reports')}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Báo cáo Khách hàng</ThemedText>
        <TouchableOpacity style={styles.backButton} onPress={fetchCustomerStats}>
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* STATS GRID */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
              <Ionicons name="people-outline" size={22} color={colors.tint} />
              <ThemedText style={styles.statLabel}>Khách hàng thành viên</ThemedText>
              <ThemedText style={styles.statValue}>{stats.totalCount} người</ThemedText>
              <ThemedText style={styles.statSub}>Tổng tích luỹ: {stats.totalPoints}đ</ThemedText>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
              <Ionicons name="wallet-outline" size={22} color={colors.tint} />
              <ThemedText style={styles.statLabel}>Chi tiêu tích luỹ</ThemedText>
              <ThemedText style={[styles.statValue, { color: colors.tint }]}>
                {stats.totalSpent.toLocaleString('vi-VN')}₫
              </ThemedText>
              <ThemedText style={styles.statSub}>TB/khách: {stats.avgSpent.toLocaleString('vi-VN')}₫</ThemedText>
            </View>
          </View>

          {/* MEMBERSHIP TIERS */}
          <View style={[styles.sectionCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
            <ThemedText style={styles.sectionTitle}>Tỷ lệ phân hạng thành viên</ThemedText>
            {Object.entries(stats.rankCounts).map(([rank, count]) => {
              const percentage = stats.totalCount > 0 ? (count / stats.totalCount) * 100 : 0;
              return (
                <View key={rank} style={styles.rankRow}>
                  <View style={styles.rankTextRow}>
                    <ThemedText style={styles.rankName}>{rank}</ThemedText>
                    <ThemedText style={styles.rankCount}>{count} người ({percentage.toFixed(0)}%)</ThemedText>
                  </View>
                  <View style={[styles.progressBarBg, { backgroundColor: colors.icon + '15' }]}>
                    <View style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: colors.gold }]} />
                  </View>
                </View>
              );
            })}
          </View>

          {/* TOP VIP CUSTOMERS */}
          <View style={[styles.sectionCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
            <ThemedText style={styles.sectionTitle}>Top 5 Khách hàng thân thiết</ThemedText>
            {topCustomers.map((customer, idx) => (
              <View key={idx} style={[styles.customerRow, idx < topCustomers.length - 1 && { borderBottomColor: colors.icon + '15', borderBottomWidth: 1 }]}>
                <View style={styles.customerMeta}>
                  <View style={[styles.indexCircle, { backgroundColor: colors.tint + '15' }]}>
                    <ThemedText style={[styles.indexText, { color: colors.tint }]}>{idx + 1}</ThemedText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.customerName}>{customer.name}</ThemedText>
                    <ThemedText style={styles.customerSub}>SĐT: {customer.phone} • {customer.orders} đơn mua</ThemedText>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <ThemedText style={[styles.customerSpent, { color: colors.tint }]}>
                    {customer.spent.toLocaleString('vi-VN')}₫
                  </ThemedText>
                  <ThemedText style={styles.customerRank}>{customer.rank}</ThemedText>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
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
  content: {
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statSub: {
    fontSize: 11,
    opacity: 0.5,
  },
  sectionCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  rankRow: {
    marginBottom: 14,
  },
  rankTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  rankName: {
    fontSize: 14,
    fontWeight: '500',
  },
  rankCount: {
    fontSize: 12,
    opacity: 0.6,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  customerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  customerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  indexCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  indexText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  customerName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  customerSub: {
    fontSize: 11,
    opacity: 0.5,
    marginTop: 2,
  },
  customerSpent: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  customerRank: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 2,
    fontWeight: '500',
  },
});
