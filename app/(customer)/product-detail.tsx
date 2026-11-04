import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { productApi } from '@/services/api/productApi';
import apiClient from '@/services/apiClient';
import { formatImageUrl } from '@/config/apiConfig';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import FloatingNotification from '@/components/FloatingNotification';
import LoginRequiredModal from '@/components/LoginRequiredModal';

export default function CustomerProductDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { isLoggedIn } = useAuth();
  const { addToCart, toggleWishlist, isFavorite, notificationMsg, clearNotification } = useCart();

  const [quantity, setQuantity] = useState(1);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [replyingReviewId, setReplyingReviewId] = useState<number | string | null>(null);
  const [reviewReplyText, setReviewReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [loginModalVisible, setLoginModalVisible] = useState(false);

  // Refs để tự động refresh đánh giá mới khi quay lại màn hình (tránh stale closure)
  const resolvedProductIdRef = useRef<string>('');
  const currentLoadedProductRef = useRef<string>('');

  const productId = (params.id as string) || '1';

  // Tự động làm mới khi quay lại hoặc focus vào màn hình chi tiết sản phẩm
  useFocusEffect(
    useCallback(() => {
      if (!productId) return;

      if (currentLoadedProductRef.current === productId && resolvedProductIdRef.current) {
        // Quay lại cùng sản phẩm → chỉ refresh đánh giá mới nhất (nhanh, không tải lại toàn bộ)
        const spId = resolvedProductIdRef.current;
        (async () => {
          try {
            const reviewRes = await apiClient.get(`/products/${spId}/reviews`);
            const reviewList = Array.isArray(reviewRes.data) ? reviewRes.data : (reviewRes.data?.data || []);
            setReviews(reviewList);
          } catch (e) {
            console.log('Lỗi refresh đánh giá:', e);
          }
        })();
      } else {
        // Lần đầu tải hoặc chuyển sang sản phẩm khác → tải toàn bộ dữ liệu
        currentLoadedProductRef.current = productId;
        loadAllData(productId, false);
      }
    }, [productId])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAllData(productId, true);
  }, [productId]);

  const loadAllData = async (id: string, isPullToRefresh = false) => {
    if (!isPullToRefresh && !product) {
      setLoading(true);
    }
    setLoadingReviews(true);

    let currentSpId = id;

    try {
      // 1. Load Product Detail
      const data = await productApi.getProductDetail(id);
      const res = data.sanPham || data.data || data;

      if (res && (res.MASP || res.id)) {
        currentSpId = String(res.id || res.MASP || id);
        resolvedProductIdRef.current = currentSpId;
        const pObj = {
          id: String(res.MASP || res.id),
          numericId: res.id,
          name: res.TENSP || res.name || res.tenSanPham,
          category: res.loaiSanPham?.tenLoai || res.loaisanpham?.TENLOAI || 'Bánh ngọt',
          categoryId: res.loaiId || res.MALOAI || res.LOAISP,
          price: res.GIABAN ? Number(res.GIABAN) : (Number(res.giaBan) || 200000),
          salePrice: res.GIAGIAM ? Number(res.GIAGIAM) : (res.giaGiam ? Number(res.giaGiam) : undefined),
          discount: res.GIAGIAM
            ? Math.round(((Number(res.GIABAN) - Number(res.GIAGIAM)) / Number(res.GIABAN)) * 100)
            : 0,
          rating: 4.9,
          reviewsCount: 0,
          soLuongTon: res.soLuongTon !== undefined ? Number(res.soLuongTon) : (res.SOLUONG_TON !== undefined ? Number(res.SOLUONG_TON) : (res.TONKHO_THUCTE !== undefined ? Number(res.TONKHO_THUCTE) : (res.tonKho !== undefined ? Number(res.tonKho) : 10))),
          isOutOfStock: Boolean(res.isOutOfStock || (res.soLuongTon !== undefined && Number(res.soLuongTon) <= 0) || (res.SOLUONG_TON !== undefined && Number(res.SOLUONG_TON) <= 0) || (res.tonKho !== undefined && Number(res.tonKho) <= 0)),
          stock: Boolean(res.isOutOfStock || (res.soLuongTon !== undefined && Number(res.soLuongTon) <= 0) || (res.SOLUONG_TON !== undefined && Number(res.SOLUONG_TON) <= 0) || (res.tonKho !== undefined && Number(res.tonKho) <= 0)) ? 'Hết hàng' : 'Còn hàng',
          code: String(res.MASP || res.id),
          image: formatImageUrl(res.HINHANH || res.hinhAnh),
          description: res.GHICHU || res.moTa || 'Bánh tươi ngon được làm từ nguyên liệu cao cấp chuẩn chất lượng Givral Bakery, sản xuất mới mỗi ngày.',
          ingredients: 'Bột mì cao cấp, Bơ lạt Anchor Thụy Sĩ, Trứng gà tươi, Kem whipping cream nhập khẩu, Đường tinh luyện.',
          preservation: 'Bảo quản ở nhiệt độ 2°C - 5°C trong ngăn mát tủ lạnh. Sử dụng ngon nhất trong vòng 48 giờ kể từ khi nhận bánh.',
        };
        setProduct(pObj);

        // 2. Load Related Products
        try {
          const prodsRes = await productApi.getProducts();
          const allProds = Array.isArray(prodsRes) ? prodsRes : (prodsRes?.data || []);
          const filtered = allProds
            .filter((p: any) => String(p.id || p.MASP) !== String(pObj.id))
            .slice(0, 6)
            .map((p: any) => ({
              id: String(p.id || p.MASP),
              name: p.name || p.TENSP || p.tenSanPham,
              price: Number(p.price || p.GIABAN || p.giaBan || 0),
              image: formatImageUrl(p.image || p.HINHANH || p.hinhAnh),
            }));
          setRelatedProducts(filtered);
        } catch (eRel) {
          console.log('Lỗi tải sản phẩm liên quan:', eRel);
        }
      }
    } catch (e) {
      console.error('Lỗi tải chi tiết sản phẩm:', e);
    } finally {
      setLoading(false);
    }

    // 3. Load Reviews from Backend using resolved id
    try {
      const reviewRes = await apiClient.get(`/products/${currentSpId}/reviews`);
      const reviewList = Array.isArray(reviewRes.data) ? reviewRes.data : (reviewRes.data?.data || []);
      setReviews(reviewList);
    } catch (eRev) {
      console.log('Lỗi tải đánh giá sản phẩm:', eRev);
      setReviews([]);
    } finally {
      setLoadingReviews(false);
      setRefreshing(false);
    }
  };

  const handleSendReviewComment = async (reviewId: number | string) => {
    if (!isLoggedIn) {
      setLoginModalVisible(true);
      return;
    }
    if (!reviewReplyText.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập nội dung bình luận!');
      return;
    }
    setSubmittingReply(true);
    try {
      await apiClient.post(`/reviews/${reviewId}/comments`, {
        noiDung: reviewReplyText.trim(),
      });
      setReviewReplyText('');
      setReplyingReviewId(null);
      // Reload reviews
      const spId = resolvedProductIdRef.current || productId;
      const reviewRes = await apiClient.get(`/products/${spId}/reviews`);
      const reviewList = Array.isArray(reviewRes.data) ? reviewRes.data : (reviewRes.data?.data || []);
      setReviews(reviewList);
      Alert.alert('Thành công', 'Bình luận của bạn đã được đăng thành công!');
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.error || e?.response?.data?.message || 'Không thể gửi bình luận lúc này!');
    } finally {
      setSubmittingReply(false);
    }
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + Number(r.soSao || r.SO_SAO || 5), 0) / reviews.length).toFixed(1)
    : '5.0';

  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.centerContainer]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <ThemedText style={{ marginTop: 12, opacity: 0.7 }}>Đang tải thông tin sản phẩm...</ThemedText>
      </ThemedView>
    );
  }

  if (!product) {
    return (
      <ThemedView style={[styles.container, styles.centerContainer]}>
        <Ionicons name="alert-circle-outline" size={54} color="#ef4444" />
        <ThemedText style={{ fontSize: 16, fontWeight: 'bold', marginTop: 12 }}>
          Không tìm thấy thông tin sản phẩm!
        </ThemedText>
        <TouchableOpacity style={[styles.buyNowBtn, { marginTop: 16, backgroundColor: colors.tint }]} onPress={() => router.back()}>
          <ThemedText style={styles.buyNowText}>Quay lại</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <LoginRequiredModal
        visible={loginModalVisible}
        onClose={() => setLoginModalVisible(false)}
      />
      <FloatingNotification 
        visible={!!notificationMsg} 
        message={notificationMsg || ''} 
        onClose={clearNotification} 
      />

      {/* FLOATING HEADER */}
      <View style={styles.floatingHeader}>
        <TouchableOpacity style={[styles.iconCircle, { backgroundColor: colorScheme === 'dark' ? '#1e293bdd' : '#ffffffdd' }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerRightGroup}>
          <TouchableOpacity style={[styles.iconCircle, { backgroundColor: colorScheme === 'dark' ? '#1e293bdd' : '#ffffffdd' }]} onPress={() => toggleWishlist(product)}>
            <Ionicons
              name={isFavorite(product.id) ? "heart" : "heart-outline"}
              size={22}
              color={isFavorite(product.id) ? "#ef4444" : colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconCircle, { backgroundColor: colorScheme === 'dark' ? '#1e293bdd' : '#ffffffdd' }]} onPress={() => router.push('/(customer)/cart')}>
            <Ionicons name="cart-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.tint]} />
        }
      >
        {/* PRODUCT IMAGE */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: product.image }} style={styles.productImage} resizeMode="cover" />
          {product.discount > 0 && (
            <View style={styles.saleTag}>
              <ThemedText style={styles.saleTagText}>-{product.discount}% OFF</ThemedText>
            </View>
          )}
        </View>

        {/* DETAILS CARD */}
        <View style={[styles.detailsSection, { backgroundColor: colors.background }]}>
          <View style={styles.catRow}>
            <ThemedText style={[styles.catText, { color: colors.cardTextSecondary }]}>{product.category}</ThemedText>
            <View style={[styles.stockBadge, { backgroundColor: colorScheme === 'dark' ? '#064e3b' : '#dcfce7' }]}>
              <ThemedText style={[styles.stockText, { color: product.isOutOfStock ? '#ef4444' : (colorScheme === 'dark' ? '#34d399' : '#15803d') }]}>{product.stock}</ThemedText>
            </View>
          </View>

          <ThemedText style={styles.productTitle}>{product.name}</ThemedText>

          <View style={styles.ratingRow}>
            <Ionicons name="star" size={16} color="#f59e0b" />
            <ThemedText style={styles.ratingScore}>{avgRating}</ThemedText>
            <ThemedText style={styles.ratingCount}>({reviews.length} đánh giá)</ThemedText>
            <ThemedText style={styles.dot}>•</ThemedText>
            <ThemedText style={styles.codeText}>Mã: #{product.code}</ThemedText>
          </View>

          {/* PRICE SECTION */}
          <View style={[styles.priceBox, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View>
              <ThemedText style={[styles.salePrice, { color: colors.tint }]}>
                {(product.salePrice ? Number(product.salePrice) : (Number(product.price) || 0)).toLocaleString('vi-VN')}₫
              </ThemedText>
              {product.salePrice && product.price ? (
                <ThemedText style={styles.originalPrice}>
                  {(Number(product.price) || 0).toLocaleString('vi-VN')}₫
                </ThemedText>
              ) : null}
            </View>

            {/* QUANTITY SELECTOR */}
            <View style={styles.quantityContainer}>
              <TouchableOpacity 
                style={[styles.qtyBtn, { borderColor: colors.cardBorder }]}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Ionicons name="remove" size={18} color={colors.text} />
              </TouchableOpacity>

              <ThemedText style={styles.qtyText}>{quantity}</ThemedText>

              <TouchableOpacity 
                style={[styles.qtyBtn, { borderColor: colors.cardBorder }]}
                onPress={() => setQuantity(quantity + 1)}
              >
                <Ionicons name="add" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* DESCRIPTION */}
          <ThemedText style={styles.sectionHeaderTitle}>Mô tả sản phẩm</ThemedText>
          <ThemedText style={styles.descriptionText}>{product.description}</ThemedText>

          {/* INGREDIENTS */}
          <ThemedText style={styles.sectionHeaderTitle}>Thành phần chính</ThemedText>
          <ThemedText style={styles.descriptionText}>{product.ingredients}</ThemedText>

          {/* PRESERVATION */}
          <ThemedText style={styles.sectionHeaderTitle}>Hướng dẫn bảo quản</ThemedText>
          <ThemedText style={styles.descriptionText}>{product.preservation}</ThemedText>

          {/* RELATED PRODUCTS SECTION */}
          {relatedProducts.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <View style={styles.sectionHeaderRow}>
                <ThemedText style={styles.sectionHeaderTitle}>🎂 Sản phẩm liên quan</ThemedText>
                <TouchableOpacity onPress={() => router.push('/(customer)/products')}>
                  <ThemedText style={[styles.seeAllText, { color: colors.tint }]}>Xem tất cả</ThemedText>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relatedScroll}>
                {relatedProducts.map((relItem, rIdx) => (
                  <TouchableOpacity
                    key={`rel-${relItem.id ?? rIdx}-${rIdx}`}
                    style={[styles.relatedCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                    onPress={() => {
                      router.push({
                        pathname: '/(customer)/product-detail',
                        params: { id: relItem.id },
                      } as any);
                    }}
                  >
                    <Image source={{ uri: relItem.image }} style={styles.relatedImage} resizeMode="cover" />
                    <View style={styles.relatedBody}>
                      <ThemedText style={styles.relatedName} numberOfLines={1}>{relItem.name}</ThemedText>
                      <ThemedText style={[styles.relatedPrice, { color: colors.tint }]}>
                        {Number(relItem.price).toLocaleString('vi-VN')}₫
                      </ThemedText>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* REVIEWS & COMMENTS SECTION */}
          <View style={{ marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.cardBorder }}>
            <View style={styles.sectionHeaderRow}>
              <ThemedText style={styles.sectionHeaderTitle}>
                ⭐ Đánh giá & Bình luận ({reviews.length})
              </ThemedText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="star" size={16} color="#f59e0b" />
                <ThemedText style={{ fontWeight: 'bold', fontSize: 14 }}>{avgRating}/5</ThemedText>
              </View>
            </View>

            {loadingReviews ? (
              <ActivityIndicator size="small" color={colors.tint} style={{ marginVertical: 16 }} />
            ) : reviews.length === 0 ? (
              <View style={[styles.emptyReviewBox, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                <Ionicons name="chatbox-ellipses-outline" size={36} color={colors.icon} style={{ opacity: 0.4, marginBottom: 8 }} />
                <ThemedText style={styles.emptyReviewText}>
                  Chưa có đánh giá nào cho sản phẩm này.
                </ThemedText>
                <ThemedText style={styles.emptyReviewSub}>
                  Hãy đặt bánh và trở thành người đầu tiên chia sẻ cảm nhận nhé!
                </ThemedText>
              </View>
            ) : (
              <View style={{ marginTop: 12, gap: 12 }}>
                {reviews.map((rev: any, idx: number) => {
                  const revId = rev.id ?? rev.MADG ?? idx;
                  const revKey = `rev-${revId}-${idx}`;
                  const ratingVal = Number(rev.soSao || rev.SO_SAO || rev.rating || 5);
                  const reviewerName = rev.nguoidung?.hoTen || rev.hoTen || rev.khachHang || 'Khách hàng Givral';
                  const dateStr =
                    rev.date ||
                    rev.NGAY_DG ||
                    (rev.created_at ? new Date(rev.created_at).toLocaleDateString('vi-VN') : 'Gần đây');
                  const commentText =
                    rev.noiDung ||
                    rev.NOIDUNG ||
                    rev.NOI_DUNG ||
                    rev.binhLuan ||
                    rev.comment ||
                    'Bánh rất ngon, ngọt vừa phải và trang trí rất đẹp mắt! Sẽ tiếp tục ủng hộ tiệm.';
                  const reviewImg =
                    rev.hinhAnh || rev.HINHANH || rev.hinhAnhKemTheo || rev.HINH_ANH || null;
                  const cskhReply =
                    rev.phanHoi ||
                    rev.PHAN_HOI ||
                    rev.traLoi ||
                    rev.phanHoiCskh ||
                    rev.PHAN_HOI_CSKH ||
                    null;
                  const isReplyingThis = replyingReviewId === revId;
                  const subComments = Array.isArray(rev.binhLuans || rev.comments) ? (rev.binhLuans || rev.comments) : [];

                  return (
                    <View key={revKey} style={[styles.reviewCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                      <View style={styles.reviewHeader}>
                        <View style={[styles.avatarCircle, { backgroundColor: colors.tint + '20' }]}>
                          <ThemedText style={[styles.avatarText, { color: colors.tint }]}>
                            {reviewerName.charAt(0).toUpperCase()}
                          </ThemedText>
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <ThemedText style={styles.reviewerName}>{reviewerName}</ThemedText>
                          <ThemedText style={styles.reviewDate}>{dateStr}</ThemedText>
                        </View>
                        <View style={styles.starsRow}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Ionicons
                              key={s}
                              name={s <= ratingVal ? "star" : "star-outline"}
                              size={14}
                              color="#f59e0b"
                            />
                          ))}
                        </View>
                      </View>
                      <ThemedText style={styles.reviewContent}>{commentText}</ThemedText>

                      {reviewImg ? (
                        <Image
                          source={{ uri: formatImageUrl(reviewImg) }}
                          style={[styles.reviewAttachedImage, { backgroundColor: colors.cardBg }]}
                          resizeMode="cover"
                        />
                      ) : null}

                      {cskhReply ? (
                        <View style={[styles.cskhReplyBox, { borderLeftColor: colors.tint, backgroundColor: colorScheme === 'dark' ? '#33291e' : 'rgba(217, 119, 6, 0.08)' }]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <Ionicons name="chatbubbles" size={14} color={colors.tint} />
                            <ThemedText style={[styles.cskhReplyTitle, { color: colors.tint }]}>
                              Phản hồi từ Givral Bakery CSKH
                            </ThemedText>
                          </View>
                          <ThemedText style={styles.cskhReplyText}>{cskhReply}</ThemedText>
                        </View>
                      ) : null}

                      {/* Danh sách các bình luận con của bài đánh giá này */}
                      {subComments.length > 0 && (
                        <View style={{ marginTop: 10, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: colors.tint, gap: 8 }}>
                          {subComments.map((cItem: any, cIdx: number) => (
                            <View key={`c-${cItem.id ?? cIdx}-${cIdx}`} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                              <View style={[styles.avatarCircle, { width: 26, height: 26, borderRadius: 13, backgroundColor: cItem.isAdmin ? '#d35400' : colors.tint }]}>
                                <ThemedText style={{ fontSize: 11, color: '#fff', fontWeight: 'bold' }}>
                                  {(cItem.hoTen || 'K').charAt(0).toUpperCase()}
                                </ThemedText>
                              </View>
                              <View style={{ flex: 1, marginLeft: 8, backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#f8fafc', padding: 8, borderRadius: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                                  <ThemedText style={{ fontSize: 12, fontWeight: 'bold' }}>{cItem.hoTen}</ThemedText>
                                  {cItem.isAdmin && (
                                    <View style={{ backgroundColor: '#ef4444', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 }}>
                                      <ThemedText style={{ color: '#fff', fontSize: 9, fontWeight: 'bold' }}>Quản trị viên</ThemedText>
                                    </View>
                                  )}
                                  <ThemedText style={{ fontSize: 10, color: colors.cardTextSecondary, marginLeft: 'auto' }}>{cItem.date}</ThemedText>
                                </View>
                                <ThemedText style={{ fontSize: 12, marginTop: 2, color: colors.text }}>{cItem.noiDung}</ThemedText>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Nút bình luận vào đánh giá */}
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, alignSelf: 'flex-start' }}
                        onPress={() => {
                          if (isReplyingThis) {
                            setReplyingReviewId(null);
                            setReviewReplyText('');
                          } else {
                            setReplyingReviewId(revId);
                            setReviewReplyText('');
                          }
                        }}
                      >
                        <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.tint} />
                        <ThemedText style={{ color: colors.tint, fontSize: 13, fontWeight: '600' }}>
                          {isReplyingThis ? 'Hủy' : 'Bình luận vào đánh giá'}
                        </ThemedText>
                      </TouchableOpacity>

                      {/* Form nhập bình luận inline */}
                      {isReplyingThis && (
                        <View style={{ marginTop: 8, padding: 8, backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: colors.cardBorder }}>
                          <TextInput
                            style={{
                              borderWidth: 1,
                              borderColor: colors.cardBorder,
                              borderRadius: 6,
                              padding: 8,
                              color: colors.text,
                              fontSize: 13,
                              minHeight: 50,
                              textAlignVertical: 'top',
                            }}
                            placeholder="Viết ý kiến thảo luận về đánh giá này..."
                            placeholderTextColor={colors.icon}
                            value={reviewReplyText}
                            onChangeText={setReviewReplyText}
                            multiline
                          />
                          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                            <TouchableOpacity
                              style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 4, backgroundColor: colors.cardBorder }}
                              onPress={() => {
                                setReplyingReviewId(null);
                                setReviewReplyText('');
                              }}
                            >
                              <ThemedText style={{ fontSize: 12 }}>Hủy</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={{ paddingVertical: 6, paddingHorizontal: 16, borderRadius: 4, backgroundColor: colors.tint }}
                              onPress={() => handleSendReviewComment(revId)}
                              disabled={submittingReply}
                            >
                              {submittingReply ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <ThemedText style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>Gửi</ThemedText>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* BOTTOM ACTION BAR */}
      <View style={[styles.bottomBar, { backgroundColor: colors.cardBg, borderTopColor: colors.cardBorder }]}>
        <TouchableOpacity 
          style={[styles.addCartBtn, { borderColor: product.isOutOfStock ? '#94a3b8' : colors.tint, opacity: product.isOutOfStock ? 0.6 : 1 }]}
          onPress={() => {
            if (product.isOutOfStock) {
              Alert.alert('Hết hàng', 'Sản phẩm này hiện đã hết hàng, vui lòng chọn loại bánh khác!');
              return;
            }
            addToCart(product, quantity);
          }}
        >
          <Ionicons name="cart-outline" size={20} color={product.isOutOfStock ? '#94a3b8' : colors.tint} style={{ marginRight: 6 }} />
          <ThemedText style={[styles.addCartText, { color: product.isOutOfStock ? '#94a3b8' : colors.tint }]}>
            {product.isOutOfStock ? 'Tạm hết hàng' : 'Thêm vào giỏ'}
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.buyNowBtn, { backgroundColor: product.isOutOfStock ? '#94a3b8' : colors.tint, opacity: product.isOutOfStock ? 0.6 : 1 }]}
          onPress={() => {
            if (product.isOutOfStock) {
              Alert.alert('Hết hàng', 'Sản phẩm này hiện đã hết hàng, vui lòng chọn loại bánh khác!');
              return;
            }
            addToCart(product, quantity);
            router.push('/(customer)/checkout');
          }}
        >
          <ThemedText style={styles.buyNowText}>{product.isOutOfStock ? 'HẾT HÀNG' : 'MUA NGAY'}</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  floatingHeader: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffffdd',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRightGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  scrollContent: {
    flexGrow: 1,
  },
  imageContainer: {
    width: '100%',
    height: 320,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  saleTag: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  saleTagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailsSection: {
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
  },
  catRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  catText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  stockBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stockText: {
    color: '#15803d',
    fontSize: 11,
    fontWeight: 'bold',
  },
  productTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    lineHeight: 26,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingScore: {
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  ratingCount: {
    fontSize: 13,
    opacity: 0.6,
    marginLeft: 4,
  },
  dot: {
    marginHorizontal: 8,
    opacity: 0.4,
  },
  codeText: {
    fontSize: 13,
    opacity: 0.6,
  },
  priceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  salePrice: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  originalPrice: {
    fontSize: 13,
    textDecorationLine: 'line-through',
    opacity: 0.5,
    marginTop: 2,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qtyBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 14,
    marginBottom: 6,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.8,
  },
  relatedScroll: {
    gap: 12,
    paddingVertical: 8,
  },
  relatedCard: {
    width: 140,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  relatedImage: {
    width: '100%',
    height: 110,
  },
  relatedBody: {
    padding: 8,
  },
  relatedName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  relatedPrice: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyReviewBox: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  emptyReviewText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyReviewSub: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'center',
    marginTop: 4,
  },
  reviewCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: '700',
  },
  reviewDate: {
    fontSize: 11,
    opacity: 0.5,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewContent: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.85,
  },
  reviewAttachedImage: {
    width: 110,
    height: 110,
    borderRadius: 10,
    marginTop: 8,
    backgroundColor: '#f1f5f9',
  },
  cskhReplyBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    backgroundColor: 'rgba(217, 119, 6, 0.08)',
  },
  cskhReplyTitle: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  cskhReplyText: {
    fontSize: 12,
    lineHeight: 17,
    opacity: 0.85,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    gap: 12,
  },
  addCartBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  addCartText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  buyNowBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 24,
  },
  buyNowText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
