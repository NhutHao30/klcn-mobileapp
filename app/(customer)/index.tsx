import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Image, FlatList, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import CustomerNavDrawer from '@/components/CustomerNavDrawer';

const POLICIES = [
  { id: '1', title: 'Miễn phí vận chuyển', desc: 'Đơn hàng từ 300k', icon: 'car-outline' },
  { id: '2', title: 'Đổi trả dễ dàng', desc: 'Đổi trong 24h', icon: 'refresh-outline' },
  { id: '3', title: 'Hỗ trợ 24/7', desc: 'Hotline 19006750', icon: 'call-outline' },
  { id: '4', title: 'Thanh toán đa dạng', desc: 'Visa, Napas, COD', icon: 'card-outline' },
];

const CATEGORIES = [
  { id: '1', title: 'Bánh kếp', image: 'https://images.unsplash.com/photo-1519869325930-281384150729?w=300' },
  { id: '2', title: 'Bánh su kem', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300' },
  { id: '3', title: 'Bánh mì nướng', image: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=300' },
  { id: '4', title: 'Bánh ngọt khác', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300' },
];

const SALE_PRODUCTS = [
  { id: '1', name: 'Bánh Kem Dâu Tây Fresh', price: 250000, salePrice: 199000, discount: 20, rating: 4.9, image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400' },
  { id: '2', name: 'Bánh Mì Sừng Bò Croissant', price: 45000, salePrice: 35000, discount: 22, rating: 4.8, image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400' },
  { id: '3', name: 'Bánh Su Kem Socola Bỉ', price: 120000, salePrice: 90000, discount: 25, rating: 5.0, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400' },
  { id: '4', name: 'Bánh Tart Trái Cây Tươi', price: 180000, salePrice: 145000, discount: 19, rating: 4.7, image: 'https://images.unsplash.com/photo-1519869325930-281384150729?w=400' },
];

const BEST_SELLERS = [
  { id: '5', name: 'Bánh Tiramisu Phô Mai', price: 220000, rating: 5.0, image: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400' },
  { id: '6', name: 'Bánh Mì Nướng Bơ Tỏi', price: 55000, rating: 4.9, image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=400' },
];

export default function CustomerHomePage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [favoriteIds, setFavoriteIds] = useState<string[]>(['1', '3']);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const toggleFavorite = (id: string) => {
    if (favoriteIds.includes(id)) {
      setFavoriteIds(favoriteIds.filter(item => item !== id));
    } else {
      setFavoriteIds([...favoriteIds, id]);
    }
  };

  const renderProductItem = ({ item }: { item: any }) => {
    const isFav = favoriteIds.includes(item.id);

    return (
      <TouchableOpacity 
        style={[styles.productCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
        onPress={() => router.push({ pathname: '/(customer)/product-detail', params: { id: item.id } })}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.image }} style={styles.productImage} />
          
          {item.discount > 0 && (
            <View style={styles.saleBadge}>
              <ThemedText style={styles.saleBadgeText}>-{item.discount}%</ThemedText>
            </View>
          )}

          <TouchableOpacity 
            style={styles.heartBtn}
            onPress={() => toggleFavorite(item.id)}
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
            <View>
              <ThemedText style={[styles.priceText, { color: colors.tint }]}>
                {(item.salePrice || item.price).toLocaleString('vi-VN')}₫
              </ThemedText>
              {item.salePrice && (
                <ThemedText style={styles.originalPriceText}>
                  {item.price.toLocaleString('vi-VN')}₫
                </ThemedText>
              )}
            </View>

            <TouchableOpacity style={[styles.addToCartBtn, { backgroundColor: colors.tint }]}>
              <Ionicons name="cart-outline" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ThemedView style={styles.container}>
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
            <ThemedText style={styles.brandName}>DOLA BAKERY</ThemedText>
          </View>

          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.push('/(customer)/cart')}>
              <Ionicons name="bag-handle-outline" size={24} color="#fff" />
              <View style={styles.badgeCount}>
                <ThemedText style={styles.badgeText}>3</ThemedText>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={colors.icon} style={{ marginRight: 8 }} />
          <TextInput 
            placeholder="Tìm kiếm bánh kem, croissant, su kem..."
            placeholderTextColor={colors.icon}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* BANNER PROMO */}
        <View style={styles.bannerContainer}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800' }} 
            style={styles.bannerImage}
          />
          <View style={styles.bannerOverlay}>
            <ThemedText style={styles.bannerSubtitle}>Bánh Tươi Mỗi Ngày</ThemedText>
            <ThemedText style={styles.bannerTitle}>GIẢM TỚI 30% ĐƠN ĐẦU TIÊN</ThemedText>
            <TouchableOpacity 
              style={[styles.bannerBtn, { backgroundColor: colors.tint }]}
              onPress={() => router.push('/(customer)/products')}
            >
              <ThemedText style={styles.bannerBtnText}>Khám phá ngay</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* POLICIES GRID */}
        <View style={styles.policiesContainer}>
          {POLICIES.map((p) => (
            <View key={p.id} style={[styles.policyCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <Ionicons name={p.icon as any} size={22} color={colors.tint} style={{ marginBottom: 4 }} />
              <ThemedText style={styles.policyTitle} numberOfLines={1}>{p.title}</ThemedText>
              <ThemedText style={styles.policyDesc} numberOfLines={1}>{p.desc}</ThemedText>
            </View>
          ))}
        </View>

        {/* CATEGORIES */}
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Danh mục bánh</ThemedText>
          <TouchableOpacity onPress={() => router.push('/(customer)/products')}>
            <ThemedText style={[styles.seeAllText, { color: colors.tint }]}>Xem tất cả</ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity 
              key={cat.id} 
              style={styles.catItem}
              onPress={() => router.push('/(customer)/products')}
            >
              <Image source={{ uri: cat.image }} style={styles.catImage} />
              <ThemedText style={styles.catTitle}>{cat.title}</ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* FLASH SALE / DISCOUNTED */}
        <View style={styles.flashSaleHeader}>
          <View style={styles.flashSaleTitleRow}>
            <Ionicons name="flash" size={22} color="#ef4444" style={{ marginRight: 6 }} />
            <ThemedText style={styles.flashSaleTitle}>Đang giảm giá</ThemedText>
          </View>
          <View style={styles.timerBadge}>
            <ThemedText style={styles.timerText}>Hết hạn trong 05:42:19</ThemedText>
          </View>
        </View>

        <FlatList
          data={SALE_PRODUCTS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.id}
          renderItem={renderProductItem}
          contentContainerStyle={styles.horizontalProductsList}
        />

        {/* BEST SELLERS */}
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Bánh bán chạy nhất</ThemedText>
          <TouchableOpacity onPress={() => router.push('/(customer)/products')}>
            <ThemedText style={[styles.seeAllText, { color: colors.tint }]}>Xem tất cả</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.verticalProductsGrid}>
          {BEST_SELLERS.map((item) => (
            <View key={item.id} style={{ width: '48%' }}>
              {renderProductItem({ item })}
            </View>
          ))}
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
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  scrollContent: {
    padding: 16,
  },
  bannerContainer: {
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 20,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 16,
    justifyContent: 'center',
  },
  bannerSubtitle: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    marginVertical: 4,
    width: '70%',
  },
  bannerBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  bannerBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  policiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  policyCard: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  policyTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  policyDesc: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  categoriesScroll: {
    marginBottom: 24,
  },
  catItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  catImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 8,
  },
  catTitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  flashSaleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  flashSaleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flashSaleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  timerBadge: {
    backgroundColor: '#ef444415',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timerText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: 'bold',
  },
  horizontalProductsList: {
    paddingBottom: 16,
    marginBottom: 12,
  },
  productCard: {
    width: 170,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginRight: 14,
  },
  imageContainer: {
    height: 140,
    width: '100%',
    position: 'relative',
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
    paddingVertical: 2,
    borderRadius: 8,
  },
  saleBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ffffffcc',
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
    height: 36,
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
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 15,
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
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verticalProductsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
