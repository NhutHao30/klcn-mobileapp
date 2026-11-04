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

export default function AdminSystemMonitor() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'PERF' | 'ERRORS'>('PERF');

  const [perfData, setPerfData] = useState<any>(null);
  const [errorsData, setErrorsData] = useState<any[]>([]);
  const [errorSummary, setErrorSummary] = useState<any>(null);

  const fetchData = async () => {
    try {
      const [resPerf, resErr] = await Promise.allSettled([
        adminApi.getSystemPerformance(),
        adminApi.getSystemErrors(),
      ]);

      if (resPerf.status === 'fulfilled' && resPerf.value?.success) {
        setPerfData(resPerf.value.data);
      }
      if (resErr.status === 'fulfilled' && resErr.value?.success) {
        setErrorsData(resErr.value.data?.data || []);
        setErrorSummary(resErr.value.summary || null);
      }
    } catch (e) {
      console.error('Lỗi khi tải giám sát hệ thống:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getUsageColor = (val: number) => {
    if (val >= 90) return '#DC2626';
    if (val >= 75) return '#D97706';
    return '#16A34A';
  };

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: '#8B0000' }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <ThemedText style={styles.headerTitle}>Giám Sát Hệ Thống</ThemedText>
          <ThemedText style={styles.headerSubtitle}>Hiệu năng Server & Ngoại lệ Real-time</ThemedText>
        </View>
        <TouchableOpacity style={styles.refreshIconBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* TABS */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'PERF' && styles.tabItemActive]}
          onPress={() => setActiveTab('PERF')}
        >
          <Ionicons name="hardware-chip-outline" size={18} color={activeTab === 'PERF' ? '#8B0000' : '#64748B'} />
          <ThemedText style={[styles.tabText, activeTab === 'PERF' && styles.tabTextActive]}>
            Hiệu Năng Phần Cứng
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'ERRORS' && styles.tabItemActive]}
          onPress={() => setActiveTab('ERRORS')}
        >
          <Ionicons name="bug-outline" size={18} color={activeTab === 'ERRORS' ? '#8B0000' : '#64748B'} />
          <ThemedText style={[styles.tabText, activeTab === 'ERRORS' && styles.tabTextActive]}>
            Lỗi Hệ Thống
          </ThemedText>
          {errorSummary?.pending > 0 && (
            <View style={styles.badgeError}>
              <ThemedText style={styles.badgeErrorText}>{errorSummary.pending}</ThemedText>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#8B0000" />
          <ThemedText style={{ marginTop: 12, color: '#64748B' }}>Đang kết nối Server Metrics...</ThemedText>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8B0000']} />}
        >
          {activeTab === 'PERF' && (
            <>
              {/* SERVER STATUS STRIP */}
              <View style={[styles.statusStrip, perfData?.isDbConnected === false && { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
                <View style={[styles.statusDot, perfData?.isDbConnected === false && { backgroundColor: '#DC2626' }]} />
                <ThemedText style={[styles.statusText, perfData?.isDbConnected === false && { color: '#991B1B' }]}>
                  {perfData?.isDbConnected === false
                    ? 'CƠ SỞ DỮ LIỆU MYSQL NGOẠI TUYẾN (DOWNTIME)'
                    : `Máy chủ Trực tuyến | Uptime: ${perfData?.serverUptime || '21 ngày'}`}
                </ThemedText>
              </View>

              {/* 4 HARDWARE CARDS */}
              <View style={styles.grid2}>
                {/* CPU */}
                <View style={styles.metricCard}>
                  <View style={styles.metricCardHeader}>
                    <ThemedText style={styles.metricTitle}>CPU LOAD</ThemedText>
                    <Ionicons name="hardware-chip" size={20} color="#0284C7" />
                  </View>
                  <ThemedText style={[styles.metricValue, { color: getUsageColor(perfData?.cpu?.usagePercent || 0) }]}>
                    {perfData?.cpu?.usagePercent ?? '--'}%
                  </ThemedText>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(100, perfData?.cpu?.usagePercent || 0)}%`,
                          backgroundColor: getUsageColor(perfData?.cpu?.usagePercent || 0),
                        },
                      ]}
                    />
                  </View>
                  <ThemedText style={styles.metricSub}>{perfData?.cpu?.cores || 8} Logical Cores</ThemedText>
                </View>

                {/* RAM */}
                <View style={styles.metricCard}>
                  <View style={styles.metricCardHeader}>
                    <ThemedText style={styles.metricTitle}>RAM SERVER</ThemedText>
                    <Ionicons name="file-tray-full" size={20} color="#9333EA" />
                  </View>
                  <ThemedText style={[styles.metricValue, { color: getUsageColor(perfData?.ram?.usagePercent || 0) }]}>
                    {perfData?.ram?.usagePercent ?? '--'}%
                  </ThemedText>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(100, perfData?.ram?.usagePercent || 0)}%`,
                          backgroundColor: getUsageColor(perfData?.ram?.usagePercent || 0),
                        },
                      ]}
                    />
                  </View>
                  <ThemedText style={styles.metricSub}>
                    {perfData?.ram?.usedGb || '--'} / {perfData?.ram?.totalGb || '--'} GB
                  </ThemedText>
                </View>

                {/* DISK */}
                <View style={styles.metricCard}>
                  <View style={styles.metricCardHeader}>
                    <ThemedText style={styles.metricTitle}>Ổ CỨNG (DISK)</ThemedText>
                    <Ionicons name="disc" size={20} color="#D97706" />
                  </View>
                  <ThemedText style={[styles.metricValue, { color: getUsageColor(perfData?.disk?.usagePercent || 0) }]}>
                    {perfData?.disk?.usagePercent ?? '--'}%
                  </ThemedText>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(100, perfData?.disk?.usagePercent || 0)}%`,
                          backgroundColor: getUsageColor(perfData?.disk?.usagePercent || 0),
                        },
                      ]}
                    />
                  </View>
                  <ThemedText style={styles.metricSub}>
                    Trống {perfData?.disk?.freeGb || '--'} / {perfData?.disk?.totalGb || '--'} GB
                  </ThemedText>
                </View>

                {/* NETWORK */}
                <View style={styles.metricCard}>
                  <View style={styles.metricCardHeader}>
                    <ThemedText style={styles.metricTitle}>TẢI API</ThemedText>
                    <Ionicons name="speedometer" size={20} color="#0D9488" />
                  </View>
                  <ThemedText style={[styles.metricValue, { color: '#0D9488' }]}>
                    {perfData?.network?.requestsPerMinute ?? '--'}
                  </ThemedText>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: '60%', backgroundColor: '#0D9488' }]} />
                  </View>
                  <ThemedText style={styles.metricSub}>req/phút (Download {perfData?.network?.bandwidthInMb || 0} MB/s)</ThemedText>
                </View>
              </View>

              {/* CORE SERVICES */}
              <View style={styles.sectionCard}>
                <ThemedText style={styles.sectionTitle}>
                  <Ionicons name="server-outline" size={16} color="#8B0000" /> Trạng Thái Dịch Vụ Cốt Lõi
                </ThemedText>

                {perfData?.services?.map((srv: any, idx: number) => (
                  <View key={idx} style={styles.serviceRow}>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.serviceName}>{srv.name}</ThemedText>
                      <ThemedText style={styles.serviceDesc}>{srv.desc}</ThemedText>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <View style={[styles.serviceBadge, { backgroundColor: srv.status === 'ONLINE' ? '#DCFCE7' : '#FEE2E2' }]}>
                        <ThemedText style={[styles.serviceBadgeText, { color: srv.status === 'ONLINE' ? '#166534' : '#991B1B' }]}>
                          {srv.status}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.serviceLatency}>{srv.latency}</ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {activeTab === 'ERRORS' && (
            <>
              {/* SUMMARY ROW */}
              <View style={styles.errorSummaryRow}>
                <View style={[styles.errorSummaryCard, { borderColor: '#FEE2E2' }]}>
                  <ThemedText style={styles.errorSummaryCount}>{errorSummary?.critical || 0}</ThemedText>
                  <ThemedText style={styles.errorSummaryLabel}>Critical</ThemedText>
                </View>
                <View style={[styles.errorSummaryCard, { borderColor: '#FEF3C7' }]}>
                  <ThemedText style={styles.errorSummaryCount}>{errorSummary?.pending || 0}</ThemedText>
                  <ThemedText style={styles.errorSummaryLabel}>Chưa Xử Lý</ThemedText>
                </View>
                <View style={[styles.errorSummaryCard, { borderColor: '#E2E8F0' }]}>
                  <ThemedText style={styles.errorSummaryCount}>{errorSummary?.dbErrors || 0}</ThemedText>
                  <ThemedText style={styles.errorSummaryLabel}>Lỗi CSDL</ThemedText>
                </View>
              </View>

              {/* ERROR LIST */}
              <View style={styles.sectionCard}>
                <ThemedText style={styles.sectionTitle}>
                  <Ionicons name="warning-outline" size={16} color="#DC2626" /> Danh Sách Ngoại Lệ Đã Gom Nhóm
                </ThemedText>

                {errorsData.length === 0 ? (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Ionicons name="checkmark-circle-outline" size={40} color="#16A34A" />
                    <ThemedText style={{ marginTop: 8, color: '#64748B', fontWeight: '600' }}>
                      Không phát hiện lỗi chưa xử lý!
                    </ThemedText>
                  </View>
                ) : (
                  errorsData.map((item, idx) => (
                    <View key={idx} style={styles.errorItem}>
                      <View style={styles.errorItemTop}>
                        <View style={[styles.severityBadge, { backgroundColor: item.mucDo === 'CRITICAL' ? '#FEE2E2' : '#FEF3C7' }]}>
                          <ThemedText style={[styles.severityBadgeText, { color: item.mucDo === 'CRITICAL' ? '#DC2626' : '#B45309' }]}>
                            {item.mucDo}
                          </ThemedText>
                        </View>
                        <ThemedText style={styles.errorCountBadge}>{item.soLanXuatHien || 1} lần</ThemedText>
                      </View>
                      <ThemedText style={styles.errorName}>{item.tenLoi}</ThemedText>
                      <ThemedText style={styles.errorMessage} numberOfLines={2}>
                        {item.thongDiep}
                      </ThemedText>
                      <ThemedText style={styles.errorUrl} numberOfLines={1}>
                        {item.url || item.tepTin || 'N/A'}
                      </ThemedText>
                    </View>
                  ))
                )}
              </View>
            </>
          )}
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#8B0000',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#8B0000',
    fontWeight: '700',
  },
  badgeError: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeErrorText: {
    color: '#FFF',
    fontSize: 10,
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
  statusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 16,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    width: (width - 44) / 2,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  metricTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    marginVertical: 4,
  },
  progressBarBg: {
    height: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  metricSub: {
    fontSize: 10,
    color: '#94A3B8',
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
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  serviceName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  serviceDesc: {
    fontSize: 11,
    color: '#64748B',
  },
  serviceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  serviceBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  serviceLatency: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  errorSummaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  errorSummaryCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  errorSummaryCount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  errorSummaryLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  errorItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  errorItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  severityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  severityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  errorCountBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  errorName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  errorMessage: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  errorUrl: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
    fontFamily: 'monospace',
  },
});

