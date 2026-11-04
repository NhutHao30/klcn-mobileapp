import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { adminApi } from '@/services/api/adminApi';

interface LoHangItem {
  MALOHANG?: string | number;
  id?: string | number;
  maLoHang?: string;
  MASP?: string | number;
  san_pham?: { TENSP?: string; name?: string; HINHANH?: string; tenSanPham?: string };
  sanPham?: { TENSP?: string; name?: string; HINHANH?: string; tenSanPham?: string };
  TENSP?: string;
  MACUAHANG?: number;
  cua_hang?: { TENCUAHANG?: string; ten_cua_hang?: string; tenCuaHang?: string };
  cuaHang?: { TENCUAHANG?: string; ten_cua_hang?: string; tenCuaHang?: string };
  TENCUAHANG?: string;
  NGAYSX?: string;
  ngaySanXuat?: string;
  ngay_san_xuat?: string;
  HANSUDUNG?: string;
  hsd?: string;
  HSD?: string;
  HSD_LO?: string;
  han_su_dung?: string;
  hanSuDung?: string;
  SOLUONG_NHAP?: number;
  soLuongNhap?: number;
  TONKHO_THUCTE?: number;
  soLuongCon?: number;
  SOLUONG_CONLAI?: number;
  SOLUONG_CON?: number;
  TRANGTHAI?: number | string;
  trangThai?: number | string;
}

const getItemHsd = (item: LoHangItem) => {
  return item.HANSUDUNG || item.hsd || item.HSD || item.HSD_LO || item.han_su_dung || item.hanSuDung || '';
};

const getItemNsx = (item: LoHangItem) => {
  return item.NGAYSX || item.ngaySanXuat || item.ngay_san_xuat || '';
};

const formatDateOnly = (d: any) => {
  if (!d) return '-';
  const s = String(d).split('T')[0].split(' ')[0];
  const parts = s.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return s;
};

export default function AdminBatchesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [batches, setBatches] = useState<LoHangItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'WARNING' | 'EXPIRED' | 'GOOD'>('ALL');
  const [stats, setStats] = useState({
    total: 0,
    warning: 0,
    expired: 0,
    good: 0,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [resBatches, resCanhBao] = await Promise.allSettled([
        adminApi.getLoHangs({ _t: Date.now() }),
        adminApi.getCanhBaoHsd(),
      ]);

      let items: LoHangItem[] = [];
      if (resBatches.status === 'fulfilled') {
        const val = resBatches.value;
        let raw = val?.data?.data || val?.data || val || [];
        if (raw && typeof raw === 'object' && Array.isArray(raw.data)) {
          raw = raw.data;
        }
        items = Array.isArray(raw) ? raw : [];
      }

      setBatches(items);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let warnCount = 0;
      let expCount = 0;
      let goodCount = 0;

      items.forEach((item) => {
        const hsdVal = getItemHsd(item);
        if (!hsdVal) return;
        const exp = new Date(hsdVal);
        exp.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          expCount++;
        } else if (diffDays <= 3) {
          warnCount++;
        } else {
          goodCount++;
        }
      });

      setStats({
        total: items.length,
        warning: warnCount,
        expired: expCount,
        good: goodCount,
      });
    } catch (error) {
      console.error('Lỗi tải danh sách lô hàng:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getDaysLeft = (hsdStr: string) => {
    if (!hsdStr) return { days: 0, label: 'N/A', status: 'unknown' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(hsdStr);
    exp.setHours(0, 0, 0, 0);
    const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diff < 0) {
      return { days: diff, label: `Hết hạn ${Math.abs(diff)} ngày trước`, status: 'expired' };
    }
    if (diff === 0) {
      return { days: 0, label: 'Hết hạn hôm nay', status: 'warning' };
    }
    if (diff <= 3) {
      return { days: diff, label: `Còn ${diff} ngày (Cảnh báo)`, status: 'warning' };
    }
    return { days: diff, label: `Còn ${diff} ngày`, status: 'good' };
  };

  const filteredBatches = (Array.isArray(batches) ? batches : []).filter((item) => {
    const code = String(item.MALOHANG || item.id || '').toLowerCase();
    const prodName = String(
      item.san_pham?.TENSP || item.san_pham?.name || item.TENSP || ''
    ).toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchSearch = code.includes(query) || prodName.includes(query);

    if (!matchSearch) return false;

    const hsdVal = getItemHsd(item);
    const { status } = getDaysLeft(hsdVal);
    if (activeTab === 'WARNING') return status === 'warning';
    if (activeTab === 'EXPIRED') return status === 'expired';
    if (activeTab === 'GOOD') return status === 'good';
    return true;
  });

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Lô Hàng & Hạn Sử Dụng</ThemedText>
          <TouchableOpacity
            style={styles.actionHeaderBtn}
            onPress={() => router.push('/(admin)/import-batch' as any)}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.cardTextSecondary} style={{ marginLeft: 12 }} />
          <TextInput
            placeholder="Tìm theo mã lô, tên bánh..."
            placeholderTextColor={colors.cardTextSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.cardTextSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.tint]} />}
      >
        {/* KPI STATS */}
        <View style={styles.kpiContainer}>
          <View style={[styles.kpiCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <ThemedText style={[styles.kpiNumber, { color: colors.text }]}>{stats.total}</ThemedText>
            <ThemedText style={[styles.kpiLabel, { color: colors.cardTextSecondary }]}>Tổng lô hàng</ThemedText>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
            <ThemedText style={[styles.kpiNumber, { color: '#d97706' }]}>{stats.warning}</ThemedText>
            <ThemedText style={[styles.kpiLabel, { color: '#b45309' }]}>Sắp hết hạn</ThemedText>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}>
            <ThemedText style={[styles.kpiNumber, { color: '#dc2626' }]}>{stats.expired}</ThemedText>
            <ThemedText style={[styles.kpiLabel, { color: '#991b1b' }]}>Đã hết hạn</ThemedText>
          </View>
        </View>

        {/* QUICK ACTIONS */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.tint }]}
            onPress={() => router.push('/(admin)/import-batch' as any)}
          >
            <Ionicons name="cart-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
            <ThemedText style={styles.actionBtnText}>Nhập Lô Hàng Mới</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#ef4444' }]}
            onPress={() => router.push('/(admin)/disposal' as any)}
          >
            <Ionicons name="trash-bin-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
            <ThemedText style={styles.actionBtnText}>Lập Biên Bản Hủy</ThemedText>
          </TouchableOpacity>
        </View>

        {/* TABS */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'ALL' && [styles.tabActive, { borderBottomColor: colors.tint }]]}
            onPress={() => setActiveTab('ALL')}
          >
            <ThemedText style={[styles.tabText, activeTab === 'ALL' && { color: colors.tint, fontWeight: 'bold' }]}>
              Tất cả ({batches.length})
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'WARNING' && [styles.tabActive, { borderBottomColor: '#f59e0b' }]]}
            onPress={() => setActiveTab('WARNING')}
          >
            <ThemedText style={[styles.tabText, activeTab === 'WARNING' && { color: '#f59e0b', fontWeight: 'bold' }]}>
              Sắp hết hạn ({stats.warning})
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'EXPIRED' && [styles.tabActive, { borderBottomColor: '#ef4444' }]]}
            onPress={() => setActiveTab('EXPIRED')}
          >
            <ThemedText style={[styles.tabText, activeTab === 'EXPIRED' && { color: '#ef4444', fontWeight: 'bold' }]}>
              Hết hạn ({stats.expired})
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* LIST */}
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.tint} />
            <ThemedText style={{ marginTop: 12, opacity: 0.6 }}>Đang tải danh sách lô hàng...</ThemedText>
          </View>
        ) : filteredBatches.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Ionicons name="cube-outline" size={56} color={colors.cardTextSecondary} />
            <ThemedText style={{ marginTop: 12, fontSize: 16, fontWeight: 'bold' }}>Không có lô hàng phù hợp</ThemedText>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredBatches.map((item, idx) => {
              const hsdVal = getItemHsd(item);
              const nsxVal = getItemNsx(item);
              const { label, status } = getDaysLeft(hsdVal);
              const prodName =
                item.sanPham?.tenSanPham || item.san_pham?.TENSP || item.san_pham?.name || item.TENSP || 'Bánh tươi Givral';
              const storeName =
                item.cuaHang?.tenCuaHang || item.cua_hang?.TENCUAHANG || item.cua_hang?.ten_cua_hang || item.TENCUAHANG || 'Chi nhánh Givral';
              const stock = item.soLuongCon ?? item.SOLUONG_CON ?? item.TONKHO_THUCTE ?? item.SOLUONG_CONLAI ?? item.SOLUONG_NHAP ?? item.soLuongNhap ?? 0;
              const total = item.soLuongNhap ?? item.SOLUONG_NHAP ?? Math.max(stock, 1);
              const ratio = Math.min(Math.max(stock / total, 0), 1);

              const badgeColor =
                status === 'expired' ? '#ef4444' : status === 'warning' ? '#f59e0b' : '#10b981';
              const badgeBg =
                status === 'expired' ? '#fee2e2' : status === 'warning' ? '#fef3c7' : '#d1fae5';

              return (
                <View
                  key={String(item.MALOHANG || item.maLoHang || item.id || idx)}
                  style={[styles.batchCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.codeTag}>
                      <Ionicons name="barcode-outline" size={16} color={colors.tint} />
                      <ThemedText style={styles.codeText}>{item.maLoHang || item.MALOHANG || `LÔ #${item.id}`}</ThemedText>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                      <View style={[styles.statusDot, { backgroundColor: badgeColor }]} />
                      <ThemedText style={[styles.statusLabel, { color: badgeColor }]}>{label}</ThemedText>
                    </View>
                  </View>

                  <ThemedText style={styles.productTitle}>{prodName}</ThemedText>
                  <ThemedText style={[styles.storeSubtitle, { color: colors.cardTextSecondary }]}>
                    <Ionicons name="storefront-outline" size={14} color={colors.cardTextSecondary} /> {storeName}
                  </ThemedText>

                  <View style={[styles.datesRow, { borderColor: colors.cardBorder }]}>
                    <View style={styles.dateCol}>
                      <ThemedText style={[styles.dateLabel, { color: colors.cardTextSecondary }]}>Ngày sản xuất</ThemedText>
                      <ThemedText style={styles.dateValue}>
                        {formatDateOnly(nsxVal)}
                      </ThemedText>
                    </View>
                    <View style={styles.dateDivider} />
                    <View style={styles.dateCol}>
                      <ThemedText style={[styles.dateLabel, { color: colors.cardTextSecondary }]}>Hạn sử dụng</ThemedText>
                      <ThemedText style={[styles.dateValue, { color: badgeColor, fontWeight: 'bold' }]}>
                        {hsdVal ? formatDateOnly(hsdVal) : 'N/A'}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.stockRow}>
                    <ThemedText style={[styles.stockLabel, { color: colors.cardTextSecondary }]}>Tồn kho thực tế:</ThemedText>
                    <ThemedText style={styles.stockValue}>{stock} / {total} cái</ThemedText>
                  </View>
                  <View style={[styles.progressBarBg, { backgroundColor: colors.icon + '20' }]}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${ratio * 100}%`, backgroundColor: stock > 0 ? colors.tint : '#ef4444' },
                      ]}
                    />
                  </View>

                  {status === 'expired' && (
                    <TouchableOpacity
                      style={styles.disposeButton}
                      onPress={() => router.push({
                        pathname: '/(admin)/disposal',
                        params: {
                          batchId: String(item.id || item.maLoHang || item.MALOHANG),
                          qty: String(stock > 0 ? stock : 1),
                        }
                      } as any)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#ef4444" style={{ marginRight: 6 }} />
                      <ThemedText style={styles.disposeText}>Biên bản hủy lô này</ThemedText>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 44,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  actionHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    height: 44,
    overflow: 'hidden',
  },
  searchInput: { flex: 1, height: 44, paddingHorizontal: 10, fontSize: 14 },
  kpiContainer: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 16, gap: 10 },
  kpiCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1 },
  kpiNumber: { fontSize: 20, fontWeight: 'bold' },
  kpiLabel: { fontSize: 11, marginTop: 4 },
  actionRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 14, gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabBtn: { paddingVertical: 10, marginRight: 20, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: {},
  tabText: { fontSize: 14, color: '#64748b' },
  listContainer: { padding: 16, gap: 14 },
  batchCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  codeTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  codeText: { fontWeight: 'bold', fontSize: 14 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 11, fontWeight: 'bold' },
  productTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  storeSubtitle: { fontSize: 13, marginBottom: 12 },
  datesRow: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 8, marginBottom: 10 },
  dateCol: { flex: 1 },
  dateDivider: { width: 1, backgroundColor: '#e2e8f0', marginHorizontal: 10 },
  dateLabel: { fontSize: 11, marginBottom: 2 },
  dateValue: { fontSize: 13, fontWeight: '500' },
  stockRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  stockLabel: { fontSize: 12 },
  stockValue: { fontSize: 12, fontWeight: 'bold' },
  progressBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  disposeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  disposeText: { color: '#ef4444', fontSize: 13, fontWeight: 'bold' },
});
