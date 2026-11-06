import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { notificationService } from '@/services/notificationService';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import FloatingNotification from '@/components/FloatingNotification';
import { orderApi } from '@/services/api/orderApi';
import { addressApi, CustomerAddress, GhnProvince, GhnWard } from '@/services/api/addressApi';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { formatImageUrl } from '@/config/apiConfig';
import { permissionService } from '@/services/permissionService';
import apiClient from '@/services/apiClient';

const PAYMENT_METHODS = [
  { id: 'cod', title: 'Thanh toán khi nhận hàng (COD)', subtitle: 'Thanh toán tiền mặt cho shipper', icon: 'cash-outline' },
  { id: 'bank', title: 'Chuyển khoản VietQR (Mọi Ngân Hàng)', subtitle: 'Quét mã VietQR tự động điền số tiền', icon: 'qr-code-outline' },
  { id: 'momo', title: 'Ví MoMo P2P', subtitle: 'Quét mã MoMo chuyển tiền nhanh', icon: 'wallet-outline' },
];

export default function CustomerCheckoutPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { cartItems, clearCart } = useCart();
  const { user } = useAuth();

  // Temporary order ID for QR code reference
  const [orderCode] = useState(() => 'HD' + Date.now().toString().slice(-8));

  // Address states
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [name, setName] = useState(user?.HOTEN || user?.name || '');
  const [phone, setPhone] = useState(user?.SDT || '');
  const [address, setAddress] = useState('');
  const [saveAsDefault, setSaveAsDefault] = useState(true);

  // 2-Level Address Selector (Province -> Ward, NO District)
  const [provinces, setProvinces] = useState<GhnProvince[]>([]);
  const [wards, setWards] = useState<GhnWard[]>([]);
  const [loadingWards, setLoadingWards] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState<GhnProvince | null>(null);
  const [selectedWard, setSelectedWard] = useState<GhnWard | null>(null);
  const [pickerType, setPickerType] = useState<'province' | 'ward' | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [ghnShippingFee, setGhnShippingFee] = useState<number | null>(null);

  // Order notes & payment
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cod');
  const [receiptImageUri, setReceiptImageUri] = useState<string | null>(null);

  // OCR Receipt Verification states
  const [receiptOcrStatus, setReceiptOcrStatus] = useState<'idle' | 'scanning' | 'valid' | 'invalid'>('idle');
  const [receiptOcrMessage, setReceiptOcrMessage] = useState<string>('');

  // Voucher states
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [availableVouchers, setAvailableVouchers] = useState<any[]>([]);
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);

  // Loading & notification states
  const [showNotification, setShowNotification] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [isPaymentDetected, setIsPaymentDetected] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);

  // Live Auto-Detection for VietQR & MoMo payment
  useEffect(() => {
    if (paymentMethod !== 'bank' && paymentMethod !== 'momo') return;
    if (isPaymentDetected || isSubmitting) return;

    let isSubscribed = true;
    const interval = setInterval(async () => {
      try {
        const res = await apiClient.get(`/payment/check-status/${orderCode}`);
        if (res.data?.paid && isSubscribed) {
          setIsPaymentDetected(true);
          clearInterval(interval);
          Alert.alert('Thành công', '🎉 Ngân hàng đã ghi nhận chuyển khoản thành công!');
          handleConfirmOrder();
        }
      } catch (e) { }
    }, 2500);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [paymentMethod, orderCode, isPaymentDetected, isSubmitting]);

  const triggerCheckPayment = async () => {
    setIsCheckingPayment(true);
    try {
      const res = await apiClient.get(`/payment/check-status/${orderCode}`);
      if (res.data?.paid) {
        setIsPaymentDetected(true);
        Alert.alert('Thành công', '🎉 Ngân hàng đã ghi nhận chuyển khoản thành công!');
        handleConfirmOrder();
      } else {
        Alert.alert('Chưa nhận được giao dịch', `Hệ thống chưa nhận được tín hiệu tiền vào tài khoản cho mã ${orderCode}. Nếu bạn đã chuyển khoản, vui lòng đợi 5-10 giây để ngân hàng gửi tín hiệu!`);
      }
    } catch (e) {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối đến cổng kiểm tra giao dịch.');
    } finally {
      setIsCheckingPayment(false);
    }
  };

  // Calculate pricing based on REAL cart items
  const subtotal = cartItems.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
    0
  );
  const shippingFee =
    subtotal > 300000 || subtotal === 0
      ? 0
      : ghnShippingFee !== null
        ? ghnShippingFee
        : 25000;
  const voucherDiscount = appliedVoucher
    ? Number(appliedVoucher.calculated_discount) || Number(appliedVoucher.discount) || 0
    : 0;
  const totalPayment = Math.max(0, subtotal + shippingFee - voucherDiscount);

  const defaultAddressId = useMemo(() => {
    const found = savedAddresses.find((a) => a.isDefault === true || Number(a.isDefault) === 1);
    return found ? found.id : null;
  }, [savedAddresses]);

  useEffect(() => {
    loadCustomerAddresses();
    addressApi.getProvinces().then((list) => {
      if (Array.isArray(list)) setProvinces(list);
    });
  }, []);

  const updateGhnFeeForLocation = async (wardCode?: string | null, districtId?: number | null) => {
    if (!wardCode || !districtId) {
      setGhnShippingFee(null);
      return;
    }
    const fee = await addressApi.calculateShippingFee({
      to_ward_code: String(wardCode),
      to_district_id: Number(districtId),
      weight: 500,
    });
    if (fee !== null) {
      setGhnShippingFee(fee);
    }
  };

  const loadCustomerAddresses = async () => {
    setIsLoadingAddresses(true);
    try {
      const list = await addressApi.getAddresses();
      setSavedAddresses(list);
      if (list.length > 0) {
        const defaultAddr = list.find((a) => a.isDefault === true || Number(a.isDefault) === 1) || list[0];
        setSelectedAddressId(defaultAddr.id);
        setName(defaultAddr.hoTenNguoiNhan || user?.HOTEN || '');
        setPhone(defaultAddr.soDienThoai || user?.SDT || '');
        setAddress(defaultAddr.diaChiChiTiet);
        updateGhnFeeForLocation(defaultAddr.maXa, defaultAddr.maHuyen);
      } else {
        setIsAddingNewAddress(true);
      }
    } catch (e) {
      console.log('Error loading customer addresses:', e);
      setIsAddingNewAddress(true);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  useEffect(() => {
    if (subtotal > 0) {
      orderApi.getSuggestedVouchers(subtotal).then((res) => {
        if (res && res.available_vouchers) {
          setAvailableVouchers(res.available_vouchers);
        }
      });
    }
  }, [subtotal]);

  const handleSelectAddress = (addr: CustomerAddress) => {
    setSelectedAddressId(addr.id);
    setName(addr.hoTenNguoiNhan);
    setPhone(addr.soDienThoai);
    setAddress(addr.diaChiChiTiet);
    setIsAddingNewAddress(false);
    updateGhnFeeForLocation(addr.maXa, addr.maHuyen);
  };

  const handleSelectProvince = async (prov: GhnProvince) => {
    setSelectedProvince(prov);
    setSelectedWard(null);
    setWards([]);
    setPickerType(null);
    setPickerSearch('');
    setLoadingWards(true);
    try {
      const wardList = await addressApi.getWardsByProvince(prov.ProvinceID);
      setWards(wardList);
    } finally {
      setLoadingWards(false);
    }
  };

  const handleSelectWard = async (ward: GhnWard) => {
    setSelectedWard(ward);
    setPickerType(null);
    setPickerSearch('');
    await updateGhnFeeForLocation(ward.WardCode, ward.DistrictID);
  };

  const getComposedNewAddress = () => {
    let full = address.trim();
    if (selectedWard && !full.toLowerCase().includes(selectedWard.WardName.toLowerCase())) {
      full = full ? `${full}, ${selectedWard.WardName}` : selectedWard.WardName;
    }
    if (selectedProvince && !full.toLowerCase().includes(selectedProvince.ProvinceName.toLowerCase())) {
      full = full ? `${full}, ${selectedProvince.ProvinceName}` : selectedProvince.ProvinceName;
    }
    return full;
  };

  const handleSaveAddressToBook = async () => {
    const composed = getComposedNewAddress();
    if (!composed) {
      Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ nhận bánh!');
      return;
    }
    try {
      const newAddr = await addressApi.addAddress({
        diaChiChiTiet: composed,
        hoTenNguoiNhan: name.trim() || user?.HOTEN || 'Khách hàng',
        soDienThoai: phone.trim() || user?.SDT || '0900000000',
        maTinh: selectedProvince ? Number(selectedProvince.ProvinceID) : undefined,
        maHuyen: selectedWard ? Number(selectedWard.DistrictID) : undefined,
        maXa: selectedWard ? String(selectedWard.WardCode) : undefined,
        isDefault: saveAsDefault,
      });
      if (newAddr) {
        Alert.alert('Thành công', 'Đã lưu địa chỉ vào sổ địa chỉ!');
        setAddress(composed);
        await loadCustomerAddresses();
        setSelectedAddressId(newAddr.id);
        setIsAddingNewAddress(false);
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e.response?.data?.error || 'Không thể lưu địa chỉ');
    }
  };

  const handleApplyVoucherCode = async (codeToApply?: string) => {
    const code = (codeToApply || voucherCode).trim().toUpperCase();
    if (!code) {
      Alert.alert('Thông báo', 'Vui lòng nhập mã Voucher!');
      return;
    }

    setIsApplyingVoucher(true);
    try {
      const res = await orderApi.getSuggestedVouchers(subtotal);
      const list = res?.available_vouchers || [];
      const match = list.find((v: any) => v.MA_VOUCHER?.toUpperCase() === code);

      if (match) {
        if (!match.is_eligible) {
          const diff = Number(match.min_order_diff || 0).toLocaleString('vi-VN');
          Alert.alert('Chưa đủ điều kiện', `Đơn hàng cần mua thêm tối thiểu ${diff}₫ để dùng mã này!`);
          return;
        }
        setAppliedVoucher(match);
        setVoucherCode(code);
        Alert.alert(
          'Áp dụng thành công! 🎉',
          `Đã giảm ${Number(match.calculated_discount).toLocaleString('vi-VN')}₫ cho đơn hàng của bạn!`
        );
      } else {
        const applyRes = await orderApi.applyVoucher(code, subtotal);
        if (applyRes && (applyRes.discount || applyRes.calculated_discount)) {
          const disc = Number(applyRes.discount || applyRes.calculated_discount || 0);
          setAppliedVoucher({
            MA_VOUCHER: code,
            TEN_VOUCHER: applyRes.message || 'Mã giảm giá',
            calculated_discount: disc,
          });
          Alert.alert('Thành công', `Đã áp dụng mã ${code}!`);
        } else {
          Alert.alert('Không hợp lệ', 'Mã Voucher không tồn tại hoặc đã hết lượt sử dụng!');
        }
      }
    } catch (e: any) {
      Alert.alert('Lỗi áp dụng', e.response?.data?.error || 'Mã giảm giá không hợp lệ!');
    } finally {
      setIsApplyingVoucher(false);
    }
  };

  const runReceiptOcrVerification = async (uri: string) => {
    setReceiptOcrStatus('scanning');
    setReceiptOcrMessage('Đang quét OCR kiểm tra biên lai chuyển khoản...');
    try {
      const filename = uri.split('/').pop() || 'receipt.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1].toLowerCase() : 'jpg';
      const type = ext === 'png' ? 'image/png' : 'image/jpeg';

      const formData = new FormData();
      formData.append('receipt', {
        uri,
        name: filename,
        type,
      } as any);
      formData.append('expected_amount', String(totalPayment));
      formData.append('expectedAmount', String(totalPayment));
      formData.append('expected_content', orderCode);
      formData.append('orderCode', orderCode);
      formData.append('expected_account', '0353144481');
      formData.append('expectedAccount', '0353144481');

      const res = await orderApi.verifyReceiptOcr(formData);
      if (res && res.valid === false) {
        setReceiptOcrStatus('invalid');
        setReceiptOcrMessage(
          res.message || 'Ảnh tải lên không khớp thông tin chuyển khoản.'
        );
      } else {
        setReceiptOcrStatus('valid');
        setReceiptOcrMessage(
          res?.message || 'Đã xác thực tài khoản nhận, số tiền & nội dung chuyển khoản.'
        );
      }
    } catch (e: any) {
      const errData = e?.response?.data;
      if (errData && errData.valid === false) {
        setReceiptOcrStatus('invalid');
        setReceiptOcrMessage(errData.message || 'Biên lai chuyển khoản không hợp lệ.');
      } else {
        setReceiptOcrStatus('valid');
        setReceiptOcrMessage('Đã tải ảnh biên lai (Sẽ được nhân viên đối soát).');
      }
    }
  };

  const handlePickReceipt = async () => {
    const granted = await permissionService.requestMediaLibraryPermission();
    if (!granted) {
      Alert.alert(
        'Quyền truy cập',
        'Vui lòng cấp quyền truy cập thư viện ảnh để đính kèm minh chứng chuyển khoản!'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const pickedUri = result.assets[0].uri;
      setReceiptImageUri(pickedUri);
      if (paymentMethod === 'bank' || paymentMethod === 'momo') {
        await runReceiptOcrVerification(pickedUri);
      }
    }
  };

  const handleConfirmOrder = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Giỏ hàng trống', 'Bạn chưa có sản phẩm nào trong giỏ hàng để đặt!');
      router.replace('/(customer)/products');
      return;
    }

    const finalAddress = isAddingNewAddress ? getComposedNewAddress() : address.trim();

    if (!name.trim() || !phone.trim() || !finalAddress) {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ Họ tên, Số điện thoại và Địa chỉ giao hàng!');
      return;
    }

    const selectedSavedAddr = savedAddresses.find((a) => a.id === selectedAddressId);
    const toWardCode = isAddingNewAddress
      ? selectedWard?.WardCode
      : selectedSavedAddr?.maXa || undefined;
    const toDistrictId = isAddingNewAddress
      ? selectedWard?.DistrictID
      : selectedSavedAddr?.maHuyen || undefined;

    setIsSubmitting(true);
    try {
      const details = cartItems.map((item) => ({
        MASP: item.id,
        sanPhamId: item.id,
        SO_LUONG: Number(item.quantity) || 1,
        soLuong: Number(item.quantity) || 1,
        price: Number(item.price) || 0,
        name: item.name,
      }));

      await orderApi.checkoutOnline({
        HOTEN: name.trim(),
        SDT: phone.trim(),
        DIACHI: finalAddress,
        GHICHU: note.trim() || 'Đặt từ Givral Bakery Mobile App',
        HINHTHUC_THANHTOAN:
          paymentMethod === 'bank' ? 'VIETQR' : paymentMethod === 'momo' ? 'MOMO' : 'COD',
        MA_VOUCHER: appliedVoucher ? appliedVoucher.MA_VOUCHER : undefined,
        receiptUri: receiptImageUri,
        to_ward_code: toWardCode,
        to_district_id: toDistrictId ? Number(toDistrictId) : undefined,
        phiVanChuyen: shippingFee,
        CHI_TIET: details,
      });

      clearCart();
      setShowNotification(true);

      // Kích hoạt thông báo nổi trên đầu màn hình điện thoại & màn hình khóa
      try {
        notificationService.sendLocalNotification(
          '🎂 Givral Bakery - Đặt hàng thành công!',
          `Đơn hàng trị giá ${totalPayment.toLocaleString('vi-VN')}₫ của bạn đã được tiếp nhận và đang được chuẩn bị!`,
          { route: '/(customer)/orders' },
          'orders'
        );
      } catch (eNoti) {}

      setTimeout(() => {
        router.replace('/(customer)/orders');
      }, 1500);
    } catch (e: any) {
      console.error('Checkout error:', e);
      const msg =
        e.response?.data?.error ||
        e.response?.data?.message ||
        e.message ||
        'Không thể tạo đơn hàng. Vui lòng thử lại!';
      Alert.alert('Lỗi đặt hàng', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProvinces = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    const cleanList = provinces.filter((p) => {
      const id = Number(p.ProvinceID);
      const name = String(p.ProvinceName || '').toLowerCase();
      if (id === 298 || id === 2002) return false;
      if (name.includes('test') || name.includes('alert') || name.includes('hà nội 02')) return false;
      return true;
    });
    if (!q) return cleanList;
    return cleanList.filter((p) => p.ProvinceName.toLowerCase().includes(q));
  }, [provinces, pickerSearch]);

  const filteredWards = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return wards;
    return wards.filter(
      (w) =>
        w.WardName.toLowerCase().includes(q) ||
        (w.DistrictName && w.DistrictName.toLowerCase().includes(q))
    );
  }, [wards, pickerSearch]);

  // Generate QR URLs
  const vietQrUrl = `https://img.vietqr.io/image/MB-0338052164-compact.png?amount=${totalPayment}&addInfo=${orderCode}&accountName=NGUYEN%20HUU%20THIEN`;
  const momoQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    `2|99|0338052164|NGUYEN HUU THIEN||0|0|${totalPayment}|${orderCode}`
  )}`;

  return (
    <ThemedView style={styles.container}>
      <FloatingNotification
        visible={showNotification}
        title="Đặt hàng thành công! 🎉"
        message={`Givral Bakery đã tiếp nhận đơn #${orderCode}. Bánh đang được chuẩn bị!`}
        type="success"
        onClose={() => setShowNotification(false)}
      />

      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Xác nhận & Thanh toán</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* SECTION 1: CUSTOMER ADDRESS BOOK */}
        <View style={styles.sectionTitleRow}>
          <ThemedText style={styles.sectionHeaderTitle}>📍 Địa chỉ nhận bánh</ThemedText>
          <TouchableOpacity
            onPress={() => setIsAddingNewAddress(!isAddingNewAddress)}
            style={styles.addAddressToggleBtn}
          >
            <Ionicons
              name={isAddingNewAddress ? 'close-circle-outline' : 'add-circle-outline'}
              size={16}
              color={colors.tint}
            />
            <ThemedText style={[styles.addAddressToggleText, { color: colors.tint }]}>
              {isAddingNewAddress ? 'Chọn địa chỉ đã lưu' : 'Nhập địa chỉ mới'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* SAVED ADDRESSES SELECTOR */}
        {!isAddingNewAddress && savedAddresses.length > 0 ? (
          <View style={{ marginBottom: 16 }}>
            {savedAddresses.map((addr, aIdx) => {
              const addrId = addr.id || (addr as any).MADC || aIdx;
              const isSelected = selectedAddressId === addr.id;
              const isDef = addr.id === defaultAddressId;
              return (
                <TouchableOpacity
                  key={`addr-${addrId}-${aIdx}`}
                  style={[
                    styles.addressCard,
                    {
                      backgroundColor: colors.cardBg,
                      borderColor: isSelected ? colors.tint : colors.cardBorder,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => handleSelectAddress(addr)}
                >
                  <View style={styles.addressRadioRow}>
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={isSelected ? colors.tint : colors.icon}
                    />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <ThemedText style={styles.addressPersonName}>{addr.hoTenNguoiNhan}</ThemedText>
                        <ThemedText style={styles.addressPhone}>({addr.soDienThoai})</ThemedText>
                        {isDef && (
                          <View style={styles.defaultBadge}>
                            <ThemedText style={styles.defaultBadgeText}>Mặc định</ThemedText>
                          </View>
                        )}
                      </View>
                      <ThemedText style={styles.addressDetailText}>{addr.diaChiChiTiet}</ThemedText>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          /* MANUAL / NEW ADDRESS INPUT FORM (2-LEVEL: PROVINCE -> WARD) */
          <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Họ và tên người nhận</ThemedText>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.cardBorder }]}
                value={name}
                onChangeText={setName}
                placeholder="Nhập tên người nhận bánh"
                placeholderTextColor={colors.icon}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Số điện thoại</ThemedText>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.cardBorder }]}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="Nhập số điện thoại liên hệ"
                placeholderTextColor={colors.icon}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Tỉnh / Thành phố</ThemedText>
              <TouchableOpacity
                style={[styles.selectorBtn, { borderColor: colors.cardBorder }]}
                onPress={() => {
                  setPickerSearch('');
                  setPickerType('province');
                }}
              >
                <ThemedText style={{ color: selectedProvince ? colors.text : colors.icon, fontSize: 14, flex: 1 }}>
                  {selectedProvince ? selectedProvince.ProvinceName : 'Chọn Tỉnh / Thành phố'}
                </ThemedText>
                <Ionicons name="chevron-down" size={18} color={colors.icon} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Phường / Xã (Gộp đơn vị hành chính mới)</ThemedText>
              <TouchableOpacity
                style={[
                  styles.selectorBtn,
                  { borderColor: colors.cardBorder, opacity: selectedProvince ? 1 : 0.6 },
                ]}
                disabled={!selectedProvince || loadingWards}
                onPress={() => {
                  setPickerSearch('');
                  setPickerType('ward');
                }}
              >
                {loadingWards ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <ActivityIndicator size="small" color={colors.tint} />
                    <ThemedText style={{ fontSize: 13, opacity: 0.7 }}>Đang tải Phường/Xã...</ThemedText>
                  </View>
                ) : (
                  <ThemedText style={{ color: selectedWard ? colors.text : colors.icon, fontSize: 14, flex: 1 }}>
                    {selectedWard
                      ? ((selectedWard as any).FullName || `${selectedWard.WardName}${(selectedWard as any).DistrictName ? ` (${(selectedWard as any).DistrictName})` : ''}`)
                      : selectedProvince
                        ? 'Chọn Phường / Xã'
                        : 'Chọn Tỉnh/Thành phố trước'}
                  </ThemedText>
                )}
                <Ionicons name="chevron-down" size={18} color={colors.icon} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Số nhà, tên đường / Địa chỉ chi tiết</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    height: 64,
                    textAlignVertical: 'top',
                    paddingTop: 8,
                    color: colors.text,
                    borderColor: colors.cardBorder,
                  },
                ]}
                value={address}
                onChangeText={setAddress}
                multiline
                placeholder="Số nhà, tên đường, tòa nhà..."
                placeholderTextColor={colors.icon}
              />
            </View>

            <TouchableOpacity
              style={styles.saveDefaultCheckboxRow}
              onPress={() => setSaveAsDefault(!saveAsDefault)}
            >
              <Ionicons
                name={saveAsDefault ? 'checkbox' : 'square-outline'}
                size={20}
                color={saveAsDefault ? colors.tint : colors.icon}
              />
              <ThemedText style={styles.saveDefaultText}>
                Lưu làm địa chỉ mặc định cho các đơn hàng sau
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveAddressBtn, { borderColor: colors.tint }]}
              onPress={handleSaveAddressToBook}
            >
              <Ionicons name="bookmark-outline" size={16} color={colors.tint} />
              <ThemedText style={[styles.saveAddressBtnText, { color: colors.tint }]}>
                Lưu vào sổ địa chỉ của tôi
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {/* SECTION 2: ORDER ITEMS SUMMARY */}
        <ThemedText style={styles.sectionHeaderTitle}>
          🎂 Sản phẩm đã chọn ({cartItems.length} món)
        </ThemedText>
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          {cartItems.map((item, index) => (
            <View
              key={item.id || index}
              style={[
                styles.itemSummaryRow,
                index < cartItems.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.cardBorder,
                  paddingBottom: 10,
                  marginBottom: 10,
                },
              ]}
            >
              <Image source={{ uri: formatImageUrl(item.image) }} style={styles.itemThumb} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <ThemedText style={styles.itemSummaryName} numberOfLines={1}>
                  {item.name}
                </ThemedText>
                <ThemedText style={styles.itemSummaryQty}>
                  Số lượng: <ThemedText style={{ fontWeight: 'bold' }}>x{item.quantity}</ThemedText>
                </ThemedText>
              </View>
              <ThemedText style={[styles.itemSummaryPrice, { color: colors.tint }]}>
                {(Number(item.price) * Number(item.quantity)).toLocaleString('vi-VN')}₫
              </ThemedText>
            </View>
          ))}

          {/* Ghi chú đơn hàng */}
          <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.cardBorder }}>
            <ThemedText style={styles.label}>Ghi chú cho tiệm (Ví dụ: Viết chữ lên bánh kem)</ThemedText>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.cardBorder }]}
              placeholder="Nhập lời chúc hoặc lưu ý đặc biệt..."
              placeholderTextColor={colors.icon}
              value={note}
              onChangeText={setNote}
            />
          </View>
        </View>

        {/* SECTION 3: VOUCHER / MÃ GIẢM GIÁ */}
        <ThemedText style={styles.sectionHeaderTitle}>🎟️ Mã giảm giá / Ưu đãi</ThemedText>
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <View style={styles.voucherInputRow}>
            <TextInput
              style={[styles.voucherInput, { color: colors.text, borderColor: colors.cardBorder }]}
              value={voucherCode}
              onChangeText={setVoucherCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: colors.tint }]}
              onPress={() => handleApplyVoucherCode()}
              disabled={isApplyingVoucher}
            >
              {isApplyingVoucher ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <ThemedText style={styles.applyBtnText}>Áp dụng</ThemedText>
              )}
            </TouchableOpacity>
          </View>

          {appliedVoucher && (
            <View style={styles.appliedVoucherBadge}>
              <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
              <ThemedText style={styles.appliedVoucherText}>
                Đã áp dụng: <ThemedText style={{ fontWeight: 'bold' }}>{appliedVoucher.MA_VOUCHER}</ThemedText> (-
                {Number(appliedVoucher.calculated_discount).toLocaleString('vi-VN')}₫)
              </ThemedText>
              <TouchableOpacity onPress={() => setAppliedVoucher(null)}>
                <Ionicons name="close-circle" size={18} color="#dc2626" />
              </TouchableOpacity>
            </View>
          )}

          {/* Suggested Vouchers List */}
          {availableVouchers.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <ThemedText style={styles.suggestedTitle}>Voucher phù hợp trong ví của bạn:</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                {availableVouchers.map((v, i) => {
                  const isEligible = v.is_eligible;
                  const discountAmount = Number(v.calculated_discount || 0);
                  const isSelected = appliedVoucher?.MA_VOUCHER === v.MA_VOUCHER;
                  return (
                    <TouchableOpacity
                      key={v.MA_VOUCHER || i}
                      style={[
                        styles.voucherChip,
                        {
                          borderColor: isSelected
                            ? '#16a34a'
                            : isEligible
                              ? colors.tint
                              : colors.cardBorder,
                          backgroundColor: isSelected
                            ? '#dcfce7'
                            : isEligible
                              ? colors.tint + '12'
                              : '#f1f5f9',
                          opacity: isEligible ? 1 : 0.6,
                        },
                      ]}
                      onPress={() => handleApplyVoucherCode(v.MA_VOUCHER)}
                      disabled={!isEligible}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="ticket-outline" size={14} color={isEligible ? colors.tint : '#64748b'} />
                        <ThemedText
                          style={[styles.voucherChipCode, { color: isEligible ? colors.tint : '#64748b' }]}
                        >
                          {v.MA_VOUCHER}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.voucherChipDesc} numberOfLines={1}>
                        {isEligible
                          ? `Giảm ${discountAmount.toLocaleString('vi-VN')}₫`
                          : `Đơn từ ${Number(v.DON_TOI_THIEU).toLocaleString('vi-VN')}₫`}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        {/* SECTION 4: PAYMENT METHODS */}
        <ThemedText style={styles.sectionHeaderTitle}>💳 Hình thức thanh toán</ThemedText>
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          {PAYMENT_METHODS.map((method, index) => (
            <React.Fragment key={`pay-${method.id || index}-${index}`}>
              <TouchableOpacity
                style={styles.paymentRow}
                onPress={() => setPaymentMethod(method.id)}
              >
                <View style={styles.paymentLeft}>
                  <Ionicons name={method.icon as any} size={24} color={colors.tint} style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.paymentTitle}>{method.title}</ThemedText>
                    <ThemedText style={styles.paymentSubtitle}>{method.subtitle}</ThemedText>
                  </View>
                </View>

                <View
                  style={[
                    styles.radioOuter,
                    { borderColor: paymentMethod === method.id ? colors.tint : colors.icon },
                  ]}
                >
                  {paymentMethod === method.id && (
                    <View style={[styles.radioInner, { backgroundColor: colors.tint }]} />
                  )}
                </View>
              </TouchableOpacity>
              {index < PAYMENT_METHODS.length - 1 && (
                <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* SECTION 5: DYNAMIC QR CODE & OCR RECEIPT PROOF UPLOAD (FOR BANK & MOMO) */}
        {(paymentMethod === 'bank' || paymentMethod === 'momo') && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: paymentMethod === 'bank' ? '#eff6ff' : '#fdf2f8',
                borderColor: paymentMethod === 'bank' ? '#bfdbfe' : '#fbcfe8',
              },
            ]}
          >
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <ThemedText
                style={[
                  styles.qrHeaderTitle,
                  { color: paymentMethod === 'bank' ? '#1d4ed8' : '#be185d' },
                ]}
              >
                {paymentMethod === 'bank' ? 'Mã VietQR Ngân Hàng' : 'Mã Thanh Toán MoMo P2P'}
              </ThemedText>
              <ThemedText style={styles.qrHeaderSubtitle}>
                Quét mã bên dưới để thanh toán đúng số tiền {totalPayment.toLocaleString('vi-VN')}₫
              </ThemedText>

              <Image
                source={{ uri: paymentMethod === 'bank' ? vietQrUrl : momoQrUrl }}
                style={styles.qrImage}
                resizeMode="contain"
              />

              <View style={styles.bankInfoBox}>
                <ThemedText style={styles.bankInfoRow}>
                  🏦 Ngân hàng:{' '}
                  <ThemedText style={{ fontWeight: 'bold' }}>
                    {paymentMethod === 'bank' ? 'MBBank (Quân Đội)' : 'Ví MoMo'}
                  </ThemedText>
                </ThemedText>
                <ThemedText style={styles.bankInfoRow}>
                  👤 Chủ tài khoản: <ThemedText style={{ fontWeight: 'bold' }}>NGUYỄN HỮU THIỆN</ThemedText>
                </ThemedText>
                <ThemedText style={styles.bankInfoRow}>
                  📱 Số tài khoản / SĐT: <ThemedText style={{ fontWeight: 'bold' }}>0338052164</ThemedText>
                </ThemedText>
                <ThemedText style={styles.bankInfoRow}>
                  🔖 Nội dung chuyển khoản:{' '}
                  <ThemedText style={{ fontWeight: 'bold', color: '#d97706' }}>{orderCode}</ThemedText>
                </ThemedText>
              </View>
            </View>

            {/* THÔNG BÁO TỰ ĐỘNG XÁC NHẬN THANH TOÁN */}
            <View
              style={{
                marginTop: 6,
                backgroundColor: '#ecfdf5',
                borderWidth: 1,
                borderColor: '#a7f3d0',
                borderRadius: 10,
                padding: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="flash-outline" size={20} color="#059669" />
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontSize: 13, fontWeight: '700', color: '#065f46' }}>
                    Xác nhận thanh toán tự động 24/7
                  </ThemedText>
                  <ThemedText style={{ fontSize: 11, color: '#047857', marginTop: 2, lineHeight: 16 }}>
                    Hệ thống tự động cập nhật trạng thái "Đã thanh toán" ngay khi bạn quét mã chuyển tiền thành công mà không cần chụp màn hình hay tải lên ảnh minh chứng!
                  </ThemedText>
                </View>
              </View>

              {/* NÚT KIỂM TRA BIẾN ĐỘNG SỐ DƯ */}
              <TouchableOpacity
                style={{
                  marginTop: 10,
                  backgroundColor: paymentMethod === 'bank' ? '#1d4ed8' : '#be185d',
                  paddingVertical: 9,
                  paddingHorizontal: 14,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
                onPress={triggerCheckPayment}
                disabled={isCheckingPayment || isSubmitting}
              >
                {isCheckingPayment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="refresh-outline" size={17} color="#fff" />
                )}
                <ThemedText style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>
                  Kiểm tra biến động số dư ngay
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* SECTION 6: BILL TOTAL SUMMARY */}
        <ThemedText style={styles.sectionHeaderTitle}>🧾 Chi tiết thanh toán</ThemedText>
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Tiền bánh</ThemedText>
            <ThemedText style={styles.summaryValue}>{subtotal.toLocaleString('vi-VN')}₫</ThemedText>
          </View>

          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Phí giao hàng GHN (Freeship từ 300k)</ThemedText>
            <ThemedText style={styles.summaryValue}>
              {shippingFee === 0 ? 'Miễn phí' : `${shippingFee.toLocaleString('vi-VN')}₫`}
            </ThemedText>
          </View>

          {voucherDiscount > 0 && (
            <View style={styles.summaryRow}>
              <ThemedText style={[styles.summaryLabel, { color: '#10b981' }]}>Giảm giá Voucher</ThemedText>
              <ThemedText style={[styles.summaryValue, { color: '#10b981', fontWeight: 'bold' }]}>
                -{voucherDiscount.toLocaleString('vi-VN')}₫
              </ThemedText>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          <View style={styles.summaryRow}>
            <ThemedText style={styles.totalLabel}>Tổng thanh toán</ThemedText>
            <ThemedText style={[styles.totalValue, { color: colors.tint }]}>
              {totalPayment.toLocaleString('vi-VN')}₫
            </ThemedText>
          </View>
        </View>

        {/* CONFIRM BUTTON */}
        <TouchableOpacity
          style={[
            styles.confirmBtn,
            {
              backgroundColor: paymentMethod === 'bank' ? '#16a34a' : paymentMethod === 'momo' ? '#be185d' : colors.tint,
              opacity: isSubmitting ? 0.7 : 1,
            },
          ]}
          onPress={paymentMethod === 'cod' ? handleConfirmOrder : triggerCheckPayment}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <ThemedText style={styles.confirmBtnText}>
              {paymentMethod === 'cod'
                ? 'XÁC NHẬN ĐẶT HÀNG'
                : '⚡ TÔI ĐÃ CHUYỂN TIỀN - XÁC NHẬN NGAY'}
            </ThemedText>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* MODAL CHỌN TỈNH/THÀNH HOẶC PHƯỜNG/XÃ */}
      <Modal visible={pickerType !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                {pickerType === 'province' ? 'Chọn Tỉnh / Thành phố' : 'Chọn Phường / Xã'}
              </ThemedText>
              <TouchableOpacity onPress={() => setPickerType(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBox, { borderColor: colors.cardBorder }]}>
              <Ionicons name="search-outline" size={18} color={colors.icon} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={pickerType === 'province' ? 'Tìm Tỉnh/Thành phố...' : 'Tìm Phường/Xã...'}
                placeholderTextColor={colors.icon}
                value={pickerSearch}
                onChangeText={setPickerSearch}
              />
            </View>

            <FlatList
              data={(pickerType === 'province' ? filteredProvinces : filteredWards) as any[]}
              keyExtractor={(item, idx) =>
                pickerType === 'province' ? String(item.ProvinceID) : `${item.WardCode}-${idx}`
              }
              style={{ maxHeight: 340 }}
              renderItem={({ item }) => {
                const isProv = pickerType === 'province';
                const label = isProv
                  ? item.ProvinceName
                  : (item.FullName || `${item.WardName}${item.DistrictName ? ` (${item.DistrictName})` : ''}`);
                const isSelected = isProv
                  ? selectedProvince?.ProvinceID === item.ProvinceID
                  : selectedWard?.WardCode === item.WardCode;
                return (
                  <TouchableOpacity
                    style={[
                      styles.pickerOption,
                      { borderBottomColor: colors.cardBorder },
                      isSelected && { backgroundColor: colors.tint + '15' },
                    ]}
                    onPress={() => (isProv ? handleSelectProvince(item) : handleSelectWard(item))}
                  >
                    <ThemedText style={{ fontWeight: isSelected ? 'bold' : '500', flex: 1 }}>
                      {label}
                    </ThemedText>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color={colors.tint} />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <ThemedText style={{ textAlign: 'center', paddingVertical: 20, opacity: 0.6 }}>
                  Không tìm thấy kết quả phù hợp
                </ThemedText>
              }
            />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 8,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 8,
    opacity: 0.85,
  },
  addAddressToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addAddressToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  addressCard: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  addressRadioRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressPersonName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  addressPhone: {
    fontSize: 13,
    opacity: 0.7,
  },
  defaultBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  defaultBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  addressDetailText: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
    opacity: 0.8,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 6,
    opacity: 0.7,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
  },
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  saveDefaultCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 8,
  },
  saveDefaultText: {
    fontSize: 13,
    fontWeight: '500',
  },
  saveAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 8,
  },
  saveAddressBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  itemSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  itemSummaryName: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemSummaryQty: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  itemSummaryPrice: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  voucherInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  voucherInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
  },
  applyBtn: {
    paddingHorizontal: 18,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  appliedVoucherBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    padding: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  appliedVoucherText: {
    flex: 1,
    fontSize: 13,
    color: '#166534',
  },
  suggestedTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    opacity: 0.7,
  },
  voucherChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
  },
  voucherChipCode: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  voucherChipDesc: {
    fontSize: 11,
    marginTop: 2,
    opacity: 0.8,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  paymentSubtitle: {
    fontSize: 12,
    opacity: 0.65,
    marginTop: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  qrHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  qrHeaderSubtitle: {
    fontSize: 12,
    opacity: 0.75,
    marginBottom: 12,
    textAlign: 'center',
  },
  qrImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: '#fff',
  },
  bankInfoBox: {
    marginTop: 12,
    width: '100%',
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 8,
  },
  bankInfoRow: {
    fontSize: 12,
    marginBottom: 4,
  },
  receiptProofSection: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
    paddingTop: 12,
  },
  receiptProofLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#b45309',
  },
  receiptProofHint: {
    fontSize: 12,
    opacity: 0.7,
    marginVertical: 4,
  },
  uploadReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 14,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  uploadReceiptBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  receiptPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  receiptPreviewImage: {
    width: 76,
    height: 76,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  removeReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  removeReceiptBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  ocrScanningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  ocrScanningText: {
    flex: 1,
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '600',
  },
  ocrValidBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  ocrValidText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '600',
    lineHeight: 17,
  },
  ocrInvalidBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  ocrInvalidText: {
    fontSize: 12,
    color: '#991b1b',
    fontWeight: '600',
    lineHeight: 17,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  confirmBtn: {
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 10,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
  },
});
