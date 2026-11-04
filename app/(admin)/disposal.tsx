import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { adminApi } from '@/services/api/adminApi';
import { useAuth } from '@/context/AuthContext';

export default function AdminDisposalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user, profile, role } = useAuth();

  const vaiTroId = Number(
    user?.vaiTroId || user?.role_id || (user?.vaitro ? user?.vaitro.id : 0) || profile?.roleId || 0
  );
  const userRole = Number(
    user?.MAROLE !== undefined ? user?.MAROLE : user?.QUYEN !== undefined ? user?.QUYEN : role
  );
  const isAdmin = vaiTroId === 1 || (!vaiTroId && userRole === 0);
  const isManager = vaiTroId === 2 || userRole === 1;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [qty, setQty] = useState('5');
  const [reason, setReason] = useState('Hết hạn sử dụng');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resReports, resBatches, resStores] = await Promise.allSettled([
        adminApi.getBienBanHuys(),
        adminApi.getLoHangs(),
        adminApi.getAdminStores(),
      ]);

      if (resReports.status === 'fulfilled') {
        const val = resReports.value;
        let raw = val?.data?.data || val?.data || val || [];
        if (raw && typeof raw === 'object' && Array.isArray(raw.data)) raw = raw.data;
        setReports(Array.isArray(raw) ? raw : []);
      }
      if (resBatches.status === 'fulfilled') {
        const val = resBatches.value;
        let raw = val?.data?.data || val?.data || val || [];
        if (raw && typeof raw === 'object' && Array.isArray(raw.data)) raw = raw.data;
        const list = Array.isArray(raw) ? raw : [];
        setBatches(list);
        if (params.batchId) {
          const target = list.find((b: any) => String(b.id || b.maLoHang || b.MALOHANG) === String(params.batchId));
          if (target) {
            setSelectedBatch(target);
            const targetStock = target.soLuongCon ?? target.SOLUONG_CONLAI ?? target.SOLUONG_CON ?? target.TONKHO_THUCTE ?? target.soLuongNhap ?? 1;
            setQty(String(params.qty || targetStock));
            setCreateModalOpen(true);
          }
        } else if (list.length > 0 && !selectedBatch) {
          setSelectedBatch(list[0]);
          const s0 = list[0].soLuongCon ?? list[0].SOLUONG_CONLAI ?? list[0].SOLUONG_CON ?? list[0].TONKHO_THUCTE ?? list[0].soLuongNhap ?? 1;
          setQty(String(s0));
        }
      }
      if (resStores.status === 'fulfilled') {
        const val = resStores.value;
        const list = Array.isArray(val) ? val : val?.data || [];
        setStores(list);
        if (list.length > 0 && !selectedStoreId)
          setSelectedStoreId(String(list[0].MACUAHANG || list[0].id));
      }
    } catch (e) {
      console.error(e);
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

  const handleCreateDisposal = async () => {
    if (!selectedBatch || !qty) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn lô hàng và nhập số lượng hủy.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        cua_hang_id: Number(selectedStoreId) || 1,
        ly_do: reason,
        ghi_chu: notes,
        auto_sign_all: isManager,
        chi_tiet: [
          {
            lo_hang_id: selectedBatch.id || selectedBatch.MALOHANG,
            san_pham_id:
              selectedBatch.MASP || selectedBatch.sanpham_id || selectedBatch.san_pham?.id,
            so_luong_huy: Number(qty),
            don_gia_von: selectedBatch.GIA_NHAP || 15000,
            ly_do_chi_tiet: reason,
          },
        ],
      };

      await adminApi.createBienBanHuy(payload);
      Alert.alert(
        'Thành công',
        isManager
          ? 'Quản lý chi nhánh đã phê duyệt lập biên bản hủy! Tồn kho đã được trừ ngay lập tức.'
          : 'Đã lập biên bản hủy! Đang chuyển sang mục Duyệt & Ký số để Quản lý chi nhánh phê duyệt.'
      );
      setCreateModalOpen(false);
      loadData();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể tạo biên bản hủy.');
    } finally {
      setSubmitting(false);
    }
  };

  const getReportSigStatus = (rep: any) => {
    const sigs = Array.isArray(rep.chu_ky_sos || rep.chuKySos || rep.chu_ky_so || rep.chu_kys || rep.signatures || rep.slots)
      ? rep.chu_ky_sos || rep.chuKySos || rep.chu_ky_so || rep.chu_kys || rep.signatures || rep.slots
      : [];
    const hasManagerSigned =
      Boolean(rep.da_ky_quan_ly || rep.quan_ly_signed || rep.KY_GIAM_DOC || rep.KY_QUAN_LY) ||
      sigs.some((s: any) => (Number(s.vai_tro_ky || s.vaiTroKy) === 3 || s.vai_tro === 'QUAN_LY') && Number(s.trangThai ?? s.trang_thai) === 1);
    const hasWarehouseSigned =
      Boolean(rep.da_ky_kho || rep.thu_kho_signed || rep.KY_THU_KHO) ||
      sigs.some((s: any) => (Number(s.vai_tro_ky || s.vaiTroKy) === 2 || s.vai_tro === 'THU_KHO') && Number(s.trangThai ?? s.trang_thai) === 1);
    const hasAccountantSigned =
      Boolean(rep.da_ky_ke_toan || rep.ke_toan_signed || rep.KY_KE_TOAN) ||
      sigs.some((s: any) => (Number(s.vai_tro_ky || s.vaiTroKy) === 1 || s.vai_tro === 'KE_TOAN') && Number(s.trangThai ?? s.trang_thai) === 1);
    const isSigned =
      Number(rep.trangThai ?? rep.trang_thai ?? rep.TRANGTHAI) === 1 ||
      rep.trang_thai === 'DA_DUYET' ||
      rep.trang_thai === 2 ||
      rep.is_signed ||
      hasManagerSigned ||
      (hasWarehouseSigned && hasAccountantSigned);

    return { hasManagerSigned, hasWarehouseSigned, hasAccountantSigned, isSigned };
  };

  const totalLoss = (Array.isArray(reports) ? reports : []).reduce(
    (acc, r) => acc + Number(r.tong_gia_tri_huy || r.TONGTIEN || 0),
    0
  );

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: '#d97706' }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Biên Bản Hủy Hàng</ThemedText>
          <TouchableOpacity style={styles.backButton} onPress={() => setCreateModalOpen(true)}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* LOSS STATS */}
        <View style={styles.statBanner}>
          <View>
            <ThemedText style={{ color: '#fff', fontSize: 12, opacity: 0.9 }}>
              Tổng hao hụt / hủy:
            </ThemedText>
            <ThemedText style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>
              {totalLoss.toLocaleString('vi-VN')}đ
            </ThemedText>
          </View>
          <TouchableOpacity
            style={styles.newReportBtn}
            onPress={() => setCreateModalOpen(true)}
          >
            <Ionicons name="add-circle" size={18} color="#d97706" style={{ marginRight: 4 }} />
            <ThemedText style={{ color: '#d97706', fontWeight: 'bold', fontSize: 12 }}>
              Lập biên bản
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} colors={['#d97706']} />
        }
        contentContainerStyle={{ padding: 16 }}
      >
        <View style={styles.ruleBanner}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#B45309" />
          <ThemedText style={styles.ruleBannerText}>
            Biên bản hủy hoàn tất ngay nếu{' '}
            <ThemedText style={{ fontWeight: '800', color: '#92400E' }}>
              Quản lý chi nhánh
            </ThemedText>{' '}
            ký duyệt, hoặc khi có đủ chữ ký của{' '}
            <ThemedText style={{ fontWeight: '800', color: '#92400E' }}>
              Nhân viên kho + Kế toán
            </ThemedText>
            .
          </ThemedText>
        </View>

        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#B71C1C" />
            <ThemedText style={{ marginTop: 12, opacity: 0.6 }}>
              Đang tải danh sách biên bản hủy...
            </ThemedText>
          </View>
        ) : reports.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Ionicons name="trash-outline" size={56} color={colors.cardTextSecondary} />
            <ThemedText style={{ marginTop: 12, fontSize: 16, fontWeight: 'bold' }}>
              Chưa có biên bản hủy nào
            </ThemedText>
            <ThemedText style={{ marginTop: 4, opacity: 0.6 }}>
              Bấm nút "+" để lập biên bản hủy sản phẩm hết hạn.
            </ThemedText>
          </View>
        ) : (
          reports.map((rep, idx) => {
            const code = rep.so_bien_ban || rep.MABB || `BBH-#${rep.id || idx + 1}`;
            const date = rep.ngay_lap ? rep.ngay_lap.split('T')[0] : 'Hôm nay';
            const creator = rep.nguoi_lap?.HOTEN || rep.nguoi_tao?.ho_ten || 'Nhân viên';
            const store =
              rep.cua_hang?.TENCUAHANG || rep.cua_hang?.ten_cua_hang || 'Chi nhánh Givral';
            const reasonText = rep.ly_do || 'Hết hạn sử dụng';
            const sig = getReportSigStatus(rep);

            return (
              <View
                key={String(rep.id || idx)}
                style={[
                  styles.repCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
                ]}
              >
                <View style={styles.repHeader}>
                  <ThemedText style={styles.codeText}>{code}</ThemedText>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: sig.isSigned ? '#d1fae5' : '#fee2e2' },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.statusPillText,
                        { color: sig.isSigned ? '#059669' : '#dc2626' },
                      ]}
                    >
                      {sig.isSigned ? 'Đã duyệt ký số' : 'Chờ duyệt ký'}
                    </ThemedText>
                  </View>
                </View>

                <ThemedText style={styles.reasonText}>Lý do: {reasonText}</ThemedText>
                <ThemedText style={[styles.subText, { color: colors.cardTextSecondary }]}>
                  Người lập: {creator} • {date}
                </ThemedText>
                <ThemedText style={[styles.subText, { color: colors.cardTextSecondary }]}>
                  <Ionicons
                    name="storefront-outline"
                    size={12}
                    color={colors.cardTextSecondary}
                  />{' '}
                  {store}
                </ThemedText>

                {/* 3 Signature Slots Display */}
                <View style={styles.sigRow}>
                  <View
                    style={[styles.sigChip, sig.hasManagerSigned && styles.sigChipActive]}
                  >
                    <Ionicons
                      name={sig.hasManagerSigned ? 'checkmark-circle' : 'ellipse-outline'}
                      size={12}
                      color={sig.hasManagerSigned ? '#059669' : '#64748B'}
                    />
                    <ThemedText style={styles.sigChipText}>Quản lý CN</ThemedText>
                  </View>
                  <View
                    style={[styles.sigChip, sig.hasWarehouseSigned && styles.sigChipActive]}
                  >
                    <Ionicons
                      name={sig.hasWarehouseSigned ? 'checkmark-circle' : 'ellipse-outline'}
                      size={12}
                      color={sig.hasWarehouseSigned ? '#059669' : '#64748B'}
                    />
                    <ThemedText style={styles.sigChipText}>NV Kho</ThemedText>
                  </View>
                  <View
                    style={[styles.sigChip, sig.hasAccountantSigned && styles.sigChipActive]}
                  >
                    <Ionicons
                      name={sig.hasAccountantSigned ? 'checkmark-circle' : 'ellipse-outline'}
                      size={12}
                      color={sig.hasAccountantSigned ? '#059669' : '#64748B'}
                    />
                    <ThemedText style={styles.sigChipText}>Kế toán</ThemedText>
                  </View>
                </View>

                {!sig.isSigned && !isAdmin && (
                  <TouchableOpacity
                    style={styles.goToSignBtn}
                    onPress={() => router.push('/(admin)/signature-approval')}
                  >
                    <Ionicons name="finger-print-outline" size={16} color="#fff" />
                    <ThemedText style={styles.goToSignBtnText}>
                      Chuyển tới Duyệt & Ký số
                    </ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
        <View style={{ height: 60 }} />
      </ScrollView>

      {/* CREATE DISPOSAL MODAL */}
      <Modal visible={createModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.background }]}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 14,
              }}
            >
              <ThemedText style={styles.modalTitle}>Lập Biên Bản Hủy Sản Phẩm</ThemedText>
              <TouchableOpacity onPress={() => setCreateModalOpen(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* CHỌN LÔ HÀNG */}
              <ThemedText style={styles.fieldLabel}>Chọn Lô Hàng / Bánh Cần Hủy:</ThemedText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 12 }}
              >
                {batches.map((b) => {
                  const bCode = b.MALOHANG || `LÔ #${b.id}`;
                  const prodName = b.san_pham?.TENSP || b.TENSP || 'Bánh';
                  const active =
                    selectedBatch?.id === b.id || selectedBatch?.MALOHANG === b.MALOHANG;
                  return (
                    <TouchableOpacity
                      key={String(b.MALOHANG || b.id)}
                      style={[
                        styles.choiceChip,
                        { borderColor: active ? '#dc2626' : colors.cardBorder },
                        active && { backgroundColor: '#fee2e2' },
                      ]}
                      onPress={() => {
                        setSelectedBatch(b);
                        const remaining = b.soLuongCon ?? b.SOLUONG_CONLAI ?? b.SOLUONG_CON ?? b.TONKHO_THUCTE ?? b.soLuongNhap ?? 1;
                        setQty(String(remaining));
                      }}
                    >
                      <ThemedText
                        style={[
                          styles.choiceText,
                          active && { color: '#dc2626', fontWeight: 'bold' },
                        ]}
                      >
                        {bCode} - {prodName}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* SỐ LƯỢNG HỦY */}
              <ThemedText style={styles.fieldLabel}>Số lượng hủy (cái):</ThemedText>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.icon + '30' }]}
                keyboardType="numeric"
                value={qty}
                onChangeText={setQty}
              />

              {/* LÝ DO HỦY */}
              <ThemedText style={styles.fieldLabel}>Lý do hủy:</ThemedText>
              {[
                'Hết hạn sử dụng',
                'Bể vỡ / Hư hỏng khi vận chuyển',
                'Lỗi kỹ thuật nướng / Biến dạng',
                'Khác',
              ].map((r) => {
                const active = reason === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.reasonOption,
                      { borderColor: active ? '#dc2626' : colors.icon + '20' },
                      active && { backgroundColor: '#fee2e2' },
                    ]}
                    onPress={() => setReason(r)}
                  >
                    <Ionicons
                      name={active ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={active ? '#dc2626' : colors.icon}
                    />
                    <ThemedText
                      style={[
                        styles.reasonOptionText,
                        active && { color: '#dc2626', fontWeight: 'bold' },
                      ]}
                    >
                      {r}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}

              {/* GHI CHÚ */}
              <ThemedText style={[styles.fieldLabel, { marginTop: 10 }]}>
                Ghi chú chi tiết:
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.icon + '30', height: 60 },
                ]}
                multiline
                value={notes}
                onChangeText={setNotes}
                placeholder="Ghi rõ tình trạng thực tế..."
              />

              {/* SUBMIT */}
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#d97706' }]}
                onPress={handleCreateDisposal}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.submitBtnText}>
                    {isManager ? 'Phê Duyệt & Trừ Kho Ngay' : 'Gửi Duyệt Biên Bản Hủy'}
                  </ThemedText>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  statBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 12,
    borderRadius: 12,
  },
  newReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ruleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  ruleBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
  },
  repCard: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 12 },
  repHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  codeText: { fontWeight: 'bold', fontSize: 15 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusPillText: { fontSize: 11, fontWeight: 'bold' },
  reasonText: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  subText: { fontSize: 12, marginBottom: 2 },
  sigRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  sigChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  sigChipActive: {
    backgroundColor: '#D1FAE5',
  },
  sigChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  goToSignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 10,
    gap: 6,
  },
  goToSignBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalTitle: { fontSize: 17, fontWeight: 'bold' },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  choiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  choiceText: { fontSize: 13 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 12,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
    gap: 8,
  },
  reasonOptionText: { fontSize: 13 },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
