import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Image, FlatList, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import CustomerNavDrawer from '@/components/CustomerNavDrawer';

import { productApi } from '@/services/api/productApi';
import { newsApi } from '@/services/api/newsApi';
import { formatImageUrl } from '@/config/apiConfig';
import { useCart } from '@/context/CartContext';
import FloatingNotification from '@/components/FloatingNotification';

const POLICIES = [
  { id: '1', title: 'Miễn phí vận chuyển', desc: 'Đơn hàng từ 300k', icon: 'car-outline' },
  { id: '2', title: 'Đổi trả dễ dàng', desc: 'Đổi trong 24h', icon: 'refresh-outline' },
  { id: '3', title: 'Hỗ trợ 24/7', desc: 'Hotline 19006750', icon: 'call-outline' },
  { id: '4', title: 'Thanh toán đa dạng', desc: 'Visa, Napas, COD', icon: 'card-outline' },
];

const DEFAULT_CATEGORIES = [
  { id: 'Bánh kếp', title: 'Bánh kếp', image: require('@/assets/images/category_1.webp') },
  { id: 'Bánh su kem', title: 'Bánh su kem', image: require('@/assets/images/category_2.webp') },
  { id: 'Bánh mì nướng', title: 'Bánh mì nướng', image: require('@/assets/images/category_3.webp') },
  { id: 'Bánh khác', title: 'Bánh khác', image: require('@/assets/images/category_4.webp') },
];

const DEFAULT_SALE_PRODUCTS = [
  { id: '1', name: 'Bánh Kem Dâu Tây Fresh', price: 250000, salePrice: 199000, discount: 20, rating: 4.9, image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400', isNew: false },
  { id: '2', name: 'Bánh Mì Sừng Bò Croissant', price: 45000, salePrice: 35000, discount: 22, rating: 4.8, image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400', isNew: false },
  { id: '3', name: 'Bánh Su Kem Socola Bỉ', price: 120000, salePrice: 90000, discount: 25, rating: 5.0, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400', isNew: false },
];

const DEFAULT_BEST_SELLERS = [
  { id: '5', name: 'Bánh Tiramisu Phô Mai', price: 220000, rating: 5.0, image: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400', isNew: false },
  { id: '6', name: 'Bánh Mì Nướng Bơ Tỏi', price: 55000, rating: 4.9, image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=400', isNew: false },
];

const DEFAULT_NEWEST_PRODUCTS = [
  { id: '7', name: 'Bánh Mousse Matcha Nhật Bản', price: 185000, rating: 4.9, image: 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=400', isNew: true },
  { id: '8', name: 'Bánh Red Velvet Trái Cây', price: 210000, rating: 5.0, image: 'https://images.unsplash.com/photo-1616541823729-00fe0aacd32c?w=400', isNew: true },
];

const DEFAULT_NEWS = [
  {
    id: '1',
    title: 'Bí Quyết Chọn Bánh Sinh Nhật Đẹp & Ý Nghĩa Cho Người Thân',
    summary: 'Một chiếc bánh sinh nhật không chỉ ngọt ngào về hương vị mà còn gửi gắm tình cảm trân trọng nhất.',
    date: '10/08/2026',
    image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400'
  },
  {
    id: '2',
    title: 'Xu Hướng Bánh Mì Croissant 27 Lớp Bơ Thụy Sĩ Hot Nhất 2026',
    summary: 'Khám phá quy trình làm bánh thủ công kỳ công tạo nên độ giòn xốp hảo hạng.',
    date: '08/08/2026',
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400'
  }
];

const TESTIMONIALS = [
  {
    id: '1',
    name: 'Nguyễn Thu Trang',
    role: 'Khách hàng thân thiết',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    comment: 'Bánh Tiramisu ở Givral Bakery thực sự đỉnh cao! Vị đắng nhẹ thơm nức cà phê quyện lớp phô mai béo ngậy.',
    rating: 5,
  },
  {
    id: '2',
    name: 'Trần Minh Quân',
    role: 'Khách mua giao tận nơi',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    comment: 'Giao hàng siêu nhanh, đóng gói hộp cao cấp giữ nguyên vẹn trang trí bánh kem sinh nhật cho bé nhà mình.',
    rating: 5,
  },
  {
    id: '3',
    name: 'Lê Hoàng Nam',
    role: 'Khách hàng chi nhánh Tân Phú',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    comment: 'Bánh su kem vỏ giòn rụm nhân mát lạnh ăn không bao giờ ngán. Nhân viên tư vấn cực kỳ nhiệt tình!',
    rating: 5,
  },
];

const SLIDESHOW_IMAGES = [
  require('@/assets/images/header_img_1.webp'),
  require('@/assets/images/header_img_2.webp'),
];

export default function CustomerHomePage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { toggleWishlist, isFavorite, addToCart, cartCount, notificationMsg, clearNotification } = useCart();
  
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [categoriesList, setCategoriesList] = useState(DEFAULT_CATEGORIES);
  const [saleProductsList, setSaleProductsList] = useState(DEFAULT_SALE_PRODUCTS);
  const [bestSellersList, setBestSellersList] = useState(DEFAULT_BEST_SELLERS);
  const [newestProductsList, setNewestProductsList] = useState(DEFAULT_NEWEST_PRODUCTS);
  const [latestNewsList, setLatestNewsList] = useState(DEFAULT_NEWS);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterToast, setNewsletterToast] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState(0);

  useEffect(() => {
    loadHomepageData();
    const timer = setInterval(() => {
      setSlideshowIndex(prev => (prev + 1) % SLIDESHOW_IMAGES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const loadHomepageData = async () => {
    // 1. Load Categories - Removed API call to keep only hardcoded categories as requested.

    // 2. Load Homepage Grouped Products (Discounted, Newest, Best Sellers)
    try {
      const homeData = await productApi.getHomepageProducts();
      if (homeData) {
        if (Array.isArray(homeData.discounted) && homeData.discounted.length > 0) {
          setSaleProductsList(homeData.discounted.map((p: any) => {
            const qty = Number(p.soLuongTon ?? p.SOLUONG_TON ?? p.TONKHO_THUCTE ?? 0);
            return {
              id: String(p.MASP || p.id),
              name: p.TENSP || p.name,
              price: Number(p.GIABAN || 0),
              salePrice: p.PHAN_TRAM_GIAM ? Math.round(Number(p.GIABAN) * (1 - p.PHAN_TRAM_GIAM / 100)) : null,
              discount: p.PHAN_TRAM_GIAM || 15,
              rating: 4.9,
              image: formatImageUrl(p.HINHANH || p.hinhAnh),
              isNew: !!p.IS_NEW,
              soLuongTon: qty,
              isOutOfStock: Boolean(p.isOutOfStock || qty <= 0),
            };
          }));
        }

        if (Array.isArray(homeData.newest) && homeData.newest.length > 0) {
          setNewestProductsList(homeData.newest.map((p: any) => {
            const qty = Number(p.soLuongTon ?? p.SOLUONG_TON ?? p.TONKHO_THUCTE ?? 0);
            return {
              id: String(p.MASP || p.id),
              name: p.TENSP || p.name,
              price: Number(p.GIABAN || 0),
              rating: 5.0,
              image: formatImageUrl(p.HINHANH || p.hinhAnh),
              isNew: true,
              soLuongTon: qty,
              isOutOfStock: Boolean(p.isOutOfStock || qty <= 0),
            };
          }));
        }

        const bestList = homeData.bestSellers || homeData.expensive;
        if (Array.isArray(bestList) && bestList.length > 0) {
          setBestSellersList(bestList.map((p: any) => {
            const qty = Number(p.soLuongTon ?? p.SOLUONG_TON ?? p.TONKHO_THUCTE ?? 0);
            return {
              id: String(p.MASP || p.id),
              name: p.TENSP || p.name,
              price: Number(p.GIABAN || 0),
              salePrice: p.PHAN_TRAM_GIAM ? Math.round(Number(p.GIABAN) * (1 - p.PHAN_TRAM_GIAM / 100)) : null,
              discount: p.PHAN_TRAM_GIAM || 0,
              rating: 5.0,
              image: formatImageUrl(p.HINHANH || p.hinhAnh),
              isNew: !!p.IS_NEW,
              soLuongTon: qty,
              isOutOfStock: Boolean(p.isOutOfStock || qty <= 0),
            };
          }));
        }
      }
    } catch (e) {}

    // Dedicated Best Sellers API call fallback
    try {
      const bestData = await productApi.getBestSellers();
      const bestItems = Array.isArray(bestData) ? bestData : (bestData.data || []);
      if (bestItems.length > 0) {
        setBestSellersList(bestItems.map((p: any) => ({
          id: String(p.MASP || p.id),
          name: p.TENSP || p.name,
          price: Number(p.GIABAN || 0),
          salePrice: p.PHAN_TRAM_GIAM ? Math.round(Number(p.GIABAN) * (1 - p.PHAN_TRAM_GIAM / 100)) : null,
          discount: p.PHAN_TRAM_GIAM || 0,
          rating: 5.0,
          image: formatImageUrl(p.HINHANH),
          isNew: !!p.IS_NEW,
        })));
      }
    } catch (e) {}

    // 3. Load Latest News
    try {
      const newsData = await newsApi.getNews();
      const newsItems = Array.isArray(newsData) ? newsData : (newsData.data || []);
      if (newsItems.length > 0) {
        setLatestNewsList(newsItems.slice(0, 4).map((n: any) => ({
          id: String(n.MABAIVIET || n.id),
          title: n.TIEUDE || n.title,
          summary: n.TOMTAT || n.summary || '',
          date: n.created_at ? new Date(n.created_at).toLocaleDateString('vi-VN') : '10/08/2026',
          image: formatImageUrl(n.HINHANH),
        })));
      }
    } catch (e) {}
  };

  const handleSubscribeNewsletter = () => {
    if (!newsletterEmail.trim() || !newsletterEmail.includes('@')) {
      Alert.alert('Thông báo', 'Vui lòng nhập địa chỉ Email hợp lệ.');
      return;
    }
    setNewsletterToast(true);
    setNewsletterEmail('');
  };

  const renderProductItem = ({ item }: { item: any }) => {
    const isFav = isFavorite(item.id);

    return (
      <TouchableOpacity 
        style={[styles.productCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
        onPress={() => router.push({ pathname: '/(customer)/product-detail', params: { id: item.id } })}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.image }} style={styles.productImage} />
          
          {item.isOutOfStock ? (
            <View style={[styles.saleBadge, { backgroundColor: '#dc2626' }]}>
              <ThemedText style={styles.saleBadgeText}>Hết hàng</ThemedText>
            </View>
          ) : item.discount > 0 ? (
            <View style={styles.saleBadge}>
              <ThemedText style={styles.saleBadgeText}>-{item.discount}%</ThemedText>
            </View>
          ) : null}

          {item.isNew && (
            <View style={styles.newBadge}>
              <ThemedText style={styles.newBadgeText}>NEW 🌟</ThemedText>
            </View>
          )}

          <TouchableOpacity 
            style={styles.heartBtn}
            onPress={() => toggleWishlist(item)}
          >
            <Ionicons name={isFav ? "heart" : "heart-outline"} size={20} color={isFav ? "#ef4444" : "#666"} />
          </TouchableOpacity>
        </View>

        <View style={styles.productDetails}>
          <ThemedText style={styles.productName} numberOfLines={2}>{item.name}</ThemedText>
          
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="#f59e0b" />
            <ThemedText style={styles.ratingText}>{item.rating}</ThemedText>
          </View>

          <View style={styles.priceRow}>
            <View style={{ flex: 1 }}>
              <ThemedText style={[styles.priceText, { color: colors.tint }]}>
                {(item.salePrice || item.price).toLocaleString('vi-VN')}₫
              </ThemedText>
              {item.salePrice && (
                <ThemedText style={styles.originalPriceText}>
                  {item.price.toLocaleString('vi-VN')}₫
                </ThemedText>
              )}
            </View>

            <TouchableOpacity 
              style={[styles.addToCartBtn, { backgroundColor: item.isOutOfStock ? '#94a3b8' : colors.tint }]}
              onPress={() => {
                if (item.isOutOfStock) {
                  Alert.alert('Hết hàng', 'Sản phẩm này hiện đang tạm hết hàng!');
                  return;
                }
                addToCart(item);
              }}
              disabled={item.isOutOfStock}
            >
              <Ionicons name="cart-outline" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <FloatingNotification 
        visible={!!notificationMsg}
        title="Givral Bakery 🥐"
        message={notificationMsg || ''}
        type="success"
        onClose={clearNotification}
      />
      <FloatingNotification 
        visible={newsletterToast}
        title="Đăng ký thành công! 🎉"
        message="Cảm ơn bạn đã đăng ký! Givral Bakery đã gửi Mã Voucher giảm 10% đến Email của bạn."
        type="success"
        onClose={() => setNewsletterToast(false)}
      />
      
      <CustomerNavDrawer 
        visible={drawerVisible} 
        onClose={() => setDrawerVisible(false)} 
      />

      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <View style={styles.headerTop}>
          <View style={styles.brandContainer}>
            <TouchableOpacity style={styles.hamburgerBtn} onPress={() => setDrawerVisible(true)}>
              <Ionicons name="menu" size={28} color="#fff" />
            </TouchableOpacity>
            <Ionicons name="restaurant" size={24} color="#fff" style={{ marginRight: 6 }} />
            <ThemedText style={styles.brandName}>GIVRAL BAKERY</ThemedText>
          </View>

          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.push('/(customer)/cart')}>
              <Ionicons name="bag-handle-outline" size={24} color="#fff" />
              {cartCount > 0 && (
                <View style={styles.badgeCount}>
                  <ThemedText style={styles.badgeText}>{cartCount}</ThemedText>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* SEARCH BAR */}
        <TouchableOpacity 
          style={styles.searchBar}
          onPress={() => router.push('/(customer)/products')}
          activeOpacity={0.9}
        >
          <Ionicons name="search-outline" size={20} color={colors.icon} style={{ marginRight: 8 }} />
          <ThemedText style={[styles.searchPlaceholder, { color: colors.icon }]}>
            Tìm bánh sinh nhật, croissant, su kem...
          </ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* HERO PROMO BANNER / SLIDESHOW */}
        <TouchableOpacity 
          style={styles.heroBanner}
          onPress={() => router.push('/(customer)/products')}
          activeOpacity={0.9}
        >
          <Image 
            source={SLIDESHOW_IMAGES[slideshowIndex]} 
            style={styles.heroBackgroundImage}
            resizeMode="cover"
          />
          <View style={styles.heroOverlay} />

          <View style={styles.heroTextContainer}>
            <View style={styles.heroBadge}>
              <ThemedText style={styles.heroBadgeText}>FRESH BAKERY 2026</ThemedText>
            </View>
            <ThemedText style={styles.heroTitle}>Bánh Ngọt Tươi Ngon Mỗi Ngày 🥐</ThemedText>
            <ThemedText style={styles.heroSubtitle}>Giảm đến 20% khi mua hàng qua app</ThemedText>
            <View style={styles.heroBtn}>
              <ThemedText style={[styles.heroBtnText, { color: '#e67e22' }]}>KHÁM PHÁ NGAY</ThemedText>
              <Ionicons name="arrow-forward" size={14} color="#e67e22" style={{ marginLeft: 4 }} />
            </View>
          </View>
        </TouchableOpacity>

        {/* POLICIES ROW */}
        <View style={styles.policiesRow}>
          {POLICIES.map((p) => (
            <View key={p.id} style={[styles.policyCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <Ionicons name={p.icon as any} size={20} color={colors.tint} style={{ marginBottom: 4 }} />
              <ThemedText style={styles.policyTitle}>{p.title}</ThemedText>
              <ThemedText style={styles.policyDesc}>{p.desc}</ThemedText>
            </View>
          ))}
        </View>

        {/* CATEGORIES SECTION */}
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Danh mục sản phẩm</ThemedText>
          <TouchableOpacity onPress={() => router.push('/(customer)/products')}>
            <ThemedText style={[styles.seeAllText, { color: colors.tint }]}>Xem tất cả</ThemedText>
          </TouchableOpacity>
        </View>

        <FlatList
          data={categoriesList}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item: any, idx: number) => String(item?.id || `cat-${idx}`)}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.catCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
              onPress={() => router.push({ pathname: '/(customer)/products', params: { category: item.title } })}
            >
              <Image source={typeof item.image === 'number' ? item.image : { uri: item.image }} style={styles.catImage} />
              <ThemedText style={styles.catTitle}>{item.title}</ThemedText>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.catList}
        />

        {/* SECTION 1: ⚡ BÁNH ĐANG GIẢM GIÁ */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="flash" size={20} color="#ef4444" style={{ marginRight: 6 }} />
            <ThemedText style={styles.sectionTitle}>Bánh đang giảm giá (Flash Sale)</ThemedText>
          </View>
          <TouchableOpacity onPress={() => router.push('/(customer)/products')}>
            <ThemedText style={[styles.seeAllText, { color: colors.tint }]}>Xem tất cả</ThemedText>
          </TouchableOpacity>
        </View>

        <FlatList
          data={saleProductsList}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item: any, idx: number) => String(item?.id || item?.MASP || `sale-${idx}`)}
          renderItem={renderProductItem}
          contentContainerStyle={styles.horizontalProductsList}
        />

        {/* SECTION 2: 🌟 BÁNH MỚI NHẤT (TAG NEW) */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="sparkles" size={20} color="#10b981" style={{ marginRight: 6 }} />
            <ThemedText style={styles.sectionTitle}>Bánh mới ra mắt (Newest)</ThemedText>
          </View>
          <TouchableOpacity onPress={() => router.push('/(customer)/products')}>
            <ThemedText style={[styles.seeAllText, { color: colors.tint }]}>Xem tất cả</ThemedText>
          </TouchableOpacity>
        </View>

        <FlatList
          data={newestProductsList}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item: any, idx: number) => String(item?.id || item?.MASP || `new-${idx}`)}
          renderItem={renderProductItem}
          contentContainerStyle={styles.horizontalProductsList}
        />

        {/* SECTION 3: 🔥 BÁNH ĐƯỢC MUA NHIỀU NHẤT */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="flame" size={20} color="#f59e0b" style={{ marginRight: 6 }} />
            <ThemedText style={styles.sectionTitle}>Bánh được mua nhiều nhất</ThemedText>
          </View>
          <TouchableOpacity onPress={() => router.push('/(customer)/products')}>
            <ThemedText style={[styles.seeAllText, { color: colors.tint }]}>Xem tất cả</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.verticalProductsGrid}>
          {bestSellersList.map((item: any, idx: number) => (
            <View key={String(item?.id || item?.MASP || `best-${idx}`)} style={{ width: '48%' }}>
              {renderProductItem({ item })}
            </View>
          ))}
        </View>

        {/* SECTION 4: 📰 TIN TỨC MỚI NHẤT */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="newspaper-outline" size={20} color={colors.tint} style={{ marginRight: 6 }} />
            <ThemedText style={styles.sectionTitle}>Tin tức & Góc bánh ngọt</ThemedText>
          </View>
          <TouchableOpacity onPress={() => router.push('/(customer)/posts')}>
            <ThemedText style={[styles.seeAllText, { color: colors.tint }]}>Xem tất cả</ThemedText>
          </TouchableOpacity>
        </View>

        <FlatList
          data={latestNewsList}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item: any, idx: number) => String(item?.id || item?.MABAIVIET || `news-${idx}`)}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.newsCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
              onPress={() => router.push({ pathname: '/(customer)/post-detail', params: { id: item.id } })}
            >
              <Image source={{ uri: item.image }} style={styles.newsImage} />
              <View style={styles.newsContent}>
                <ThemedText style={styles.newsDate}>{item.date}</ThemedText>
                <ThemedText style={styles.newsTitle} numberOfLines={2}>{item.title}</ThemedText>
                <ThemedText style={styles.newsSummary} numberOfLines={2}>{item.summary}</ThemedText>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.horizontalProductsList}
        />

        {/* SECTION 5: ⭐ KHÁCH HÀNG NÓI GÌ VỀ GIVRAL BAKERY */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="star" size={20} color="#f59e0b" style={{ marginRight: 6 }} />
            <ThemedText style={styles.sectionTitle}>Khách hàng nói gì về Givral Bakery</ThemedText>
          </View>
        </View>

        <FlatList
          data={TESTIMONIALS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item: any, idx: number) => String(item?.id || `testi-${idx}`)}
          renderItem={({ item }) => (
            <View style={[styles.testimonialCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <View style={styles.testimonialHeader}>
                <Image source={{ uri: item.avatar }} style={styles.testimonialAvatar} />
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.testimonialName}>{item.name}</ThemedText>
                  <ThemedText style={styles.testimonialRole}>{item.role}</ThemedText>
                </View>
                <View style={styles.starRow}>
                  {[...Array(item.rating)].map((_, i) => (
                    <Ionicons key={i} name="star" size={14} color="#f59e0b" />
                  ))}
                </View>
              </View>
              <ThemedText style={styles.testimonialComment}>"{item.comment}"</ThemedText>
            </View>
          )}
          contentContainerStyle={styles.horizontalProductsList}
        />

        {/* SECTION 6: 📩 ĐĂNG KÝ NHẬN TIN & VOUCHER 10% */}
        <View style={[styles.newsletterBox, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <View style={[styles.newsletterIconCircle, { backgroundColor: colors.tint + '18' }]}>
            <Ionicons name="mail-open-outline" size={32} color={colors.tint} />
          </View>
          <ThemedText style={styles.newsletterTitle}>Đăng ký nhận thông báo & Voucher 10% 🎁</ThemedText>
          <ThemedText style={styles.newsletterSubtitle}>
            Nhập email của bạn để nhận thông báo khuyến mãi bánh ngọt tươi và mã giảm giá ưu đãi mỗi tuần từ Givral Bakery.
          </ThemedText>

          <View style={styles.newsletterInputRow}>
            <TextInput
              style={[styles.newsletterInput, { color: colors.text, borderColor: colors.cardBorder }]}
              placeholder="Nhập email của bạn..."
              placeholderTextColor={colors.icon}
              value={newsletterEmail}
              onChangeText={setNewsletterEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity 
              style={[styles.newsletterBtn, { backgroundColor: colors.tint }]}
              onPress={handleSubscribeNewsletter}
            >
              <ThemedText style={styles.newsletterBtnText}>ĐĂNG KÝ</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hamburgerBtn: {
    paddingRight: 10,
  },
  brandName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    position: 'relative',
    padding: 4,
  },
  badgeCount: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ef4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
  },
  searchPlaceholder: {
    fontSize: 14,
    opacity: 0.7,
  },
  scrollContent: {
    padding: 16,
  },
  heroBanner: {
    height: 260,
    marginHorizontal: -16,
    marginTop: -16,
    // paddingHorizontal: 24,
    // paddingVertical: 20,
    justifyContent: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  heroBackgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    objectFit: 'cover',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  heroTextContainer: {
    width: '100%',
    marginLeft: 16,
  },
  heroBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  heroBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    lineHeight: 22,
  },
  heroSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    marginBottom: 14,
  },
  heroBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  heroBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  heroImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  policiesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  policyCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  policyTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
  },
  policyDesc: {
    fontSize: 9,
    opacity: 0.6,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  catList: {
    paddingBottom: 20,
    gap: 12,
  },
  catCard: {
    width: 100,
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 10,
  },
  catImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  catTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  horizontalProductsList: {
    paddingBottom: 20,
    gap: 14,
  },
  verticalProductsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  productCard: {
    width: 170,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 4,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 140,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  saleBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  saleBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productDetails: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    height: 38,
    lineHeight: 18,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
    opacity: 0.8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  originalPriceText: {
    fontSize: 11,
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  addToCartBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newsCard: {
    width: 240,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginRight: 12,
  },
  newsImage: {
    width: '100%',
    height: 120,
  },
  newsContent: {
    padding: 12,
  },
  newsDate: {
    fontSize: 10,
    opacity: 0.5,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  newsTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 6,
    height: 36,
    lineHeight: 18,
  },
  newsSummary: {
    fontSize: 11,
    opacity: 0.7,
    lineHeight: 15,
  },
  testimonialCard: {
    width: 280,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 12,
  },
  testimonialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  testimonialAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  testimonialName: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  testimonialRole: {
    fontSize: 10,
    opacity: 0.6,
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
  },
  testimonialComment: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 17,
    opacity: 0.8,
  },
  newsletterBox: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  newsletterIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  newsletterTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  newsletterSubtitle: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
  },
  newsletterInputRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
  },
  newsletterInput: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 13,
  },
  newsletterBtn: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newsletterBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});

