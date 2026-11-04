import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import { adminApi } from '@/services/api/adminApi';

const { width } = Dimensions.get('window');

export default function AdminAnalytics() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days'>('7days');

  const [userData, setUserData] = useState<any>(null);
  const [behaviorData, setBehaviorData] = useState<any>(null);

  const fetchData = async () => {
    try {
      const [resUser, resBehavior] = await Promise.allSettled([
        adminApi.getUserAnalytics({ timeRange }),
        adminApi.getBehaviorAnalytics({ timeRange }),
      ]);

      if (resUser.status === 'fulfilled' && resUser.value?.success) {
        setUserData(resUser.value.data);
      }
      if (resBehavior.status === 'fulfilled' && resBehavior.value?.success) {
        setBehaviorData(resBehavior.value.data);
      }
    } catch (e) {
      console.error('Lỗi tải dữ liệu người dùng mobile:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: '#8B0000' }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <ThemedText style={styles.headerTitle}>Phân Tích Người Dùng</ThemedText>
          <ThemedText style={styles.headerSubtitle}>DAU, MAU & Báo cáo Hành vi</ThemedText>
        </View>
        <TouchableOpacity style={styles.refreshIconBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* FILTER BUTTONS */}
      <View style={styles.filterBar}>
        {[
          { key: 'today', label: 'Hôm nay' },
          { key: '7days', label: '7 ngày qua' },
          { key: '30days', label: '30 ngày qua' },
        ].map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.filterBtn, timeRange === item.key && styles.filterBtnActive]}
            onPress={() => setTimeRange(item.key as any)}
          >
            <ThemedText style={[styles.filterBtnText, timeRange === item.key && styles.filterBtnTextActive]}>
              {item.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#8B0000" />
          <ThemedText style={{ marginTop: 12, color: '#64748B' }}>Đang tổng hợp số liệu phân tích...</ThemedText>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8B0000']} />}
        >
          {/* 4 CORE KPI CARDS */}
          <View style={styles.grid2}>
            {/* TOTAL USERS */}
            <View style={styles.kpiCard}>
              <View style={styles.kpiCardHeader}>
                <ThemedText style={styles.kpiTitle}>TỔNG NGƯỜI DÙNG</ThemedText>
                <Ionicons name="people" size={18} color="#0284C7" />
              </View>
              <ThemedText style={styles.kpiValue}>{userData?.totalUsers || '--'}</ThemedText>
              <ThemedText style={styles.kpiSub}>Khóa: {userData?.lockedCount || 0} tài khoản</ThemedText>
            </View>

            {/* DAU */}
            <View style={styles.kpiCard}>
              <View style={styles.kpiCardHeader}>
                <ThemedText style={styles.kpiTitle}>ACTIVE HÔM NAY (DAU)</ThemedText>
                <Ionicons name="person-circle" size={18} color="#16A34A" />
              </View>
              <ThemedText style={[styles.kpiValue, { color: '#16A34A' }]}>{userData?.dau || '--'}</ThemedText>
              <ThemedText style={styles.kpiSub}>Trong 24 giờ qua</ThemedText>
            </View>

            {/* MAU */}
            <View style={styles.kpiCard}>
              <View style={styles.kpiCardHeader}>
                <ThemedText style={styles.kpiTitle}>THÁNG NÀY (MAU)</ThemedText>
                <Ionicons name="calendar" size={18} color="#9333EA" />
              </View>
              <ThemedText style={[styles.kpiValue, { color: '#9333EA' }]}>{userData?.mau || '--'}</ThemedText>
              <ThemedText style={styles.kpiSub}>Trong 30 ngày qua</ThemedText>
            </View>

            {/* ONLINE */}
            <View style={styles.kpiCard}>
              <View style={styles.kpiCardHeader}>
                <ThemedText style={styles.kpiTitle}>ĐANG TRỰC TUYẾN</ThemedText>
                <Ionicons name="wifi" size={18} color="#0D9488" />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={styles.greenPulse} />
                <ThemedText style={[styles.kpiValue, { color: '#0D9488' }]}>{userData?.onlineCount || 1}</ThemedText>
              </View>
              <ThemedText style={styles.kpiSub}>Phiên tương tác &lt; 15p</ThemedText>
            </View>
          </View>

          {/* CHURN RATE BANNER */}
          <View style={styles.churnBanner}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.churnTitle}>Tỷ Lệ Rời Bỏ (Churn Rate)</ThemedText>
              <ThemedText style={styles.churnDesc}>Tài khoản không hoạt động &gt; 60 ngày</ThemedText>
            </View>
            <ThemedText style={styles.churnPercent}>{userData?.churnRate || 0}%</ThemedText>
          </View>

          {/* TOP FEATURES */}
          <View style={styles.sectionCard}>
            <ThemedText style={styles.sectionTitle}>
              <Ionicons name="flame-outline" size={16} color="#EA580C" /> Top Tính Năng Truy Cập Nhiều Nhất
            </ThemedText>

            {behaviorData?.topFeatures?.map((f: any, idx: number) => {
              const maxVisits = Math.max(1, behaviorData.topFeatures[0]?.visits || 1);
              const percent = Math.round((f.visits / maxVisits) * 100);

              return (
                <View key={idx} style={{ marginBottom: 12 }}>
                  <View style={styles.barHeader}>
                    <ThemedText style={styles.barName}>
                      #{idx + 1} {f.name}
                    </ThemedText>
                    <ThemedText style={styles.barCount}>{f.visits} lượt</ThemedText>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${percent}%`, backgroundColor: idx === 0 ? '#EA580C' : '#0284C7' }]} />
                  </View>
                </View>
              );
            })}
          </View>

          {/* DEVICES BREAKDOWN */}
          <View style={styles.sectionCard}>
            <ThemedText style={styles.sectionTitle}>
              <Ionicons name="phone-portrait-outline" size={16} color="#9333EA" /> Phân Bố Thiết Bị & Nền Tảng
            </ThemedText>

            <View style={{ gap: 8 }}>
              {behaviorData?.devices?.breakdown?.map((d: any, idx: number) => (
                <View key={idx} style={styles.deviceRow}>
                  <ThemedText style={styles.deviceName}>{d.name}</ThemedText>
                  <ThemedText style={styles.devicePercent}>{d.percentage}% ({d.count} lượt)</ThemedText>
                </View>
              ))}
            </View>
          </View>

          {/* REALTIME ONLINE USERS */}
          <View style={styles.sectionCard}>
            <ThemedText style={styles.sectionTitle}>
              <Ionicons name="radio-outline" size={16} color="#10B981" /> Người Dùng Đang Online (Real-time)
            </ThemedText>

            {userData?.onlineUsers?.length > 0 ? (
              userData.onlineUsers.map((u: any, idx: number) => (
                <View key={idx} style={styles.onlineUserRow}>
                  <View style={styles.userAvatarMini}>
                    <ThemedText style={styles.userAvatarText}>{(u.hoTen || 'U')[0]}</ThemedText>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <ThemedText style={styles.onlineUserName}>{u.hoTen} (@{u.username})</ThemedText>
                    <ThemedText style={styles.onlineUserAction}>📱 {u.device || 'Desktop'} • {u.action}</ThemedText>
                  </View>
                  <ThemedText style={styles.onlineUserTime}>{u.lastActive}</ThemedText>
                </View>
              ))
            ) : (
              <ThemedText style={{ color: '#94A3B8', fontSize: 12, textAlign: 'center', paddingVertical: 12 }}>
                Không có tương tác mới trong 15 phút qua
              </ThemedText>
            )}
          </View>
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 6,
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 10,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  refreshIconBtn: {
    padding: 6,
  },
  filterBar: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  filterBtnActive: {
    backgroundColor: '#8B0000',
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterBtnTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
    padding: 16,
  },
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    width: (width - 44) / 2,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kpiCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  kpiTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginVertical: 2,
  },
  kpiSub: {
    fontSize: 10,
    color: '#94A3B8',
  },
  greenPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  churnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 16,
  },
  churnTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
  },
  churnDesc: {
    fontSize: 11,
    color: '#DC2626',
    marginTop: 2,
  },
  churnPercent: {
    fontSize: 24,
    fontWeight: '800',
    color: '#DC2626',
  },
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14,
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  barName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  barCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  barTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  deviceName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  devicePercent: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  onlineUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  userAvatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  onlineUserName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  onlineUserAction: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  onlineUserTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
});

