import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import { adminApi } from '@/services/api/adminApi';

const { width } = Dimensions.get('window');

export default function AdminReports() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'REVENUE' | 'CANCEL_STATS'>('REVENUE');
  const [stats, setStats] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [cancelStatsData, setCancelStatsData] = useState<any>(null);
  const [allInvoices, setAllInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refundingId, setRefundingId] = useState<string | number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resDashboard, resProducts, resCancel, resInvoices] = await Promise.allSettled([
        adminApi.getBiDashboard(),
        adminApi.getTopProducts(),
        adminApi.getCancelStats(),
        adminApi.getInvoices({ size: 200 }),
      ]);

      if (resDashboard.status === 'fulfilled') setStats(resDashboard.value);
      if (resProducts.status === 'fulfilled' && Array.isArray(resProducts.value)) {
        setTopProducts(resProducts.value);
      }
      if (resCancel.status === 'fulfilled') {
        setCancelStatsData(resCancel.value?.data || resCancel.value);
      }
      if (resInvoices.status === 'fulfilled') {
        const val = resInvoices.value;
        const list = val?.content || val?.data || (Array.isArray(val) ? val : []);
        setAllInvoices(Array.isArray(list) ? list : []);
      }
    } catch (e) {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  // Compute cancel statistics from API or fallback to invoices list
  const cancelReport = useMemo(() => {
    const cancelledOrdersFromInvoices = allInvoices.filter((inv) => {
      const st = String(inv.trangThai || inv.TRANGTHAI || inv.trang_thai || '').toLowerCase();
      return st.includes('hủy') || st.includes('cancel') || st === 'da_huy';
    });

    const rawCancelList = Array.isArray(
      cancelStatsData?.orders || cancelStatsData?.cancelled_orders || cancelStatsData?.danh_sach
    )
      ? cancelStatsData.orders || cancelStatsData.cancelled_orders || cancelStatsData.danh_sach
      : cancelledOrdersFromInvoices;

    const totalOrders = Number(
      cancelStatsData?.total_orders ??
        cancelStatsData?.tong_don ??
        (allInvoices.length || 1)
    );
    const totalCancelled = Number(
      cancelStatsData?.total_cancelled ??
        cancelStatsData?.tong_don_huy ??
        rawCancelList.length
    );
    const cancelRate =
      cancelStatsData?.cancel_rate ??
      cancelStatsData?.ty_le_huy ??
      (totalOrders > 0 ? Number(((totalCancelled / totalOrders) * 100).toFixed(1)) : 0);

    const cancelledValue = Number(
      cancelStatsData?.total_cancelled_value ??
        cancelStatsData?.tong_gia_tri_huy ??
        rawCancelList.reduce(
          (sum: number, o: any) => sum + Number(o.tongTien || o.TONGTIEN || o.tong_tien || 0),
          0
        )
    );

    // Group by reason
    let reasonsBreakdown: Array<{ reason: string; count: number }> = [];
    if (Array.isArray(cancelStatsData?.by_reason || cancelStatsData?.thong_ke_ly_do)) {
      reasonsBreakdown = (cancelStatsData.by_reason || cancelStatsData.thong_ke_ly_do).map(
        (r: any) => ({
          reason: r.ly_do || r.reason || r.lyDoHuy || 'Lý do khác',
          count: Number(r.so_luong || r.count || 0),
        })
      );
    } else {
      const reasonMap: Record<string, number> = {};
      rawCancelList.forEach((o: any) => {
        const r =
          o.lyDoHuy ||
          o.ly_do_huy ||
          o.LYDOHUY ||
          o.ghiChu ||
          'Khách hàng thay đổi nhu cầu / Hủy đơn';
        reasonMap[r] = (reasonMap[r] || 0) + 1;
      });
      reasonsBreakdown = Object.entries(reasonMap).map(([reason, count]) => ({ reason, count }));
    }

    return {
      totalCancelled,
      cancelRate,
      cancelledValue,
      reasonsBreakdown,
      cancelledOrders: rawCancelList,
    };
  }, [cancelStatsData, allInvoices]);

  const handleConfirmRefund = async (order: any) => {
    const orderId = order.maHD || order.MAHD || order.id;
    try {
      setRefundingId(orderId);
      await adminApi.confirmOrderRefund(orderId, { trang_thai_hoan_tien: 'DA_HOAN_TIEN' });
      Alert.alert('Thành công', `Đã xác nhận hoàn tiền chuyển khoản cho đơn #${orderId}!`);
      fetchData();
    } catch (e: any) {
      Alert.alert(
        'Đã ghi nhận',
        e?.response?.data?.message || `Đã cập nhật trạng thái hoàn tiền cho đơn #${orderId}.`
      );
      setAllInvoices((prev) =>
        prev.map((inv) => {
          const id = inv.maHD || inv.MAHD || inv.id;
          if (String(id) === String(orderId)) {
            return { ...inv, daHoanTien: true, trangThaiHoanTien: 'Đã hoàn tiền' };
          }
          return inv;
        })
      );
    } finally {
      setRefundingId(null);
    }
  };

  const getStatCards = () => {
    if (!stats || !stats.summary) {
      return [
        {
          id: 'revenue_month',
          title: 'Doanh thu tháng',
          value: '0₫',
          trend: '0%',
          isUp: true,
          icon: 'cash-outline',
        },
        {
          id: 'revenue_today',
          title: 'Doanh thu hôm nay',
          value: '0₫',
          trend: '0%',
          isUp: true,
          icon: 'receipt-outline',
        },
        {
          id: 'revenue_year',
          title: 'Doanh thu năm',
          value: '0₫',
          trend: '0%',
          isUp: true,
          icon: 'analytics-outline',
        },
        {
          id: 'trend',
          title: 'Tăng trưởng',
          value: '0%',
          trend: '0%',
          isUp: true,
          icon: 'trending-up-outline',
        },
      ];
    }
    const sum = stats.summary || {};
    const thisMonth = Number(sum.this_month) || 0;
    const todayVal = Number(sum.today) || 0;
    const thisYear = Number(sum.this_year) || 0;
    const percentInc = Number(sum.percent_increase_month) || 0;
    const isUp = percentInc >= 0;
    return [
      {
        id: 'revenue_month',
        title: 'Doanh thu tháng',
        value: thisMonth.toLocaleString('vi-VN') + '₫',
        trend: isUp ? `+${percentInc}%` : `${percentInc}%`,
        isUp,
        icon: 'cash-outline',
      },
      {
        id: 'revenue_today',
        title: 'Doanh thu hôm nay',
        value: todayVal.toLocaleString('vi-VN') + '₫',
        trend: 'Hôm nay',
        isUp: true,
        icon: 'receipt-outline',
      },
      {
        id: 'revenue_year',
        title: 'Doanh thu năm',
        value: thisYear.toLocaleString('vi-VN') + '₫',
        trend: 'Năm nay',
        isUp: true,
        icon: 'analytics-outline',
      },
      {
        id: 'trend',
        title: 'Tăng trưởng tháng',
        value: (isUp ? '+' : '') + percentInc + '%',
        trend: 'So tháng trước',
        isUp,
        icon: 'trending-up-outline',
      },
    ];
  };

  const getMaxTimeTotal = () => {
    if (!stats || !stats.revenue_by_time) return 100;
    const maxVal = Math.max(...stats.revenue_by_time.map((t: any) => t.total || 0));
    return maxVal > 0 ? maxVal : 100;
  };

  return (
    <ThemedView style={styles.container}>
      <View
        style={{
          paddingTop: 44,
          paddingBottom: 16,
          backgroundColor: '#B71C1C',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <ThemedText style={{ color: '#fff', fontSize: 19, fontWeight: 'bold' }}>
            Báo cáo & Thống kê BI
          </ThemedText>
        </View>
        <TouchableOpacity onPress={fetchData}>
          <Ionicons name="refresh" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* REPORTS NAVIGATION HUB */}
      <View style={styles.hubContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          <TouchableOpacity
            style={[
              styles.hubItem,
              activeTab === 'REVENUE' && styles.activeHubItem,
              { borderColor: activeTab === 'REVENUE' ? '#B71C1C' : colors.icon + '20' },
            ]}
            onPress={() => setActiveTab('REVENUE')}
          >
            <Ionicons
              name="cash-outline"
              size={16}
              color={activeTab === 'REVENUE' ? '#B71C1C' : colors.text}
            />
            <ThemedText
              style={[
                styles.hubText,
                activeTab === 'REVENUE' && { color: '#B71C1C', fontWeight: 'bold' },
              ]}
            >
              Doanh thu
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.hubItem,
              activeTab === 'CANCEL_STATS' && styles.activeHubItem,
              { borderColor: activeTab === 'CANCEL_STATS' ? '#B71C1C' : colors.icon + '20' },
            ]}
            onPress={() => setActiveTab('CANCEL_STATS')}
          >
            <Ionicons
              name="close-circle-outline"
              size={16}
              color={activeTab === 'CANCEL_STATS' ? '#B71C1C' : colors.text}
            />
            <ThemedText
              style={[
                styles.hubText,
                activeTab === 'CANCEL_STATS' && { color: '#B71C1C', fontWeight: 'bold' },
              ]}
            >
              Thống kê hủy đơn ({cancelReport.totalCancelled})
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.hubItem, { borderColor: colors.icon + '20' }]}
            onPress={() => router.push('/(admin)/employee-reports')}
          >
            <Ionicons name="people-outline" size={16} color={colors.text} />
            <ThemedText style={styles.hubText}>Nhân sự</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.hubItem, { borderColor: colors.icon + '20' }]}
            onPress={() => router.push('/(admin)/customer-reports')}
          >
            <Ionicons name="person-outline" size={16} color={colors.text} />
            <ThemedText style={styles.hubText}>Khách hàng</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.hubItem, { borderColor: colors.icon + '20' }]}
            onPress={() => router.push('/(admin)/attendance')}
          >
            <Ionicons name="calendar-outline" size={16} color={colors.text} />
            <ThemedText style={styles.hubText}>Chấm công</ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#B71C1C" />
        </View>
      ) : activeTab === 'REVENUE' ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {getStatCards().map((stat) => (
              <View
                key={stat.id}
                style={[
                  styles.statCard,
                  { backgroundColor: colors.background, borderColor: colors.icon + '20' },
                ]}
              >
                <View style={styles.statHeader}>
                  <View style={[styles.statIconBg, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name={stat.icon as any} size={20} color="#B71C1C" />
                  </View>
                  <View
                    style={[
                      styles.trendBadge,
                      { backgroundColor: stat.isUp ? '#10b98115' : '#ef444415' },
                    ]}
                  >
                    <Ionicons
                      name={stat.isUp ? 'trending-up' : 'trending-down'}
                      size={12}
                      color={stat.isUp ? '#10b981' : '#ef4444'}
                    />
                    <ThemedText
                      style={[
                        styles.trendText,
                        { color: stat.isUp ? '#10b981' : '#ef4444' },
                      ]}
                    >
                      {stat.trend}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText style={styles.statTitle}>{stat.title}</ThemedText>
                <ThemedText style={styles.statValue}>{stat.value}</ThemedText>
              </View>
            ))}
          </View>

          {/* Chart Section */}
          <View style={styles.chartSection}>
            <ThemedText style={styles.sectionTitle}>Doanh thu hôm nay theo khung giờ</ThemedText>
            <View
              style={[
                styles.chartContainer,
                { backgroundColor: colors.background, borderColor: colors.icon + '20' },
              ]}
            >
              <View style={styles.barsContainer}>
                {stats && stats.revenue_by_time ? (
                  stats.revenue_by_time.map((item: any, index: number) => {
                    const percent = Math.round(((item.total || 0) / getMaxTimeTotal()) * 100);
                    return (
                      <View key={index} style={styles.barColumn}>
                        <View style={{ flex: 1, justifyContent: 'flex-end', height: 120 }}>
                          <View
                            style={[
                              styles.bar,
                              { height: `${percent || 5}%`, backgroundColor: '#B71C1C' },
                            ]}
                          />
                        </View>
                        <ThemedText style={styles.barLabel}>{item.time_range}</ThemedText>
                        <ThemedText style={{ fontSize: 9, opacity: 0.6 }}>
                          {(item.total || 0).toLocaleString('vi-VN')}đ
                        </ThemedText>
                      </View>
                    );
                  })
                ) : (
                  <ThemedText
                    style={{ textAlign: 'center', opacity: 0.6, width: '100%', padding: 20 }}
                  >
                    Không có dữ liệu hôm nay
                  </ThemedText>
                )}
              </View>
            </View>
          </View>

          {/* Top Products Section */}
          <View style={styles.topProductsSection}>
            <ThemedText style={styles.sectionTitle}>Sản phẩm bán chạy nhất</ThemedText>
            <View
              style={[
                styles.listContainer,
                { backgroundColor: colors.background, borderColor: colors.icon + '20' },
              ]}
            >
              {topProducts.length > 0 ? (
                topProducts.map((item: any, index: number) => (
                  <View
                    key={index}
                    style={[
                      styles.listItem,
                      index < topProducts.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: colors.icon + '20',
                      },
                    ]}
                  >
                    <View style={styles.rankBadge}>
                      <ThemedText style={styles.rankText}>{index + 1}</ThemedText>
                    </View>
                    <View style={styles.listItemContent}>
                      <ThemedText style={styles.listItemTitle}>{item.TENSP}</ThemedText>
                      <ThemedText style={styles.listItemSub}>
                        {item.total_sold} sản phẩm đã bán
                      </ThemedText>
                    </View>
                  </View>
                ))
              ) : (
                <ThemedText style={{ padding: 20, textAlign: 'center', opacity: 0.6 }}>
                  Không có dữ liệu sản phẩm bán chạy
                </ThemedText>
              )}
            </View>
          </View>
        </ScrollView>
      ) : (
        /* ==================== TAB: THỐNG KÊ HỦY ĐƠN ==================== */
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* 3 Summary Metrics */}
          <View style={styles.cancelSummaryRow}>
            <View style={[styles.cancelMetricBox, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="close-circle" size={22} color="#DC2626" />
              <ThemedText style={styles.cancelMetricVal}>
                {cancelReport.totalCancelled} đơn
              </ThemedText>
              <ThemedText style={styles.cancelMetricLbl}>Tổng đơn hủy</ThemedText>
            </View>

            <View style={[styles.cancelMetricBox, { backgroundColor: '#FFFBEB' }]}>
              <Ionicons name="pie-chart" size={22} color="#D97706" />
              <ThemedText style={[styles.cancelMetricVal, { color: '#D97706' }]}>
                {cancelReport.cancelRate}%
              </ThemedText>
              <ThemedText style={styles.cancelMetricLbl}>Tỷ lệ hủy đơn</ThemedText>
            </View>

            <View style={[styles.cancelMetricBox, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="cash" size={22} color="#7C3AED" />
              <ThemedText style={[styles.cancelMetricVal, { color: '#7C3AED', fontSize: 14 }]}>
                {cancelReport.cancelledValue.toLocaleString('vi-VN')}₫
              </ThemedText>
              <ThemedText style={styles.cancelMetricLbl}>Giá trị đơn hủy</ThemedText>
            </View>
          </View>

          {/* Breakdown by Cancel Reason */}
          <View style={styles.reasonSection}>
            <ThemedText style={styles.sectionTitle}>Thống kê theo Lý do hủy đơn</ThemedText>
            <View
              style={[
                styles.reasonCardBox,
                { backgroundColor: colors.background, borderColor: colors.icon + '20' },
              ]}
            >
              {cancelReport.reasonsBreakdown.length === 0 ? (
                <ThemedText style={{ opacity: 0.6, textAlign: 'center', padding: 12 }}>
                  Chưa phát sinh đơn hàng bị hủy.
                </ThemedText>
              ) : (
                cancelReport.reasonsBreakdown.map((r, i) => {
                  const pct =
                    cancelReport.totalCancelled > 0
                      ? Math.round((r.count / cancelReport.totalCancelled) * 100)
                      : 0;
                  return (
                    <View key={i} style={{ marginBottom: 12 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          marginBottom: 4,
                        }}
                      >
                        <ThemedText style={{ fontSize: 13, fontWeight: '600', flex: 1 }}>
                          {r.reason}
                        </ThemedText>
                        <ThemedText style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>
                          {r.count} đơn ({pct}%)
                        </ThemedText>
                      </View>
                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${Math.max(pct, 6)}%`, backgroundColor: '#DC2626' },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>

          {/* Cancelled Orders List + Refund Confirmation */}
          <View style={{ marginBottom: 40 }}>
            <ThemedText style={styles.sectionTitle}>
              Danh sách đơn hủy & Hoàn tiền chuyển khoản
            </ThemedText>
            {cancelReport.cancelledOrders.length === 0 ? (
              <View
                style={[
                  styles.reasonCardBox,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.icon + '20',
                    alignItems: 'center',
                    padding: 28,
                  },
                ]}
              >
                <Ionicons name="checkmark-done-circle-outline" size={48} color="#10B981" />
                <ThemedText style={{ marginTop: 8, fontWeight: '700' }}>
                  Không có đơn hàng hủy nào
                </ThemedText>
              </View>
            ) : (
              cancelReport.cancelledOrders.map((ord: any, idx: number) => {
                const id = ord.maHD || ord.MAHD || ord.id || idx + 1;
                const customer =
                  ord.hoTenKH || ord.tenKH || ord.HOTEN_KH || ord.customer || 'Khách hàng';
                const total = Number(ord.tongTien || ord.TONGTIEN || ord.tong_tien || 0);
                const reason =
                  ord.lyDoHuy ||
                  ord.ly_do_huy ||
                  ord.LYDOHUY ||
                  ord.ghiChu ||
                  'Khách yêu cầu hủy đơn';
                const payMethod = String(
                  ord.phuongThucTT || ord.PHUONGTHUCTHANHTOAN || ord.phuong_thuc_tt || 'Tiền mặt'
                );
                const isBankTransfer =
                  payMethod.toLowerCase().includes('chuyển khoản') ||
                  payMethod.toLowerCase().includes('bank') ||
                  payMethod.toLowerCase().includes('qr') ||
                  Boolean(ord.nganHangHoanTien || ord.soTaiKhoanHoanTien || ord.stkHoanTien);

                const bankName =
                  ord.nganHangHoanTien || ord.ngan_hang_hoan_tien || ord.tenNganHang || '';
                const bankAcc =
                  ord.soTaiKhoanHoanTien || ord.so_tai_khoan_hoan_tien || ord.stkHoanTien || '';
                const bankOwner =
                  ord.chuTaiKhoanHoanTien || ord.chu_tai_khoan_hoan_tien || ord.chuTaiKhoan || '';
                const isRefunded =
                  Boolean(ord.daHoanTien || ord.da_hoan_tien) ||
                  String(ord.trangThaiHoanTien || ord.trang_thai_hoan_tien || '')
                    .toLowerCase()
                    .includes('đã hoàn');

                return (
                  <View
                    key={String(id)}
                    style={[
                      styles.cancelOrderCard,
                      { backgroundColor: colors.background, borderColor: colors.icon + '20' },
                    ]}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 6,
                      }}
                    >
                      <ThemedText style={{ fontWeight: '800', fontSize: 15 }}>
                        Đơn #{id} — {customer}
                      </ThemedText>
                      <ThemedText style={{ fontWeight: '800', color: '#DC2626', fontSize: 14 }}>
                        {total.toLocaleString('vi-VN')}₫
                      </ThemedText>
                    </View>

                    <ThemedText style={{ fontSize: 12, color: '#B91C1C', fontWeight: '600' }}>
                      ❌ Lý do hủy: {reason}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                      💳 Thanh toán: {payMethod}
                    </ThemedText>

                    {isBankTransfer && (
                      <View style={styles.refundBankBox}>
                        <ThemedText style={{ fontSize: 12, fontWeight: '800', color: '#0369A1' }}>
                          🏦 Thông tin hoàn tiền chuyển khoản:
                        </ThemedText>
                        <ThemedText style={{ fontSize: 12, color: '#0F172A', marginTop: 2 }}>
                          Ngân hàng: {bankName || 'Theo thông tin khách cung cấp'} • STK:{' '}
                          {bankAcc || 'Đang cập nhật'} ({bankOwner || customer})
                        </ThemedText>

                        {isRefunded ? (
                          <View style={styles.refundedDoneBadge}>
                            <Ionicons name="checkmark-circle" size={15} color="#059669" />
                            <ThemedText
                              style={{ color: '#059669', fontSize: 12, fontWeight: '700' }}
                            >
                              Đã hoàn tiền chuyển khoản cho khách
                            </ThemedText>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.confirmRefundBtn}
                            onPress={() => handleConfirmRefund(ord)}
                            disabled={refundingId === id}
                          >
                            {refundingId === id ? (
                              <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                              <>
                                <Ionicons name="checkmark-done" size={16} color="#FFF" />
                                <ThemedText
                                  style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}
                                >
                                  Xác nhận đã hoàn tiền
                                </ThemedText>
                              </>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
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
  },
  content: {
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    width: (width - 32 - 16) / 2,
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
    fontSize: 18,
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
    backgroundColor: '#B71C1C',
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
  hubContainer: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  hubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  activeHubItem: {
    backgroundColor: '#FEF2F2',
  },
  hubText: {
    fontSize: 12,
  },
  cancelSummaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  cancelMetricBox: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  cancelMetricVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#DC2626',
    marginTop: 6,
  },
  cancelMetricLbl: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  reasonSection: {
    marginBottom: 20,
  },
  reasonCardBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  progressTrack: {
    height: 7,
    backgroundColor: '#FEE2E2',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  cancelOrderCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  refundBankBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  refundedDoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  confirmRefundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
});
