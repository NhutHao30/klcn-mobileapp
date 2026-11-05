

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
import { useRouter, useFocusEffect } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { adminApi } from '@/services/api/adminApi';
import { useAuth } from '@/context/AuthContext';

export default function AdminSignatureApprovalScreen() {
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

  // Strict Role Mapping for Digital Signature
  const isAdmin = vaiTroId === 1 || (!vaiTroId && userRole === 0);
  const isManager = vaiTroId === 2 || userRole === 1;
  const isWarehouse = vaiTroId === 4;
  const isAccountant = vaiTroId === 7 || userRole === 6;
  const isDirector = vaiTroId === 8 || userRole === 5;

  // Map vaiTroId -> vaiTroKy:
  // vaiTroId = 2 (Quản lý CN) -> vaiTroKy = 3
  // vaiTroId = 4 (Nhân viên kho) -> vaiTroKy = 2
  // vaiTroId = 7 (Kế toán) -> vaiTroKy = 1
  // Admin & Giám đốc: Không tham gia ký chứng từ chi nhánh
  const currentUserSignSlot: 1 | 2 | 3 | null = isManager
    ? 3
    : isWarehouse
    ? 2
    : isAccountant
    ? 1
    : null;

  const getSignerRoleLabel = () => {
    if (isAdmin) return 'Quản trị viên Hệ thống (Không được phép ký số)';
    if (isDirector) return 'Ban Giám Đốc (Giám sát & phê duyệt yêu cầu nhập hàng)';
    if (isManager) return 'Quản lý Chi nhánh (Chốt duyệt hoàn tất ngay - Slot 3)';
    if (isWarehouse) return 'Nhân viên Kho (Ký xác nhận thực nhận - Slot 2)';
    if (isAccountant) return 'Nhân viên Kế toán (Ký đối soát tài chính - Slot 1)';
    return 'Nhân sự nội bộ';
  };

  const [activeTab, setActiveTab] = useState<'PENDING' | 'SIGNED'>('PENDING');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [signedList, setSignedList] = useState<any[]>([]);

  // Signing Modal State
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [signing, setSigning] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getPendingSignatures();
      const rawData = res?.data || res;
      const hdNhapPending = Array.isArray(res?.hd_nhap?.pending)
        ? res.hd_nhap.pending
        : (Array.isArray(rawData?.hd_nhap?.pending) ? rawData.hd_nhap.pending : (Array.isArray(rawData?.hd_nhap) ? rawData.hd_nhap : []));
      const bbHuyPending = Array.isArray(res?.bien_ban_huy?.pending)
        ? res.bien_ban_huy.pending
        : (Array.isArray(rawData?.bien_ban_huy?.pending) ? rawData.bien_ban_huy.pending : (Array.isArray(rawData?.bien_ban_huy) ? rawData.bien_ban_huy : []));
      const hdNhapSigned = Array.isArray(res?.hd_nhap?.signed)
        ? res.hd_nhap.signed
        : (Array.isArray(rawData?.hd_nhap?.signed) ? rawData.hd_nhap.signed : []);
      const bbHuySigned = Array.isArray(res?.bien_ban_huy?.signed)
        ? res.bien_ban_huy.signed
        : (Array.isArray(rawData?.bien_ban_huy?.signed) ? rawData.bien_ban_huy.signed : []);

      const pCombined = [
        ...hdNhapPending.map((x: any) => ({
          ...x,
          doc_type: 'hdnhap',
          type_label: 'Hóa đơn nhập kho',
        })),
        ...bbHuyPending.map((x: any) => ({
          ...x,
          doc_type: 'bien_ban_huy',
          type_label: 'Biên bản hủy hàng',
        })),
      ];

      const sCombined = [
        ...hdNhapSigned.map((x: any) => ({
          ...x,
          doc_type: 'hdnhap',
          type_label: 'Hóa đơn nhập kho',
        })),
        ...bbHuySigned.map((x: any) => ({
          ...x,
          doc_type: 'bien_ban_huy',
          type_label: 'Biên bản hủy hàng',
        })),
      ];

      setPendingList(pCombined);
      setSignedList(sCombined);
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

  // Inspect existing signatures on a document
  const getDocSignatureStatus = (doc: any) => {
    const sigs = Array.isArray(doc.slots || doc.chu_ky_sos || doc.chuKySos || doc.chu_ky_so || doc.chu_kys || doc.signatures)
      ? doc.slots || doc.chu_ky_sos || doc.chuKySos || doc.chu_ky_so || doc.chu_kys || doc.signatures
      : [];

    const hasManagerSigned =
      Boolean(doc.da_ky_quan_ly || doc.quan_ly_signed || doc.KY_GIAM_DOC || doc.KY_QUAN_LY) ||
      sigs.some(
        (s: any) =>
          (Number(s.vai_tro_ky || s.vaiTroKy) === 3 || s.vai_tro === 'QUAN_LY') &&
          Number(s.trangThai ?? s.trang_thai) === 1
      );
    const hasWarehouseSigned =
      Boolean(doc.da_ky_kho || doc.thu_kho_signed || doc.KY_THU_KHO) ||
      sigs.some(
        (s: any) =>
          (Number(s.vai_tro_ky || s.vaiTroKy) === 2 || s.vai_tro === 'THU_KHO') &&
          Number(s.trangThai ?? s.trang_thai) === 1
      );
    const hasAccountantSigned =
      Boolean(doc.da_ky_ke_toan || doc.ke_toan_signed || doc.KY_KE_TOAN) ||
      sigs.some(
        (s: any) =>
          (Number(s.vai_tro_ky || s.vaiTroKy) === 1 || s.vai_tro === 'KE_TOAN') &&
          Number(s.trangThai ?? s.trang_thai) === 1
      );

    // Rule: Completed immediately if Manager signed, OR if both Warehouse + Accountant signed
    const isCompleted =
      Boolean(doc.TRANGTHAI === 1 || doc.trangThai === 1 || doc.is_fully_signed) ||
      hasManagerSigned ||
      (hasWarehouseSigned && hasAccountantSigned) ||
      activeTab === 'SIGNED';

    // Check if the current user's slot is already signed
    const isCurrentSlotSigned =
      (currentUserSignSlot === 3 && hasManagerSigned) ||
      (currentUserSignSlot === 2 && hasWarehouseSigned) ||
      (currentUserSignSlot === 1 && hasAccountantSigned);

    return {
      hasManagerSigned,
      hasWarehouseSigned,
      hasAccountantSigned,
      isCompleted,
      isCurrentSlotSigned,
    };
  };

  const handleSignConfirm = async () => {
    if (!selectedDoc) return;
    if (isAdmin || isDirector) {
      Alert.alert(
        'Từ chối truy cập',
        isAdmin
          ? 'Role Admin không được phép tham gia vào việc ký duyệt chứng từ theo quy định bảo mật.'
          : 'Ban Giám Đốc chỉ giám sát và duyệt yêu cầu nhập hàng, không trực tiếp ký chứng từ chi nhánh.'
      );
      return;
    }

    try {
      setSigning(true);
      await adminApi.signDocument({
        loai_tai_lieu: selectedDoc.doc_type,
        tai_lieu_id: selectedDoc.id || selectedDoc.MAHDNHAP || selectedDoc.MABB,
        pin: '123456',
      });

      Alert.alert(
        'Ký số thành công',
        isManager
          ? 'Quản lý chi nhánh đã ký số! Chứng từ đã được hoàn tất ngay lập tức.'
          : 'Đã ghi nhận chữ ký số điện tử của bạn vào chứng từ thành công!'
      );
      setSignModalOpen(false);
      loadData();
    } catch (e: any) {
      Alert.alert('Lỗi ký số', e?.response?.data?.message || 'Không thể ký số tài liệu.');
    } finally {
      setSigning(false);
    }
  };

  const currentList = activeTab === 'PENDING' ? pendingList : signedList;

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: '#d97706' }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <ThemedText style={styles.headerTitle}>Duyệt & Ký Số Biên Bản</ThemedText>
          </View>
          <TouchableOpacity onPress={() => router.push('/(admin)/profile')} style={styles.backButton}>
            <Ionicons name="create-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* TABS */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'PENDING' && styles.tabActive]}
            onPress={() => setActiveTab('PENDING')}
          >
            <ThemedText
              style={[
                styles.tabText,
                activeTab === 'PENDING' && { color: '#d97706', fontWeight: 'bold' },
              ]}
            >
              Chờ duyệt ký ({pendingList.length})
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'SIGNED' && styles.tabActive]}
            onPress={() => setActiveTab('SIGNED')}
          >
            <ThemedText
              style={[
                styles.tabText,
                activeTab === 'SIGNED' && { color: '#d97706', fontWeight: 'bold' },
              ]}
            >
              Đã hoàn tất ký ({signedList.length})
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
        {/* SECURITY NOTICE IF LOGGED IN AS ADMIN */}
        {isAdmin && (
          <View style={styles.adminForbiddenBox}>
            <Ionicons name="lock-closed" size={24} color="#DC2626" />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.adminForbiddenTitle}>
                Cảnh báo phân quyền bảo mật
              </ThemedText>
              <ThemedText style={styles.adminForbiddenDesc}>
                Role Admin không được phép tham gia vào việc ký duyệt chứng từ. Chỉ Quản lý chi
                nhánh, Nhân viên kho và Nhân viên kế toán mới có thẩm quyền ký số nghiệp vụ.
              </ThemedText>
            </View>
          </View>
        )}

        {/* MULTI-PARTY SIGNATURE RULE BANNER */}
        <View style={styles.ruleCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Ionicons name="shield-checkmark" size={18} color="#7C3AED" />
            <ThemedText style={styles.ruleTitle}>Quy định Ký số Điện tử Nội bộ:</ThemedText>
          </View>
          <ThemedText style={styles.ruleBody}>
            Nếu <ThemedText style={{ fontWeight: '800', color: '#4C1D95' }}>Quản lý chi nhánh</ThemedText>{' '}
            đã ký duyệt thì hoàn tất ngay. Nếu không có Quản lý chi nhánh thì cần đủ chữ ký của{' '}
            <ThemedText style={{ fontWeight: '800', color: '#4C1D95' }}>Nhân viên kho</ThemedText>{' '}
            và{' '}
            <ThemedText style={{ fontWeight: '800', color: '#4C1D95' }}>Nhân viên kế toán</ThemedText>.
          </ThemedText>
          <View style={styles.roleSlotPill}>
            <Ionicons name="person-circle-outline" size={15} color="#6D28D9" />
            <ThemedText style={styles.roleSlotPillText}>
              Vai trò của bạn: {getSignerRoleLabel()}
            </ThemedText>
          </View>
        </View>

        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#d97706" />
            <ThemedText style={{ marginTop: 12, opacity: 0.6 }}>
              Đang kiểm tra văn bản chờ ký...
            </ThemedText>
          </View>
        ) : currentList.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Ionicons
              name="shield-checkmark-outline"
              size={56}
              color={colors.cardTextSecondary}
            />
            <ThemedText style={{ marginTop: 12, fontSize: 16, fontWeight: 'bold' }}>
              {activeTab === 'PENDING' ? 'Không có văn bản nào cần ký' : 'Chưa có văn bản đã ký'}
            </ThemedText>
            <ThemedText style={{ marginTop: 4, opacity: 0.6, textAlign: 'center' }}>
              Tất cả biên bản nhập kho và hủy hàng đều đã được xử lý theo quy định.
            </ThemedText>
          </View>
        ) : (
          currentList.map((doc, idx) => {
            const isHdNhap = doc.doc_type === 'hdnhap';
            const code = doc.so_hoa_don || doc.so_bien_ban || doc.maBienBan || doc.maHoaDonNhap || doc.MABB || doc.MAHDNHAP || `VB-#${doc.id || idx + 1}`;
            const creator = doc.nguoi_tao?.ho_ten || doc.nguoi_lap?.hoTen || doc.nguoi_lap?.HOTEN || doc.nguoiLap?.hoTen || 'Nhân viên kho';
            const store =
              doc.cua_hang?.TENCUAHANG || doc.cua_hang?.ten_cua_hang || doc.cuahang?.TENCUAHANG || doc.cuaHang?.tenCuaHang || 'Chi nhánh Givral Bakery';
            const total =
              Number(doc.tong_tien || doc.tong_gia_tri_huy || doc.TONGTIEN || doc.TONGGIATRI_HUY || 0).toLocaleString('vi-VN') + 'đ';

            const sigState = getDocSignatureStatus(doc);

            return (
              <View
                key={String(doc.id || idx)}
                style={[
                  styles.docCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
                ]}
              >
                <View style={styles.docHeader}>
                  <View
                    style={[
                      styles.typeBadge,
                      { backgroundColor: isHdNhap ? '#eff6ff' : '#fef2f2' },
                    ]}
                  >
                    <Ionicons
                      name={isHdNhap ? 'file-tray-full-outline' : 'trash-bin-outline'}
                      size={14}
                      color={isHdNhap ? '#2563eb' : '#dc2626'}
                    />
                    <ThemedText
                      style={[styles.typeText, { color: isHdNhap ? '#2563eb' : '#dc2626' }]}
                    >
                      {doc.type_label}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.codeText}>{code}</ThemedText>
                </View>

                <ThemedText style={styles.creatorText}>Người lập: {creator}</ThemedText>
                <ThemedText style={[styles.storeText, { color: colors.cardTextSecondary }]}>
                  <Ionicons
                    name="storefront-outline"
                    size={13}
                    color={colors.cardTextSecondary}
                  />{' '}
                  {store}
                </ThemedText>

                {/* 3 SIGNATURE SLOTS GRID */}
                <View style={styles.slotsContainer}>
                  <ThemedText style={styles.slotsLabel}>
                    3 ô chữ ký chứng từ (Quản lý CN chốt ngay HOẶC Kho + Kế toán):
                  </ThemedText>

                  <View style={styles.slotsGrid}>
                    {/* Slot 3: Quản lý CN */}
                    <View
                      style={[
                        styles.slotCard,
                        sigState.hasManagerSigned && styles.slotCardSigned,
                        currentUserSignSlot === 3 && styles.slotCardCurrentRole,
                      ]}
                    >
                      <Ionicons
                        name={
                          sigState.hasManagerSigned ? 'checkmark-circle' : 'ribbon-outline'
                        }
                        size={18}
                        color={sigState.hasManagerSigned ? '#059669' : '#7C3AED'}
                      />
                      <ThemedText style={styles.slotRoleTitle}>Quản lý CN</ThemedText>
                      <ThemedText
                        style={[
                          styles.slotStatusSub,
                          { color: sigState.hasManagerSigned ? '#059669' : '#64748B' },
                        ]}
                      >
                        {sigState.hasManagerSigned ? 'Đã ký (Hoàn tất)' : 'Ký là hoàn tất ngay'}
                      </ThemedText>
                    </View>

                    {/* Slot 2: Nhân viên Kho */}
                    <View
                      style={[
                        styles.slotCard,
                        sigState.hasWarehouseSigned && styles.slotCardSigned,
                        currentUserSignSlot === 2 && styles.slotCardCurrentRole,
                      ]}
                    >
                      <Ionicons
                        name={
                          sigState.hasWarehouseSigned ? 'checkmark-circle' : 'cube-outline'
                        }
                        size={18}
                        color={sigState.hasWarehouseSigned ? '#059669' : '#0284C7'}
                      />
                      <ThemedText style={styles.slotRoleTitle}>Nhân viên Kho</ThemedText>
                      <ThemedText
                        style={[
                          styles.slotStatusSub,
                          { color: sigState.hasWarehouseSigned ? '#059669' : '#64748B' },
                        ]}
                      >
                        {sigState.hasWarehouseSigned ? 'Đã ký số' : 'Chờ ký kho'}
                      </ThemedText>
                    </View>

                    {/* Slot 1: Kế toán */}
                    <View
                      style={[
                        styles.slotCard,
                        sigState.hasAccountantSigned && styles.slotCardSigned,
                        currentUserSignSlot === 1 && styles.slotCardCurrentRole,
                      ]}
                    >
                      <Ionicons
                        name={
                          sigState.hasAccountantSigned ? 'checkmark-circle' : 'calculator-outline'
                        }
                        size={18}
                        color={sigState.hasAccountantSigned ? '#059669' : '#D97706'}
                      />
                      <ThemedText style={styles.slotRoleTitle}>Kế toán</ThemedText>
                      <ThemedText
                        style={[
                          styles.slotStatusSub,
                          { color: sigState.hasAccountantSigned ? '#059669' : '#64748B' },
                        ]}
                      >
                        {sigState.hasAccountantSigned ? 'Đã ký số' : 'Chờ ký kế toán'}
                      </ThemedText>
                    </View>
                  </View>
                </View>

                <View style={styles.amountRow}>
                  <ThemedText style={[styles.amountLabel, { color: colors.cardTextSecondary }]}>
                    Giá trị chứng từ:
                  </ThemedText>
                  <ThemedText style={styles.amountValue}>{total}</ThemedText>
                </View>

                {activeTab === 'PENDING' && !sigState.isCompleted ? (
                  isAdmin ? (
                    <View style={styles.disabledAdminBtn}>
                      <Ionicons name="ban-outline" size={16} color="#DC2626" />
                      <ThemedText style={styles.disabledAdminBtnText}>
                        Role Admin không được phép ký duyệt chứng từ
                      </ThemedText>
                    </View>
                  ) : sigState.isCurrentSlotSigned ? (
                    <View style={styles.alreadySignedSlotTag}>
                      <Ionicons name="checkmark-done-circle" size={16} color="#0284C7" />
                      <ThemedText style={styles.alreadySignedSlotText}>
                        Bạn đã ký ô của mình • Đang chờ bên còn lại ký hoàn tất
                      </ThemedText>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.signBtn, { backgroundColor: '#d97706' }]}
                      onPress={() => {
                        setSelectedDoc(doc);
                        setSignModalOpen(true);
                      }}
                    >
                      <Ionicons
                        name="finger-print-outline"
                        size={18}
                        color="#fff"
                        style={{ marginRight: 6 }}
                      />
                      <ThemedText style={styles.signBtnText}>
                        {isManager
                          ? 'Ký Duyệt Quản Lý CN (Hoàn tất ngay)'
                          : isWarehouse
                          ? 'Ký Số Xác Nhận Kho (Slot Kho)'
                          : isAccountant
                          ? 'Ký Số Đối Soát (Slot Kế Toán)'
                          : 'Ký Duyệt Văn Bản'}
                      </ThemedText>
                    </TouchableOpacity>
                  )
                ) : (
                  <View style={styles.signedTag}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#059669"
                      style={{ marginRight: 4 }}
                    />
                    <ThemedText style={styles.signedText}>
                      Đã hoàn tất hiệu lực ký số
                    </ThemedText>
                  </View>
                )}
              </View>
            );
          })
        )}
        <View style={{ height: 60 }} />
      </ScrollView>

      {/* SIGN CONFIRM MODAL */}
      <Modal visible={signModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.background }]}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View style={[styles.signIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="finger-print" size={32} color="#d97706" />
              </View>
              <ThemedText style={styles.modalTitle}>Xác nhận Ký Số Điện Tử Nội Bộ</ThemedText>
              <ThemedText style={{ fontSize: 13, opacity: 0.75, textAlign: 'center', marginTop: 2 }}>
                Chứng từ:{' '}
                <ThemedText style={{ fontWeight: '700' }}>
                  {selectedDoc?.so_hoa_don || selectedDoc?.so_bien_ban || selectedDoc?.maBienBan || selectedDoc?.maHoaDonNhap || 'Văn bản chứng từ'}
                </ThemedText>
              </ThemedText>
              <ThemedText
                style={{
                  fontSize: 12,
                  color: '#d97706',
                  fontWeight: '700',
                  marginTop: 4,
                  textAlign: 'center',
                }}
              >
                {getSignerRoleLabel()}
              </ThemedText>
            </View>

            <View style={{ backgroundColor: colors.cardBg || (colors.background === '#ffffff' ? '#f8fafc' : '#1e293b'), padding: 12, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: colors.icon + '20' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <ThemedText style={{ fontSize: 12, color: colors.icon }}>Người thực hiện ký:</ThemedText>
                <ThemedText style={{ fontSize: 12, fontWeight: '700' }}>{user?.nguoidung?.hoTen || user?.HOTEN || (user as any)?.hoten || user?.username || 'Nhân sự chi nhánh'}</ThemedText>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <ThemedText style={{ fontSize: 12, color: colors.icon }}>Loại tài liệu:</ThemedText>
                <ThemedText style={{ fontSize: 12, fontWeight: '600' }}>{selectedDoc?.type_label || (selectedDoc?.doc_type === 'bien_ban_huy' ? 'Biên bản hủy hàng' : 'Hóa đơn nhập kho')}</ThemedText>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <ThemedText style={{ fontSize: 12, color: colors.icon }}>Phương thức:</ThemedText>
                <ThemedText style={{ fontSize: 12, color: '#16a34a', fontWeight: '700' }}>Chứng thư số điện tử nội bộ</ThemedText>
              </View>
            </View>

            <ThemedText style={{ fontSize: 12, color: colors.icon, textAlign: 'center', marginBottom: 16 }}>
              Bằng việc bấm xác nhận, bạn cam kết đã kiểm đếm thực tế và chịu trách nhiệm pháp lý nội bộ đối với chứng từ này.
            </ThemedText>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#94a3b8' }]}
                onPress={() => setSignModalOpen(false)}
              >
                <ThemedText style={styles.modalBtnText}>Hủy</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#d97706' }]}
                onPress={handleSignConfirm}
                disabled={signing}
              >
                {signing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.modalBtnText}>Ký Xác Nhận</ThemedText>
                )}
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
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    padding: 3,
  },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#fff' },
  tabText: { color: '#fff', fontSize: 13 },
  adminForbiddenBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#DC2626',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    gap: 12,
  },
  adminForbiddenTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991B1B',
    marginBottom: 2,
  },
  adminForbiddenDesc: {
    fontSize: 12,
    color: '#B91C1C',
    lineHeight: 17,
  },
  ruleCard: {
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  ruleTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#5B21B6',
  },
  ruleBody: {
    fontSize: 12,
    color: '#4C1D95',
    lineHeight: 18,
  },
  roleSlotPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  roleSlotPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5B21B6',
  },
  docCard: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 14 },
  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  typeText: { fontSize: 11, fontWeight: 'bold' },
  codeText: { fontWeight: 'bold', fontSize: 14 },
  creatorText: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  storeText: { fontSize: 12, marginBottom: 10 },
  slotsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  slotsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  slotsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  slotCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  slotCardSigned: {
    backgroundColor: '#ECFDF5',
    borderColor: '#6EE7B7',
  },
  slotCardCurrentRole: {
    borderWidth: 1.5,
    borderColor: '#7C3AED',
  },
  slotRoleTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 4,
    textAlign: 'center',
  },
  slotStatusSub: {
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '600',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
  },
  amountLabel: { fontSize: 13 },
  amountValue: { fontSize: 14, fontWeight: 'bold', color: '#d97706' },
  signBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 11,
    borderRadius: 10,
  },
  signBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  disabledAdminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    gap: 6,
  },
  disabledAdminBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  alreadySignedSlotTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#E0F2FE',
    gap: 6,
  },
  alreadySignedSlotText: {
    color: '#0369A1',
    fontSize: 11,
    fontWeight: '700',
  },
  signedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#d1fae5',
  },
  signedText: { color: '#059669', fontSize: 12, fontWeight: 'bold' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: { borderRadius: 16, padding: 20 },
  signIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 4 },
  pinInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 6,
    marginBottom: 12,
  },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
