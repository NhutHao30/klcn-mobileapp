import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { adminApi } from '@/services/api/adminApi';
import { useAuth } from '@/context/AuthContext';
import { formatImageUrl } from '@/config/apiConfig';

interface ImportLineItem {
  san_pham_id: string;
  ten_sp: string;
  so_luong_chung_tu: number;
  don_gia_nhap: number;
  ngay_san_xuat: string;
  han_su_dung: string;
}

export default function AdminImportBatchScreen() {
  const router = useRouter();
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
  const isDirector = vaiTroId === 8 || userRole === 5;
  const isManager = vaiTroId === 2 || userRole === 1;
  const isWarehouse = vaiTroId === 4;
  const isAccountant = vaiTroId === 7 || userRole === 6;

  // Director ONLY views & approves import orders (does NOT see "+ Lập phiếu mới")
  const canCreateImport = !isDirector && (isManager || isWarehouse || isAccountant || isAdmin);

  const userBranchId =
    user?.nguoidung?.cuaHangId ||
    user?.nguoidung?.MACUAHANG ||
    user?.nguoidung?.cuahang?.id ||
    user?.nguoidung?.cuahang?.MACUAHANG ||
    user?.nguoidung?.cuahang_id ||
    user?.nhanvien?.cuaHangId ||
    user?.nhanvien?.MACUAHANG ||
    user?.nhanvien?.cuahang_id ||
    profile?.storeId ||
    (user as any)?.MACUAHANG ||
    (isManager ? 1 : 1);

  const [activeTab, setActiveTab] = useState<'INVOICES' | 'CREATE'>('INVOICES');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [nccList, setNccList] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Form State (Supports multiple product items per import order)
  const [nccId, setNccId] = useState('');
  const [storeId, setStoreId] = useState(() => String(userBranchId || profile?.storeId || 1));
  const [masp, setMasp] = useState('');
  const [qty, setQty] = useState('50');
  const [price, setPrice] = useState('15000');
  const [nsx, setNsx] = useState(new Date().toISOString().split('T')[0]);
  const [hsd, setHsd] = useState(
    new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [lineItems, setLineItems] = useState<ImportLineItem[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [approvingId, setApprovingId] = useState<string | number | null>(null);

  // Modal Confirm Receipt
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [receivedQty, setReceivedQty] = useState('');
  const [confirming, setConfirming] = useState(false);

  // Modal View Invoice Detail
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetailInvoice, setSelectedDetailInvoice] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const currentAssignedStore = useMemo(() => {
    const sId = Number(storeId || userBranchId || profile?.storeId || 1);
    return (
      stores.find((s) => Number(s.MACUAHANG || s.id) === sId) ||
      (stores.length > 0 ? stores[0] : null)
    );
  }, [stores, storeId, userBranchId, profile?.storeId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resInvoices, resNcc, resStores, resProds] = await Promise.allSettled([
        adminApi.getHoaDonNhaps({ _t: Date.now() }),
        adminApi.getNhaCungCaps(),
        adminApi.getAdminStores(),
        adminApi.getAdminProducts(),
      ]);

      if (resInvoices.status === 'fulfilled') {
        const val = resInvoices.value;
        let raw = val?.data?.data || val?.data || val || [];
        if (raw && typeof raw === 'object' && Array.isArray(raw.data)) {
          raw = raw.data;
        }
        setInvoices(Array.isArray(raw) ? raw : []);
      }
      if (resNcc.status === 'fulfilled') {
        const val = resNcc.value;
        const list = Array.isArray(val) ? val : val?.data || [];
        setNccList(list);
        if (list.length > 0 && !nccId) setNccId(String(list[0].id || list[0].MANCC));
      }
      if (resStores.status === 'fulfilled') {
        const val = resStores.value;
        const list = Array.isArray(val) ? val : val?.data || [];
        setStores(list);
        const resolvedId = userBranchId || profile?.storeId || (list.length > 0 ? (list[0].MACUAHANG || list[0].id) : 1);
        setStoreId(String(resolvedId));
      }
      if (resProds.status === 'fulfilled') {
        const val = resProds.value;
        const list = Array.isArray(val) ? val : val?.data || [];
        setProducts(list);
        if (list.length > 0 && !masp) setMasp(String(list[0].id || list[0].MASP));
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

  const handleAddLineItem = () => {
    if (!masp || !qty || !price) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn bánh, số lượng và đơn giá nhập.');
      return;
    }
    const foundProd = products.find(
      (p) => String(p.id) === String(masp) || String(p.MASP) === String(masp)
    );
    const prodId = foundProd?.id ? String(foundProd.id) : String(masp);
    const prodName = foundProd?.tenSanPham || foundProd?.TENSP || foundProd?.name || `Sản phẩm #${masp}`;

    setLineItems((prev) => [
      ...prev,
      {
        san_pham_id: prodId,
        ten_sp: prodName,
        so_luong_chung_tu: Number(qty) || 1,
        don_gia_nhap: Number(price) || 0,
        ngay_san_xuat: nsx,
        han_su_dung: hsd,
      },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleCreateInvoice = async () => {
    const finalStoreId = Number(
      storeId ||
      userBranchId ||
      profile?.storeId ||
      (stores.length > 0 ? (stores[0].MACUAHANG || stores[0].id) : 1)
    );

    if (!nccId) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn nhà cung cấp nhập hàng.');
      return;
    }

    const itemsToSubmit: ImportLineItem[] =
      lineItems.length > 0
        ? lineItems
        : masp && qty && price
        ? [
            {
              san_pham_id: String(masp),
              ten_sp: '',
              so_luong_chung_tu: Number(qty),
              don_gia_nhap: Number(price),
              ngay_san_xuat: nsx,
              han_su_dung: hsd,
            },
          ]
        : [];

    if (itemsToSubmit.length === 0) {
      Alert.alert('Thiếu mặt hàng', 'Vui lòng thêm ít nhất 1 sản phẩm bánh vào phiếu nhập.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        nhaCungCapId: Number(nccId),
        nha_cung_cap_id: Number(nccId),
        MANCC: Number(nccId),
        cuaHangId: finalStoreId,
        cua_hang_id: finalStoreId,
        MACUAHANG_NHAP: finalStoreId,
        MACUAHANG: finalStoreId,
        ghiChu: notes,
        ghi_chu: notes,
        items: itemsToSubmit.map((item) => {
          let numericId = Number(item.san_pham_id);
          if (isNaN(numericId) || numericId <= 0) {
            const matched = products.find(
              (p) => String(p.MASP) === String(item.san_pham_id) || String(p.maSanPham) === String(item.san_pham_id) || String(p.id) === String(item.san_pham_id)
            );
            numericId = matched?.id ? Number(matched.id) : 1;
          }
          return {
            sanPhamId: numericId,
            san_pham_id: numericId,
            MASP: numericId,
            soLuong: Number(item.so_luong_chung_tu) || 1,
            so_luong: Number(item.so_luong_chung_tu) || 1,
            don_gia_nhap: Number(item.don_gia_nhap) || 0,
            ngaySanXuat: item.ngay_san_xuat,
            ngay_san_xuat: item.ngay_san_xuat,
            hsd: item.han_su_dung,
            han_su_dung: item.han_su_dung,
          };
        }),
        chi_tiet: itemsToSubmit.map((item) => {
          let numericId = Number(item.san_pham_id);
          if (isNaN(numericId) || numericId <= 0) {
            const matched = products.find(
              (p) => String(p.MASP) === String(item.san_pham_id) || String(p.maSanPham) === String(item.san_pham_id) || String(p.id) === String(item.san_pham_id)
            );
            numericId = matched?.id ? Number(matched.id) : 1;
          }
          return {
            sanPhamId: numericId,
            san_pham_id: numericId,
            MASP: numericId,
            soLuong: Number(item.so_luong_chung_tu) || 1,
            so_luong: Number(item.so_luong_chung_tu) || 1,
            don_gia_nhap: Number(item.don_gia_nhap) || 0,
            ngaySanXuat: item.ngay_san_xuat,
            ngay_san_xuat: item.ngay_san_xuat,
            hsd: item.han_su_dung,
            han_su_dung: item.han_su_dung,
          };
        }),
      };

      await adminApi.createHoaDonNhap(payload);
      Alert.alert(
        'Thành công',
        'Đã lập phiếu nhập kho thành công! Phiếu đã chuyển sang luồng Ký số điện tử.'
      );
      setLineItems([]);
      setNotes('');
      setActiveTab('INVOICES');
      loadData();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể tạo phiếu nhập kho lúc này.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveRequest = async (inv: any) => {
    const id = inv.id || inv.MAHDNHAP;
    try {
      setApprovingId(id);
      await adminApi.approveImportOrder(id);
      Alert.alert('Đã phê duyệt', `Đã duyệt yêu cầu nhập hàng #${inv.so_hoa_don || id} thành công!`);
      loadData();
    } catch (e: any) {
      Alert.alert('Thông báo', e?.response?.data?.message || 'Đã ghi nhận duyệt yêu cầu nhập hàng.');
      loadData();
    } finally {
      setApprovingId(null);
    }
  };

  const handleConfirmReceipt = async () => {
    if (!selectedInvoice) return;
    try {
      setConfirming(true);
      const invoiceId = selectedInvoice.id || selectedInvoice.MAHDNHAP || selectedInvoice.maHoaDonNhap;
      await adminApi.xacNhanNhapKho(invoiceId, {
        so_luong_thuc_nhan: Number(receivedQty) || selectedInvoice.tong_so_luong || 1,
      });
      Alert.alert('Hoàn tất', 'Đã xác nhận nhập kho và cập nhật số lượng tồn lô thành công!');
      setConfirmModalOpen(false);
      if (selectedDetailInvoice && (selectedDetailInvoice.id === invoiceId || selectedDetailInvoice.maHoaDonNhap === invoiceId)) {
        handleOpenDetail(selectedInvoice);
      }
      loadData();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể xác nhận nhập kho.');
    } finally {
      setConfirming(false);
    }
  };

  const handleOpenDetail = async (inv: any) => {
    setSelectedDetailInvoice(inv);
    setDetailModalOpen(true);
    const invoiceId = inv.id || inv.MAHDNHAP || inv.maHoaDonNhap;
    if (invoiceId) {
      try {
        setLoadingDetail(true);
        const res = await adminApi.getHoaDonNhapDetail(invoiceId);
        const full = res?.data || res;
        if (full && (full.id || full.maHoaDonNhap)) {
          setSelectedDetailInvoice(full);
        }
      } catch (e) {
        console.log('Error fetching full invoice detail:', e);
      } finally {
        setLoadingDetail(false);
      }
    }
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

  // Evaluate multi-party signature status on an import invoice
  const parseSignatureStatus = (inv: any) => {
    const sigs = Array.isArray(inv.chuKySos || inv.chu_ky_sos || inv.chu_ky_so || inv.chu_kys || inv.signatures)
      ? inv.chuKySos || inv.chu_ky_sos || inv.chu_ky_so || inv.chu_kys || inv.signatures
      : [];

    const isSlotSigned = (s: any) =>
      Number(s.trangThai ?? s.trang_thai ?? 0) === 1 ||
      Boolean(s.digitalSignatureHash || s.digital_signature_hash);

    const hasManagerSigned =
      Boolean(inv.da_ky_quan_ly || inv.quan_ly_signed) ||
      sigs.some(
        (s: any) => (Number(s.vaiTroKy || s.vai_tro_ky) === 3 || s.vai_tro === 'QUAN_LY') && isSlotSigned(s)
      );
    const hasWarehouseSigned =
      Boolean(inv.da_ky_kho || inv.thu_kho_signed) ||
      sigs.some(
        (s: any) => (Number(s.vaiTroKy || s.vai_tro_ky) === 2 || s.vai_tro === 'THU_KHO') && isSlotSigned(s)
      );
    const hasAccountantSigned =
      Boolean(inv.da_ky_ke_toan || inv.ke_toan_signed) ||
      sigs.some(
        (s: any) => (Number(s.vaiTroKy || s.vai_tro_ky) === 1 || s.vai_tro === 'KE_TOAN') && isSlotSigned(s)
      );

    const isConfirmedStatus =
      Number(inv.trangThai ?? inv.trang_thai ?? 0) === 1 ||
      inv.trang_thai === 'DA_NHAP' ||
      inv.trang_thai === 'HOAN_TAT' ||
      inv.trang_thai === 2 ||
      inv.is_confirmed;

    // Rule: Completed immediately if Manager signed, OR if both Warehouse + Accountant signed
    const isSignatureCompleted =
      hasManagerSigned || (hasWarehouseSigned && hasAccountantSigned) || isConfirmedStatus;

    return {
      hasManagerSigned,
      hasWarehouseSigned,
      hasAccountantSigned,
      isSignatureCompleted,
      sigs,
    };
  };

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: '#d97706' }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <ThemedText style={styles.headerTitle}>
              {isDirector ? 'Duyệt Yêu Cầu Nhập Lô Hàng' : 'Quản Lý Nhập Lô Hàng'}
            </ThemedText>
            <ThemedText style={{ color: '#FDE047', fontSize: 11, fontWeight: '600' }}>
              {isDirector
                ? 'Chế độ Ban Giám Đốc (Chỉ xem & Phê duyệt)'
                : isManager
                ? 'Quản lý Chi nhánh • Lập phiếu & Ký duyệt ngay'
                : 'Quy trình Nhập kho & Ký số điện tử'}
            </ThemedText>
          </View>
          <TouchableOpacity onPress={loadData} style={styles.backButton}>
            <Ionicons name="refresh" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* TABS — Hide "+ Lập phiếu mới" for Director */}
        {canCreateImport ? (
          <View style={styles.headerTabs}>
            <TouchableOpacity
              style={[styles.headerTabBtn, activeTab === 'INVOICES' && styles.headerTabActive]}
              onPress={() => setActiveTab('INVOICES')}
            >
              <ThemedText
                style={[
                  styles.headerTabText,
                  activeTab === 'INVOICES' && { fontWeight: 'bold', color: '#d97706' },
                ]}
              >
                Danh sách phiếu nhập ({invoices.length})
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerTabBtn, activeTab === 'CREATE' && styles.headerTabActive]}
              onPress={() => setActiveTab('CREATE')}
            >
              <ThemedText
                style={[
                  styles.headerTabText,
                  activeTab === 'CREATE' && { fontWeight: 'bold', color: '#d97706' },
                ]}
              >
                + Lập phiếu mới
              </ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.directorNoticeBanner}>
            <Ionicons name="shield-checkmark" size={16} color="#FDE047" />
            <ThemedText style={styles.directorNoticeText}>
              Ban Giám Đốc kiểm tra chứng từ và phê duyệt yêu cầu nhập hàng của các chi nhánh.
            </ThemedText>
          </View>
        )}
      </View>

      {activeTab === 'INVOICES' || !canCreateImport ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadData} colors={['#B71C1C']} />
          }
          contentContainerStyle={{ padding: 16 }}
        >
          {/* Rule explanation banner */}
          <View style={styles.ruleBanner}>
            <Ionicons name="information-circle" size={18} color="#B45309" />
            <ThemedText style={styles.ruleBannerText}>
              Quy tắc ký duyệt: Hoàn tất ngay nếu có chữ ký{' '}
              <ThemedText style={{ fontWeight: '800', color: '#92400E' }}>
                Quản lý chi nhánh
              </ThemedText>
              , hoặc khi đủ cả 2 chữ ký của{' '}
              <ThemedText style={{ fontWeight: '800', color: '#92400E' }}>
                Nhân viên Kho + Kế toán
              </ThemedText>
              .
            </ThemedText>
          </View>

          {loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#B71C1C" />
              <ThemedText style={{ marginTop: 12, opacity: 0.6 }}>
                Đang tải danh sách phiếu nhập...
              </ThemedText>
            </View>
          ) : invoices.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Ionicons name="receipt-outline" size={56} color={colors.cardTextSecondary} />
              <ThemedText style={{ marginTop: 12, fontSize: 16, fontWeight: 'bold' }}>
                Chưa có phiếu nhập nào
              </ThemedText>
              {canCreateImport && (
                <ThemedText style={{ marginTop: 4, opacity: 0.6 }}>
                  Bấm "+ Lập phiếu mới" để tạo lô hàng nhập cho chi nhánh.
                </ThemedText>
              )}
            </View>
          ) : (
            (Array.isArray(invoices) ? invoices : []).map((inv, idx) => {
              const id = inv.id || inv.MAHDNHAP || idx + 1;
              const code =
                inv.maHoaDonNhap ||
                inv.ma_hoadon_nhap ||
                inv.so_hoa_don ||
                inv.MAHDNHAP ||
                `HDN-#${id}`;
              const ncc =
                inv.nhaCungCap?.tenNhaCungCap ||
                inv.nha_cung_cap?.tenNhaCungCap ||
                inv.nha_cung_cap?.TENNCC ||
                inv.nha_cung_cap?.ten_ncc ||
                'Nhà cung cấp';
              const store =
                inv.cuaHang?.tenCuaHang ||
                inv.cua_hang?.tenCuaHang ||
                inv.cua_hang?.TENCUAHANG ||
                inv.cua_hang?.ten_cua_hang ||
                'Chi nhánh Givral Bakery';
              const totalAmount =
                Number(inv.tongTien || inv.tong_tien || inv.TONGTIEN || 0).toLocaleString('vi-VN') +
                '₫';
              const isConfirmed =
                Number(inv.trangThai ?? inv.trang_thai ?? 0) === 1 ||
                inv.trang_thai === 'DA_NHAP' ||
                inv.trang_thai === 'HOAN_TAT' ||
                inv.trang_thai === 2 ||
                inv.is_confirmed;
              const isApprovedByDirector =
                inv.da_duyet_yeu_cau ||
                inv.trang_thai === 'DA_DUYET' ||
                inv.trang_thai === 'DA_NHAP' ||
                isConfirmed;

              const sigInfo = parseSignatureStatus(inv);
              const items = inv.chiTiets || inv.chi_tiets || [];

              return (
                <View
                  key={String(id)}
                  style={[
                    styles.card,
                    { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.codeBadge}>
                      <Ionicons name="document-text-outline" size={16} color="#B71C1C" />
                      <ThemedText style={styles.codeText}>{code}</ThemedText>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor:
                            isConfirmed || sigInfo.isSignatureCompleted ? '#D1FAE5' : '#FEF3C7',
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.statusPillText,
                          {
                            color:
                              isConfirmed || sigInfo.isSignatureCompleted ? '#059669' : '#D97706',
                          },
                        ]}
                      >
                        {isConfirmed
                          ? 'Đã nhập kho'
                          : sigInfo.isSignatureCompleted
                          ? 'Đủ chữ ký • Sẵn sàng nhập'
                          : 'Chờ ký số / Xác nhận'}
                      </ThemedText>
                    </View>
                  </View>

                  <ThemedText style={styles.nccText}>NCC: {ncc}</ThemedText>
                  <ThemedText style={[styles.storeText, { color: colors.cardTextSecondary }]}>
                    <Ionicons name="storefront-outline" size={13} color={colors.cardTextSecondary} />{' '}
                    {store}
                  </ThemedText>

                  {/* 3 SIGNATURE SLOTS STATUS */}
                  <View style={styles.sigSlotsBox}>
                    <ThemedText style={styles.sigSlotsHeading}>
                      Trạng thái chữ ký số điện tử:
                    </ThemedText>
                    <View style={styles.sigSlotsRow}>
                      <View
                        style={[
                          styles.sigSlotBadge,
                          sigInfo.hasManagerSigned && styles.sigSlotSigned,
                        ]}
                      >
                        <Ionicons
                          name={sigInfo.hasManagerSigned ? 'checkmark-circle' : 'ellipse-outline'}
                          size={13}
                          color={sigInfo.hasManagerSigned ? '#059669' : '#64748B'}
                        />
                        <ThemedText
                          style={[
                            styles.sigSlotText,
                            sigInfo.hasManagerSigned && { color: '#059669', fontWeight: '700' },
                          ]}
                        >
                          Quản lý CN (Chốt ngay)
                        </ThemedText>
                      </View>

                      <View
                        style={[
                          styles.sigSlotBadge,
                          sigInfo.hasWarehouseSigned && styles.sigSlotSigned,
                        ]}
                      >
                        <Ionicons
                          name={sigInfo.hasWarehouseSigned ? 'checkmark-circle' : 'ellipse-outline'}
                          size={13}
                          color={sigInfo.hasWarehouseSigned ? '#059669' : '#64748B'}
                        />
                        <ThemedText
                          style={[
                            styles.sigSlotText,
                            sigInfo.hasWarehouseSigned && { color: '#059669', fontWeight: '700' },
                          ]}
                        >
                          NV Kho
                        </ThemedText>
                      </View>

                      <View
                        style={[
                          styles.sigSlotBadge,
                          sigInfo.hasAccountantSigned && styles.sigSlotSigned,
                        ]}
                      >
                        <Ionicons
                          name={
                            sigInfo.hasAccountantSigned ? 'checkmark-circle' : 'ellipse-outline'
                          }
                          size={13}
                          color={sigInfo.hasAccountantSigned ? '#059669' : '#64748B'}
                        />
                        <ThemedText
                          style={[
                            styles.sigSlotText,
                            sigInfo.hasAccountantSigned && { color: '#059669', fontWeight: '700' },
                          ]}
                        >
                          Kế toán
                        </ThemedText>
                      </View>
                    </View>
                  </View>

                  <View style={styles.amountRow}>
                    <ThemedText style={[styles.amountLabel, { color: colors.cardTextSecondary }]}>
                      Tổng tiền nhập:
                    </ThemedText>
                    <ThemedText style={styles.amountValue}>{totalAmount}</ThemedText>
                  </View>

                  <View style={styles.actionRowButtons}>
                    {/* Nút Xem chi tiết đơn nhập */}
                    <TouchableOpacity
                      style={[styles.confirmBtn, { backgroundColor: '#d97706', flex: 1 }]}
                      onPress={() => handleOpenDetail(inv)}
                    >
                      <Ionicons
                        name="eye-outline"
                        size={17}
                        color="#fff"
                        style={{ marginRight: 6 }}
                      />
                      <ThemedText style={styles.confirmBtnText}>Xem chi tiết</ThemedText>
                    </TouchableOpacity>

                    {/* Director Approval Button */}
                    {isDirector && !isApprovedByDirector && (
                      <TouchableOpacity
                        style={[styles.confirmBtn, { backgroundColor: '#B71C1C', flex: 1.1 }]}
                        onPress={() => handleApproveRequest(inv)}
                        disabled={approvingId === id}
                      >
                        {approvingId === id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons
                              name="shield-checkmark-outline"
                              size={17}
                              color="#fff"
                              style={{ marginRight: 6 }}
                            />
                            <ThemedText style={styles.confirmBtnText}>
                              Duyệt yêu cầu
                            </ThemedText>
                          </>
                        )}
                      </TouchableOpacity>
                    )}

                    {/* Digital Signature shortcut for non-Admin signers */}
                    {!isAdmin && !isConfirmed && (
                      <TouchableOpacity
                        style={[styles.confirmBtn, { backgroundColor: '#7C3AED', flex: 0.9 }]}
                        onPress={() => router.push('/(admin)/signature-approval')}
                      >
                        <Ionicons
                          name="finger-print-outline"
                          size={17}
                          color="#fff"
                          style={{ marginRight: 6 }}
                        />
                        <ThemedText style={styles.confirmBtnText}>Ký số</ThemedText>
                      </TouchableOpacity>
                    )}

                    {/* Confirm warehouse receipt */}
                    {!isConfirmed && (isManager || isWarehouse || isAdmin) && (
                      <TouchableOpacity
                        style={[styles.confirmBtn, { backgroundColor: '#059669', flex: 1.2 }]}
                        onPress={() => {
                          setSelectedInvoice(inv);
                          setReceivedQty(String(inv.tong_so_luong || 50));
                          setConfirmModalOpen(true);
                        }}
                      >
                        <Ionicons
                          name="checkmark-done"
                          size={17}
                          color="#fff"
                          style={{ marginRight: 6 }}
                        />
                        <ThemedText style={styles.confirmBtnText}>Đồng kiểm</ThemedText>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
          <View style={{ height: 60 }} />
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
          <View
            style={[
              styles.formCard,
              { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
            ]}
          >
            <ThemedText style={styles.formSectionTitle}>
              Lập Phiếu Nhập Lô Hàng Mới {isManager ? '(Quản lý Chi nhánh)' : ''}
            </ThemedText>

            {/* NCC */}
            <ThemedText style={styles.fieldLabel}>Nhà cung cấp:</ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 14 }}
            >
              {nccList.map((n) => {
                const idStr = String(n.id || n.MANCC);
                const active = nccId === idStr;
                return (
                  <TouchableOpacity
                    key={idStr}
                    style={[
                      styles.choiceChip,
                      { borderColor: active ? '#d97706' : colors.cardBorder },
                      active && { backgroundColor: '#FEF3C7' },
                    ]}
                    onPress={() => setNccId(idStr)}
                  >
                    <ThemedText
                      style={[
                        styles.choiceText,
                        active && { color: '#d97706', fontWeight: 'bold' },
                      ]}
                    >
                      {n.TENNCC || n.ten_ncc}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* CHI NHÁNH NHẬN HÀNG (Tự động áp dụng cho Quản lý chi nhánh) */}
            <View style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <ThemedText style={styles.fieldLabel}>Chi nhánh tiếp nhận hàng:</ThemedText>
                {(!isAdmin && !isDirector) && (
                  <View style={styles.autoStoreBadge}>
                    <Ionicons name="checkmark-circle" size={13} color="#15803D" />
                    <ThemedText style={styles.autoStoreBadgeText}>Tự động nhận diện (Chi nhánh của bạn)</ThemedText>
                  </View>
                )}
              </View>

              {!isAdmin && !isDirector ? (
                /* Thẻ Chi Nhánh Tự Động cho Quản lý chi nhánh / Nhân viên kho */
                <View style={[styles.assignedStoreBox, { backgroundColor: colors.cardBg, borderColor: '#d97706' }]}>
                  <View style={styles.assignedStoreIcon}>
                    <Ionicons name="storefront" size={22} color="#d97706" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.assignedStoreName}>
                      {currentAssignedStore?.TENCUAHANG || currentAssignedStore?.ten_cua_hang || profile?.storeName || 'Chi nhánh 1 (Quản lý CN1)'}
                    </ThemedText>
                    <ThemedText style={styles.assignedStoreAddr}>
                      {currentAssignedStore?.DIACHI || currentAssignedStore?.diaChi || 'Trụ sở chính & Điểm nhập hàng chi nhánh 1'}
                    </ThemedText>
                  </View>
                  <View style={styles.lockedStorePill}>
                    <Ionicons name="lock-closed" size={12} color="#B45309" />
                    <ThemedText style={styles.lockedStorePillText}>Cố định</ThemedText>
                  </View>
                </View>
              ) : (
                /* Danh sách chọn chi nhánh dành riêng cho Admin / Ban Giám Đốc */
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 14 }}
                >
                  {stores.map((s, idx) => {
                    const idStr = String(s.MACUAHANG || s.id);
                    const active = storeId === idStr;
                    return (
                      <TouchableOpacity
                        key={idStr || ('store-' + idx)}
                        style={[
                          styles.choiceChip,
                          { borderColor: active ? '#d97706' : colors.cardBorder },
                          active && { backgroundColor: '#FEF3C7' },
                        ]}
                        onPress={() => setStoreId(idStr)}
                      >
                        <ThemedText
                          style={[
                            styles.choiceText,
                            active && { color: '#d97706', fontWeight: 'bold' },
                          ]}
                        >
                          {s.TENCUAHANG || s.ten_cua_hang}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* SAN PHAM */}
            <ThemedText style={styles.fieldLabel}>Chọn sản phẩm bánh:</ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 14 }}
            >
              {products.slice(0, 50).map((p) => {
                const idStr = String(p.id || p.MASP);
                const active = masp === idStr;
                return (
                  <TouchableOpacity
                    key={idStr}
                    style={[
                      styles.choiceChip,
                      { borderColor: active ? '#d97706' : colors.cardBorder },
                      active && { backgroundColor: '#FEF3C7' },
                    ]}
                    onPress={() => setMasp(idStr)}
                  >
                    <ThemedText
                      style={[
                        styles.choiceText,
                        active && { color: '#d97706', fontWeight: 'bold' },
                      ]}
                    >
                      {p.TENSP || p.tenSanPham || p.name} (Tồn: {p.soLuongTon ?? p.SOLUONG_TON ?? p.TONKHO_THUCTE ?? 0})
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* SL & GIA */}
            <View style={styles.rowTwo}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <ThemedText style={styles.fieldLabel}>Số lượng nhập:</ThemedText>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.cardBorder }]}
                  keyboardType="numeric"
                  value={qty}
                  onChangeText={setQty}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <ThemedText style={styles.fieldLabel}>Đơn giá nhập (đ):</ThemedText>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.cardBorder }]}
                  keyboardType="numeric"
                  value={price}
                  onChangeText={setPrice}
                />
              </View>
            </View>

            {/* NSX & HSD */}
            <View style={styles.rowTwo}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <ThemedText style={styles.fieldLabel}>Ngày sản xuất:</ThemedText>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.cardBorder }]}
                  value={nsx}
                  onChangeText={setNsx}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <ThemedText style={styles.fieldLabel}>Hạn sử dụng:</ThemedText>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.cardBorder }]}
                  value={hsd}
                  onChangeText={setHsd}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>

            {/* ADD TO LIST BUTTON */}
            <TouchableOpacity style={styles.addItemBtn} onPress={handleAddLineItem}>
              <Ionicons name="add-circle-outline" size={18} color="#B71C1C" />
              <ThemedText style={styles.addItemBtnText}>
                + Thêm dòng bánh này vào danh sách nhập
              </ThemedText>
            </TouchableOpacity>

            {/* LIST OF ADDED ITEMS */}
            {lineItems.length > 0 && (
              <View style={styles.addedItemsBox}>
                <ThemedText style={{ fontWeight: '700', fontSize: 13, marginBottom: 8 }}>
                  Danh sách mặt hàng trong phiếu ({lineItems.length}):
                </ThemedText>
                {lineItems.map((item, idx) => (
                  <View key={idx} style={styles.addedItemRow}>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={{ fontWeight: '700', fontSize: 13 }}>
                        {idx + 1}. {item.ten_sp}
                      </ThemedText>
                      <ThemedText style={{ fontSize: 11, opacity: 0.7 }}>
                        SL: {item.so_luong_chung_tu} ×{' '}
                        {item.don_gia_nhap.toLocaleString('vi-VN')}đ • HSD: {item.han_su_dung}
                      </ThemedText>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveLineItem(idx)}>
                      <Ionicons name="trash-outline" size={18} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* GHI CHU */}
            <ThemedText style={styles.fieldLabel}>Ghi chú chứng từ:</ThemedText>
            <TextInput
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.cardBorder, height: 70 },
              ]}
              multiline
              value={notes}
              onChangeText={setNotes}
              placeholder="Ghi chú về lô hàng nhập..."
            />

            {/* SUBMIT BUTTON */}
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: '#B71C1C' }]}
              onPress={handleCreateInvoice}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.submitText}>
                  Tạo Phiếu Nhập & Chuyển Ký Số
                </ThemedText>
              )}
            </TouchableOpacity>
          </View>
          <View style={{ height: 60 }} />
        </ScrollView>
      )}

      {/* MODAL CONFIRM RECEIPT */}
      <Modal visible={confirmModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.background }]}>
            <ThemedText style={styles.modalTitle}>Đồng kiểm & Xác nhận nhập kho</ThemedText>
            <ThemedText style={{ opacity: 0.7, marginBottom: 14 }}>
              Nhập số lượng thực tế nhận tại chi nhánh:
            </ThemedText>

            <TextInput
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.icon + '30', marginBottom: 20 },
              ]}
              keyboardType="numeric"
              value={receivedQty}
              onChangeText={setReceivedQty}
              placeholder="Số lượng thực nhận"
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#94a3b8' }]}
                onPress={() => setConfirmModalOpen(false)}
              >
                <ThemedText style={styles.modalBtnText}>Hủy</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#059669' }]}
                onPress={handleConfirmReceipt}
                disabled={confirming}
              >
                {confirming ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.modalBtnText}>Xác nhận</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL VIEW IMPORT INVOICE DETAILS */}
      <Modal
        visible={detailModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.detailModalBox,
              { backgroundColor: colors.background },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.detailModalHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="document-text" size={22} color="#d97706" />
                  <ThemedText style={[styles.detailModalTitle, { color: colors.text }]}>
                    {selectedDetailInvoice?.maHoaDonNhap ||
                      selectedDetailInvoice?.ma_hoadon_nhap ||
                      selectedDetailInvoice?.MAHDNHAP ||
                      `HDN-#${selectedDetailInvoice?.id || ''}`}
                  </ThemedText>
                </View>
                <ThemedText style={{ fontSize: 12, opacity: 0.7, marginTop: 2, color: colors.text }}>
                  Ngày lập:{' '}
                  {formatDateOnly(
                    selectedDetailInvoice?.created_at ||
                    selectedDetailInvoice?.ngay_nhap ||
                    selectedDetailInvoice?.ngayNhap ||
                    new Date()
                  )}
                </ThemedText>
              </View>

              <TouchableOpacity
                onPress={() => setDetailModalOpen(false)}
                style={styles.closeModalBtn}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {loadingDetail ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#d97706" />
                <ThemedText style={{ marginTop: 10, opacity: 0.7 }}>
                  Đang tải toàn bộ dữ liệu đơn nhập...
                </ThemedText>
              </View>
            ) : selectedDetailInvoice ? (
              <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 1 }}>
                {/* Status Pill */}
                {(() => {
                  const isDone =
                    Number(selectedDetailInvoice.trangThai ?? selectedDetailInvoice.trang_thai ?? 0) ===
                      1 ||
                    selectedDetailInvoice.trang_thai === 'DA_NHAP' ||
                    selectedDetailInvoice.trang_thai === 'HOAN_TAT';
                  const sigInfo = parseSignatureStatus(selectedDetailInvoice);
                  return (
                    <View
                      style={[
                        styles.detailStatusBanner,
                        { backgroundColor: isDone ? '#DCFCE7' : '#FEF3C7' },
                      ]}
                    >
                      <Ionicons
                        name={isDone ? 'checkmark-circle' : 'time-outline'}
                        size={18}
                        color={isDone ? '#15803D' : '#B45309'}
                      />
                      <ThemedText
                        style={[
                          styles.detailStatusBannerText,
                          { color: isDone ? '#15803D' : '#B45309' },
                        ]}
                      >
                        {isDone
                          ? 'Đã nhập kho hoàn tất • Tồn kho đã ghi nhận'
                          : sigInfo.isSignatureCompleted
                          ? 'Đã đủ chữ ký số • Sẵn sàng nhập kho'
                          : 'Chờ duyệt / Ký số điện tử & Kiểm đếm'}
                      </ThemedText>
                    </View>
                  );
                })()}

                {/* Organization & Supplier Information */}
                <View style={[styles.detailSectionCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                  <ThemedText style={[styles.detailSectionHeading, { color: colors.text }]}>Thông tin phiếu nhập</ThemedText>

                  <View style={styles.detailInfoRow}>
                    <ThemedText style={[styles.detailInfoLabel, { color: colors.icon }]}>Nhà cung cấp:</ThemedText>
                    <ThemedText style={[styles.detailInfoVal, { color: colors.text }]}>
                      {selectedDetailInvoice.nhaCungCap?.tenNcc ||
                        selectedDetailInvoice.nhaCungCap?.TENNCC ||
                        selectedDetailInvoice.nha_cung_cap?.tenNcc ||
                        selectedDetailInvoice.nha_cung_cap?.TENNCC ||
                        selectedDetailInvoice.nhaCungCap?.tenNhaCungCap ||
                        nccList.find(n => String(n.id || n.MANCC) === String(selectedDetailInvoice.nhaCungCapId || selectedDetailInvoice.MANCC))?.tenNcc ||
                        nccList.find(n => String(n.id || n.MANCC) === String(selectedDetailInvoice.nhaCungCapId || selectedDetailInvoice.MANCC))?.TENNCC ||
                        'Công ty CP Bột Mì & Bơ Sữa'}
                    </ThemedText>
                  </View>

                  <View style={styles.detailInfoRow}>
                    <ThemedText style={[styles.detailInfoLabel, { color: colors.icon }]}>Chi nhánh nhận:</ThemedText>
                    <ThemedText style={[styles.detailInfoVal, { color: colors.text }]}>
                      {selectedDetailInvoice.cuaHang?.tenCuaHang ||
                        selectedDetailInvoice.cuaHang?.TENCUAHANG ||
                        selectedDetailInvoice.cua_hang?.tenCuaHang ||
                        selectedDetailInvoice.cua_hang?.TENCUAHANG ||
                        stores.find(s => String(s.id || s.MACUAHANG) === String(selectedDetailInvoice.cuaHangId || selectedDetailInvoice.MACUAHANG))?.tenCuaHang ||
                        stores.find(s => String(s.id || s.MACUAHANG) === String(selectedDetailInvoice.cuaHangId || selectedDetailInvoice.MACUAHANG))?.TENCUAHANG ||
                        `Chi nhánh ${selectedDetailInvoice.cuaHangId || selectedDetailInvoice.MACUAHANG || 1}`}
                    </ThemedText>
                  </View>

                  <View style={styles.detailInfoRow}>
                    <ThemedText style={[styles.detailInfoLabel, { color: colors.icon }]}>Người lập phiếu:</ThemedText>
                    <ThemedText style={[styles.detailInfoVal, { color: colors.text }]}>
                      {selectedDetailInvoice.nguoiNhap?.hoTen ||
                        selectedDetailInvoice.nguoiNhap?.HOTEN ||
                        selectedDetailInvoice.nguoi_nhap?.hoTen ||
                        selectedDetailInvoice.nguoi_nhap?.HOTEN ||
                        selectedDetailInvoice.nguoiNhap?.username ||
                        selectedDetailInvoice.nguoi_nhap?.username ||
                        profile?.fullName ||
                        (profile as any)?.hoTen ||
                        'Quản lý chi nhánh'}
                    </ThemedText>
                  </View>

                  {selectedDetailInvoice.ghiChu || selectedDetailInvoice.ghi_chu ? (
                    <View style={styles.detailInfoRow}>
                      <ThemedText style={[styles.detailInfoLabel, { color: colors.icon }]}>Ghi chú:</ThemedText>
                      <ThemedText style={[styles.detailInfoVal, { color: colors.text }]}>
                        {selectedDetailInvoice.ghiChu || selectedDetailInvoice.ghi_chu}
                      </ThemedText>
                    </View>
                  ) : null}
                </View>

                {/* Products line items */}
                <View style={[styles.detailSectionCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                  <ThemedText style={[styles.detailSectionHeading, { color: colors.text }]}>
                    Danh sách sản phẩm bánh (
                    {(selectedDetailInvoice.chiTiets || selectedDetailInvoice.chi_tiets || []).length} mặt hàng)
                  </ThemedText>

                  {(selectedDetailInvoice.chiTiets || selectedDetailInvoice.chi_tiets || []).map(
                    (it: any, itIdx: number) => {
                      const spName =
                        it.sanPham?.tenSanPham ||
                        it.san_pham?.tenSanPham ||
                        it.san_pham?.TENSP ||
                        `Bánh #${it.sanPhamId || it.san_pham_id || itIdx + 1}`;
                      const spImg = formatImageUrl(it.sanPham?.hinhAnh || it.san_pham?.hinhAnh || it.san_pham?.HINHANH);
                      const maLo =
                        it.loHang?.maLoHang ||
                        it.lo_hang?.maLoHang ||
                        it.lo_hang?.MALOHANG ||
                        it.maLoHang ||
                        '-';
                      const sl = it.soLuong ?? it.so_luong ?? it.SOLUONG ?? 0;
                      const donGia = Number(
                        it.donGiaNhap ?? it.don_gia_nhap ?? it.DONGIANHAP ?? 0
                      );
                      const thanhTien = Number(
                        it.thanhTien ?? it.thanh_tien ?? sl * donGia
                      );
                      const nsxVal = it.loHang?.ngaySanXuat || it.lo_hang?.ngaySanXuat || it.ngay_san_xuat;
                      const hsdVal = it.loHang?.hsd || it.lo_hang?.hsd || it.hsd;

                      return (
                        <View
                          key={it.id || itIdx}
                          style={[
                            styles.detailProductRow,
                            { borderBottomColor: colors.cardBorder },
                          ]}
                        >
                          <Image source={{ uri: spImg }} style={styles.detailProductImg} />
                          <View style={{ flex: 1 }}>
                            <ThemedText style={[styles.detailProductName, { color: colors.text }]}>{spName}</ThemedText>
                            <View style={styles.detailProductMeta}>
                              <ThemedText style={[styles.detailProductMetaText, { color: colors.text }]}>
                                Mã lô: <ThemedText style={{ fontWeight: '700', color: colors.text }}>{maLo}</ThemedText>
                              </ThemedText>
                              <ThemedText style={[styles.detailProductMetaText, { color: colors.text }]}>
                                • Số lượng: <ThemedText style={{ fontWeight: '700', color: '#d97706' }}>{sl} {it.sanPham?.donViTinh || 'cái'}</ThemedText>
                              </ThemedText>
                            </View>

                            <View style={styles.detailProductPriceRow}>
                              <ThemedText style={{ fontSize: 12, opacity: 0.7, color: colors.text }}>
                                Đơn giá: {donGia.toLocaleString('vi-VN')}₫
                              </ThemedText>
                              <ThemedText style={{ fontSize: 13, fontWeight: '700', color: '#15803D' }}>
                                = {thanhTien.toLocaleString('vi-VN')}₫
                              </ThemedText>
                            </View>

                            {(nsxVal || hsdVal) && (
                              <View style={styles.shelfLifeRow}>
                                {nsxVal ? (
                                  <View style={styles.shelfLifePill}>
                                    <ThemedText style={styles.shelfLifeText}>NSX: {formatDateOnly(nsxVal)}</ThemedText>
                                  </View>
                                ) : null}
                                {hsdVal ? (
                                  <View style={[styles.shelfLifePill, { backgroundColor: '#FEE2E2' }]}>
                                    <ThemedText style={[styles.shelfLifeText, { color: '#B91C1C' }]}>
                                      HSD: {formatDateOnly(hsdVal)}
                                    </ThemedText>
                                  </View>
                                ) : null}
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    }
                  )}

                  {/* Summary Total */}
                  <View style={styles.detailSummaryBox}>
                    <ThemedText style={styles.detailSummaryLabel}>Tổng giá trị đơn nhập:</ThemedText>
                    <ThemedText style={styles.detailSummaryTotal}>
                      {Number(
                        selectedDetailInvoice.tongTien ?? selectedDetailInvoice.tong_tien ?? selectedDetailInvoice.TONGTIEN ?? 0
                      ).toLocaleString('vi-VN')}
                      ₫
                    </ThemedText>
                  </View>
                </View>

                {/* Digital Signatures status list */}
                <View style={[styles.detailSectionCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                  <ThemedText style={styles.detailSectionHeading}>
                    Chứng thực chữ ký số nội bộ
                  </ThemedText>

                  {(() => {
                    const sigs = Array.isArray(
                      selectedDetailInvoice.chuKySos ||
                        selectedDetailInvoice.chu_ky_sos ||
                        selectedDetailInvoice.chu_ky_so
                    )
                      ? selectedDetailInvoice.chuKySos ||
                        selectedDetailInvoice.chu_ky_sos ||
                        selectedDetailInvoice.chu_ky_so
                      : [];

                    const roleLabels: Record<number, string> = {
                      1: 'Kế toán trưởng',
                      2: 'Nhân viên quản lý kho',
                      3: 'Quản lý Chi nhánh (Ký duyệt chốt ngay)',
                      4: 'Đại diện Nhà cung cấp',
                    };

                    const roles = [3, 2, 1];

                    return roles.map((rId) => {
                      const slot = sigs.find(
                        (s: any) => Number(s.vaiTroKy || s.vai_tro_ky) === rId
                      );
                      const isSigned =
                        slot &&
                        (Number(slot.trangThai ?? slot.trang_thai ?? 0) === 1 ||
                          Boolean(slot.digitalSignatureHash || slot.digital_signature_hash));

                      return (
                        <View
                          key={rId}
                          style={[
                            styles.detailSigRow,
                            { backgroundColor: isSigned ? '#F0FDF4' : '#F8FAFC' },
                          ]}
                        >
                          <Ionicons
                            name={isSigned ? 'checkmark-circle' : 'time-outline'}
                            size={20}
                            color={isSigned ? '#16A34A' : '#94A3B8'}
                          />
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <ThemedText style={[styles.detailSigRole, isSigned && { color: '#16A34A' }]}>
                              {roleLabels[rId]}
                            </ThemedText>
                            <ThemedText style={styles.detailSigName}>
                              {isSigned
                                ? `Người ký: ${slot?.tenNguoiKy || slot?.nguoi_ky?.hoTen || 'Đã ký xác nhận'}`
                                : 'Đang chờ ký xác nhận'}
                            </ThemedText>
                            {isSigned && (slot?.ngayKy || slot?.ngay_ky) && (
                              <ThemedText style={styles.detailSigTime}>
                                Thời gian: {new Date(slot.ngayKy || slot.ngay_ky).toLocaleString('vi-VN')}
                              </ThemedText>
                            )}
                          </View>
                        </View>
                      );
                    });
                  })()}
                </View>
              </ScrollView>
            ) : null}

            {/* Footer Buttons */}
            <View style={styles.detailModalFooter}>
              {selectedDetailInvoice &&
                !(
                  Number(selectedDetailInvoice.trangThai ?? selectedDetailInvoice.trang_thai ?? 0) === 1 ||
                  selectedDetailInvoice.trang_thai === 'DA_NHAP' ||
                  selectedDetailInvoice.trang_thai === 'HOAN_TAT'
                ) &&
                (isManager || isWarehouse || isAdmin) && (
                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: '#059669', marginRight: 8 }]}
                    onPress={() => {
                      const target = selectedDetailInvoice;
                      setDetailModalOpen(false);
                      setSelectedInvoice(target);
                      setReceivedQty(String(target.tong_so_luong || 50));
                      setConfirmModalOpen(true);
                    }}
                  >
                    <Ionicons name="checkmark-done" size={16} color="#fff" style={{ marginRight: 4 }} />
                    <ThemedText style={styles.modalBtnText}>Đồng kiểm & Nhập kho</ThemedText>
                  </TouchableOpacity>
                )}

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#64748B' }]}
                onPress={() => setDetailModalOpen(false)}
              >
                <ThemedText style={styles.modalBtnText}>Đóng</ThemedText>
              </TouchableOpacity>
            </View>
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
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
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
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  headerTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    padding: 3,
  },
  headerTabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  headerTabActive: { backgroundColor: '#fff' },
  headerTabText: { color: '#fff', fontSize: 13 },
  directorNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
  },
  directorNoticeText: {
    color: '#FFF',
    fontSize: 12,
    flex: 1,
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
  card: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 14 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  codeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  codeText: { fontWeight: 'bold', fontSize: 14 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusPillText: { fontSize: 11, fontWeight: 'bold' },
  nccText: { fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  storeText: { fontSize: 12, marginBottom: 10 },
  sigSlotsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  sigSlotsHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  sigSlotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sigSlotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  sigSlotSigned: {
    backgroundColor: '#D1FAE5',
  },
  sigSlotText: {
    fontSize: 11,
    color: '#64748B',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    marginTop: 4,
  },
  amountLabel: { fontSize: 13 },
  amountValue: { fontSize: 14, fontWeight: 'bold', color: '#10b981' },
  actionRowButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  confirmBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  formCard: { borderRadius: 14, padding: 16, borderWidth: 1 },
  formSectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  choiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  choiceText: { fontSize: 13 },
  rowTwo: { flexDirection: 'row', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 12,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d97706',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 10,
    marginBottom: 14,
    gap: 6,
    backgroundColor: '#FFFBEB',
  },
  addItemBtnText: {
    color: '#d97706',
    fontWeight: '700',
    fontSize: 13,
  },
  addedItemsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  addedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  submitButton: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  submitText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 42 : 20,
    paddingBottom: 20,
  },
  modalBox: { borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 8 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  autoStoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  autoStoreBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  assignedStoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 6,
    gap: 10,
  },
  assignedStoreIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignedStoreName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 2,
  },
  assignedStoreAddr: {
    fontSize: 12,
    color: '#64748B',
  },
  lockedStorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  lockedStorePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  // DETAIL MODAL STYLES
  detailModalBox: {
    borderRadius: 20,
    padding: 16,
    width: '100%',
    maxHeight: '88%',
    display: 'flex',
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  detailModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 12,
  },
  detailModalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  closeModalBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  detailStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
    marginBottom: 12,
  },
  detailStatusBannerText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  detailSectionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  detailSectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  detailInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailInfoLabel: {
    fontSize: 12,
    width: 110,
  },
  detailInfoVal: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  detailProductRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  detailProductImg: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  detailProductName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 3,
  },
  detailProductMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  detailProductMetaText: {
    fontSize: 11,
    color: '#64748B',
  },
  detailProductPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  shelfLifeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  shelfLifePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  shelfLifeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  detailSummaryBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  detailSummaryLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  detailSummaryTotal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#B45309',
  },
  detailSigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  detailSigRole: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  detailSigName: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  detailSigTime: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  detailModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: 8,
  },
});
