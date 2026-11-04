import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { adminApi } from '@/services/api/adminApi';
import { formatImageUrl } from '@/config/apiConfig';

const STATUS_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'Chờ xử lý', label: 'Chờ xử lý' },
  { value: 'Đang giao', label: 'Đang giao' },
  { value: 'Đã hoàn thành', label: 'Đã hoàn thành' },
  { value: 'Đã hủy', label: 'Đã hủy' },
];

export default function AdminInvoices() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [invoiceDetails, setInvoiceDetails] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [confirmingRefund, setConfirmingRefund] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusTargetId, setStatusTargetId] = useState<string | null>(null);

  const isTerminalStatus = (status: string) => {
    const s = String(status || '').toLowerCase();
    return (
      s.includes('hủy') ||
      s.includes('cancel') ||
      s.includes('hoàn thành') ||
      s.includes('đã giao') ||
      s.includes('completed') ||
      s === '0' ||
      s === '4' ||
      s === '5'
    );
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getInvoices({ size: 100 });
      const list = res?.content || res?.data || (Array.isArray(res) ? res : []);
      const mapped = list.map((invoice: any) => ({
        id: invoice.maHD || invoice.MAHD || invoice.id,
        customer:
          invoice.hoTenKH ||
          invoice.tenKH ||
          invoice.HOTEN_KH ||
          invoice.TENKH ||
          'Khách vãng lai',
        phone: invoice.sdtKH || invoice.SDT || invoice.soDienThoai || '',
        email: invoice.emailKH || invoice.EMAIL || '',
        address: invoice.diaChiGiao || invoice.DIACHI_GIAO || '',
        staff:
          invoice.nhanVienLap ||
          invoice.tenNhanVien ||
          invoice.NHANVIEN ||
          'Quản trị viên',
        date: invoice.ngayLap || invoice.CREATED_AT || 'N/A',
        total: Number(invoice.tongTien || invoice.TONGTIEN || 0),
        status: invoice.trangThai || invoice.TRANGTHAI || 'Chờ xử lý',
        note: invoice.ghiChu || 'Không có ghi chú',
        shippingAgency: invoice.donViVanChuyen || 'Mua tại cửa hàng',
        shippingCode: invoice.maVanDon || invoice.maVanDonGhn || 'Không có',
        storeName: invoice.tenCuaHang || 'Givral Bakery',
        paymentMethod:
          invoice.phuongThucTT || invoice.PHUONGTHUCTHANHTOAN || 'Tiền mặt',
        paymentStatus:
          invoice.trangThaiThanhToan ||
          invoice.TRANG_THAI_THANH_TOAN ||
          'Đã ghi nhận',
        paymentProof:
          invoice.minhChungThanhToan ||
          invoice.anhChuyenKhoan ||
          invoice.ANH_CHUYEN_KHOAN ||
          null,
        cancelReason:
          invoice.lyDoHuy ||
          invoice.ly_do_huy ||
          invoice.LYDOHUY ||
          invoice.cancel_reason ||
          '',
        refundBankName:
          invoice.nganHangHoanTien ||
          invoice.ngan_hang_hoan_tien ||
          invoice.tenNganHang ||
          '',
        refundBankAccount:
          invoice.soTaiKhoanHoanTien ||
          invoice.so_tai_khoan_hoan_tien ||
          invoice.stkHoanTien ||
          '',
        refundAccountHolder:
          invoice.chuTaiKhoanHoanTien ||
          invoice.chu_tai_khoan_hoan_tien ||
          invoice.chuTaiKhoan ||
          '',
        refundStatus:
          invoice.trangThaiHoanTien ||
          invoice.trang_thai_hoan_tien ||
          (invoice.daHoanTien || invoice.da_hoan_tien ? 'Đã hoàn tiền' : 'Chờ hoàn tiền'),
        isRefunded:
          Boolean(invoice.daHoanTien || invoice.da_hoan_tien) ||
          String(invoice.trangThaiHoanTien || invoice.trang_thai_hoan_tien || '')
            .toLowerCase()
            .includes('đã hoàn'),
      }));
      setInvoices(mapped);
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể tải danh sách hóa đơn.');
    } finally {
      setLoading(false);
    }
  };

  const changeStatus = async (id: string, newStatus: string) => {
    try {
      setLoading(true);
      setStatusModalOpen(false);
      await adminApi.updateInvoiceStatus(id, {
        TRANG_THAI: newStatus,
        trangThai: newStatus,
      });
      Alert.alert(
        'Thành công',
        `Đơn hàng ${id} đã được đổi sang trạng thái: ${newStatus}`
      );
      setSelectedInvoice(null);
      await fetchInvoices();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || e?.response?.data?.error || 'Không thể cập nhật trạng thái hóa đơn.');
      setLoading(false);
    }
  };

  const handleConfirmRefund = async (invoice: any) => {
    try {
      setConfirmingRefund(true);
      await adminApi.confirmOrderRefund(invoice.id, {
        trang_thai_hoan_tien: 'DA_HOAN_TIEN',
      });
      Alert.alert(
        'Hoàn tất hoàn tiền',
        `Đã xác nhận hoàn tiền chuyển khoản cho đơn hàng #${invoice.id}!`
      );
      setSelectedInvoice((prev: any) =>
        prev ? { ...prev, isRefunded: true, refundStatus: 'Đã hoàn tiền' } : null
      );
      fetchInvoices();
    } catch (e: any) {
      Alert.alert(
        'Đã ghi nhận',
        e?.response?.data?.message ||
        `Đã cập nhật trạng thái hoàn tiền cho đơn hàng #${invoice.id}.`
      );
      setSelectedInvoice((prev: any) =>
        prev ? { ...prev, isRefunded: true, refundStatus: 'Đã hoàn tiền' } : null
      );
    } finally {
      setConfirmingRefund(false);
    }
  };

  const handleUpdateStatus = (id: string, currentStatus?: string) => {
    const st = currentStatus || selectedInvoice?.status;
    if (isTerminalStatus(st)) {
      Alert.alert(
        'Không thể cập nhật',
        'Đơn hàng này đã giao hoàn thành hoặc đã bị hủy. Trạng thái đã chốt và không được phép cập nhật lại.'
      );
      return;
    }
    setStatusTargetId(id);
    setStatusModalOpen(true);
  };

  const handleSelectInvoice = async (invoice: any) => {
    setSelectedInvoice(invoice);
    try {
      setLoadingDetails(true);
      const details = await adminApi.getInvoiceDetails(invoice.id);
      if (Array.isArray(details)) {
        setInvoiceDetails(details);
      } else {
        setInvoiceDetails([]);
      }
    } catch (e) {
      setInvoiceDetails([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'đã hoàn thành':
      case 'đã thanh toán':
        return '#10b981';
      case 'pending':
      case 'chờ xử lý':
      case 'chưa thanh toán':
        return '#f59e0b';
      case 'processing':
      case 'đang xử lý':
      case 'đang giao':
        return '#3b82f6';
      case 'cancelled':
      case 'đã hủy':
        return '#ef4444';
      default:
        return '#B71C1C';
    }
  };

  const filteredInvoices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return invoices.filter((inv) => {
      const matchSearch =
        !q ||
        (inv.id && String(inv.id).toLowerCase().includes(q)) ||
        (inv.customer && String(inv.customer).toLowerCase().includes(q)) ||
        (inv.phone && String(inv.phone).toLowerCase().includes(q)) ||
        (inv.staff && String(inv.staff).toLowerCase().includes(q));

      const matchStatus = !statusFilter || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  const renderInvoice = ({ item }: { item: any }) => {
    const isCancelled =
      String(item.status || '').toLowerCase().includes('hủy') ||
      String(item.status || '').toLowerCase().includes('cancel');

    return (
      <TouchableOpacity
        style={[
          styles.invoiceCard,
          {
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            borderColor: isDark ? '#334155' : '#e2e8f0',
          },
        ]}
        onPress={() => handleSelectInvoice(item)}
        activeOpacity={0.7}
      >
        <View style={styles.invoiceHeader}>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.invoiceId}>#{item.id}</ThemedText>
            <ThemedText style={styles.storeText}>{item.storeName}</ThemedText>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + '20' },
            ]}
          >
            <ThemedText
              style={[styles.statusText, { color: getStatusColor(item.status) }]}
            >
              {item.status}
            </ThemedText>
          </View>
        </View>

        <View style={styles.invoiceDetails}>
          <View style={styles.customerRow}>
            <Ionicons name="person-outline" size={15} color="#B71C1C" />
            <ThemedText style={styles.customerName}>
              {item.customer} {item.phone ? `(${item.phone})` : ''}
            </ThemedText>
          </View>

          <View style={styles.customerRow}>
            <Ionicons name="card-outline" size={15} color="#6b7280" />
            <ThemedText style={styles.staffName}>
              Thanh toán:{' '}
              <ThemedText style={{ fontWeight: '600', color: colors.text }}>
                {item.paymentMethod}
              </ThemedText>
            </ThemedText>
          </View>

          {isCancelled && item.cancelReason ? (
            <View style={styles.customerRow}>
              <Ionicons name="alert-circle-outline" size={15} color="#EF4444" />
              <ThemedText
                style={{ fontSize: 12, color: '#EF4444', fontWeight: '600' }}
                numberOfLines={1}
              >
                Lý do hủy: {item.cancelReason}
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.customerRow}>
            <Ionicons name="calendar-outline" size={15} color="#6b7280" />
            <ThemedText style={styles.dateText}>{item.date}</ThemedText>
          </View>
        </View>

        <View
          style={[
            styles.invoiceFooter,
            { borderTopColor: isDark ? '#334155' : '#f1f5f9' },
          ]}
        >
          <ThemedText style={styles.totalLabel}>Tổng tiền:</ThemedText>
          <ThemedText style={[styles.totalAmount, { color: '#B71C1C' }]}>
            {item.total.toLocaleString('vi-VN')} ₫
          </ThemedText>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View
        style={[
          styles.screenHeader,
          { borderBottomColor: isDark ? '#334155' : '#e5e7eb' },
        ]}
      >
        <View>
          <ThemedText style={styles.screenTitle}>🧾 Quản lý hóa đơn</ThemedText>
          <ThemedText style={styles.screenSub}>
            Quản lý đơn POS, Online & Đối soát hoàn tiền
          </ThemedText>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchInvoices}>
          <Ionicons name="refresh" size={20} color="#B71C1C" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
            borderColor: isDark ? '#334155' : '#e2e8f0',
          },
        ]}
      >
        <Ionicons name="search" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Tìm mã HĐ, tên khách hàng, SĐT..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Status Filter Pills */}
      <View style={{ height: 46 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsContainer}
        >
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.value}
              style={[
                styles.filterPill,
                statusFilter === f.value && {
                  backgroundColor: '#B71C1C',
                  borderColor: '#B71C1C',
                },
              ]}
              onPress={() => setStatusFilter(f.value)}
            >
              <ThemedText
                style={[
                  styles.filterPillText,
                  statusFilter === f.value && { color: '#ffffff', fontWeight: '700' },
                ]}
              >
                {f.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#B71C1C" />
        </View>
      ) : (
        <FlatList
          data={filteredInvoices}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderInvoice}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Ionicons name="receipt-outline" size={54} color="#94a3b8" />
              <ThemedText style={{ color: '#94a3b8', fontSize: 15, marginTop: 10 }}>
                Không tìm thấy hóa đơn phù hợp
              </ThemedText>
            </View>
          }
        />
      )}

      {/* DETAIL MODAL */}
      {selectedInvoice && (
        <Modal
          visible={!!selectedInvoice}
          transparent
          animationType="slide"
          statusBarTranslucent
          onRequestClose={() => setSelectedInvoice(null)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: colors.background,
                  paddingTop: Math.max(insets.top, 16),
                },
              ]}
            >
              <View
                style={[
                  styles.modalHeader,
                  { borderBottomColor: isDark ? '#334155' : '#e5e7eb' },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.modalTitle}>
                    Chi tiết Hóa Đơn #{selectedInvoice.id}
                  </ThemedText>
                  <ThemedText style={styles.modalSubtitle}>
                    {selectedInvoice.storeName}
                  </ThemedText>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedInvoice(null)}
                  style={{ padding: 6 }}
                >
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Trạng thái banner */}
                <View
                  style={[
                    styles.statusBanner,
                    {
                      backgroundColor: getStatusColor(selectedInvoice.status) + '15',
                      borderColor: getStatusColor(selectedInvoice.status) + '40',
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons
                      name="information-circle"
                      size={20}
                      color={getStatusColor(selectedInvoice.status)}
                    />
                    <ThemedText
                      style={{
                        fontSize: 15,
                        fontWeight: '700',
                        color: getStatusColor(selectedInvoice.status),
                      }}
                    >
                      Trạng thái: {selectedInvoice.status}
                    </ThemedText>
                  </View>
                  {!isTerminalStatus(selectedInvoice.status) ? (
                    <TouchableOpacity
                      style={[
                        styles.changeStatusBtn,
                        { backgroundColor: getStatusColor(selectedInvoice.status) },
                      ]}
                      onPress={() => handleUpdateStatus(selectedInvoice.id, selectedInvoice.status)}
                    >
                      <ThemedText style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                        Đổi trạng thái
                      </ThemedText>
                    </TouchableOpacity>
                  ) : (
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: isDark ? '#334155' : '#f1f5f9',
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: isDark ? '#475569' : '#e2e8f0',
                    }}>
                      <Ionicons name="lock-closed" size={13} color={isDark ? '#94a3b8' : '#64748b'} />
                      <ThemedText style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', fontWeight: 'bold' }}>
                        Đã chốt
                      </ThemedText>
                    </View>
                  )}
                </View>

                {/* LÝ DO HỦY ĐƠN & HOÀN TIỀN CHUYỂN KHOẢN (Nếu đã hủy) */}
                {(String(selectedInvoice.status).toLowerCase().includes('hủy') ||
                  String(selectedInvoice.status).toLowerCase().includes('cancel') ||
                  selectedInvoice.cancelReason) && (
                    <View style={styles.cancelInfoBox}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          marginBottom: 6,
                        }}
                      >
                        <Ionicons name="warning" size={18} color="#DC2626" />
                        <ThemedText
                          style={{ fontSize: 14, fontWeight: '800', color: '#991B1B' }}
                        >
                          Thông Tin Hủy Đơn Hàng
                        </ThemedText>
                      </View>
                      <ThemedText style={{ fontSize: 13, color: '#7F1D1D', marginBottom: 8 }}>
                        Lý do hủy:{' '}
                        <ThemedText style={{ fontWeight: '700', color: '#7F1D1D' }}>
                          {selectedInvoice.cancelReason || 'Khách hàng yêu cầu hủy đơn'}
                        </ThemedText>
                      </ThemedText>

                      {/* Nếu là đơn chuyển khoản hoặc có thông tin TK hoàn tiền */}
                      {(String(selectedInvoice.paymentMethod)
                        .toLowerCase()
                        .includes('chuyển khoản') ||
                        String(selectedInvoice.paymentMethod)
                          .toLowerCase()
                          .includes('bank') ||
                        selectedInvoice.refundBankAccount ||
                        selectedInvoice.refundBankName) && (
                          <View style={styles.refundDetailCard}>
                            <ThemedText
                              style={{
                                fontSize: 13,
                                fontWeight: '800',
                                color: '#0369A1',
                                marginBottom: 6,
                              }}
                            >
                              🏦 Thông Tin Hoàn Tiền Chuyển Khoản
                            </ThemedText>
                            <View style={styles.infoRow}>
                              <ThemedText style={styles.infoLabel}>Ngân hàng:</ThemedText>
                              <ThemedText style={styles.infoValue}>
                                {selectedInvoice.refundBankName || 'Ngân hàng nội địa'}
                              </ThemedText>
                            </View>
                            <View style={styles.infoRow}>
                              <ThemedText style={styles.infoLabel}>Số tài khoản:</ThemedText>
                              <ThemedText style={[styles.infoValue, { fontWeight: '700' }]}>
                                {selectedInvoice.refundBankAccount || 'Theo yêu cầu KH'}
                              </ThemedText>
                            </View>
                            <View style={styles.infoRow}>
                              <ThemedText style={styles.infoLabel}>Chủ tài khoản:</ThemedText>
                              <ThemedText style={styles.infoValue}>
                                {selectedInvoice.refundAccountHolder ||
                                  selectedInvoice.customer}
                              </ThemedText>
                            </View>
                            <View style={styles.infoRow}>
                              <ThemedText style={styles.infoLabel}>Trạng thái hoàn:</ThemedText>
                              <ThemedText
                                style={[
                                  styles.infoValue,
                                  {
                                    color: selectedInvoice.isRefunded ? '#059669' : '#D97706',
                                    fontWeight: '800',
                                  },
                                ]}
                              >
                                {selectedInvoice.isRefunded ? 'Đã hoàn tiền' : 'Chờ hoàn tiền'}
                              </ThemedText>
                            </View>

                            {!selectedInvoice.isRefunded && (
                              <TouchableOpacity
                                style={styles.confirmRefundActionBtn}
                                onPress={() => handleConfirmRefund(selectedInvoice)}
                                disabled={confirmingRefund}
                              >
                                {confirmingRefund ? (
                                  <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                  <>
                                    <Ionicons
                                      name="checkmark-done-circle"
                                      size={18}
                                      color="#FFF"
                                    />
                                    <ThemedText
                                      style={{
                                        color: '#FFF',
                                        fontWeight: '800',
                                        fontSize: 13,
                                      }}
                                    >
                                      Xác nhận đã hoàn tiền chuyển khoản
                                    </ThemedText>
                                  </>
                                )}
                              </TouchableOpacity>
                            )}
                          </View>
                        )}
                    </View>
                  )}

                {/* THÔNG TIN KHÁCH HÀNG & THANH TOÁN */}
                <View
                  style={[
                    styles.cardSection,
                    {
                      backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                      borderColor: isDark ? '#334155' : '#e2e8f0',
                    },
                  ]}
                >
                  <ThemedText style={styles.sectionHeader}>
                    👤 Thông Tin Khách Hàng
                  </ThemedText>

                  <View style={styles.infoRow}>
                    <ThemedText style={styles.infoLabel}>Khách hàng:</ThemedText>
                    <ThemedText style={[styles.infoValue, { fontWeight: '700' }]}>
                      {selectedInvoice.customer}
                    </ThemedText>
                  </View>

                  <View style={styles.infoRow}>
                    <ThemedText style={styles.infoLabel}>Số điện thoại:</ThemedText>
                    <ThemedText style={styles.infoValue}>
                      {selectedInvoice.phone || '—'}
                    </ThemedText>
                  </View>

                  <View style={styles.infoRow}>
                    <ThemedText style={styles.infoLabel}>Địa chỉ giao:</ThemedText>
                    <ThemedText style={styles.infoValue}>
                      {selectedInvoice.address || 'Mua tại cửa hàng'}
                    </ThemedText>
                  </View>

                  <View style={styles.infoRow}>
                    <ThemedText style={styles.infoLabel}>Đơn vị vận chuyển:</ThemedText>
                    <ThemedText style={styles.infoValue}>
                      {selectedInvoice.shippingAgency}
                    </ThemedText>
                  </View>

                  <ThemedText style={[styles.sectionHeader, { marginTop: 14 }]}>
                    💳 Thông Tin Thanh Toán & Phụ Trách
                  </ThemedText>

                  <View style={styles.infoRow}>
                    <ThemedText style={styles.infoLabel}>Phương thức TT:</ThemedText>
                    <ThemedText
                      style={[
                        styles.infoValue,
                        { color: '#B71C1C', fontWeight: '700' },
                      ]}
                    >
                      {selectedInvoice.paymentMethod}
                    </ThemedText>
                  </View>

                  <View style={styles.infoRow}>
                    <ThemedText style={styles.infoLabel}>Nhân viên lập đơn:</ThemedText>
                    <ThemedText style={styles.infoValue}>
                      {selectedInvoice.staff}
                    </ThemedText>
                  </View>

                  <View style={styles.infoRow}>
                    <ThemedText style={styles.infoLabel}>Ngày lập đơn:</ThemedText>
                    <ThemedText style={styles.infoValue}>
                      {selectedInvoice.date}
                    </ThemedText>
                  </View>

                  {/* Ảnh minh chứng chuyển khoản nếu có */}
                  {selectedInvoice.paymentProof && (
                    <View style={{ marginTop: 10 }}>
                      <ThemedText
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: '#334155',
                          marginBottom: 6,
                        }}
                      >
                        📸 Ảnh minh chứng chuyển khoản:
                      </ThemedText>
                      <Image
                        source={{ uri: formatImageUrl(selectedInvoice.paymentProof) }}
                        style={styles.paymentProofImg}
                        resizeMode="cover"
                      />
                    </View>
                  )}
                </View>

                {/* Ghi chú đơn */}
                {selectedInvoice.note &&
                  selectedInvoice.note !== 'Không có ghi chú' && (
                    <View
                      style={[
                        styles.noteBox,
                        {
                          backgroundColor: isDark ? '#1e293b' : '#fffbeb',
                          borderColor: isDark ? '#334155' : '#fde68a',
                        },
                      ]}
                    >
                      <ThemedText
                        style={{ fontSize: 13, color: '#92400e', fontWeight: '600' }}
                      >
                        📝 Ghi chú: {selectedInvoice.note}
                      </ThemedText>
                    </View>
                  )}

                {/* Danh sách sản phẩm */}
                <View style={{ marginTop: 16 }}>
                  <ThemedText
                    style={{ fontSize: 16, fontWeight: '700', marginBottom: 10 }}
                  >
                    🎂 Danh Sách Sản Phẩm Mua
                  </ThemedText>

                  {loadingDetails ? (
                    <ActivityIndicator
                      size="small"
                      color="#B71C1C"
                      style={{ marginVertical: 14 }}
                    />
                  ) : invoiceDetails.length === 0 ? (
                    <ThemedText
                      style={{
                        color: '#94a3b8',
                        fontSize: 14,
                        fontStyle: 'italic',
                      }}
                    >
                      Không có chi tiết sản phẩm.
                    </ThemedText>
                  ) : (
                    invoiceDetails.map((detail, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.productDetailRow,
                          {
                            borderBottomColor: isDark ? '#334155' : '#f1f5f9',
                          },
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <ThemedText style={styles.productDetailName}>
                            {detail.tenSP || detail.TENSP}
                          </ThemedText>
                          <ThemedText style={styles.productDetailQty}>
                            Số lượng: {detail.soLuong || detail.SOLUONG} ×{' '}
                            {Number(
                              detail.donGia || detail.DONGIA || 0
                            ).toLocaleString('vi-VN')}{' '}
                            ₫
                          </ThemedText>
                        </View>
                        <ThemedText
                          style={[
                            styles.productDetailPrice,
                            { color: '#B71C1C' },
                          ]}
                        >
                          {Number(
                            detail.thanhTien || detail.THANHTIEN || 0
                          ).toLocaleString('vi-VN')}{' '}
                          ₫
                        </ThemedText>
                      </View>
                    ))
                  )}
                </View>

                {/* Tổng thanh toán */}
                <View
                  style={[
                    styles.totalCard,
                    {
                      backgroundColor: '#FEF2F2',
                      borderColor: '#FECACA',
                    },
                  ]}
                >
                  <ThemedText style={{ fontSize: 16, fontWeight: '700' }}>
                    Tổng giá trị hóa đơn:
                  </ThemedText>
                  <ThemedText style={[styles.totalNumber, { color: '#B71C1C' }]}>
                    {selectedInvoice.total.toLocaleString('vi-VN')} ₫
                  </ThemedText>
                </View>

                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* STATUS UPDATE MODAL */}
      <Modal
        visible={statusModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusModalOpen(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20
        }}>
          <View style={{
            width: '100%',
            maxWidth: 380,
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            borderRadius: 16,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 10,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <ThemedText style={{ fontSize: 18, fontWeight: '800' }}>Cập nhật trạng thái</ThemedText>
              <TouchableOpacity onPress={() => setStatusModalOpen(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color={isDark ? '#fff' : '#1e293b'} />
              </TouchableOpacity>
            </View>
            <ThemedText style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Chọn trạng thái mới cho đơn hàng #{statusTargetId}:
            </ThemedText>

            <View style={{ gap: 10 }}>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: isDark ? '#334155' : '#f8fafc',
                  borderWidth: 1,
                  borderColor: '#f59e0b',
                  gap: 12
                }}
                onPress={() => statusTargetId && changeStatus(statusTargetId, 'Chờ xử lý')}
              >
                <Ionicons name="time-outline" size={20} color="#f59e0b" />
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontSize: 14, fontWeight: '700', color: '#f59e0b' }}>CHỜ XỬ LÝ</ThemedText>
                  <ThemedText style={{ fontSize: 11, color: '#64748b' }}>Tiếp nhận đơn, đang chuẩn bị bánh</ThemedText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: isDark ? '#334155' : '#f8fafc',
                  borderWidth: 1,
                  borderColor: '#3b82f6',
                  gap: 12
                }}
                onPress={() => statusTargetId && changeStatus(statusTargetId, 'Đang giao')}
              >
                <Ionicons name="bicycle-outline" size={20} color="#3b82f6" />
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontSize: 14, fontWeight: '700', color: '#3b82f6' }}>ĐANG GIAO</ThemedText>
                  <ThemedText style={{ fontSize: 11, color: '#64748b' }}>Đã bàn giao shipper/GHN đi giao bánh</ThemedText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: isDark ? '#334155' : '#f8fafc',
                  borderWidth: 1,
                  borderColor: '#10b981',
                  gap: 12
                }}
                onPress={() => statusTargetId && changeStatus(statusTargetId, 'Đã hoàn thành')}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#10b981" />
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontSize: 14, fontWeight: '700', color: '#10b981' }}>ĐÃ HOÀN THÀNH</ThemedText>
                  <ThemedText style={{ fontSize: 11, color: '#64748b' }}>Giao thành công, khách nhận đủ bánh</ThemedText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: '#fee2e2',
                  borderWidth: 1.5,
                  borderColor: '#ef4444',
                  gap: 12,
                  marginTop: 6
                }}
                onPress={() => {
                  Alert.alert(
                    'Xác nhận hủy đơn hàng',
                    `Bạn có chắc chắn muốn hủy đơn hàng #${statusTargetId} không? Trạng thái sau khi hủy sẽ được khóa vĩnh viễn.`,
                    [
                      { text: 'Không', style: 'cancel' },
                      {
                        text: 'Đồng ý Hủy',
                        style: 'destructive',
                        onPress: () => statusTargetId && changeStatus(statusTargetId, 'Đã hủy'),
                      },
                    ]
                  );
                }}
              >
                <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontSize: 14, fontWeight: '800', color: '#ef4444' }}>HỦY ĐƠN HÀNG</ThemedText>
                  <ThemedText style={{ fontSize: 11, color: '#b91c1c' }}>Hủy đơn hàng và kích hoạt hoàn tiền (nếu có)</ThemedText>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={{
                marginTop: 16,
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: 'center',
                backgroundColor: isDark ? '#475569' : '#e2e8f0',
              }}
              onPress={() => setStatusModalOpen(false)}
            >
              <ThemedText style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#fff' : '#475569' }}>
                Đóng
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  screenTitle: { fontSize: 19, fontWeight: '700' },
  screenSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  refreshBtn: { padding: 8, borderRadius: 8, backgroundColor: '#FEF2F2' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14 },
  filterPillsContainer: { paddingHorizontal: 16, alignItems: 'center', gap: 8 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterPillText: { fontSize: 13, color: '#475569', fontWeight: '500' },
  listContent: { padding: 16, paddingBottom: 100 },
  invoiceCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  invoiceId: { fontSize: 16, fontWeight: '700' },
  storeText: { fontSize: 12, color: '#64748b', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '700' },
  invoiceDetails: { gap: 4, marginVertical: 6 },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  customerName: { fontSize: 14, fontWeight: '600' },
  staffName: { fontSize: 13, color: '#64748b' },
  dateText: { fontSize: 12, color: '#64748b' },
  invoiceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 6,
  },
  totalLabel: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  totalAmount: { fontSize: 17, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { flex: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  modalBody: { padding: 16 },
  statusBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  changeStatusBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  cancelInfoBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  refundDetailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  confirmRefundActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 10,
    gap: 6,
  },
  cardSection: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    color: '#334155',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoLabel: { fontSize: 13, color: '#64748b' },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    maxWidth: '65%',
    textAlign: 'right',
  },
  paymentProofImg: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  noteBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  productDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  productDetailName: { fontSize: 14, fontWeight: '600' },
  productDetailQty: { fontSize: 12, color: '#64748b', marginTop: 2 },
  productDetailPrice: { fontSize: 14, fontWeight: '700' },
  totalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
  totalNumber: { fontSize: 20, fontWeight: '700' },
});
