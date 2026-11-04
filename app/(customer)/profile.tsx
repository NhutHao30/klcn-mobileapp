import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { permissionService } from '@/services/permissionService';
import * as ImagePicker from 'expo-image-picker';
import { useCustomTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/services/apiClient';

const formatVoucherDate = (raw?: string | null): string => {
  if (!raw) return 'Không giới hạn';
  const str = String(raw).trim();
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toLocaleDateString('vi-VN');
  return str;
};

const normalizeBirthDateInput = (input: string): string => {
  const trimmed = input.trim();
  if (!trimmed) return '';
  // Convert dd/mm/yyyy -> yyyy-mm-dd for backend if needed
  const dmy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const dd = dmy[1].padStart(2, '0');
    const mm = dmy[2].padStart(2, '0');
    const yyyy = dmy[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  return trimmed;
};

export default function CustomerProfilePage() {
  const router = useRouter();
  const { colors, toggleTheme } = useCustomTheme();
  const { user, profile, isLoggedIn, canAccessAdmin, logout, refreshProfile, setUser } = useAuth();
  const [pickedAvatar, setPickedAvatar] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Loyalty & Profile Data from GET /me
  const [meData, setMeData] = useState<any>(null);

  // Voucher Wallet State from GET /vouchers/my-wallet
  const [savedVouchers, setSavedVouchers] = useState<any[]>([]);
  const [availableVouchers, setAvailableVouchers] = useState<any[]>([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [collectingCode, setCollectingCode] = useState<string | null>(null);
  const [voucherTab, setVoucherTab] = useState<'saved' | 'hunt'>('saved');
  const [voucherModalVisible, setVoucherModalVisible] = useState(false);

  // Edit Profile Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    hoTen: '',
    soDienThoai: '',
    ngaySinh: '',
    diaChi: '',
  });

  const fetchCustomerData = useCallback(
    async (isPullRefresh = false) => {
      if (!isLoggedIn) return;
      if (isPullRefresh) setRefreshing(true);
      setLoadingVouchers(true);
      try {
        const [meRes, walletRes] = await Promise.allSettled([
          apiClient.get('/me'),
          apiClient.get('/vouchers/my-wallet'),
        ]);

        if (meRes.status === 'fulfilled' && meRes.value?.data) {
          const me = meRes.value.data;
          setMeData(me);
          if (setUser) {
            setUser(me);
          }
        }

        if (walletRes.status === 'fulfilled' && walletRes.value?.data) {
          const wData = walletRes.value.data;
          const saved = Array.isArray(wData.saved_vouchers)
            ? wData.saved_vouchers
            : Array.isArray(wData.data)
            ? wData.data
            : [];
          const avail = Array.isArray(wData.available_vouchers) ? wData.available_vouchers : [];
          setSavedVouchers(saved);
          setAvailableVouchers(avail);
        }
      } catch (e) {
        // Ignore network errors and keep existing state
      } finally {
        setLoadingVouchers(false);
        setRefreshing(false);
      }
    },
    [isLoggedIn, setUser]
  );

  useEffect(() => {
    if (isLoggedIn) {
      fetchCustomerData(false);
    } else {
      setMeData(null);
      setSavedVouchers([]);
      setAvailableVouchers([]);
    }
  }, [isLoggedIn, fetchCustomerData]);

  // Extract loyalty data from meData or AuthContext user
  const activeMe = meData || user;
  const nd = activeMe?.nguoidung ?? activeMe?.khachhang ?? activeMe;
  const diemTichLuy = Number(nd?.diemTichLuy ?? nd?.DIEMTICHLUY ?? activeMe?.diemTichLuy ?? 0);
  const tongChiTieu = Number(nd?.tongChiTieu ?? nd?.TONGCHITIEU ?? activeMe?.tongChiTieu ?? 0);
  const hangThanhVienRaw = String(
    nd?.hangThanhVien ?? nd?.HANGTHANHVIEN ?? activeMe?.hangThanhVien ?? 'Đồng'
  );

  // Compute tier theme & progress bar (Đồng -> Bạc: 100 điểm / 1.000.000đ; Bạc -> Vàng: 500 điểm / 5.000.000đ; Vàng -> Kim Cương: 1.500 điểm / 15.000.000đ)
  const getTierConfig = (tierStr: string, points: number) => {
    const lower = tierStr.toLowerCase();
    let tierLabel = `Hạng ${tierStr}`;
    if (!tierLabel.toLowerCase().startsWith('hạng')) {
      tierLabel = `Hạng ${tierStr}`;
    }

    let badgeColor = '#b45309'; // Đồng
    let cardBgColor = '#fef3c7';
    let cardBorderColor = '#f59e0b';
    let iconName: any = 'ribbon';

    if (lower.includes('kim cương') || lower.includes('thách đấu') || points >= 1500) {
      badgeColor = '#0284c7';
      cardBgColor = '#e0f2fe';
      cardBorderColor = '#38bdf8';
      iconName = 'diamond';
    } else if (lower.includes('vàng') || points >= 500) {
      badgeColor = '#ca8a04';
      cardBgColor = '#fef9c3';
      cardBorderColor = '#eab308';
      iconName = 'trophy';
    } else if (lower.includes('bạc') || points >= 100) {
      badgeColor = '#475569';
      cardBgColor = '#f1f5f9';
      cardBorderColor = '#94a3b8';
      iconName = 'medal';
    }

    let nextTierName = 'Hạng Bạc';
    let targetPoints = 100;
    let targetSpend = 1000000;
    if (points >= 1500) {
      nextTierName = 'Hạng Kim Cương (Tối đa)';
      targetPoints = 1500;
      targetSpend = 15000000;
    } else if (points >= 500) {
      nextTierName = 'Hạng Kim Cương';
      targetPoints = 1500;
      targetSpend = 15000000;
    } else if (points >= 100) {
      nextTierName = 'Hạng Vàng';
      targetPoints = 500;
      targetSpend = 5000000;
    }

    const progressPercent = Math.min(100, Math.round((points / targetPoints) * 100));
    const pointsNeeded = Math.max(0, targetPoints - points);

    return {
      tierLabel,
      badgeColor,
      cardBgColor,
      cardBorderColor,
      iconName,
      nextTierName,
      targetPoints,
      targetSpend,
      progressPercent,
      pointsNeeded,
    };
  };

  const tierConfig = getTierConfig(hangThanhVienRaw, diemTichLuy);

  const displayFullName =
    nd?.hoTen || nd?.HOTEN || profile?.fullName || activeMe?.username || 'Khách hàng Givral Bakery';
  const displayPhone = nd?.soDienThoai || nd?.SDT || profile?.phone || '';
  const displayEmail = activeMe?.email || activeMe?.EMAIL || profile?.email || '';
  const displayBirthDate = nd?.NGAYSINH || nd?.ngaySinh || profile?.birthDate || '';
  const displayAddress = nd?.DIACHI || nd?.diaChi || '';

  const avatarUri =
    pickedAvatar ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayFullName)}&background=f59e0b&color=fff`;

  const handleOpenEditModal = () => {
    setEditForm({
      hoTen: displayFullName === 'Khách hàng Givral Bakery' ? '' : displayFullName,
      soDienThoai: displayPhone,
      ngaySinh: displayBirthDate ? String(displayBirthDate).slice(0, 10) : '',
      diaChi: displayAddress,
    });
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!editForm.hoTen.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập họ và tên.');
      return;
    }
    setSavingProfile(true);
    try {
      const normalizedBirth = normalizeBirthDateInput(editForm.ngaySinh);
      await apiClient.post('/profile/update', {
        hoTen: editForm.hoTen.trim(),
        HOTEN: editForm.hoTen.trim(),
        soDienThoai: editForm.soDienThoai.trim(),
        SDT: editForm.soDienThoai.trim(),
        ngaySinh: normalizedBirth || null,
        NGAYSINH: normalizedBirth || null,
        diaChi: editForm.diaChi.trim(),
        dia_chi: editForm.diaChi.trim(),
        DIACHI: editForm.diaChi.trim(),
      });
      setEditModalVisible(false);
      await Promise.allSettled([refreshProfile(), fetchCustomerData(false)]);
      Alert.alert('Thành công', 'Đã cập nhật thông tin hồ sơ cá nhân!');
    } catch (e: any) {
      Alert.alert(
        'Lỗi',
        e?.response?.data?.error || e?.response?.data?.message || 'Không thể cập nhật thông tin cá nhân.'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCollectVoucher = async (voucher: any) => {
    const code = voucher?.MA_VOUCHER || voucher?.ma_voucher || voucher?.maVoucher;
    if (!code) return;
    setCollectingCode(String(code));
    try {
      const res = await apiClient.post('/vouchers/collect', {
        ma_voucher: code,
        maVoucher: code,
        voucher_code: code,
        MA_VOUCHER: code,
      });
      Alert.alert(
        'Thành công 🎉',
        res?.data?.message || `Đã lưu mã "${code}" vào Ví Voucher của bạn!`
      );
      await fetchCustomerData(false);
    } catch (e: any) {
      Alert.alert(
        'Thông báo',
        e?.response?.data?.error || e?.response?.data?.message || 'Không thể lưu voucher này.'
      );
    } finally {
      setCollectingCode(null);
    }
  };

  const handleUseVoucherNow = (voucher: any) => {
    setVoucherModalVisible(false);
    router.push('/(customer)/cart' as any);
  };

  const handleLogout = async () => {
    try {
      if (logout) {
        await logout();
      }
    } catch (e) {}

    router.replace('/login');
  };

  const handleGoToLogin = async () => {
    try {
      if (logout) {
        await logout();
      }
    } catch (e) {}

    router.replace('/login');
  };

  const handleSwitchAdmin = () => {
    if (!isLoggedIn) {
      Alert.alert(
        'Từ chối truy cập 🔒',
        'Bạn cần đăng nhập tài khoản Quản lý / Nhân viên để truy cập trang Quản trị.',
        [
          { text: 'Đóng', style: 'cancel' },
          { text: 'Đăng nhập', onPress: handleGoToLogin },
        ]
      );
      return;
    }

    if (!canAccessAdmin) {
      Alert.alert(
        'Từ chối truy cập 🔒',
        `Tài khoản "${displayFullName}" là tài khoản Khách hàng.\n\nChỉ tài khoản nhân sự (nhân viên, quản lý, giám đốc) mới truy cập được giao diện Quản trị.`,
        [{ text: 'Đã hiểu', style: 'cancel' }]
      );
      return;
    }

    router.replace('/(admin)/' as any);
  };

  const handlePickAvatar = async () => {
    const granted = await permissionService.requestMediaLibraryPermission();
    if (granted) {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPickedAvatar(result.assets[0].uri);
      }
    }
  };

  const renderVoucherDiscountText = (v: any) => {
    const loai = v.LOAI_GIAM || v.loai_giam || 'PHAN_TRAM';
    const giaTri = Number(v.GIA_TRI ?? v.gia_tri ?? 0);
    const giamToiDa = Number(v.GIAM_TOI_DA ?? v.giam_toi_da ?? 0);
    const donToiThieu = Number(v.DON_TOI_THIEU ?? v.don_toi_thieu ?? 0);

    const mainDiscount =
      loai === 'PHAN_TRAM'
        ? `Giảm ${giaTri}%${giamToiDa > 0 ? ` (Tối đa ${giamToiDa.toLocaleString('vi-VN')}₫)` : ''}`
        : `Giảm ${giaTri.toLocaleString('vi-VN')}₫`;
    const minOrder = `Đơn tối thiểu ${donToiThieu.toLocaleString('vi-VN')}₫`;
    return { mainDiscount, minOrder };
  };

  const renderVoucherCard = (v: any, mode: 'saved' | 'hunt') => {
    const code = v.MA_VOUCHER || v.ma_voucher || v.maVoucher || 'VOUCHER';
    const name = v.TEN_VOUCHER || v.ten_voucher || code;
    const expiry = formatVoucherDate(v.NGAY_KET_THUC || v.ngay_ket_thuc);
    const isAlreadySaved = Boolean(
      v.is_saved || savedVouchers.some((sv) => String(sv.MA_VOUCHER) === String(code))
    );
    const { mainDiscount, minOrder } = renderVoucherDiscountText(v);
    const isCollecting = collectingCode === String(code);

    return (
      <View
        key={`${mode}-${code}`}
        style={[
          styles.voucherItemCard,
          { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
        ]}
      >
        <View style={[styles.voucherLeftTicket, { backgroundColor: colors.tint }]}>
          <Ionicons name="pricetag" size={22} color="#fff" />
          <ThemedText style={styles.voucherCodeBadgeText} numberOfLines={1}>
            {code}
          </ThemedText>
        </View>

        <View style={styles.voucherMiddleInfo}>
          <ThemedText style={styles.voucherNameText} numberOfLines={1}>
            {name}
          </ThemedText>
          <ThemedText style={[styles.voucherDiscountText, { color: colors.tint }]}>
            {mainDiscount}
          </ThemedText>
          <ThemedText style={styles.voucherMetaText}>{minOrder}</ThemedText>
          <ThemedText style={styles.voucherExpiryText}>HSD: {expiry}</ThemedText>
        </View>

        <View style={styles.voucherRightAction}>
          {mode === 'saved' || isAlreadySaved ? (
            <TouchableOpacity
              style={[styles.voucherUseBtn, { backgroundColor: colors.tint }]}
              onPress={() => handleUseVoucherNow(v)}
            >
              <ThemedText style={styles.voucherUseBtnText}>Dùng ngay</ThemedText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.voucherCollectBtn, { borderColor: colors.tint, backgroundColor: colors.tint + '15' }]}
              onPress={() => handleCollectVoucher(v)}
              disabled={isCollecting}
            >
              {isCollecting ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : (
                <ThemedText style={[styles.voucherCollectBtnText, { color: colors.tint }]}>
                  Lưu vào ví
                </ThemedText>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <ThemedText style={styles.headerTitle}>Tài khoản cá nhân</ThemedText>
        {isLoggedIn && (
          <TouchableOpacity style={styles.headerEditBtn} onPress={handleOpenEditModal}>
            <Ionicons name="create-outline" size={20} color="#fff" />
            <ThemedText style={styles.headerEditBtnText}>Sửa hồ sơ</ThemedText>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          isLoggedIn ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchCustomerData(true)}
              colors={[colors.tint]}
              tintColor={colors.tint}
            />
          ) : undefined
        }
      >
        {/* CONDITION 1: UN-AUTHENTICATED GUEST USER */}
        {!isLoggedIn ? (
          <View style={[styles.guestCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={[styles.guestAvatarCircle, { backgroundColor: colors.tint + '18' }]}>
              <Ionicons name="person-outline" size={40} color={colors.tint} />
              <View style={[styles.lockBadge, { backgroundColor: colors.tint }]}>
                <Ionicons name="lock-closed" size={12} color="#fff" />
              </View>
            </View>

            <ThemedText style={styles.guestTitle}>Chào mừng bạn đến với Givral Bakery!</ThemedText>
            <ThemedText style={styles.guestSubtitle}>
              Vui lòng đăng nhập tài khoản để quản lý đơn hàng, sổ địa chỉ, tích điểm và trải nghiệm mua sắm tốt nhất.
            </ThemedText>

            <TouchableOpacity
              style={[styles.primaryLoginBtn, { backgroundColor: colors.tint }]}
              onPress={handleGoToLogin}
            >
              <Ionicons name="log-in-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <ThemedText style={styles.primaryLoginText}>ĐĂNG NHẬP NGAY</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryRegisterBtn, { borderColor: colors.tint }]}
              onPress={handleGoToLogin}
            >
              <ThemedText style={[styles.secondaryRegisterText, { color: colors.tint }]}>
                Tạo tài khoản mới
              </ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          /* CONDITION 2: LOGGED-IN USER CARD */
          <>
            <View style={[styles.profileCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <TouchableOpacity style={{ position: 'relative' }} onPress={handlePickAvatar}>
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
                <View style={[styles.cameraBadge, { backgroundColor: colors.tint }]}>
                  <Ionicons name="camera" size={14} color="#fff" />
                </View>
              </TouchableOpacity>

              <View style={styles.profileInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <ThemedText style={styles.userName} numberOfLines={1}>
                    {displayFullName}
                  </ThemedText>
                  <TouchableOpacity onPress={handleOpenEditModal} style={{ padding: 4 }}>
                    <Ionicons name="pencil-outline" size={16} color={colors.tint} />
                  </TouchableOpacity>
                </View>
                <ThemedText style={styles.userEmail}>
                  {displayEmail || displayPhone || 'Tài khoản chính thức'}
                </ThemedText>
                {!!displayPhone && !!displayEmail && (
                  <ThemedText style={styles.userPhoneText}>SĐT: {displayPhone}</ThemedText>
                )}

                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  <View style={[styles.tierBadge, { backgroundColor: tierConfig.badgeColor + '20' }]}>
                    <Ionicons
                      name={tierConfig.iconName}
                      size={13}
                      color={tierConfig.badgeColor}
                      style={{ marginRight: 4 }}
                    />
                    <ThemedText style={[styles.tierText, { color: tierConfig.badgeColor }]}>
                      {tierConfig.tierLabel}
                    </ThemedText>
                  </View>

                  <View style={[styles.tierBadge, { backgroundColor: colors.tint + '18' }]}>
                    <ThemedText style={[styles.tierText, { color: colors.tint }]}>
                      {diemTichLuy} điểm
                    </ThemedText>
                  </View>
                </View>
              </View>
            </View>

            {/* RICH MEMBERSHIP & LOYALTY CARD */}
            <View
              style={[
                styles.loyaltyCard,
                {
                  backgroundColor: colors.cardBg,
                  borderColor: tierConfig.cardBorderColor,
                },
              ]}
            >
              <View style={styles.loyaltyHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={[styles.loyaltyIconCircle, { backgroundColor: tierConfig.badgeColor }]}>
                    <Ionicons name={tierConfig.iconName} size={20} color="#fff" />
                  </View>
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <ThemedText style={styles.loyaltyCardTitle}>Thẻ Thành Viên Givral</ThemedText>
                    <ThemedText style={styles.loyaltyConversionHint}>
                      Quy đổi tích điểm: 10.000₫ = 1 điểm
                    </ThemedText>
                  </View>
                </View>

                <View style={[styles.loyaltyTierPill, { backgroundColor: tierConfig.badgeColor }]}>
                  <ThemedText style={styles.loyaltyTierPillText}>{tierConfig.tierLabel}</ThemedText>
                </View>
              </View>

              <View style={[styles.loyaltyMetricsRow, { borderColor: colors.cardBorder }]}>
                <View style={styles.loyaltyMetricCol}>
                  <ThemedText style={styles.loyaltyMetricLabel}>Điểm tích lũy</ThemedText>
                  <ThemedText style={[styles.loyaltyMetricValue, { color: tierConfig.badgeColor }]}>
                    {diemTichLuy.toLocaleString('vi-VN')} điểm
                  </ThemedText>
                </View>
                <View style={[styles.loyaltyMetricDivider, { backgroundColor: colors.cardBorder }]} />
                <View style={styles.loyaltyMetricCol}>
                  <ThemedText style={styles.loyaltyMetricLabel}>Tổng chi tiêu tích lũy</ThemedText>
                  <ThemedText style={[styles.loyaltyMetricValue, { color: colors.tint }]}>
                    {tongChiTieu.toLocaleString('vi-VN')}₫
                  </ThemedText>
                </View>
              </View>

              {/* PROGRESS BAR TOWARD NEXT TIER */}
              <View style={styles.progressSection}>
                <View style={styles.progressLabelRow}>
                  <ThemedText style={styles.progressTitleText}>
                    Tiến trình lên {tierConfig.nextTierName}
                  </ThemedText>
                  <ThemedText style={[styles.progressFractionText, { color: tierConfig.badgeColor }]}>
                    {diemTichLuy}/{tierConfig.targetPoints} điểm ({tierConfig.progressPercent}%)
                  </ThemedText>
                </View>

                <View style={[styles.progressBarTrack, { backgroundColor: colors.cardBorder }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${tierConfig.progressPercent}%`,
                        backgroundColor: tierConfig.badgeColor,
                      },
                    ]}
                  />
                </View>

                <ThemedText style={styles.progressSubHint}>
                  {tierConfig.pointsNeeded > 0
                    ? `Cần tích lũy thêm ${tierConfig.pointsNeeded} điểm (tương đương ${(
                        tierConfig.pointsNeeded * 10000
                      ).toLocaleString('vi-VN')}₫) để đạt ${tierConfig.nextTierName}.`
                    : 'Chúc mừng! Bạn đã đạt hạng thành viên cao nhất của Givral Bakery.'}
                </ThemedText>

                {/* Mốc hạng thành viên */}
                <View style={styles.tierMilestonesRow}>
                  <ThemedText style={styles.milestoneChip}>Đồng: 0đ</ThemedText>
                  <ThemedText style={styles.milestoneChip}>Bạc: 100đ (1Tr)</ThemedText>
                  <ThemedText style={styles.milestoneChip}>Vàng: 500đ (5Tr)</ThemedText>
                  <ThemedText style={styles.milestoneChip}>Kim Cương: 1500đ (15Tr)</ThemedText>
                </View>
              </View>
            </View>

            {/* CUSTOMER VOUCHER WALLET SECTION */}
            <View style={styles.voucherSectionHeader}>
              <ThemedText style={styles.sectionHeaderTitle}>
                Ví Voucher Của Tôi & Kho Săn Voucher
              </ThemedText>
              <TouchableOpacity onPress={() => setVoucherModalVisible(true)}>
                <ThemedText style={{ fontSize: 13, fontWeight: 'bold', color: colors.tint }}>
                  Mở rộng ({savedVouchers.length})
                </ThemedText>
              </TouchableOpacity>
            </View>

            <View style={[styles.voucherContainerCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              {/* Tabs: Ví của tôi vs Kho săn Voucher */}
              <View style={[styles.voucherTabsRow, { backgroundColor: colors.background }]}>
                <TouchableOpacity
                  style={[
                    styles.voucherTabBtn,
                    voucherTab === 'saved' && { backgroundColor: colors.tint },
                  ]}
                  onPress={() => setVoucherTab('saved')}
                >
                  <Ionicons
                    name="wallet-outline"
                    size={16}
                    color={voucherTab === 'saved' ? '#fff' : colors.text}
                  />
                  <ThemedText
                    style={[
                      styles.voucherTabBtnText,
                      voucherTab === 'saved' && { color: '#fff', fontWeight: 'bold' },
                    ]}
                  >
                    Ví của tôi ({savedVouchers.length})
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.voucherTabBtn,
                    voucherTab === 'hunt' && { backgroundColor: colors.tint },
                  ]}
                  onPress={() => setVoucherTab('hunt')}
                >
                  <Ionicons
                    name="gift-outline"
                    size={16}
                    color={voucherTab === 'hunt' ? '#fff' : colors.text}
                  />
                  <ThemedText
                    style={[
                      styles.voucherTabBtnText,
                      voucherTab === 'hunt' && { color: '#fff', fontWeight: 'bold' },
                    ]}
                  >
                    Kho săn Voucher ({availableVouchers.length})
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {loadingVouchers ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={colors.tint} />
                </View>
              ) : voucherTab === 'saved' ? (
                savedVouchers.length === 0 ? (
                  <View style={styles.emptyVoucherBox}>
                    <Ionicons name="ticket-outline" size={36} color={colors.icon} style={{ opacity: 0.4 }} />
                    <ThemedText style={styles.emptyVoucherText}>
                      Bạn chưa có voucher nào trong ví. Chuyển sang tab "Kho săn Voucher" để lưu mã ưu đãi ngay!
                    </ThemedText>
                    <TouchableOpacity
                      style={[styles.switchHuntBtn, { borderColor: colors.tint }]}
                      onPress={() => setVoucherTab('hunt')}
                    >
                      <ThemedText style={{ color: colors.tint, fontWeight: 'bold', fontSize: 13 }}>
                        Săn Voucher ngay
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    {savedVouchers.map((v) => renderVoucherCard(v, 'saved'))}
                  </View>
                )
              ) : availableVouchers.length === 0 ? (
                <View style={styles.emptyVoucherBox}>
                  <Ionicons name="sparkles-outline" size={36} color={colors.icon} style={{ opacity: 0.4 }} />
                  <ThemedText style={styles.emptyVoucherText}>
                    Hiện chưa có chương trình voucher mới để săn.
                  </ThemedText>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {availableVouchers.map((v) => renderVoucherCard(v, 'hunt'))}
                </View>
              )}
            </View>
          </>
        )}

        {/* CUSTOMER ACTIONS (If logged in) */}
        {isLoggedIn && (
          <>
            <ThemedText style={styles.sectionHeaderTitle}>Hoạt động mua sắm</ThemedText>
            <View style={[styles.menuCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(customer)/orders')}>
                <View style={[styles.iconBg, { backgroundColor: colors.tint + '15' }]}>
                  <Ionicons name="receipt-outline" size={20} color={colors.tint} />
                </View>
                <ThemedText style={styles.menuTitle}>Đơn hàng của tôi</ThemedText>
                <Ionicons name="chevron-forward" size={20} color={colors.icon} />
              </TouchableOpacity>

              <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

              <TouchableOpacity style={styles.menuItem} onPress={() => setVoucherModalVisible(true)}>
                <View style={[styles.iconBg, { backgroundColor: colors.tint + '15' }]}>
                  <Ionicons name="ticket-outline" size={20} color={colors.tint} />
                </View>
                <ThemedText style={styles.menuTitle}>
                  Ví Voucher & Kho săn mã ({savedVouchers.length} mã đã lưu)
                </ThemedText>
                <Ionicons name="chevron-forward" size={20} color={colors.icon} />
              </TouchableOpacity>

              <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(customer)/wishlist')}>
                <View style={[styles.iconBg, { backgroundColor: colors.tint + '15' }]}>
                  <Ionicons name="heart-outline" size={20} color={colors.tint} />
                </View>
                <ThemedText style={styles.menuTitle}>Sản phẩm yêu thích</ThemedText>
                <Ionicons name="chevron-forward" size={20} color={colors.icon} />
              </TouchableOpacity>

              <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(customer)/addresses')}>
                <View style={[styles.iconBg, { backgroundColor: colors.tint + '15' }]}>
                  <Ionicons name="location-outline" size={20} color={colors.tint} />
                </View>
                <ThemedText style={styles.menuTitle}>Sổ địa chỉ nhận hàng</ThemedText>
                <Ionicons name="chevron-forward" size={20} color={colors.icon} />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* APP SETTINGS */}
        <ThemedText style={styles.sectionHeaderTitle}>Cài đặt & Ứng dụng</ThemedText>

        <View style={[styles.menuCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          {/* LIGHT / DARK MODE */}
          <TouchableOpacity style={styles.menuItem} onPress={toggleTheme}>
            <View style={[styles.iconBg, { backgroundColor: colors.tint + '15' }]}>
              <Ionicons name="moon-outline" size={20} color={colors.tint} />
            </View>
            <ThemedText style={styles.menuTitle}>Giao diện (Sáng/Tối)</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={colors.icon} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          {/* STORES */}
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(customer)/stores')}>
            <View style={[styles.iconBg, { backgroundColor: colors.tint + '15' }]}>
              <Ionicons name="storefront-outline" size={20} color={colors.tint} />
            </View>
            <ThemedText style={styles.menuTitle}>Hệ thống cửa hàng Givral Bakery</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={colors.icon} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          {/* NEWS & BLOG */}
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(customer)/posts')}>
            <View style={[styles.iconBg, { backgroundColor: colors.tint + '15' }]}>
              <Ionicons name="newspaper-outline" size={20} color={colors.tint} />
            </View>
            <ThemedText style={styles.menuTitle}>Tin tức & Cẩm nang bánh ngọt</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={colors.icon} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          {/* NOTIFICATION SETTINGS */}
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(customer)/notifications')}>
            <View style={[styles.iconBg, { backgroundColor: colors.tint + '15' }]}>
              <Ionicons name="notifications-outline" size={20} color={colors.tint} />
            </View>
            <ThemedText style={styles.menuTitle}>Cài đặt thông báo</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={colors.icon} />
          </TouchableOpacity>
        </View>

        {/* LOGOUT BUTTON (Only if logged in) */}
        {isLoggedIn && (
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="#ef4444" style={{ marginRight: 8 }} />
            <ThemedText style={styles.logoutText}>Đăng xuất</ThemedText>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* MODAL 1: EDIT PROFILE MODAL */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.cardBorder }]}>
              <ThemedText style={styles.modalTitle}>Cập nhật hồ sơ cá nhân</ThemedText>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
              <ThemedText style={styles.fieldLabel}>Họ và tên *</ThemedText>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.cardBg }]}
                value={editForm.hoTen}
                onChangeText={(v) => setEditForm((f) => ({ ...f, hoTen: v }))}
                placeholder="Nhập họ và tên..."
                placeholderTextColor={colors.icon}
              />

              <ThemedText style={styles.fieldLabel}>Số điện thoại</ThemedText>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.cardBg }]}
                value={editForm.soDienThoai}
                onChangeText={(v) => setEditForm((f) => ({ ...f, soDienThoai: v }))}
                keyboardType="phone-pad"
                placeholder="Nhập số điện thoại..."
                placeholderTextColor={colors.icon}
              />

              <ThemedText style={styles.fieldLabel}>Ngày sinh (YYYY-MM-DD hoặc DD/MM/YYYY)</ThemedText>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.cardBg }]}
                value={editForm.ngaySinh}
                onChangeText={(v) => setEditForm((f) => ({ ...f, ngaySinh: v }))}
                placeholder="VD: 2000-05-20"
                placeholderTextColor={colors.icon}
              />

              <ThemedText style={styles.fieldLabel}>Địa chỉ nhận hàng mặc định</ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.cardBg, minHeight: 72, textAlignVertical: 'top' },
                ]}
                value={editForm.diaChi}
                onChangeText={(v) => setEditForm((f) => ({ ...f, diaChi: v }))}
                multiline
                placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                placeholderTextColor={colors.icon}
              />

              <TouchableOpacity
                style={[styles.saveModalBtn, { backgroundColor: colors.tint }, savingProfile && { opacity: 0.6 }]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.saveModalBtnText}>Lưu thay đổi</ThemedText>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: FULL VOUCHER WALLET & HUNT MODAL */}
      <Modal
        visible={voucherModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setVoucherModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, maxHeight: '88%' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.cardBorder }]}>
              <ThemedText style={styles.modalTitle}>Ví Voucher & Kho Săn Ưu Đãi</ThemedText>
              <TouchableOpacity onPress={() => setVoucherModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 16 }}>
              <View style={[styles.voucherTabsRow, { backgroundColor: colors.cardBg }]}>
                <TouchableOpacity
                  style={[styles.voucherTabBtn, voucherTab === 'saved' && { backgroundColor: colors.tint }]}
                  onPress={() => setVoucherTab('saved')}
                >
                  <ThemedText
                    style={[
                      styles.voucherTabBtnText,
                      voucherTab === 'saved' && { color: '#fff', fontWeight: 'bold' },
                    ]}
                  >
                    Ví của tôi ({savedVouchers.length})
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.voucherTabBtn, voucherTab === 'hunt' && { backgroundColor: colors.tint }]}
                  onPress={() => setVoucherTab('hunt')}
                >
                  <ThemedText
                    style={[
                      styles.voucherTabBtnText,
                      voucherTab === 'hunt' && { color: '#fff', fontWeight: 'bold' },
                    ]}
                  >
                    Kho săn Voucher ({availableVouchers.length})
                  </ThemedText>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 460, marginTop: 12 }} showsVerticalScrollIndicator={false}>
                {voucherTab === 'saved' ? (
                  savedVouchers.length === 0 ? (
                    <View style={styles.emptyVoucherBox}>
                      <ThemedText style={styles.emptyVoucherText}>
                        Chưa có mã giảm giá nào trong ví của bạn.
                      </ThemedText>
                    </View>
                  ) : (
                    <View style={{ gap: 10, paddingBottom: 20 }}>
                      {savedVouchers.map((v) => renderVoucherCard(v, 'saved'))}
                    </View>
                  )
                ) : availableVouchers.length === 0 ? (
                  <View style={styles.emptyVoucherBox}>
                    <ThemedText style={styles.emptyVoucherText}>
                      Hiện không có mã giảm giá nào trong kho săn.
                    </ThemedText>
                  </View>
                ) : (
                  <View style={{ gap: 10, paddingBottom: 20 }}>
                    {availableVouchers.map((v) => renderVoucherCard(v, 'hunt'))}
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  headerEditBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
  },
  guestCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 20,
  },
  guestAvatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    position: 'relative',
  },
  lockBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  guestTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  guestSubtitle: {
    fontSize: 13,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  primaryLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 48,
    borderRadius: 14,
    marginBottom: 10,
  },
  primaryLoginText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  secondaryRegisterBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryRegisterText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
    flex: 1,
  },
  userEmail: {
    fontSize: 13,
    opacity: 0.65,
    marginBottom: 2,
  },
  userPhoneText: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 4,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  // Loyalty Card
  loyaltyCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 20,
  },
  loyaltyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  loyaltyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loyaltyCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  loyaltyConversionHint: {
    fontSize: 11,
    opacity: 0.65,
    marginTop: 2,
  },
  loyaltyTierPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  loyaltyTierPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loyaltyMetricsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 12,
    marginBottom: 12,
  },
  loyaltyMetricCol: {
    flex: 1,
    alignItems: 'center',
  },
  loyaltyMetricDivider: {
    width: 1,
    height: '100%',
  },
  loyaltyMetricLabel: {
    fontSize: 12,
    opacity: 0.65,
    marginBottom: 4,
  },
  loyaltyMetricValue: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  progressSection: {
    marginTop: 2,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressTitleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressFractionText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressBarTrack: {
    height: 9,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressSubHint: {
    fontSize: 12,
    opacity: 0.75,
    lineHeight: 17,
    marginBottom: 8,
  },
  tierMilestonesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  milestoneChip: {
    fontSize: 10,
    opacity: 0.6,
  },
  // Voucher Wallet Section
  voucherSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  voucherContainerCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 20,
  },
  voucherTabsRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  voucherTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  voucherTabBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  voucherItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  voucherLeftTicket: {
    width: 82,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voucherCodeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 4,
    textAlign: 'center',
  },
  voucherMiddleInfo: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  voucherNameText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  voucherDiscountText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  voucherMetaText: {
    fontSize: 11,
    opacity: 0.65,
    marginTop: 1,
  },
  voucherExpiryText: {
    fontSize: 10,
    opacity: 0.5,
    marginTop: 2,
  },
  voucherRightAction: {
    paddingRight: 10,
  },
  voucherUseBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  voucherUseBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  voucherCollectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  voucherCollectBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyVoucherBox: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyVoucherText: {
    fontSize: 13,
    opacity: 0.65,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  switchHuntBtn: {
    marginTop: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
    opacity: 0.6,
    marginLeft: 4,
  },
  menuCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  divider: {
    height: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#ef444415',
    marginTop: 8,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: 'bold',
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
    opacity: 0.8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
  },
  saveModalBtn: {
    marginTop: 22,
    marginBottom: 30,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveModalBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
