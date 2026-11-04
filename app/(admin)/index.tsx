import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Modal,
  Platform,
  TextInput,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { adminApi } from '@/services/api/adminApi';
import { useAuth } from '@/context/AuthContext';

const { width } = Dimensions.get('window');

interface UtilityItem {
  id: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bgColor: string;
  group: 'SALES' | 'WAREHOUSE' | 'SIGN' | 'CSKH' | 'SYSTEM';
  visible: boolean;
  badgeCount?: number;
}

export default function AdminDashboardScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [refreshing, setRefreshing] = useState(false);
  const [revenue, setRevenue] = useState('0đ');
  const [orderCount, setOrderCount] = useState(0);
  const [warningBatchCount, setWarningBatchCount] = useState(0);
  const [pendingSignCount, setPendingSignCount] = useState(0);

  const [selectedStore, setSelectedStore] = useState<any>({
    MACUAHANG: 1,
    TENCUAHANG: 'Chi nhánh Quận 1',
  });
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [storesList, setStoresList] = useState<any[]>([]);

  // VNeID Modals
  const [showIdCardModal, setShowIdCardModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditFavModal, setShowEditFavModal] = useState(false);
  const [selectedGroupModal, setSelectedGroupModal] = useState<string | null>(null);
  const [activeGroupFilter, setActiveGroupFilter] = useState<string>('ALL');

  const { user, profile, role } = useAuth();
  const vaiTroId = Number(
    user?.vaiTroId || user?.role_id || (user?.vaitro ? user?.vaitro.id : 0) || profile?.roleId || 0
  );
  const userRole = Number(
    user?.MAROLE !== undefined ? user?.MAROLE : user?.QUYEN !== undefined ? user?.QUYEN : role
  );

  // Strict role checks: Note that Admin is vaiTroId === 1 (or legacy userRole === 0 when vaiTroId is not set)
  const isAdmin = vaiTroId === 1 || (!vaiTroId && userRole === 0);
  const isDirector = vaiTroId === 8 || userRole === 5;
  const isManager = vaiTroId === 2 || userRole === 1;
  const isCashier = vaiTroId === 3;
  const isWarehouse = vaiTroId === 4;
  const isCskh = vaiTroId === 5 || userRole === 4;
  const isAccountant = vaiTroId === 7 || userRole === 6;
  const canSign = !isAdmin && (isManager || isWarehouse || isAccountant || isDirector);

  const getRoleTitle = () => {
    if (isAdmin) return 'Quản trị viên Hệ thống';
    if (isDirector) return 'Ban Giám Đốc';
    if (isManager) return 'Quản lý Chi nhánh';
    if (isCashier) return 'Nhân viên Bán hàng (POS)';
    if (isWarehouse) return 'Nhân viên Kho';
    if (isAccountant) return 'Kế toán';
    if (isCskh) return 'Chăm sóc Khách hàng';
    return profile?.roleLabel || 'Nhân viên Nội bộ';
  };

  const displayName = (
    user?.HOTEN ||
    profile?.fullName ||
    user?.name ||
    user?.USERNAME ||
    user?.username ||
    'QUẢN TRỊ VIÊN'
  ).toUpperCase();

  const staffUsername = user?.USERNAME || user?.username || profile?.username || 'NV-GIVRAL-01';

  // All utilities configured with strict role rules
  const allUtilities: UtilityItem[] = useMemo(
    () => [
      // SALES GROUP (Ẩn với Admin)
      {
        id: 'invoices',
        title: 'Hóa Đơn\nBán Hàng',
        shortTitle: 'Hóa Đơn Bán Hàng',
        subtitle: 'Đơn POS, Online & Hoàn tiền',
        route: '/(admin)/invoices',
        icon: 'receipt-outline',
        iconColor: '#d97706',
        bgColor: '#FEF3C7',
        group: 'SALES',
        visible: isDirector || isManager || isCashier || isAccountant || isCskh,
        badgeCount: orderCount > 0 ? orderCount : undefined,
      },
      {
        id: 'pre-orders',
        title: 'Đặt Bánh\nTrước',
        shortTitle: 'Đặt Bánh Trước',
        subtitle: 'Bánh sinh nhật & sự kiện',
        route: '/(admin)/pre-orders',
        icon: 'calendar-outline',
        iconColor: '#B45309',
        bgColor: '#FEF3C7',
        group: 'SALES',
        visible: !isAdmin && (isDirector || isManager || isCashier),
      },
      {
        id: 'scanner',
        title: 'Quét QR &\nBán Hàng POS',
        shortTitle: 'Quét QR & Bán Hàng POS',
        subtitle: 'Máy tính tiền & Quét lô bánh',
        route: '/(admin)/scanner',
        icon: 'qr-code-outline',
        iconColor: '#047857',
        bgColor: '#D1FAE5',
        group: 'SALES',
        visible: !isAdmin && (isDirector || isManager || isCashier || isWarehouse),
      },
      // WAREHOUSE & BATCH GROUP (Ẩn với Admin)
      {
        id: 'import-batch',
        title: 'Nhập Lô\nHàng Mới',
        shortTitle: 'Nhập Lô Hàng',
        subtitle: isDirector ? 'Duyệt yêu cầu nhập hàng' : 'Lập phiếu & Đồng kiểm kho',
        route: '/(admin)/import-batch',
        icon: 'arrow-down-circle-outline',
        iconColor: '#0284C7',
        bgColor: '#E0F2FE',
        group: 'WAREHOUSE',
        visible: !isAdmin && (isManager || isWarehouse || isAccountant || isDirector),
      },
      {
        id: 'batches',
        title: 'Lô Bánh &\nCảnh Báo HSD',
        shortTitle: 'Lô Hàng & HSD',
        subtitle: 'Theo dõi cận hạn & tồn lô',
        route: '/(admin)/batches',
        icon: 'cube-outline',
        iconColor: '#DC2626',
        bgColor: '#FEE2E2',
        group: 'WAREHOUSE',
        visible: !isAdmin && (isDirector || isManager || isWarehouse || isAccountant),
        badgeCount: warningBatchCount > 0 ? warningBatchCount : undefined,
      },
      {
        id: 'inventory',
        title: 'Tồn Kho &\nChuyển Kho',
        shortTitle: 'Tồn & Chuyển Kho',
        subtitle: 'Sổ cái & Điều chuyển CN',
        route: '/(admin)/inventory',
        icon: 'swap-horizontal-outline',
        iconColor: '#EA580C',
        bgColor: '#FFEDD5',
        group: 'WAREHOUSE',
        visible: !isAdmin && (isDirector || isManager || isWarehouse || isAccountant),
      },
      {
        id: 'disposal',
        title: 'Biên Bản\nHủy Hàng',
        shortTitle: 'Biên Bản Hủy',
        subtitle: 'Xử lý bánh hết hạn & hư hỏng',
        route: '/(admin)/disposal',
        icon: 'trash-outline',
        iconColor: '#B91C1C',
        bgColor: '#FEF2F2',
        group: 'WAREHOUSE',
        visible: !isAdmin && (isDirector || isManager || isWarehouse || isAccountant),
      },
      {
        id: 'products',
        title: 'Sản Phẩm\nMenu Bánh',
        shortTitle: 'Sản Phẩm Bánh',
        subtitle: 'Danh sách bánh & Giá bán',
        route: '/(admin)/products',
        icon: 'fast-food-outline',
        iconColor: '#D97706',
        bgColor: '#FEF3C7',
        group: 'WAREHOUSE',
        visible: !isAdmin && (isDirector || isManager || isWarehouse || isCashier),
      },
      {
        id: 'categories',
        title: 'Danh Mục\nLoại Bánh',
        shortTitle: 'Loại Bánh',
        subtitle: 'Phân nhóm sản phẩm',
        route: '/(admin)/categories',
        icon: 'pricetags-outline',
        iconColor: '#0369A1',
        bgColor: '#E0F2FE',
        group: 'WAREHOUSE',
        visible: !isAdmin && (isDirector || isManager),
      },
      // DIGITAL SIGNATURE GROUP (Ẩn với Admin)
      {
        id: 'signature-approval',
        title: 'Duyệt &\nKý Số Điện Tử',
        shortTitle: 'Duyệt & Ký Số Biên Bản',
        subtitle: 'Ký số đa bên (QLCN / Kho + KT)',
        route: '/(admin)/signature-approval',
        icon: 'finger-print-outline',
        iconColor: '#7C3AED',
        bgColor: '#EDE9FE',
        group: 'SIGN',
        visible: !isAdmin && canSign,
        badgeCount: pendingSignCount > 0 ? pendingSignCount : undefined,
      },
      // CSKH GROUP
      {
        id: 'reviews',
        title: 'Đánh Giá\nSản Phẩm',
        shortTitle: 'Quản Lý Đánh Giá CSKH',
        subtitle: 'Phản hồi & Ẩn/Hiện đánh giá',
        route: '/(admin)/reviews',
        icon: 'star-half-outline',
        iconColor: '#D97706',
        bgColor: '#FEF3C7',
        group: 'CSKH',
        visible: !isAdmin && (isDirector || isManager || isCskh),
      },
      {
        id: 'chat',
        title: 'Chat CSKH\nTrực Tuyến',
        shortTitle: 'Chat CSKH',
        subtitle: 'Tư vấn khách hàng 24/7',
        route: '/(admin)/chat',
        icon: 'chatbubbles-outline',
        iconColor: '#0284C7',
        bgColor: '#E0F2FE',
        group: 'CSKH',
        visible: !isAdmin && (isDirector || isManager || isCskh || isCashier),
      },
      {
        id: 'customers',
        title: 'Hồ Sơ\nKhách Hàng',
        shortTitle: 'Khách Hàng',
        subtitle: 'Thành viên & Tích điểm',
        route: '/(admin)/customers',
        icon: 'people-outline',
        iconColor: '#2563EB',
        bgColor: '#EFF6FF',
        group: 'CSKH',
        visible: !isAdmin && (isDirector || isManager || isCskh || isCashier),
      },
      {
        id: 'news',
        title: 'Tin Tức &\nKhuyến Mãi',
        shortTitle: 'Tin Tức & Sự Kiện',
        subtitle: 'Đăng bài & Bình luận',
        route: '/(admin)/news',
        icon: 'newspaper-outline',
        iconColor: '#EA580C',
        bgColor: '#FFEDD5',
        group: 'CSKH',
        visible: !isAdmin && (isDirector || isManager || isCskh),
      },
      {
        id: 'vouchers',
        title: 'Voucher\nGiảm Giá',
        shortTitle: 'Voucher Giảm Giá',
        subtitle: 'Chiến dịch mã ưu đãi',
        route: '/(admin)/vouchers',
        icon: 'ticket-outline',
        iconColor: '#BE185D',
        bgColor: '#FCE7F3',
        group: 'CSKH',
        visible: !isAdmin && (isDirector || isManager || isAccountant || isCskh),
      },
      // SYSTEM & OPERATIONS GROUP (CHỈ ADMIN MỚI ĐƯỢC TRUY CẬP)
      {
        id: 'reports',
        title: 'Báo Cáo &\nThống Kê Hủy',
        shortTitle: 'Báo Cáo & BI',
        subtitle: 'Doanh thu & Thống kê hủy đơn',
        route: '/(admin)/reports',
        icon: 'bar-chart-outline',
        iconColor: '#7E22CE',
        bgColor: '#F3E8FF',
        group: 'SYSTEM',
        visible: !isAdmin && (isDirector || isManager || isAccountant),
      },
      {
        id: 'system-monitor',
        title: 'Giám Sát\nKỹ Thuật',
        shortTitle: 'Giám Sát Hệ Thống',
        subtitle: 'Hiệu năng CPU/RAM & Lỗi',
        route: '/(admin)/system-monitor',
        icon: 'server-outline',
        iconColor: '#0284C7',
        bgColor: '#E0F2FE',
        group: 'SYSTEM',
        visible: isAdmin, // CHỈ ADMIN
      },
      {
        id: 'analytics',
        title: 'Phân Tích\nNgười Dùng',
        shortTitle: 'Phân Tích Người Dùng',
        subtitle: 'DAU/MAU & Tăng trưởng',
        route: '/(admin)/analytics',
        icon: 'pie-chart-outline',
        iconColor: '#059669',
        bgColor: '#ECFDF5',
        group: 'SYSTEM',
        visible: isAdmin, // CHỈ ADMIN
      },
      {
        id: 'attendance',
        title: 'Chấm Công',
        shortTitle: 'Chấm Công',
        subtitle: 'Điểm danh ca làm việc',
        route: '/(admin)/attendance',
        icon: 'id-card-outline',
        iconColor: '#15803D',
        bgColor: '#DCFCE7',
        group: 'SYSTEM',
        visible: !isAdmin, // CHỈ NHÂN VIÊN CỬA HÀNG (Ẩn với Admin)
      },
      {
        id: 'employees',
        title: 'Quản Trị\nNhân Sự',
        shortTitle: 'Nhân Viên',
        subtitle: 'Hồ sơ & Phân quyền NV',
        route: '/(admin)/employees',
        icon: 'briefcase-outline',
        iconColor: '#B45309',
        bgColor: '#FEF3C7',
        group: 'SYSTEM',
        visible: isAdmin, // CHỈ ADMIN
      },
      {
        id: 'stores',
        title: 'Hệ Thống\nChi Nhánh',
        shortTitle: 'Chi Nhánh Cửa Hàng',
        subtitle: 'Quản lý chuỗi cửa hàng',
        route: '/(admin)/stores',
        icon: 'business-outline',
        iconColor: '#059669',
        bgColor: '#ECFDF5',
        group: 'SYSTEM',
        visible: !isAdmin && isDirector,
      },
      {
        id: 'audit',
        title: 'Nhật Ký\nAudit Hệ Thống',
        shortTitle: 'Nhật Ký Audit',
        subtitle: 'Truy vết thao tác & IP',
        route: '/(admin)/audit',
        icon: 'shield-half-outline',
        iconColor: '#475569',
        bgColor: '#F1F5F9',
        group: 'SYSTEM',
        visible: isAdmin, // CHỈ ADMIN
      },
      {
        id: 'feature-lock',
        title: 'Khóa Bảo Trì\nTính Năng',
        shortTitle: 'Khóa Bảo Trì',
        subtitle: 'Đóng/mở module bảo trì',
        route: '/(admin)/feature-lock',
        icon: 'lock-closed-outline',
        iconColor: '#DC2626',
        bgColor: '#FEE2E2',
        group: 'SYSTEM',
        visible: isAdmin, // CHỈ ADMIN
      },
    ],
    [
      isAdmin,
      isDirector,
      isManager,
      isCashier,
      isWarehouse,
      isCskh,
      isAccountant,
      canSign,
      orderCount,
      warningBatchCount,
      pendingSignCount,
    ]
  );

  const permittedUtilities = useMemo(
    () => allUtilities.filter((u) => u.visible),
    [allUtilities]
  );

  // Favorite utility IDs theo vai trò Admin vs Nhân viên
  const defaultFavIds = useMemo(() => {
    if (isAdmin) {
      return ['system-monitor', 'analytics', 'audit', 'feature-lock', 'employees'];
    }
    return ['invoices', 'scanner', 'import-batch', 'signature-approval', 'batches', 'disposal', 'attendance', 'inventory'];
  }, [isAdmin]);

  const [favoriteIds, setFavoriteIds] = useState<string[]>(defaultFavIds);

  useEffect(() => {
    setFavoriteIds(defaultFavIds);
  }, [defaultFavIds]);

  const favoriteUtilities = useMemo(() => {
    const favs = permittedUtilities.filter((u) => favoriteIds.includes(u.id));
    return favs.length > 0 ? favs.slice(0, 6) : permittedUtilities.slice(0, 6);
  }, [permittedUtilities, favoriteIds]);

  // Service Groups (Nhóm dịch vụ theo vai trò)
  const serviceGroups = useMemo(() => {
    const groups = [
      {
        key: 'SALES',
        label: 'Nghiệp vụ\nbán hàng',
        icon: 'cart-outline' as const,
        visible: !isAdmin && (isDirector || isManager || isCashier || isAccountant),
      },
      {
        key: 'WAREHOUSE',
        label: 'Quản trị\nkho & lô',
        icon: 'cube-outline' as const,
        visible: !isAdmin && (isDirector || isManager || isWarehouse || isAccountant),
      },
      {
        key: 'SIGN',
        label: 'Duyệt &\nKý số',
        icon: 'finger-print-outline' as const,
        visible: !isAdmin && canSign,
      },
      {
        key: 'CSKH',
        label: 'Chăm sóc\nkhách hàng',
        icon: 'heart-circle-outline' as const,
        visible: !isAdmin && (isDirector || isManager || isCskh || isCashier),
      },
      {
        key: 'SYSTEM',
        label: 'Quản trị\nhệ thống',
        icon: 'shield-checkmark-outline' as const,
        ionIcon: 'shield-checkmark-outline' as const,
        visible: isAdmin,
      },
    ];
    return groups.filter((g) => g.visible);
  }, [isAdmin, isDirector, isManager, isCashier, isWarehouse, isCskh, isAccountant, canSign]);

  const loadDashboardData = async () => {
    try {
      const [resBi, resCanhBao, resSign, resStores] = await Promise.allSettled([
        adminApi.getBiDashboard(),
        adminApi.getCanhBaoHsd(),
        adminApi.getPendingSignatures(),
        adminApi.getAdminStores(),
      ]);

      if (resBi.status === 'fulfilled' && resBi.value) {
        const d = resBi.value;
        const rev = d.tong_doanh_thu ?? d.summary?.this_month ?? d.summary?.today ?? 0;
        setRevenue(`${(Number(rev) || 0).toLocaleString('vi-VN')}₫`);

        const ordCount =
          d.tong_don_hang ??
          (d.channel_stats?.pos?.count || 0) + (d.channel_stats?.online?.count || 0);
        setOrderCount(Number(ordCount) || 0);
      }

      if (resCanhBao.status === 'fulfilled' && resCanhBao.value) {
        const cb = resCanhBao.value;
        const data = cb?.data || cb;
        const totalW =
          cb?.tong_canh_bao ??
          ((data?.quoc_han?.length || 0) + (data?.sap_het_han?.length || 0) ||
            (Array.isArray(data) ? data.length : 0));
        setWarningBatchCount(Number(totalW) || 0);
      }

      if (resSign.status === 'fulfilled' && resSign.value) {
        const s = resSign.value;
        const totalP =
          s.total_pending ??
          ((s.data?.hd_nhap?.length || s.hd_nhap?.pending?.length || 0) +
            (s.data?.bien_ban_huy?.length || s.bien_ban_huy?.pending?.length || 0));
        setPendingSignCount(Number(totalP) || 0);
      }

      if (resStores.status === 'fulfilled') {
        const val = resStores.value;
        const list = Array.isArray(val) ? val : val?.data || [];
        if (list.length > 0) {
          setStoresList(list);
          const userStoreId = user?.nguoidung?.cuahang_id || user?.nhanvien?.cuahang_id;
          if (userStoreId) {
            const matched = list.find(
              (st: any) => Number(st.MACUAHANG || st.id) === Number(userStoreId)
            );
            if (matched) setSelectedStore(matched);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const nav = (route: string) => {
    router.push(route as any);
  };

  const toggleFavorite = (id: string) => {
    setFavoriteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredAllUtilities = useMemo(() => {
    if (activeGroupFilter === 'ALL') return permittedUtilities;
    return permittedUtilities.filter((u) => u.group === activeGroupFilter);
  }, [permittedUtilities, activeGroupFilter]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return permittedUtilities;
    return permittedUtilities.filter(
      (u) =>
        u.shortTitle.toLowerCase().includes(q) ||
        u.subtitle.toLowerCase().includes(q) ||
        u.title.toLowerCase().includes(q)
    );
  }, [permittedUtilities, searchQuery]);

  const groupModalItems = useMemo(() => {
    if (!selectedGroupModal) return [];
    return permittedUtilities.filter((u) => u.group === selectedGroupModal);
  }, [permittedUtilities, selectedGroupModal]);

  const qrCardUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&charset-source=UTF-8&data=${encodeURIComponent(
    JSON.stringify({
      app: 'GIVRAL_BAKERY',
      type: 'STAFF_ID',
      username: staffUsername,
      name: displayName,
      role: getRoleTitle(),
      store: selectedStore?.TENCUAHANG || 'Chi nhánh Givral',
    })
  )}`;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#d97706" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#d97706']} />
        }
        bounces={false}
      >
        {/* ==================== 1. TOP CRIMSON RED VNeID HEADER ==================== */}
        <View style={styles.crimsonHeader}>
          {/* Subtle decorative VNeID pattern circles */}
          <View style={styles.patternCircle1} />
          <View style={styles.patternCircle2} />
          <View style={styles.patternCircle3} />

          <SafeAreaView>
            <View style={styles.headerTopRow}>
              {/* Left: Circular user avatar (52x52) with gold/white border */}
              <TouchableOpacity
                style={styles.avatarRing}
                onPress={() => setShowIdCardModal(true)}
                activeOpacity={0.85}
              >
                <Image
                  source={{
                    uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      displayName
                    )}&background=d97706&color=FFFFFF&bold=true&size=128`,
                  }}
                  style={styles.avatarImg}
                />
                <View style={styles.verifiedMiniDot}>
                  <Ionicons name="checkmark" size={10} color="#fff" />
                </View>
              </TouchableOpacity>

              {/* Center: Level 2 Pill Badge + Bold Uppercase Name */}
              <TouchableOpacity
                style={styles.headerIdentityCenter}
                onPress={() => setShowIdCardModal(true)}
                activeOpacity={0.85}
              >
                <View style={styles.level2Pill}>
                  <ThemedText style={styles.level2PillText} numberOfLines={1}>
                    {getRoleTitle()}
                  </ThemedText>
                  <View style={styles.level2ShieldCircle}>
                    <Ionicons name="shield-checkmark" size={12} color="#d97706" />
                  </View>
                </View>
                <ThemedText style={styles.staffUpperName} numberOfLines={1}>
                  {displayName}
                </ThemedText>
              </TouchableOpacity>

              {/* Right: White circular search button */}
              <TouchableOpacity
                style={styles.searchCircleBtn}
                onPress={() => {
                  setSearchQuery('');
                  setShowSearchModal(true);
                }}
              >
                <Ionicons name="search" size={20} color="#d97706" />
              </TouchableOpacity>
            </View>

            {/* Two Cream-Gold Cards side-by-side inside bottom of crimson header */}
            <View style={styles.dualCreamCardsRow}>
              {/* Left Card: Mã QR Thẻ Nhân Viên */}
              <TouchableOpacity
                key="card-qr"
                style={styles.creamGoldCard}
                activeOpacity={0.85}
                onPress={() => setShowIdCardModal(true)}
              >
                <View style={styles.idCardMiniIllustration}>
                  <View style={styles.idCardMiniHeader} />
                  <View style={styles.idCardMiniBody}>
                    <Ionicons name="person" size={13} color="#d97706" />
                    <View style={{ flex: 1, marginLeft: 3, gap: 2 }}>
                      <View style={styles.idCardLine1} />
                      <View style={styles.idCardLine2} />
                    </View>
                  </View>
                </View>
                <ThemedText style={styles.creamCardTitle}>{'Mã QR\nThẻ Nhân Viên'}</ThemedText>
              </TouchableOpacity>

              {/* Right Card: Ký số cho role yêu cầu hoặc Chấm công cho role khác */}
              <TouchableOpacity
                key="card-action"
                style={styles.creamGoldCard}
                activeOpacity={0.85}
                onPress={() =>
                  canSign && pendingSignCount > 0
                    ? nav('/(admin)/signature-approval')
                    : nav('/(admin)/attendance')
                }
              >
                <View style={styles.greenEmblemBox}>
                  <View style={styles.emblemYellowRing}>
                    <Ionicons name={canSign ? "finger-print" : "time-outline"} size={14} color="#FACC15" />
                  </View>
                </View>
                <ThemedText style={styles.creamCardTitle}>
                  {canSign
                    ? pendingSignCount > 0
                      ? `Ký số ngay\n(${pendingSignCount} hồ sơ)`
                      : 'Ký số &\nPhê duyệt'
                    : 'Chấm công\nvào ca'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        {/* ==================== 2. MAIN WHITE ROUNDED BODY ==================== */}
        <View style={styles.whiteRoundedBody}>
          {/* 2.1 Nhóm dịch vụ (Service Groups) */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <ThemedText style={styles.vneidSectionTitle}>Nhóm dịch vụ</ThemedText>
              {activeGroupFilter !== 'ALL' && (
                <TouchableOpacity onPress={() => setActiveGroupFilter('ALL')}>
                  <ThemedText style={{ fontSize: 12, color: '#d97706', fontWeight: '700' }}>
                    Xem tất cả
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.serviceGroupsRow}
            >
              {serviceGroups.map((grp, idx) => {
                const isSelected = activeGroupFilter === grp.key;
                const iconName = (grp as any).ionIcon || grp.icon;
                return (
                  <TouchableOpacity
                    key={grp.key || ('grp-' + idx)}
                    style={styles.serviceGroupItem}
                    activeOpacity={0.8}
                    onPress={() => {
                      setActiveGroupFilter(grp.key);
                      setSelectedGroupModal(grp.key);
                    }}
                  >
                    <View style={styles.serviceCircleWrapper}>
                      <View
                        style={[
                          styles.serviceRedCircle,
                          isSelected && {
                            backgroundColor: '#7F1D1D',
                            borderWidth: 2,
                            borderColor: '#F59E0B',
                          },
                        ]}
                      >
                        <Ionicons name={iconName} size={26} color="#FFF" />
                      </View>
                      {/* "Mới" red pill badge */}
                      <View style={styles.moiPillBadge}>
                        <ThemedText style={styles.moiPillText}>Mới</ThemedText>
                      </View>
                    </View>
                    <ThemedText
                      style={[
                        styles.serviceGroupLabel,
                        isSelected && { color: '#d97706', fontWeight: '800' },
                      ]}
                    >
                      {grp.label}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          

          {/* 2.3 Featured Campaign Banner (QUẢN TRỊ SỐ GIVRAL BAKERY 2026) */}
          <View style={styles.campaignBanner}>
            <View style={styles.campaignPatternGlow} />
            <View style={styles.campaignTopFlex}>
              {/* Left Lotus/Star Emblem */}
              <View style={styles.campaignEmblemBox}>
                <View style={styles.campaignEmblemInner}>
                  <Ionicons name="sparkles" size={28} color="#FDE047" />
                </View>
                <ThemedText style={styles.campaignYearTag}>GIVRAL 2026</ThemedText>
              </View>

              {/* Right Title & Live Summary Pills */}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <ThemedText style={styles.campaignMainTitle}>
                  {'QUẢN TRỊ SỐ GIVRAL BAKERY\n2026'}
                </ThemedText>

                <View style={styles.campaignMetricsWrap}>
                  {(isAdmin || isDirector || isManager || isAccountant) && (
                    <View style={styles.campaignMetricPill}>
                      <Ionicons name="cash-outline" size={12} color="#FDE047" />
                      <ThemedText style={styles.campaignMetricText}>DT: {revenue}</ThemedText>
                    </View>
                  )}
                  <View style={styles.campaignMetricPill}>
                    <Ionicons name="receipt-outline" size={12} color="#FDE047" />
                    <ThemedText style={styles.campaignMetricText}>
                      Đơn hàng: {orderCount}
                    </ThemedText>
                  </View>
                  {!isAdmin && (isManager || isWarehouse || isAccountant || isDirector) && (
                    <View style={styles.campaignMetricPill}>
                      <Ionicons name="finger-print-outline" size={12} color="#FDE047" />
                      <ThemedText style={styles.campaignMetricText}>
                        Chờ ký: {pendingSignCount}
                      </ThemedText>
                    </View>
                  )}
                  {(isAdmin || isDirector || isManager || isWarehouse) && (
                    <View style={styles.campaignMetricPill}>
                      <Ionicons name="warning-outline" size={12} color="#FDE047" />
                      <ThemedText style={styles.campaignMetricText}>
                        Cảnh báo HSD: {warningBatchCount}
                      </ThemedText>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.exploreGoldBtn}
                  onPress={() =>
                    isAdmin || isDirector || isManager || isAccountant
                      ? nav('/(admin)/reports')
                      : nav('/(admin)/invoices')
                  }
                >
                  <ThemedText style={styles.exploreGoldBtnText}>KHÁM PHÁ NGAY</ThemedText>
                  <Ionicons name="arrow-forward-circle" size={16} color="#78350F" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 2.4 Tiện ích yêu thích with Chỉnh sửa ✏️ button */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <ThemedText style={styles.vneidSectionTitle}>Tiện ích yêu thích</ThemedText>
              <TouchableOpacity
                style={styles.editFavBtn}
                onPress={() => setShowEditFavModal(true)}
              >
                <ThemedText style={styles.editFavBtnText}>Chỉnh sửa</ThemedText>
                <Ionicons name="create-outline" size={16} color="#d97706" />
              </TouchableOpacity>
            </View>

            <View style={styles.fav3ColGrid}>
              {favoriteUtilities.map((item, idx) => (
                <TouchableOpacity
                  key={item.id || ('fav-' + idx)}
                  style={styles.favPedestalItem}
                  activeOpacity={0.75}
                  onPress={() => nav(item.route)}
                >
                  <View style={styles.pedestalContainer}>
                    <View style={[styles.pedestalBasePlate, { backgroundColor: '#F3DEBA' }]} />
                    <View style={[styles.pedestalIconCircle, { backgroundColor: item.bgColor }]}>
                      <Ionicons name={item.icon} size={24} color={item.iconColor} />
                    </View>
                    {item.badgeCount !== undefined && item.badgeCount > 0 && (
                      <View style={styles.utilityCountBadge}>
                        <ThemedText style={styles.utilityCountBadgeText}>
                          {item.badgeCount > 99 ? '99+' : item.badgeCount}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                  <ThemedText style={styles.favPedestalTitle} numberOfLines={2}>
                    {item.title}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 2.5 Tất cả dịch vụ theo phân quyền */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.vneidSectionTitle}>
                  Tất cả dịch vụ theo phân quyền ({getRoleTitle()})
                </ThemedText>
                <ThemedText style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  {isAdmin
                    ? 'Quản trị toàn diện hệ thống (Không tham gia ký số chứng từ)'
                    : 'Đầy đủ công cụ nghiệp vụ được cấp quyền mức 2'}
                </ThemedText>
              </View>
            </View>

            {/* Filter pills by service group */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
            >
              <TouchableOpacity
                key="chip-all"
                style={[
                  styles.groupFilterChip,
                  activeGroupFilter === 'ALL' && styles.groupFilterChipActive,
                ]}
                onPress={() => setActiveGroupFilter('ALL')}
              >
                <ThemedText
                  style={[
                    styles.groupFilterChipText,
                    activeGroupFilter === 'ALL' && { color: '#fff', fontWeight: '700' },
                  ]}
                >
                  Tất cả ({permittedUtilities.length})
                </ThemedText>
              </TouchableOpacity>
              {serviceGroups.map((g, idx) => (
                <TouchableOpacity
                  key={g.key || ('chip-' + idx)}
                  style={[
                    styles.groupFilterChip,
                    activeGroupFilter === g.key && styles.groupFilterChipActive,
                  ]}
                  onPress={() => setActiveGroupFilter(g.key)}
                >
                  <ThemedText
                    style={[
                      styles.groupFilterChipText,
                      activeGroupFilter === g.key && { color: '#fff', fontWeight: '700' },
                    ]}
                  >
                    {g.label.replace('\n', ' ')}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.allServices2ColGrid}>
              {filteredAllUtilities.map((u, idx) => (
                <TouchableOpacity
                  key={u.id || ('util-' + idx)}
                  style={styles.serviceDetailCard}
                  activeOpacity={0.8}
                  onPress={() => nav(u.route)}
                >
                  <View style={[styles.serviceDetailIconBox, { backgroundColor: u.bgColor }]}>
                    <Ionicons name={u.icon} size={22} color={u.iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.serviceDetailTitle} numberOfLines={1}>
                      {u.shortTitle}
                    </ThemedText>
                    <ThemedText style={styles.serviceDetailSub} numberOfLines={2}>
                      {u.subtitle}
                    </ThemedText>
                  </View>
                  {u.badgeCount !== undefined && u.badgeCount > 0 && (
                    <View style={styles.inlineAlertBadge}>
                      <ThemedText style={styles.inlineAlertBadgeText}>{u.badgeCount}</ThemedText>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ height: 90 }} />
        </View>
      </ScrollView>

      {/* ==================== MODAL 1: THẺ ĐỊNH DANH NHÂN SỰ ĐIỆN TỬ (VNeID STYLE) ==================== */}
      <Modal
        visible={showIdCardModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowIdCardModal(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={styles.vneidCardModalBox}>
            {/* Top Crimson Header of ID Card */}
            <View style={styles.vneidCardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.vneidCrestCircle}>
                  <Ionicons name="star" size={16} color="#FACC15" />
                </View>
                <View>
                  <ThemedText style={styles.vneidHeaderGovText}>
                    HỆ THỐNG QUẢN TRỊ NỘI BỘ GIVRAL BAKERY
                  </ThemedText>
                  <ThemedText style={styles.vneidHeaderCardType}>
                    THẺ ĐỊNH DANH NHÂN SỰ ĐIỆN TỬ
                  </ThemedText>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowIdCardModal(false)}>
                <Ionicons name="close-circle" size={26} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* Body of ID Card */}
            <View style={styles.vneidCardBody}>
              <View style={styles.qrWrapperBox}>
                <Image source={{ uri: qrCardUrl }} style={styles.qrImage} />
                <View style={styles.level2VerifiedBanner}>
                  <Ionicons name="checkmark-circle" size={14} color="#fff" />
                  <ThemedText style={styles.level2VerifiedText}>
                    Thẻ nhân sự chính thức
                  </ThemedText>
                </View>
              </View>

              <View style={styles.idDetailRows}>
                <View style={styles.idDetailRow}>
                  <ThemedText style={styles.idDetailLabel}>Họ và tên:</ThemedText>
                  <ThemedText style={styles.idDetailValueBold}>{displayName}</ThemedText>
                </View>
                <View style={styles.idDetailRow}>
                  <ThemedText style={styles.idDetailLabel}>Mã NV / Username:</ThemedText>
                  <ThemedText style={styles.idDetailValue}>{staffUsername}</ThemedText>
                </View>
                <View style={styles.idDetailRow}>
                  <ThemedText style={styles.idDetailLabel}>Chức vụ:</ThemedText>
                  <ThemedText style={[styles.idDetailValueBold, { color: '#d97706' }]}>
                    {getRoleTitle()}
                  </ThemedText>
                </View>
                <View style={styles.idDetailRow}>
                  <ThemedText style={styles.idDetailLabel}>Chi nhánh công tác:</ThemedText>
                  <ThemedText style={styles.idDetailValue}>
                    {selectedStore?.TENCUAHANG || profile?.storeName || 'Toàn hệ thống Givral'}
                  </ThemedText>
                </View>
                <View style={styles.idDetailRow}>
                  <ThemedText style={styles.idDetailLabel}>Quyền ký số chứng từ:</ThemedText>
                  <ThemedText
                    style={[
                      styles.idDetailValue,
                      { color: canSign ? '#059669' : '#64748B', fontWeight: '700' },
                    ]}
                  >
                    {canSign
                      ? 'Được cấp quyền ký duyệt chứng từ'
                      : 'Không thuộc vai trò ký duyệt chứng từ'}
                  </ThemedText>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <TouchableOpacity
                  style={[styles.idModalActionBtn, { backgroundColor: '#F1F5F9', flex: 1 }]}
                  onPress={() => {
                    setShowIdCardModal(false);
                    nav('/(admin)/profile');
                  }}
                >
                  <Ionicons name="person-circle-outline" size={18} color="#334155" />
                  <ThemedText style={{ color: '#334155', fontWeight: '700', fontSize: 13 }}>
                    Hồ sơ cá nhân
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.idModalActionBtn, { backgroundColor: '#d97706', flex: 1 }]}
                  onPress={() => {
                    setShowIdCardModal(false);
                    nav('/(admin)/attendance');
                  }}
                >
                  <Ionicons name="finger-print-outline" size={18} color="#FFF" />
                  <ThemedText style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>
                    Chấm công ngay
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== MODAL 2: QUICK SEARCH MODAL ==================== */}
      <Modal
        visible={showSearchModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSearchModal(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheetContainer}>
            <View style={styles.sheetHeader}>
              <ThemedText style={styles.sheetTitle}>Tìm kiếm dịch vụ & tiện ích</ThemedText>
              <TouchableOpacity onPress={() => setShowSearchModal(false)}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchModalInputBox}>
              <Ionicons name="search" size={18} color="#94A3B8" />
              <TextInput
                style={styles.searchModalInput}
                placeholder="Nhập tên nghiệp vụ (VD: nhập lô, ký số, đánh giá, hủy...)"
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {searchResults.map((item, idx) => (
                <TouchableOpacity
                  key={item.id || ('search-' + idx)}
                  style={styles.searchResultRow}
                  onPress={() => {
                    setShowSearchModal(false);
                    nav(item.route);
                  }}
                >
                  <View style={[styles.searchResultIcon, { backgroundColor: item.bgColor }]}>
                    <Ionicons name={item.icon} size={20} color={item.iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={{ fontWeight: '700', fontSize: 14, color: '#0F172A' }}>
                      {item.shortTitle}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 12, color: '#64748B' }}>
                      {item.subtitle}
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ==================== MODAL 3: SERVICE GROUP QUICK SHEET ==================== */}
      <Modal
        visible={!!selectedGroupModal}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedGroupModal(null)}
      >
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheetContainer}>
            <View style={styles.sheetHeader}>
              <ThemedText style={styles.sheetTitle}>
                Nhóm dịch vụ:{' '}
                {serviceGroups
                  .find((g) => g.key === selectedGroupModal)
                  ?.label.replace('\n', ' ')}
              </ThemedText>
              <TouchableOpacity onPress={() => setSelectedGroupModal(null)}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {groupModalItems.map((item, idx) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.searchResultRow}
                  onPress={() => {
                    setSelectedGroupModal(null);
                    nav(item.route);
                  }}
                >
                  <View style={[styles.searchResultIcon, { backgroundColor: item.bgColor }]}>
                    <Ionicons name={item.icon} size={22} color={item.iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={{ fontWeight: '700', fontSize: 15, color: '#0F172A' }}>
                      {item.shortTitle}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 12, color: '#64748B' }}>
                      {item.subtitle}
                    </ThemedText>
                  </View>
                  <Ionicons name="arrow-forward-circle" size={22} color="#d97706" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ==================== MODAL 4: EDIT FAVORITES MODAL ==================== */}
      <Modal
        visible={showEditFavModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditFavModal(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheetContainer}>
            <View style={styles.sheetHeader}>
              <ThemedText style={styles.sheetTitle}>Chỉnh sửa Tiện ích yêu thích</ThemedText>
              <TouchableOpacity onPress={() => setShowEditFavModal(false)}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>
            <ThemedText style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
              Chọn các nghiệp vụ bạn thường dùng để ghim lên trang chủ (tối đa 6 tiện ích hiển thị đầu tiên):
            </ThemedText>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {permittedUtilities.map((item, idx) => {
                const isFav = favoriteIds.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id || ('permit-' + idx)}
                    style={styles.searchResultRow}
                    onPress={() => toggleFavorite(item.id)}
                  >
                    <View style={[styles.searchResultIcon, { backgroundColor: item.bgColor }]}>
                      <Ionicons name={item.icon} size={20} color={item.iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={{ fontWeight: '700', fontSize: 14, color: '#0F172A' }}>
                        {item.shortTitle}
                      </ThemedText>
                      <ThemedText style={{ fontSize: 12, color: '#64748B' }}>
                        {item.subtitle}
                      </ThemedText>
                    </View>
                    <Ionicons
                      name={isFav ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={isFav ? '#d97706' : '#94A3B8'}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.doneFavBtn}
              onPress={() => setShowEditFavModal(false)}
            >
              <ThemedText style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                Lưu danh sách yêu thích
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ==================== MODAL 5: STORE / ORGANIZATION SWITCHER ==================== */}
      <Modal
        visible={showStoreModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowStoreModal(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheetContainer}>
            <View style={styles.sheetHeader}>
              <View>
                <ThemedText style={styles.sheetTitle}>Định danh Tổ chức & Chi nhánh</ThemedText>
                <ThemedText style={{ fontSize: 12, color: '#d97706', fontWeight: '600' }}>
                  Vai trò hiện tại: {getRoleTitle()}
                </ThemedText>
              </View>
              <TouchableOpacity onPress={() => setShowStoreModal(false)}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.storeOptionCard,
                  selectedStore?.MACUAHANG === 0 && styles.storeOptionCardActive,
                ]}
                onPress={() => {
                  setSelectedStore({ MACUAHANG: 0, TENCUAHANG: 'Toàn hệ thống Givral Bakery' });
                  setShowStoreModal(false);
                }}
              >
                <View style={styles.storeOptionIcon}>
                  <Ionicons name="globe-outline" size={22} color="#d97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontWeight: '700', fontSize: 15, color: '#0F172A' }}>
                    Toàn hệ thống Givral Bakery
                  </ThemedText>
                  <ThemedText style={{ fontSize: 12, color: '#64748B' }}>
                    Trụ sở điều hành trung tâm
                  </ThemedText>
                </View>
                {selectedStore?.MACUAHANG === 0 && (
                  <Ionicons name="checkmark-circle" size={22} color="#d97706" />
                )}
              </TouchableOpacity>

              {storesList.map((st, idx) => {
                const stId = st.MACUAHANG || st.id || idx + 1;
                const isSelected = selectedStore?.MACUAHANG === stId;
                return (
                  <TouchableOpacity
                    key={String(stId)}
                    style={[styles.storeOptionCard, isSelected && styles.storeOptionCardActive]}
                    onPress={() => {
                      setSelectedStore({
                        ...st,
                        MACUAHANG: stId,
                        TENCUAHANG: st.TENCUAHANG || st.ten_cua_hang || `Chi nhánh #${stId}`,
                      });
                      setShowStoreModal(false);
                    }}
                  >
                    <View style={styles.storeOptionIcon}>
                      <Ionicons name="storefront-outline" size={20} color="#d97706" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={{ fontWeight: '700', fontSize: 15, color: '#0F172A' }}>
                        {st.TENCUAHANG || st.ten_cua_hang}
                      </ThemedText>
                      <ThemedText style={{ fontSize: 12, color: '#64748B' }}>
                        {st.DIACHI || st.dia_chi || 'Chi nhánh Givral Bakery'}
                      </ThemedText>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={22} color="#d97706" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // 1. TOP CRIMSON HEADER
  crimsonHeader: {
    backgroundColor: '#d97706',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 12,
    paddingBottom: 30,
    paddingHorizontal: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  patternCircle1: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    top: -80,
    right: -60,
  },
  patternCircle2: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(253, 224, 71, 0.06)',
    bottom: -40,
    left: -40,
  },
  patternCircle3: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    top: 20,
    left: '40%',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  avatarRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: '#FDE047',
    padding: 2,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarImg: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  verifiedMiniDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#16A34A',
    borderWidth: 2,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIdentityCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  level2Pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 3,
    borderRadius: 20,
    marginBottom: 5,
    gap: 6,
  },
  level2PillText: {
    color: '#1E293B',
    fontSize: 11,
    fontWeight: '700',
  },
  level2ShieldCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  staffUpperName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  searchCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  // Two Cream-Gold Cards
  dualCreamCardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  creamGoldCard: {
    flex: 1,
    backgroundColor: '#F3DEBA',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
    elevation: 3,
  },
  idCardMiniIllustration: {
    width: 42,
    height: 32,
    backgroundColor: '#FFFBEB',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D97706',
    overflow: 'hidden',
    marginRight: 10,
  },
  idCardMiniHeader: {
    height: 7,
    backgroundColor: '#d97706',
  },
  idCardMiniBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  idCardLine1: {
    height: 3,
    backgroundColor: '#D97706',
    borderRadius: 2,
    width: '90%',
  },
  idCardLine2: {
    height: 3,
    backgroundColor: '#F59E0B',
    borderRadius: 2,
    width: '65%',
  },
  greenEmblemBox: {
    width: 40,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#15803D',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  emblemYellowRing: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FACC15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creamCardTitle: {
    flex: 1,
    color: '#451A03',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  // 2. MAIN WHITE ROUNDED BODY
  whiteRoundedBody: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  vneidSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  serviceGroupsRow: {
    gap: 16,
    paddingRight: 12,
    paddingTop: 4,
  },
  serviceGroupItem: {
    alignItems: 'center',
    width: 74,
  },
  serviceCircleWrapper: {
    position: 'relative',
    marginBottom: 6,
  },
  serviceRedCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#d97706',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  moiPillBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#d97706',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  moiPillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  serviceGroupLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    lineHeight: 15,
  },
  // 2.2 Red Organization Switcher Banner
  orgSwitcherBanner: {
    backgroundColor: '#D32F2F',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    elevation: 3,
  },
  orgLeftCreamCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3DEBA',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  orgMiniShield: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#B71C1C',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  orgCenterTextCol: {
    flex: 1,
    marginHorizontal: 12,
  },
  orgTitleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  orgSubItalic: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  orgRightSwapSquare: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 2.3 Featured Campaign Banner
  campaignBanner: {
    backgroundColor: '#b45309',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    marginBottom: 22,
    overflow: 'hidden',
    position: 'relative',
  },
  campaignPatternGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    right: -30,
    top: -30,
  },
  campaignTopFlex: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  campaignEmblemBox: {
    width: 76,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(253, 224, 71, 0.3)',
  },
  campaignEmblemInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#78350F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FDE047',
    marginBottom: 6,
  },
  campaignYearTag: {
    color: '#FDE047',
    fontSize: 9,
    fontWeight: '800',
  },
  campaignMainTitle: {
    color: '#FEF08A',
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
    marginBottom: 8,
  },
  campaignMetricsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  campaignMetricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  campaignMetricText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  exploreGoldBtn: {
    backgroundColor: '#F59E0B',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  exploreGoldBtnText: {
    color: '#78350F',
    fontSize: 11,
    fontWeight: '900',
  },
  // 2.4 Tiện ích yêu thích
  editFavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
  },
  editFavBtnText: {
    color: '#B71C1C',
    fontSize: 12,
    fontWeight: '700',
  },
  fav3ColGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  favPedestalItem: {
    width: '33.33%',
    paddingHorizontal: 6,
    marginBottom: 16,
    alignItems: 'center',
  },
  pedestalContainer: {
    width: 64,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 6,
  },
  pedestalBasePlate: {
    position: 'absolute',
    bottom: 0,
    width: 54,
    height: 14,
    borderRadius: 7,
    opacity: 0.7,
  },
  pedestalIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    elevation: 2,
  },
  utilityCountBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  utilityCountBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
  favPedestalTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    lineHeight: 16,
  },
  // 2.5 Tất cả dịch vụ
  groupFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  groupFilterChipActive: {
    backgroundColor: '#d97706',
    borderColor: '#d97706',
  },
  groupFilterChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  allServices2ColGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  serviceDetailCard: {
    width: (width - 42) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    elevation: 1,
  },
  serviceDetailIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceDetailTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  serviceDetailSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 13,
  },
  inlineAlertBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  inlineAlertBadgeText: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '800',
  },
  // MODALS
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  vneidCardModalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  vneidCardHeader: {
    backgroundColor: '#B71C1C',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vneidCrestCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#991B1B',
    borderWidth: 1.5,
    borderColor: '#FACC15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vneidHeaderGovText: {
    color: '#FDE047',
    fontSize: 9,
    fontWeight: '800',
  },
  vneidHeaderCardType: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  vneidCardBody: {
    padding: 18,
  },
  qrWrapperBox: {
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#FFFBEB',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  qrImage: {
    width: 160,
    height: 160,
    borderRadius: 8,
  },
  level2VerifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16A34A',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 10,
    gap: 5,
  },
  level2VerifiedText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  idDetailRows: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
    gap: 8,
  },
  idDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  idDetailLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  idDetailValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    maxWidth: '62%',
    textAlign: 'right',
  },
  idDetailValueBold: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '800',
    maxWidth: '62%',
    textAlign: 'right',
  },
  idModalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    gap: 6,
  },
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '82%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  searchModalInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
    gap: 8,
  },
  searchModalInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  searchResultIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneFavBtn: {
    backgroundColor: '#d97706',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  storeOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    gap: 12,
  },
  storeOptionCardActive: {
    borderColor: '#d97706',
    backgroundColor: '#FEF2F2',
  },
  storeOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
});


