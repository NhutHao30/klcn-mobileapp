import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { orderApi } from '@/services/api/orderApi';
import apiClient from '@/services/apiClient';
import { formatImageUrl } from '@/config/apiConfig';
import { permissionService } from '@/services/permissionService';

const STATUS_TABS = ['Tất cả', 'Chờ xác nhận', 'Đang chuẩn bị', 'Đang giao', 'Đã giao', 'Trả hàng / Hoàn tiền', 'Đã hủy'];

const CANCEL_REASONS = [
  'Không còn nhu cầu mua hàng',
  'Muốn thay đổi sản phẩm hoặc số lượng',
  'Muốn áp dụng voucher khác',
  'Muốn đổi địa chỉ nhận hàng',
  'Thời gian giao hàng quá lâu',
  'Tìm được sản phẩm phù hợp hơn',
  'Lý do khác',
];

const RETURN_REASONS = [
  'Bánh bị hỏng hóc, dập nát, biến dạng khi vận chuyển',
  'Giao sai loại bánh / kích cỡ đã đặt',
  'Bánh không đảm bảo độ tươi / có mùi lạ / cận date',
  'Giao thiếu sản phẩm hoặc quà tặng kèm',
  'Lý do khác (vui lòng mô tả chi tiết)',
];

export default function CustomerOrdersPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [selectedTab, setSelectedTab] = useState('Tất cả');
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Order Detail Modal State
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailOrder, setDetailOrder] = useState<any>(null);

  // Cancel Order Modal State
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState<any>(null);
  const [selectedCancelReason, setSelectedCancelReason] = useState(CANCEL_REASONS[0]);
  const [cancelNote, setCancelNote] = useState('');
  const [refundBank, setRefundBank] = useState('');
  const [refundAccountNo, setRefundAccountNo] = useState('');
  const [refundAccountName, setRefundAccountName] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Return & Refund Modal State
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [returningOrder, setReturningOrder] = useState<any>(null);
  const [selectedReturnReason, setSelectedReturnReason] = useState(RETURN_REASONS[0]);
  const [returnNote, setReturnNote] = useState('');
  const [returnBank, setReturnBank] = useState('MB');
  const [returnAccountNo, setReturnAccountNo] = useState('');
  const [returnAccountName, setReturnAccountName] = useState('');
  const [returnImageUri, setReturnImageUri] = useState<string | null>(null);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  // Per-Product Review Modal State
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedProductToReview, setSelectedProductToReview] = useState<any>(null);
  const [ratingStars, setRatingStars] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewImageUri, setReviewImageUri] = useState<string | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewedItemKeys, setReviewedItemKeys] = useState<string[]>([]);

  const mapStatusText = (status: any) => {
    if (typeof status === 'string') {
      const s = status.toLowerCase();
      if (s.includes('hoàn hàng') || s.includes('hoan hang')) return 'Đã hoàn hàng';
      if (s.includes('hoàn trả') || s.includes('hoan tra')) return 'Yêu cầu hoàn trả';
      if (s.includes('chờ xác nhận') || s.includes('chờ xử lý') || s.includes('cho xac nhan')) return 'Chờ xác nhận';
      if (s.includes('chuẩn bị') || s.includes('chế biến') || s.includes('chờ lấy hàng') || s.includes('chưa giao')) return 'Đang chuẩn bị';
      if (s.includes('giao') && !s.includes('đã') && !s.includes('da') && !s.includes('thành công')) return 'Đang giao';
      if (s.includes('hoàn thành') || s.includes('đã giao') || s.includes('thành công')) return 'Đã giao';
      if (s.includes('hủy') || s.includes('huy')) return 'Đã hủy';
      return status;
    }
    const num = Number(status);
    switch (num) {
      case 0:
        return 'Đã hủy';
      case 1:
        return 'Chờ xác nhận';
      case 2:
      case 7:
        return 'Đang chuẩn bị';
      case 3:
        return 'Đang giao';
      case 4:
      case 5:
        return 'Đã giao';
      case 6:
        return 'Đã hoàn hàng';
      case 8:
        return 'Yêu cầu hoàn trả';
      default:
        return 'Chờ xác nhận';
    }
  };

  const loadOrders = async () => {
    try {
      const data = await orderApi.getMyOrders();
      const items = Array.isArray(data) ? data : data?.data || [];

      const formatted = items.map((ord: any) => {
        const chitietList = ord.chitiet || ord.chiTiet || ord.details || ord.items || [];
        const itemsParsed = chitietList.map((ct: any) => ({
          id: ct.id,
          sanphamId: ct.sanphamId || ct.sanPhamId || ct.MASP || ct.maSP || ct.sanpham?.id,
          name: ct.tenSP || ct.sanpham?.TENSP || ct.sanpham?.tenSanPham || ct.TENSP || ct.name || 'Sản phẩm',
          quantity: Number(ct.soLuong || ct.SO_LUONG || ct.quantity || 1),
          price: Number(ct.donGia || ct.DONGIA || ct.GIA || ct.price || 0),
          image: ct.image || ct.hinhAnh || ct.sanpham?.HINHANH || ct.sanpham?.hinhAnh || null,
          daDanhGia: Boolean(ct.daDanhGia || ct.isReviewed),
        }));

        const rawStatus = ord.trangThaiDonHang ?? ord.trangThai ?? ord.TRANGTHAI ?? ord.status;
        const mappedStatus = mapStatusText(ord.trangThai ?? ord.TRANGTHAI ?? rawStatus);

        const rawPm =
          ord.phuongThucThanhToan ??
          ord.phuongThucTT ??
          ord.PHUONGTHUCTHANHTOAN ??
          (ord.HINHTHUC_TT === 1 ? 'Chuyển khoản / VietQR' : ord.HINHTHUC_TT === 2 ? 'MoMo' : 'COD');

        const pmText =
          rawPm === 1 || String(rawPm).toLowerCase().includes('vietqr') || String(rawPm).toLowerCase().includes('chuyển khoản')
            ? 'Chuyển khoản / VietQR'
            : rawPm === 2 || String(rawPm).toLowerCase().includes('momo')
            ? 'Ví MoMo'
            : 'COD (Thanh toán khi nhận hàng)';

        const isPaidTransfer =
          pmText.includes('VietQR') ||
          pmText.includes('Chuyển khoản') ||
          pmText.includes('MoMo') ||
          Number(ord.phuongThucThanhToan) === 1 ||
          Number(ord.phuongThucThanhToan) === 2 ||
          Boolean(ord.minhChungThanhToan);

        return {
          rawId: ord.id,
          id: ord.MAHD || ord.maHD || ord.maDonHang || ord.id || `DH-${ord.MADH || ''}`,
          date:
            ord.ngayLap ||
            (ord.created_at ? new Date(ord.created_at).toLocaleString('vi-VN') : 'Mới tạo'),
          status: mappedStatus,
          trangThaiDonHang: ord.trangThaiDonHang,
          itemsCount:
            itemsParsed.reduce((acc: number, cur: any) => acc + (cur.quantity || 1), 0) ||
            ord.chitiet_count ||
            1,
          subtotal: Number(ord.tongTienHang || ord.TONG_TIEN || ord.tongTien || 0),
          shippingFee: Number(ord.phiVanChuyen || 0),
          discount: Number(ord.soTienGiam || 0),
          total: Number(ord.TONG_TIEN || ord.tongTien || ord.SOTIEN || ord.total || 0),
          items: itemsParsed,
          storeName: ord.tenCuaHang || 'Givral Bakery',
          hoTenNguoiNhan:
            ord.hoTenNguoiNhan ||
            ord.tenKH ||
            ord.hoTenKH ||
            ord.HOTEN_KH ||
            ord.khach_hang?.HOTEN ||
            'Khách hàng',
          soDienThoaiNhan:
            ord.soDienThoaiNhan ||
            ord.sdtKH ||
            ord.SDT ||
            ord.khach_hang?.SDT ||
            'Chưa cập nhật',
          diaChiGiao: ord.diaChiGiao || ord.diaChiGiaoHang || ord.DIACHI_GIAO || 'Nhận tại cửa hàng',
          ghiChu: ord.ghiChu || '',
          lyDoHuy: ord.lyDoHuy || '',
          ghiChuHuy: ord.ghiChuHuy || '',
          lyDoHoanTra: ord.lyDoHoanTra || ord.ly_do_hoan_tra || '',
          ghiChuHoanTra: ord.ghiChuHoanTra || ord.ghi_chu_hoan_tra || '',
          hinhAnhHoanTra: ord.hinhAnhHoanTra || ord.hinh_anh_hoan_tra || null,
          ngayYeuCauHoanTra: ord.ngayYeuCauHoanTra || '',
          trangThaiHoanHang: ord.trangThaiHoanHang || ord.trang_thai_hoan_hang || '',
          lyDoTuChoiHoanTra: ord.lyDoTuChoiHoanTra || '',
          nganHangHoanTien: ord.nganHangHoanTien || ord.ngan_hang_hoan_tien || '',
          soTaiKhoanHoanTien: ord.soTaiKhoanHoanTien || ord.so_tai_khoan_hoan_tien || '',
          tenNguoiNhanHoanTien: ord.tenNguoiNhanHoanTien || ord.ten_nguoi_nhan_hoan_tien || '',
          phuongThucThanhToan: pmText,
          paymentMethod: pmText,
          trangThaiThanhToan: ord.trangThaiThanhToan,
          minhChungThanhToan: ord.minhChungThanhToan || null,
          hasReceipt: Boolean(ord.minhChungThanhToan),
          receiptUrl: ord.minhChungThanhToan || null,
          isPaidTransfer,
          nganHangHoan: ord.nganHangHoan || ord.ngan_hang_hoan || '',
          soTaiKhoanHoan: ord.soTaiKhoanHoan || ord.so_tai_khoan_hoan || '',
          chuTaiKhoanHoan: ord.chuTaiKhoanHoan || ord.chu_tai_khoan_hoan || '',
          trangThaiHoanTien:
            ord.trangThaiHoanTien ||
            (Number(ord.trangThaiThanhToan) === 2
              ? 'Đang xử lý hoàn tiền'
              : mappedStatus === 'Đã hủy' && isPaidTransfer
              ? 'Chờ kế toán hoàn tiền'
              : ''),
          isReviewed: Boolean(
            ord.daDanhGia || ord.isReviewed || (itemsParsed.length > 0 && itemsParsed.every((i: any) => i.daDanhGia))
          ),
        };
      });

      setOrdersList(formatted);
    } catch (e) {
      console.error('Failed to load orders:', e);
      setOrdersList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrders();
  }, []);

  const filteredOrders = ordersList.filter((order) => {
    if (selectedTab === 'Tất cả') return true;
    if (selectedTab === 'Trả hàng / Hoàn tiền') {
      return (
        Number(order.trangThaiDonHang) === 8 ||
        Number(order.trangThaiDonHang) === 6 ||
        order.status === 'Yêu cầu hoàn trả' ||
        order.status === 'Đã hoàn hàng' ||
        Boolean(order.trangThaiHoanHang)
      );
    }
    return order.status === selectedTab;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Chờ xác nhận':
        return '#f59e0b';
      case 'Đang chuẩn bị':
        return '#8b5cf6';
      case 'Đang giao':
        return '#3b82f6';
      case 'Đã giao':
        return '#10b981';
      case 'Yêu cầu hoàn trả':
        return '#f97316';
      case 'Đã hoàn hàng':
        return '#ea580c';
      case 'Đã hủy':
        return '#ef4444';
      default:
        return colors.text;
    }
  };

  const canCancelOrder = (order: any) => {
    return (order.status === 'Chờ xác nhận' || order.status === 'Đang chuẩn bị') && Number(order.trangThaiThanhToan) === 0;
  };

  const isProcessingPaid = (order: any) => {
    return (order.status === 'Chờ xác nhận' || order.status === 'Đang chuẩn bị') && Number(order.trangThaiThanhToan) === 1;
  };

  const isReturnable = (order: any) => {
    return (order.status === 'Đã giao' || order.status === 'Đã hoàn thành') &&
      order.trangThaiDonHang !== 6 &&
      order.trangThaiDonHang !== 8 &&
      !order.trangThaiHoanHang;
  };

  const handleOpenReturnModal = (order: any) => {
    setReturningOrder(order);
    setSelectedReturnReason(RETURN_REASONS[0]);
    setReturnNote('');
    setReturnBank('MB');
    setReturnAccountNo('');
    setReturnAccountName(order.hoTenNguoiNhan || '');
    setReturnImageUri(null);
    setReturnModalVisible(true);
  };

  const handlePickReturnImage = async () => {
    const granted = await permissionService.requestMediaLibraryPermission();
    if (!granted) {
      Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền thư viện ảnh để đính kèm hình ảnh bánh bị lỗi/hỏng!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setReturnImageUri(result.assets[0].uri);
    }
  };

  const handleConfirmReturnOrder = async () => {
    if (!returningOrder) return;
    if (!selectedReturnReason) {
      Alert.alert('Thông báo', 'Vui lòng chọn lý do hoàn trả bánh!');
      return;
    }
    if (!returnNote.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập mô tả chi tiết tình trạng bánh hỏng!');
      return;
    }
    const isPaid = Number(returningOrder.trangThaiThanhToan) === 1 || returningOrder.isPaidTransfer;
    if (isPaid) {
      if (!returnAccountNo.trim() || !returnAccountName.trim()) {
        Alert.alert(
          'Thông tin hoàn tiền',
          'Đơn hàng này đã thanh toán. Vui lòng nhập đầy đủ Số tài khoản và Tên chủ tài khoản để tiệm chuyển hoàn tiền cho bạn!'
        );
        return;
      }
    }

    try {
      setIsSubmittingReturn(true);
      const formData = new FormData();
      formData.append('lyDoHoanTra', selectedReturnReason);
      formData.append('ghiChuHoanTra', returnNote.trim());
      formData.append('nganHangHoanTien', returnBank);
      formData.append('soTaiKhoanHoanTien', returnAccountNo.trim());
      formData.append('tenNguoiNhanHoanTien', returnAccountName.trim().toUpperCase());

      if (returnImageUri) {
        const filename = returnImageUri.split('/').pop() || 'return.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const ext = match ? match[1].toLowerCase() : 'jpg';
        const type = ext === 'png' ? 'image/png' : 'image/jpeg';

        formData.append('hinhAnhHoanTra', {
          uri: returnImageUri,
          name: filename,
          type,
        } as any);
      }

      await apiClient.post(`/my-orders/${returningOrder.id}/request-return`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Thành công', 'Đã gửi yêu cầu Trả hàng & Hoàn tiền thành công! Tiệm sẽ kiểm tra và phản hồi sớm nhất.');
      setReturnModalVisible(false);
      setDetailModalVisible(false);
      loadOrders();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.error || 'Có lỗi xảy ra khi gửi yêu cầu hoàn trả.');
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  const handleOpenCancelModal = (order: any) => {
    setCancellingOrder(order);
    setSelectedCancelReason(CANCEL_REASONS[0]);
    setCancelNote('');
    setRefundBank('');
    setRefundAccountNo('');
    setRefundAccountName(order.hoTenNguoiNhan || '');
    setCancelModalVisible(true);
  };

  const handleConfirmCancelOrder = async () => {
    if (!cancellingOrder) return;
    if (!selectedCancelReason) {
      Alert.alert('Thông báo', 'Vui lòng chọn lý do hủy đơn hàng!');
      return;
    }
    if (selectedCancelReason === 'Lý do khác' && !cancelNote.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập cụ thể lý do hủy đơn hàng!');
      return;
    }
    if (cancellingOrder.isPaidTransfer) {
      if (!refundBank.trim() || !refundAccountNo.trim() || !refundAccountName.trim()) {
        Alert.alert(
          'Thông tin hoàn tiền',
          'Đơn hàng đã thanh toán chuyển khoản. Vui lòng nhập đầy đủ Ngân hàng, Số tài khoản và Tên chủ tài khoản để tiệm hoàn tiền cho bạn!'
        );
        return;
      }
    }

    setIsCancelling(true);
    try {
      const noteCombined = cancellingOrder.isPaidTransfer
        ? `${cancelNote.trim() ? cancelNote.trim() + ' | ' : ''}Hoàn tiền về: ${refundBank.trim()} - STK: ${refundAccountNo.trim()} (${refundAccountName.trim()})`
        : cancelNote.trim();

      await orderApi.cancelOrder(String(cancellingOrder.id), {
        ly_do: selectedCancelReason,
        ghi_chu: noteCombined,
        ngan_hang_hoan: refundBank.trim() || undefined,
        so_tai_khoan_hoan: refundAccountNo.trim() || undefined,
        chu_tai_khoan_hoan: refundAccountName.trim() || undefined,
      });

      Alert.alert(
        'Đã hủy đơn hàng',
        cancellingOrder.isPaidTransfer
          ? 'Đơn hàng đã được hủy. Yêu cầu hoàn tiền chuyển khoản của bạn đã được chuyển tới bộ phận Kế toán!'
          : 'Đơn hàng của bạn đã được hủy thành công.'
      );
      setCancelModalVisible(false);
      setDetailModalVisible(false);
      loadOrders();
    } catch (e: any) {
      const msg = e.response?.data?.error || e.response?.data?.message || 'Không thể hủy đơn hàng.';
      Alert.alert('Lỗi hủy đơn', msg);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleOpenReview = (order: any, productItem?: any) => {
    setSelectedOrder(order);
    const defaultProd = productItem || (order.items && order.items[0]) || null;
    setSelectedProductToReview(defaultProd);
    setRatingStars(5);
    setReviewComment('');
    setReviewImageUri(null);
    setReviewModalVisible(true);
  };

  const handlePickReviewImage = async () => {
    const granted = await permissionService.requestMediaLibraryPermission();
    if (!granted) {
      Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền thư viện ảnh để đính kèm hình ảnh đánh giá bánh!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setReviewImageUri(result.assets[0].uri);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedOrder) return;
    if (!reviewComment.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập nhận xét/cảm nhận của bạn về sản phẩm!');
      return;
    }

    const spId =
      selectedProductToReview?.sanphamId ||
      selectedProductToReview?.id ||
      selectedOrder.items?.[0]?.sanphamId;

    setIsSubmittingReview(true);
    try {
      const formData = new FormData();
      formData.append('donhangId', String(selectedOrder.id));
      formData.append('donHangId', String(selectedOrder.id));
      if (spId) {
        formData.append('sanphamId', String(spId));
        formData.append('sanPhamId', String(spId));
      }
      formData.append('soSao', String(ratingStars));
      formData.append('noiDung', reviewComment.trim());

      if (reviewImageUri) {
        const filename = reviewImageUri.split('/').pop() || 'review.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const ext = match ? match[1].toLowerCase() : 'jpg';
        const type = ext === 'png' ? 'image/png' : 'image/jpeg';

        formData.append('hinhAnh', {
          uri: reviewImageUri,
          name: filename,
          type,
        } as any);
      }

      await apiClient.post('/reviews', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const key = `${selectedOrder.id}_${spId || 'all'}`;
      setReviewedItemKeys((prev) => [...prev, key]);

      Alert.alert(
        '🎉 Thành công',
        `Cảm ơn bạn đã gửi đánh giá cho "${selectedProductToReview?.name || 'sản phẩm'}"!`
      );
      setReviewModalVisible(false);
      loadOrders();
    } catch (e: any) {
      const msg = e.response?.data?.error || e.response?.data?.message || 'Không thể gửi đánh giá';
      Alert.alert('Lỗi', msg);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const isProductReviewed = (orderId: string, prod: any) => {
    const spId = prod?.sanphamId || prod?.id || 'all';
    return Boolean(prod?.daDanhGia || reviewedItemKeys.includes(`${orderId}_${spId}`));
  };

  const renderOrder = ({ item }: { item: any }) => {
    const isCompleted = item.status === 'Đã giao';
    const isCancelled = item.status === 'Đã hủy';
    const allowCancel = canCancelOrder(item);

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          setDetailOrder(item);
          setDetailModalVisible(true);
        }}
        style={[styles.orderCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
      >
        <View style={styles.orderHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="receipt-outline" size={16} color={colors.tint} />
              <ThemedText style={styles.orderId}>#{item.id}</ThemedText>
            </View>
            <ThemedText style={styles.orderDate}>{item.date}</ThemedText>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '18' }]}>
            <ThemedText style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status}
            </ThemedText>
          </View>
        </View>

        {/* CUSTOMER DELIVERY SUMMARY */}
        <View style={styles.customerMiniBox}>
          <ThemedText style={styles.customerMiniText} numberOfLines={1}>
            👤 {item.hoTenNguoiNhan} • 📞 {item.soDienThoaiNhan}
          </ThemedText>
          <ThemedText style={styles.customerMiniText} numberOfLines={1}>
            📍 {item.diaChiGiao}
          </ThemedText>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

        {/* ITEMS LIST WITH PER-PRODUCT REVIEW BUTTON */}
        <View style={styles.itemList}>
          {item.items && item.items.length > 0 ? (
            item.items.map((prod: any, idx: number) => {
              const prodReviewed = isProductReviewed(item.id, prod);
              return (
                <View key={idx} style={styles.itemRow}>
                  {prod.image ? (
                    <Image
                      source={{ uri: formatImageUrl(prod.image) }}
                      style={styles.itemThumb}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.itemThumbPlaceholder, { backgroundColor: colors.cardBorder }]}>
                      <Ionicons name="fast-food-outline" size={18} color={colors.text} style={{ opacity: 0.5 }} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.itemTitle} numberOfLines={1}>
                      {prod.name}
                    </ThemedText>
                    <ThemedText style={styles.itemSub}>
                      Số lượng: x{prod.quantity}{' '}
                      {prod.price > 0 ? `• ${Number(prod.price).toLocaleString('vi-VN')}₫` : ''}
                    </ThemedText>
                  </View>

                  {isCompleted && (
                    prodReviewed ? (
                      <View style={styles.alreadyReviewedBadge}>
                        <Ionicons name="checkmark-circle" size={13} color="#15803d" />
                        <ThemedText style={styles.alreadyReviewedText}>Đã đánh giá</ThemedText>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.writeReviewBtn, { borderColor: '#f59e0b' }]}
                        onPress={() => handleOpenReview(item, prod)}
                      >
                        <Ionicons name="star" size={12} color="#f59e0b" style={{ marginRight: 4 }} />
                        <ThemedText style={styles.writeReviewText}>Đánh giá</ThemedText>
                      </TouchableOpacity>
                    )
                  )}
                </View>
              );
            })
          ) : (
            <ThemedText style={styles.itemText}>Chi tiết đơn hàng đang cập nhật</ThemedText>
          )}
        </View>

        {/* PAYMENT & RECEIPT / REFUND BADGE */}
        <View style={styles.paymentInfoRow}>
          <View style={styles.badgeRow}>
            <Ionicons name="wallet-outline" size={14} color="#6b7280" />
            <ThemedText style={styles.badgeText}>{item.paymentMethod}</ThemedText>
          </View>
          {item.hasReceipt && (
            <View style={[styles.badgeRow, { backgroundColor: '#ecfdf5', borderColor: '#10b981' }]}>
              <Ionicons name="checkmark-circle" size={14} color="#10b981" />
              <ThemedText style={[styles.badgeText, { color: '#047857' }]}>Đã tải minh chứng</ThemedText>
            </View>
          )}
        </View>

        {isCancelled && item.lyDoHuy ? (
          <View style={styles.cancelReasonBanner}>
            <ThemedText style={styles.cancelReasonText}>
              Lý do hủy: {item.lyDoHuy}
              {item.trangThaiHoanTien ? ` • ${item.trangThaiHoanTien}` : ''}
            </ThemedText>
          </View>
        ) : null}

        {Number(item.trangThaiDonHang) === 8 && (
          <View style={[styles.cancelReasonBanner, { backgroundColor: '#fff7ed', borderColor: '#fdba74' }]}>
            <Ionicons name="time-outline" size={14} color="#ea580c" />
            <ThemedText style={[styles.cancelReasonText, { color: '#c2410c' }]}>
              Đang yêu cầu trả hàng & hoàn tiền (Chờ duyệt)
            </ThemedText>
          </View>
        )}

        {Number(item.trangThaiDonHang) === 6 && (
          <View style={[styles.cancelReasonBanner, { backgroundColor: '#f0fdf4', borderColor: '#86efac' }]}>
            <Ionicons name="checkmark-done-circle-outline" size={14} color="#16a34a" />
            <ThemedText style={[styles.cancelReasonText, { color: '#15803d' }]}>
              Đã duyệt hoàn tất trả hàng và hoàn tiền ({item.total.toLocaleString('vi-VN')}₫)
            </ThemedText>
          </View>
        )}

        {item.trangThaiHoanHang === 'TU_CHOI' && (
          <View style={[styles.cancelReasonBanner, { backgroundColor: '#fef2f2', borderColor: '#fca5a5' }]}>
            <Ionicons name="close-circle-outline" size={14} color="#dc2626" />
            <ThemedText style={[styles.cancelReasonText, { color: '#b91c1c' }]}>
              Từ chối trả hàng: {item.lyDoTuChoiHoanTra || 'Không đủ điều kiện'}
            </ThemedText>
          </View>
        )}

        <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

        <View style={styles.orderFooter}>
          <ThemedText style={styles.itemsCountText}>{item.itemsCount} sản phẩm</ThemedText>

          <View style={styles.totalRow}>
            <ThemedText style={styles.totalLabel}>Tổng thanh toán: </ThemedText>
            <ThemedText style={[styles.totalValue, { color: colors.tint }]}>
              {item.total.toLocaleString('vi-VN')}₫
            </ThemedText>
          </View>
        </View>

        {/* ACTION BAR: VIEW DETAILS / CANCEL ORDER / REVIEW / RETURN */}
        <View style={[styles.cardActionsRow, { borderTopColor: colors.cardBorder }]}>
          <TouchableOpacity
            style={[styles.detailBtn, { borderColor: colors.cardBorder }]}
            onPress={() => {
              setDetailOrder(item);
              setDetailModalVisible(true);
            }}
          >
            <Ionicons name="eye-outline" size={15} color={colors.text} />
            <ThemedText style={styles.detailBtnText}>Chi tiết đơn</ThemedText>
          </TouchableOpacity>

          {allowCancel && (
            <TouchableOpacity
              style={styles.cancelOrderBtn}
              onPress={() => handleOpenCancelModal(item)}
            >
              <Ionicons name="close-circle-outline" size={15} color="#dc2626" />
              <ThemedText style={styles.cancelOrderBtnText}>Hủy đơn hàng</ThemedText>
            </TouchableOpacity>
          )}

          {isProcessingPaid(item) && (
            <View style={styles.lockNoticeBadge}>
              <Ionicons name="lock-closed" size={13} color="#b45309" />
              <ThemedText style={styles.lockNoticeText}>Đang chuẩn bị (Đã thanh toán)</ThemedText>
            </View>
          )}

          {isReturnable(item) && (
            <TouchableOpacity
              style={[styles.returnOrderBtn, { borderColor: '#ea580c' }]}
              onPress={() => handleOpenReturnModal(item)}
            >
              <Ionicons name="arrow-undo-outline" size={14} color="#ea580c" />
              <ThemedText style={[styles.returnOrderBtnText, { color: '#ea580c' }]}>Trả hàng / Hoàn tiền</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Đơn hàng của tôi</ThemedText>
        <TouchableOpacity style={styles.backButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* STATUS TABS */}
      <View style={{ paddingVertical: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {STATUS_TABS.map((tab) => {
            const isSelected = selectedTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.statusTab,
                  {
                    backgroundColor: isSelected ? colors.tint : colors.cardBg,
                    borderColor: colors.cardBorder,
                  },
                ]}
                onPress={() => setSelectedTab(tab)}
              >
                <ThemedText style={[styles.tabText, { color: isSelected ? '#fff' : colors.text }]}>
                  {tab}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <ThemedText style={{ marginTop: 12, opacity: 0.7 }}>Đang tải danh sách đơn hàng...</ThemedText>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item: any, index: number) => String(item?.id || index)}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.tint]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color={colors.text} style={{ opacity: 0.25 }} />
              <ThemedText style={styles.emptyTitle}>
                {selectedTab === 'Tất cả'
                  ? 'Bạn chưa có đơn hàng nào'
                  : `Không có đơn hàng nào ở mục "${selectedTab}"`}
              </ThemedText>
              <ThemedText style={styles.emptySubtitle}>
                Hãy khám phá các món bánh tươi ngon và đặt ngay nhé!
              </ThemedText>
              <TouchableOpacity
                style={[styles.shopButton, { backgroundColor: colors.tint }]}
                onPress={() => router.push('/(customer)/(tabs)' as any)}
              >
                <ThemedText style={styles.shopButtonText}>Mua sắm ngay</ThemedText>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* MODAL CHI TIẾT ĐƠN HÀNG (THÔNG TIN KHÁCH HÀNG & THANH TOÁN) */}
      <Modal visible={detailModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.cardBg, maxHeight: '88%' }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                Chi tiết đơn #{detailOrder?.id}
              </ThemedText>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {detailOrder && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Trạng thái đơn */}
                <View
                  style={[
                    styles.detailSectionBox,
                    { backgroundColor: getStatusColor(detailOrder.status) + '15', borderColor: getStatusColor(detailOrder.status) },
                  ]}
                >
                  <ThemedText style={{ fontWeight: 'bold', color: getStatusColor(detailOrder.status) }}>
                    Trạng thái: {detailOrder.status}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                    Ngày đặt: {detailOrder.date} • Chi nhánh: {detailOrder.storeName}
                  </ThemedText>
                  {detailOrder.lyDoHuy ? (
                    <ThemedText style={{ fontSize: 12, color: '#dc2626', marginTop: 4, fontWeight: '600' }}>
                      Lý do hủy: {detailOrder.lyDoHuy}
                    </ThemedText>
                  ) : null}
                </View>

                {/* Thông tin khách hàng */}
                <ThemedText style={styles.detailGroupTitle}>👤 Thông tin khách hàng</ThemedText>
                <View style={[styles.detailInfoBox, { borderColor: colors.cardBorder }]}>
                  <ThemedText style={styles.detailLine}>
                    • Người nhận: <ThemedText style={{ fontWeight: 'bold' }}>{detailOrder.hoTenNguoiNhan}</ThemedText>
                  </ThemedText>
                  <ThemedText style={styles.detailLine}>
                    • Số điện thoại: <ThemedText style={{ fontWeight: 'bold' }}>{detailOrder.soDienThoaiNhan}</ThemedText>
                  </ThemedText>
                  <ThemedText style={styles.detailLine}>
                    • Địa chỉ giao: <ThemedText style={{ fontWeight: '600' }}>{detailOrder.diaChiGiao}</ThemedText>
                  </ThemedText>
                  {detailOrder.ghiChu ? (
                    <ThemedText style={styles.detailLine}>• Ghi chú: {detailOrder.ghiChu}</ThemedText>
                  ) : null}
                </View>

                {/* Thông tin thanh toán */}
                <ThemedText style={styles.detailGroupTitle}>💳 Thông tin thanh toán</ThemedText>
                <View style={[styles.detailInfoBox, { borderColor: colors.cardBorder }]}>
                  <ThemedText style={styles.detailLine}>
                    • Phương thức: <ThemedText style={{ fontWeight: 'bold' }}>{detailOrder.phuongThucThanhToan}</ThemedText>
                  </ThemedText>
                  <ThemedText style={styles.detailLine}>
                    • Trạng thái thanh toán:{' '}
                    <ThemedText style={{ fontWeight: 'bold', color: Number(detailOrder.trangThaiThanhToan) === 1 ? '#16a34a' : '#d97706' }}>
                      {Number(detailOrder.trangThaiThanhToan) === 2
                        ? 'Đang hoàn tiền'
                        : Number(detailOrder.trangThaiThanhToan) === 1 || detailOrder.hasReceipt
                        ? 'Đã thanh toán / Đã gửi biên lai'
                        : 'Thanh toán khi nhận hàng'}
                    </ThemedText>
                  </ThemedText>
                  {detailOrder.trangThaiHoanTien ? (
                    <ThemedText style={[styles.detailLine, { color: '#2563eb', fontWeight: '600' }]}>
                      • Hoàn tiền: {detailOrder.trangThaiHoanTien}
                    </ThemedText>
                  ) : null}
                  {detailOrder.ghiChuHuy ? (
                    <ThemedText style={[styles.detailLine, { fontSize: 12, opacity: 0.8 }]}>
                      • Chi tiết hủy/hoàn tiền: {detailOrder.ghiChuHuy}
                    </ThemedText>
                  ) : null}

                  {detailOrder.receiptUrl && (
                    <View style={{ marginTop: 8 }}>
                      <ThemedText style={{ fontSize: 12, fontWeight: '600', marginBottom: 6 }}>
                        Ảnh minh chứng chuyển khoản:
                      </ThemedText>
                      <Image
                        source={{ uri: formatImageUrl(detailOrder.receiptUrl) }}
                        style={styles.detailReceiptImg}
                        resizeMode="cover"
                      />
                    </View>
                  )}
                </View>

                {/* Danh sách sản phẩm */}
                <ThemedText style={styles.detailGroupTitle}>🎂 Danh sách sản phẩm</ThemedText>
                <View style={[styles.detailInfoBox, { borderColor: colors.cardBorder }]}>
                  {detailOrder.items.map((prod: any, idx: number) => (
                    <View key={idx} style={[styles.itemRow, { marginBottom: 8 }]}>
                      {prod.image && (
                        <Image
                          source={{ uri: formatImageUrl(prod.image) }}
                          style={styles.itemThumb}
                          resizeMode="cover"
                        />
                      )}
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.itemTitle}>{prod.name}</ThemedText>
                        <ThemedText style={styles.itemSub}>
                          SL: x{prod.quantity} • {Number(prod.price).toLocaleString('vi-VN')}₫
                        </ThemedText>
                      </View>
                      {detailOrder.status === 'Đã giao' && (
                        <TouchableOpacity
                          style={[styles.writeReviewBtn, { borderColor: '#f59e0b' }]}
                          onPress={() => {
                            setDetailModalVisible(false);
                            handleOpenReview(detailOrder, prod);
                          }}
                        >
                          <Ionicons name="star" size={12} color="#f59e0b" style={{ marginRight: 4 }} />
                          <ThemedText style={styles.writeReviewText}>Đánh giá</ThemedText>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}

                  <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
                  <View style={styles.summaryLine}>
                    <ThemedText style={{ fontSize: 13, opacity: 0.75 }}>Phí giao hàng:</ThemedText>
                    <ThemedText style={{ fontSize: 13 }}>
                      {detailOrder.shippingFee > 0
                        ? `${detailOrder.shippingFee.toLocaleString('vi-VN')}₫`
                        : 'Miễn phí'}
                    </ThemedText>
                  </View>
                  {detailOrder.discount > 0 && (
                    <View style={styles.summaryLine}>
                      <ThemedText style={{ fontSize: 13, color: '#16a34a' }}>Giảm giá Voucher:</ThemedText>
                      <ThemedText style={{ fontSize: 13, color: '#16a34a', fontWeight: 'bold' }}>
                        -{detailOrder.discount.toLocaleString('vi-VN')}₫
                      </ThemedText>
                    </View>
                  )}
                  <View style={[styles.summaryLine, { marginTop: 4 }]}>
                    <ThemedText style={{ fontSize: 15, fontWeight: 'bold' }}>Tổng thanh toán:</ThemedText>
                    <ThemedText style={{ fontSize: 16, fontWeight: 'bold', color: colors.tint }}>
                      {detailOrder.total.toLocaleString('vi-VN')}₫
                    </ThemedText>
                  </View>
                </View>

                {/* Thông tin Trả hàng & Hoàn tiền (nếu có yêu cầu) */}
                {(Number(detailOrder.trangThaiDonHang) === 8 || Number(detailOrder.trangThaiDonHang) === 6 || Boolean(detailOrder.trangThaiHoanHang)) && (
                  <>
                    <ThemedText style={styles.detailGroupTitle}>🔄 Thông tin Trả hàng & Hoàn tiền</ThemedText>
                    <View style={[styles.detailInfoBox, { borderColor: '#fdba74', backgroundColor: '#fff7ed' }]}>
                      <ThemedText style={[styles.detailLine, { color: '#c2410c', fontWeight: 'bold' }]}>
                        • Trạng thái: {Number(detailOrder.trangThaiDonHang) === 6 ? 'Đã hoàn tất trả hàng & hoàn tiền' : detailOrder.trangThaiHoanHang === 'TU_CHOI' ? 'Cửa hàng đã từ chối' : 'Đang chờ cửa hàng phê duyệt'}
                      </ThemedText>
                      {detailOrder.lyDoHoanTra ? (
                        <ThemedText style={styles.detailLine}>
                          • Lý do hoàn trả: <ThemedText style={{ fontWeight: '600' }}>{detailOrder.lyDoHoanTra}</ThemedText>
                        </ThemedText>
                      ) : null}
                      {detailOrder.ghiChuHoanTra ? (
                        <ThemedText style={styles.detailLine}>
                          • Mô tả chi tiết: {detailOrder.ghiChuHoanTra}
                        </ThemedText>
                      ) : null}
                      {detailOrder.lyDoTuChoiHoanTra ? (
                        <ThemedText style={[styles.detailLine, { color: '#dc2626' }]}>
                          • Lý do từ chối: {detailOrder.lyDoTuChoiHoanTra}
                        </ThemedText>
                      ) : null}
                      {(detailOrder.soTaiKhoanHoanTien || detailOrder.soTaiKhoanHoan) ? (
                        <ThemedText style={styles.detailLine}>
                          • Tài khoản nhận hoàn tiền: {detailOrder.nganHangHoanTien || detailOrder.nganHangHoan} - {detailOrder.soTaiKhoanHoanTien || detailOrder.soTaiKhoanHoan} ({detailOrder.tenNguoiNhanHoanTien || detailOrder.chuTaiKhoanHoan})
                        </ThemedText>
                      ) : null}
                      {detailOrder.hinhAnhHoanTra && (
                        <View style={{ marginTop: 8 }}>
                          <ThemedText style={{ fontSize: 12, fontWeight: '600', marginBottom: 6 }}>
                            Ảnh minh chứng bánh lỗi/hỏng:
                          </ThemedText>
                          <Image
                            source={{ uri: formatImageUrl(detailOrder.hinhAnhHoanTra) }}
                            style={styles.detailReceiptImg}
                            resizeMode="cover"
                          />
                        </View>
                      )}
                    </View>
                  </>
                )}

                {isProcessingPaid(detailOrder) && (
                  <View style={styles.detailPaidProcessingAlert}>
                    <Ionicons name="information-circle" size={18} color="#b45309" />
                    <ThemedText style={styles.detailPaidProcessingAlertText}>
                      Đơn hàng đã được thanh toán và đang trong quá trình chuẩn bị/chế biến nên không thể tự hủy trên ứng dụng. Quý khách có thể yêu cầu Trả hàng & Hoàn tiền sau khi nhận hàng nếu có sự cố.
                    </ThemedText>
                  </View>
                )}

                {canCancelOrder(detailOrder) && (
                  <TouchableOpacity
                    style={[styles.cancelOrderBtn, { alignSelf: 'stretch', justifyContent: 'center', marginTop: 12, paddingVertical: 11 }]}
                    onPress={() => {
                      setDetailModalVisible(false);
                      handleOpenCancelModal(detailOrder);
                    }}
                  >
                    <Ionicons name="close-circle-outline" size={18} color="#dc2626" />
                    <ThemedText style={[styles.cancelOrderBtnText, { fontSize: 14 }]}>
                      Yêu cầu hủy đơn hàng này
                    </ThemedText>
                  </TouchableOpacity>
                )}

                {isReturnable(detailOrder) && (
                  <TouchableOpacity
                    style={[styles.submitReviewBtn, { backgroundColor: '#ea580c', alignSelf: 'stretch', alignItems: 'center', marginTop: 12, paddingVertical: 12 }]}
                    onPress={() => {
                      setDetailModalVisible(false);
                      handleOpenReturnModal(detailOrder);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="arrow-undo-circle" size={20} color="#fff" />
                      <ThemedText style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>
                        Yêu cầu Trả hàng & Hoàn tiền
                      </ThemedText>
                    </View>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL HỦY ĐƠN HÀNG & THÔNG TIN HOÀN TIỀN NGÂN HÀNG */}
      <Modal visible={cancelModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.cardBg, maxHeight: '88%' }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Hủy đơn hàng #{cancellingOrder?.id}</ThemedText>
              <TouchableOpacity onPress={() => setCancelModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <ThemedText style={{ fontSize: 13, opacity: 0.75, marginBottom: 10 }}>
                Vui lòng chọn lý do bạn muốn hủy đơn hàng này:
              </ThemedText>

              {CANCEL_REASONS.map((reason) => {
                const selected = selectedCancelReason === reason;
                return (
                  <TouchableOpacity
                    key={reason}
                    style={[
                      styles.reasonOption,
                      {
                        borderColor: selected ? colors.tint : colors.cardBorder,
                        backgroundColor: selected ? colors.tint + '12' : 'transparent',
                      },
                    ]}
                    onPress={() => setSelectedCancelReason(reason)}
                  >
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={selected ? colors.tint : colors.icon}
                    />
                    <ThemedText style={{ fontSize: 13, flex: 1, fontWeight: selected ? 'bold' : '500' }}>
                      {reason}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}

              <TextInput
                style={[styles.reviewInput, { color: colors.text, borderColor: colors.cardBorder, minHeight: 64, marginTop: 8 }]}
                placeholder="Ghi chú bổ sung (bắt buộc nếu chọn Lý do khác)..."
                placeholderTextColor={colors.icon}
                value={cancelNote}
                onChangeText={setCancelNote}
                multiline
              />

              {cancellingOrder?.isPaidTransfer && (
                <View style={styles.refundBox}>
                  <ThemedText style={styles.refundTitle}>
                    🏦 Thông tin tài khoản nhận hoàn tiền
                  </ThemedText>
                  <ThemedText style={styles.refundDesc}>
                    Đơn hàng này đã thanh toán qua Chuyển khoản / MoMo. Vui lòng cung cấp tài khoản ngân hàng để bộ phận Kế toán hoàn lại{' '}
                    <ThemedText style={{ fontWeight: 'bold', color: '#b45309' }}>
                      {Number(cancellingOrder.total || 0).toLocaleString('vi-VN')}₫
                    </ThemedText>{' '}
                    cho bạn:
                  </ThemedText>

                  <TextInput
                    style={[styles.refundInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.cardBg }]}
                    placeholder="Tên Ngân hàng (VD: Vietcombank, MB Bank, MoMo...)"
                    placeholderTextColor={colors.icon}
                    value={refundBank}
                    onChangeText={setRefundBank}
                  />
                  <TextInput
                    style={[styles.refundInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.cardBg }]}
                    placeholder="Số tài khoản / SĐT ví nhận hoàn tiền"
                    placeholderTextColor={colors.icon}
                    value={refundAccountNo}
                    onChangeText={setRefundAccountNo}
                    keyboardType="number-pad"
                  />
                  <TextInput
                    style={[styles.refundInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.cardBg }]}
                    placeholder="Họ và tên Chủ tài khoản (Viết hoa không dấu)"
                    placeholderTextColor={colors.icon}
                    value={refundAccountName}
                    onChangeText={setRefundAccountName}
                    autoCapitalize="characters"
                  />
                </View>
              )}

              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={[styles.cancelReviewBtn, { borderColor: colors.cardBorder }]}
                  onPress={() => setCancelModalVisible(false)}
                >
                  <ThemedText style={{ fontWeight: '600' }}>Đóng</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitReviewBtn, { backgroundColor: '#dc2626' }]}
                  onPress={handleConfirmCancelOrder}
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Xác nhận hủy đơn</ThemedText>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL TRẢ HÀNG & HOÀN TIỀN */}
      <Modal visible={returnModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.cardBg, maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.modalTitle}>🔄 Trả hàng & Hoàn tiền</ThemedText>
                <ThemedText style={{ fontSize: 12, opacity: 0.7 }}>Đơn hàng #{returningOrder?.id}</ThemedText>
              </View>
              <TouchableOpacity onPress={() => setReturnModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.returnNoticeBox}>
                <Ionicons name="shield-checkmark" size={18} color="#059669" />
                <ThemedText style={styles.returnNoticeText}>
                  Chính sách đảm bảo: Quý khách được quyền yêu cầu trả hàng & hoàn tiền trong vòng 3 ngày kể từ khi nhận nếu bánh bị dập nát, hỏng hóc hoặc giao sai loại.
                </ThemedText>
              </View>

              <ThemedText style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 8 }}>
                Lý do hoàn trả:
              </ThemedText>
              {RETURN_REASONS.map((reason) => {
                const selected = selectedReturnReason === reason;
                return (
                  <TouchableOpacity
                    key={reason}
                    style={[
                      styles.reasonOption,
                      {
                        borderColor: selected ? '#ea580c' : colors.cardBorder,
                        backgroundColor: selected ? '#ea580c12' : 'transparent',
                      },
                    ]}
                    onPress={() => setSelectedReturnReason(reason)}
                  >
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={selected ? '#ea580c' : colors.icon}
                    />
                    <ThemedText style={{ fontSize: 13, flex: 1, fontWeight: selected ? 'bold' : '500' }}>
                      {reason}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}

              <ThemedText style={{ fontSize: 13, fontWeight: 'bold', marginTop: 10, marginBottom: 6 }}>
                Mô tả chi tiết tình trạng bánh: *
              </ThemedText>
              <TextInput
                style={[styles.reviewInput, { color: colors.text, borderColor: colors.cardBorder, minHeight: 70 }]}
                placeholder="Ví dụ: Bánh bị dập nát góc bên phải khi mở hộp, kem bị chảy..."
                placeholderTextColor={colors.icon}
                value={returnNote}
                onChangeText={setReturnNote}
                multiline
              />

              {/* UPLOAD MINH CHỨNG ẢNH BÁNH HỎNG */}
              <ThemedText style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 6 }}>
                Ảnh minh chứng bánh lỗi / hỏng:
              </ThemedText>
              <View style={{ marginBottom: 14 }}>
                {returnImageUri ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Image source={{ uri: returnImageUri }} style={styles.reviewPickedImg} />
                    <TouchableOpacity
                      style={[styles.cancelOrderBtn, { paddingVertical: 6 }]}
                      onPress={() => setReturnImageUri(null)}
                    >
                      <Ionicons name="trash-outline" size={14} color="#dc2626" />
                      <ThemedText style={styles.cancelOrderBtnText}>Đổi ảnh khác</ThemedText>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.pickReviewImgBtn, { borderColor: '#ea580c' }]}
                    onPress={handlePickReturnImage}
                  >
                    <Ionicons name="camera-outline" size={20} color="#ea580c" />
                    <ThemedText style={{ fontSize: 13, fontWeight: '600', color: '#ea580c' }}>
                      Chụp hoặc tải ảnh bánh thực tế
                    </ThemedText>
                  </TouchableOpacity>
                )}
              </View>

              {/* TÀI KHOẢN NHẬN HOÀN TIỀN NẾU ĐƠN ĐÃ THANH TOÁN */}
              <View style={styles.refundBox}>
                <ThemedText style={styles.refundTitle}>
                  🏦 Tài khoản nhận tiền hoàn lại (
                  <ThemedText style={{ fontWeight: 'bold', color: '#b45309' }}>
                    {Number(returningOrder?.total || 0).toLocaleString('vi-VN')}₫
                  </ThemedText>)
                </ThemedText>
                <ThemedText style={styles.refundDesc}>
                  Sau khi cửa hàng kiểm tra & duyệt yêu cầu, tiệm sẽ hoàn trả 100% về tài khoản này:
                </ThemedText>

                <TextInput
                  style={[styles.refundInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.cardBg }]}
                  placeholder="Ngân hàng nhận (VD: MB Bank, Vietcombank, Techcombank...)"
                  placeholderTextColor={colors.icon}
                  value={returnBank}
                  onChangeText={setReturnBank}
                />
                <TextInput
                  style={[styles.refundInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.cardBg }]}
                  placeholder="Số tài khoản ngân hàng"
                  placeholderTextColor={colors.icon}
                  value={returnAccountNo}
                  onChangeText={setReturnAccountNo}
                  keyboardType="number-pad"
                />
                <TextInput
                  style={[styles.refundInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.cardBg }]}
                  placeholder="Họ và tên chủ tài khoản (Viết hoa không dấu)"
                  placeholderTextColor={colors.icon}
                  value={returnAccountName}
                  onChangeText={setReturnAccountName}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={[styles.cancelReviewBtn, { borderColor: colors.cardBorder }]}
                  onPress={() => setReturnModalVisible(false)}
                >
                  <ThemedText style={{ fontWeight: '600' }}>Hủy bỏ</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitReviewBtn, { backgroundColor: '#ea580c' }]}
                  onPress={handleConfirmReturnOrder}
                  disabled={isSubmittingReturn}
                >
                  {isSubmittingReturn ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Gửi yêu cầu hoàn tiền</ThemedText>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL VIẾT ĐÁNH GIÁ TỪNG SẢN PHẨM (KÈM ẢNH) */}
      <Modal visible={reviewModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.cardBg }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>⭐ Đánh giá sản phẩm</ThemedText>
              <TouchableOpacity onPress={() => setReviewModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedOrder && (
              <ThemedText style={styles.modalOrderCode}>
                Đơn hàng: #{selectedOrder.id}
              </ThemedText>
            )}

            {/* PRODUCT SELECTOR IF ORDER HAS MULTIPLE PRODUCTS */}
            {selectedOrder?.items && selectedOrder.items.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                <ThemedText style={{ fontSize: 12, fontWeight: '600', marginBottom: 6, opacity: 0.75 }}>
                  Chọn sản phẩm đánh giá:
                </ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {selectedOrder.items.map((prod: any, i: number) => {
                    const isSelected =
                      (selectedProductToReview?.sanphamId || selectedProductToReview?.name) ===
                      (prod.sanphamId || prod.name);
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[
                          styles.prodSelectChip,
                          {
                            borderColor: isSelected ? colors.tint : colors.cardBorder,
                            backgroundColor: isSelected ? colors.tint + '15' : 'transparent',
                          },
                        ]}
                        onPress={() => setSelectedProductToReview(prod)}
                      >
                        <ThemedText
                          style={{
                            fontSize: 12,
                            fontWeight: isSelected ? 'bold' : '500',
                            color: isSelected ? colors.tint : colors.text,
                          }}
                          numberOfLines={1}
                        >
                          {prod.name}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* STAR RATING PICKER */}
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRatingStars(star)}
                  style={{ padding: 6 }}
                >
                  <Ionicons
                    name={star <= ratingStars ? 'star' : 'star-outline'}
                    size={36}
                    color="#f59e0b"
                  />
                </TouchableOpacity>
              ))}
            </View>
            <ThemedText style={styles.starTextDesc}>
              {ratingStars === 5
                ? 'Tuyệt vời, cực kỳ hài lòng!'
                : ratingStars === 4
                ? 'Rất tốt, bánh ngon!'
                : ratingStars === 3
                ? 'Bình thường, ổn!'
                : ratingStars === 2
                ? 'Chưa hài lòng lắm'
                : 'Rất thất vọng'}
            </ThemedText>

            {/* REVIEW COMMENT INPUT */}
            <TextInput
              style={[styles.reviewInput, { color: colors.text, borderColor: colors.cardBorder }]}
              placeholder="Chia sẻ cảm nhận về hương vị bánh, đóng gói và dịch vụ giao hàng..."
              placeholderTextColor={colors.icon}
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
              numberOfLines={4}
            />

            {/* REVIEW IMAGE UPLOAD */}
            <View style={{ marginBottom: 16 }}>
              {reviewImageUri ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Image source={{ uri: reviewImageUri }} style={styles.reviewPickedImg} />
                  <TouchableOpacity
                    style={[styles.cancelOrderBtn, { paddingVertical: 6 }]}
                    onPress={() => setReviewImageUri(null)}
                  >
                    <Ionicons name="trash-outline" size={14} color="#dc2626" />
                    <ThemedText style={styles.cancelOrderBtnText}>Xóa ảnh</ThemedText>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.pickReviewImgBtn, { borderColor: colors.tint }]}
                  onPress={handlePickReviewImage}
                >
                  <Ionicons name="camera-outline" size={18} color={colors.tint} />
                  <ThemedText style={{ fontSize: 13, fontWeight: '600', color: colors.tint }}>
                    Thêm hình ảnh thực tế của bánh
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={[styles.cancelReviewBtn, { borderColor: colors.cardBorder }]}
                onPress={() => setReviewModalVisible(false)}
              >
                <ThemedText style={{ fontWeight: '600' }}>Hủy</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitReviewBtn, { backgroundColor: colors.tint }]}
                onPress={handleSubmitReview}
                disabled={isSubmittingReview}
              >
                {isSubmittingReview ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Gửi đánh giá</ThemedText>
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
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tabScroll: {
    paddingHorizontal: 16,
  },
  statusTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  tabText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  orderCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  orderDate: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  customerMiniBox: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  customerMiniText: {
    fontSize: 12,
    opacity: 0.78,
    lineHeight: 17,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  itemList: {
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  itemThumbPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemSub: {
    fontSize: 12,
    opacity: 0.65,
    marginTop: 2,
  },
  itemText: {
    fontSize: 14,
    opacity: 0.8,
  },
  paymentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  badgeText: {
    fontSize: 11,
    color: '#4b5563',
    fontWeight: '500',
  },
  cancelReasonBanner: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  cancelReasonText: {
    fontSize: 12,
    color: '#b91c1c',
    fontWeight: '500',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemsCountText: {
    fontSize: 13,
    opacity: 0.6,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 13,
    opacity: 0.8,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  detailBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cancelOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  cancelOrderBtnText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '700',
  },
  writeReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#fffbeb',
  },
  writeReviewText: {
    fontSize: 11,
    color: '#b45309',
    fontWeight: '700',
  },
  alreadyReviewedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#ecfdf5',
  },
  alreadyReviewedText: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  shopButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  shopButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  modalOrderCode: {
    fontSize: 13,
    opacity: 0.6,
    marginBottom: 12,
  },
  detailSectionBox: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  detailGroupTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 4,
  },
  detailInfoBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  detailLine: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 3,
  },
  detailReceiptImg: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 6,
  },
  refundBox: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    marginBottom: 14,
  },
  refundTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 4,
  },
  refundDesc: {
    fontSize: 12,
    color: '#78350f',
    lineHeight: 17,
    marginBottom: 8,
  },
  refundInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    fontSize: 13,
    marginBottom: 8,
  },
  prodSelectChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 8,
    maxWidth: 180,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 4,
  },
  starTextDesc: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#d97706',
    marginBottom: 12,
  },
  reviewInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 14,
    marginBottom: 12,
  },
  pickReviewImgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 10,
  },
  reviewPickedImg: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelReviewBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  submitReviewBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  lockNoticeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  lockNoticeText: {
    fontSize: 11,
    color: '#92400e',
    fontWeight: '600',
  },
  returnOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fff7ed',
  },
  returnOrderBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailPaidProcessingAlert: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  detailPaidProcessingAlertText: {
    fontSize: 12,
    color: '#78350f',
    flex: 1,
    lineHeight: 18,
  },
  returnNoticeBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  returnNoticeText: {
    fontSize: 12,
    color: '#065f46',
    flex: 1,
    lineHeight: 18,
  },
});
