import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, Image, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import CustomerNavDrawer from '@/components/CustomerNavDrawer';
import FloatingNotification from '@/components/FloatingNotification';
import { productApi } from '@/services/api/productApi';
import { formatImageUrl } from '@/config/apiConfig';
import { useCart } from '@/context/CartContext';

const PRICE_FILTERS = [
  { id: 'all', label: 'Tất cả giá' },
  { id: 'under100', label: '< 100k' },
  { id: '100to300', label: '100k - 300k' },
  { id: 'over300', label: '> 300k' },
];

interface CategoryItem {
  id: string | number;
  name: string;
}

export default function CustomerProductsPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialCategory = params.category as string;

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { addToCart, toggleWishlist, isFavorite, cartCount, notificationMsg, clearNotification } = useCart();
  
  const [categories, setCategories] = useState<CategoryItem[]>([
    { id: 'all', name: 'Tất cả' },
  ]);
  const [selectedCat, setSelectedCat] = useState<string | number>('all');
  const [selectedPriceFilter, setSelectedPriceFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [productsList, setProductsList] = useState<any[]>([]);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Load Categories dynamically from system
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await productApi.getCategories();
      let list: any[] = [];
      if (Array.isArray(res)) {
        list = res;
      } else if (res?.data && Array.isArray(res.data)) {
        list = res.data;
      }

      if (list.length > 0) {
        const mapped: CategoryItem[] = [
          { id: 'all', name: 'Tất cả' },
          ...list
            .filter((c: any) => c.trangThai === undefined || c.trangThai === 1 || c.trang_thai === 1)
            .map((c: any) => ({
              id: c.id ?? c.MALOAI ?? c.slug ?? c.tenLoai,
              name: c.tenLoai ?? c.TENLOAI ?? c.name ?? `Loại ${c.id}`,
            })),
        ];
        setCategories(mapped);
      }
    } catch (e) {
      console.log('Error loading categories:', e);
    }
  };

  useEffect(() => {
    if (initialCategory) {
      setSelectedCat(initialCategory);
    }
  }, [initialCategory]);

  useEffect(() => {
    loadProducts(currentPage);
  }, [currentPage, selectedCat]);

  const loadProducts = async (page: number = 1) => {
    setIsLoading(true);
    try {
      const params: any = { page, size: 50 };
      if (selectedCat !== 'all' && selectedCat !== 'Tất cả') {
        params.category = selectedCat;
      }
      const data = await productApi.getProducts(params);
      let items: any[] = [];
      
      if (data) {
        if (data.data && Array.isArray(data.data)) {
          items = data.data;
          setCurrentPage(data.current_page || page);
          setLastPage(data.last_page || 1);
          setTotalProducts(data.total || items.length);
        } else if (Array.isArray(data)) {
          items = data;
          setLastPage(1);
          setTotalProducts(data.length);
        }
      }

      if (items.length > 0) {
        const mapped = items.map((p: any) => {
          const qty = Number(p.soLuongTon ?? p.SOLUONG_TON ?? p.TONKHO_THUCTE ?? 0);
          const isOut = Boolean(p.isOutOfStock || qty <= 0);
          const catName = p.loaiSanPham?.tenLoai || p.loai_san_pham?.tenLoai || p.loai_san_pham?.TENLOAI || p.loaisanpham?.TENLOAI || p.loaiSanPham?.TENLOAI || p.category || 'Bánh ngọt';
          const catId = p.loaiId ?? p.loai_id ?? p.MALOAI ?? p.loaisanpham?.id ?? p.loai_san_pham?.id ?? p.loaiSanPham?.id;
          return {
            id: p.MASP || p.id,
            name: p.TENSP || p.name,
            category: catName,
            categoryId: catId,
            price: p.GIABAN ? Number(p.GIABAN) : (p.giaBan ? Number(p.giaBan) : 0),
            salePrice: p.GIAGIAM ? Number(p.GIAGIAM) : null,
            discount: p.GIAGIAM ? Math.round(((Number(p.GIABAN) - Number(p.GIAGIAM)) / Number(p.GIABAN)) * 100) : 0,
            rating: 5.0,
            image: formatImageUrl(p.HINHANH || p.hinhAnh),
            isNew: !!p.IS_NEW,
            soLuongTon: qty,
            isOutOfStock: isOut,
          };
        });
        setProductsList(mapped);

        // Auto-extract categories from products if categoryApi didn't return any
        setCategories(prevCats => {
          if (prevCats.length <= 1) {
            const uniqueCats = Array.from(new Set(mapped.map(p => p.category).filter(Boolean)));
            if (uniqueCats.length > 0) {
              return [
                { id: 'all', name: 'Tất cả' },
                ...uniqueCats.map(name => ({ id: name, name })),
              ];
            }
          }
          return prevCats;
        });
      } else {
        setProductsList([]);
      }
    } catch (e) {
      console.log('Error loading products:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtering Logic
  const filteredProducts = productsList.filter(p => {
    const finalPrice = p.salePrice || p.price;

    // 1. Category Filter
    let matchesCat = true;
    if (selectedCat !== 'all' && selectedCat !== 'Tất cả') {
      const target = String(selectedCat).toLowerCase().trim();
      const pCatId = p.categoryId !== undefined && p.categoryId !== null ? String(p.categoryId).toLowerCase().trim() : '';
      const pCatName = (p.category || '').toLowerCase().trim();
      matchesCat = pCatId === target || pCatName === target || pCatName.includes(target) || target.includes(pCatName);
    }

    // 2. Search Query
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());

    // 3. Price Filter
    let matchesPrice = true;
    if (selectedPriceFilter === 'under100') {
      matchesPrice = finalPrice < 100000;
    } else if (selectedPriceFilter === '100to300') {
      matchesPrice = finalPrice >= 100000 && finalPrice <= 300000;
    } else if (selectedPriceFilter === 'over300') {
      matchesPrice = finalPrice > 300000;
    }

    return matchesCat && matchesSearch && matchesPrice;
  });

  const renderProduct = ({ item }: { item: any }) => {
    const isFav = isFavorite(item.id);

    return (
      <TouchableOpacity 
        style={[styles.productCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
        onPress={() => router.push({ pathname: '/(customer)/product-detail', params: { id: item.id } })}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.image }} style={styles.productImage} />
          
          <View style={styles.badgesContainer}>
            {item.isNew && (
              <View style={styles.newBadge}>
                <ThemedText style={styles.newBadgeText}>NEW 🌟</ThemedText>
              </View>
            )}

            {item.isOutOfStock ? (
              <View style={[styles.saleBadge, { backgroundColor: '#dc2626' }]}>
                <ThemedText style={styles.saleBadgeText}>Hết hàng</ThemedText>
              </View>
            ) : item.discount > 0 ? (
              <View style={styles.saleBadge}>
                <ThemedText style={styles.saleBadgeText}>-{item.discount}%</ThemedText>
              </View>
            ) : null}
          </View>

          {/* WISHLIST HEART BUTTON */}
          <TouchableOpacity 
            style={styles.heartBtn}
            onPress={(e) => {
              e.stopPropagation();
              toggleWishlist(item);
            }}
          >
            <Ionicons 
              name={isFav ? "heart" : "heart-outline"} 
              size={18} 
              color={isFav ? "#ef4444" : "#ffffff"} 
            />
          </TouchableOpacity>
        </View>

        <View style={styles.productDetails}>
          <ThemedText style={styles.catName}>{item.category}</ThemedText>
          <ThemedText style={styles.productName} numberOfLines={2}>{item.name}</ThemedText>
          
          <View style={styles.priceRow}>
            <View style={{ flex: 1 }}>
              <ThemedText style={[styles.priceText, { color: colors.tint }]}>
                {(item.salePrice || item.price || 0).toLocaleString('vi-VN')}₫
              </ThemedText>
              {item.salePrice && (
                <ThemedText style={styles.originalPriceText}>
                  {item.price.toLocaleString('vi-VN')}₫
                </ThemedText>
              )}
            </View>

            {/* ADD TO CART BUTTON */}
            <TouchableOpacity 
              style={[styles.addToCartBtn, { backgroundColor: item.isOutOfStock ? '#94a3b8' : colors.tint }]}
              onPress={(e) => {
                e.stopPropagation();
                if (item.isOutOfStock) {
                  Alert.alert('Hết hàng', 'Sản phẩm này hiện đang tạm hết hàng!');
                  return;
                }
                addToCart(item);
              }}
              disabled={item.isOutOfStock}
            >
              <Ionicons name="add" size={20} color="#fff" />
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
        message={notificationMsg || ''} 
        onClose={clearNotification} 
      />

      <CustomerNavDrawer 
        visible={drawerVisible} 
        onClose={() => setDrawerVisible(false)} 
      />

      {/* HEADER & SEARCH */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setDrawerVisible(true)} style={{ paddingRight: 12 }}>
              <Ionicons name="menu" size={28} color="#fff" />
            </TouchableOpacity>
            <ThemedText style={styles.headerTitle}>Danh mục Bánh Givral</ThemedText>
          </View>

          {/* CART ICON WITH BADGE */}
          <TouchableOpacity 
            style={styles.cartHeaderBtn}
            onPress={() => router.push('/(customer)/cart')}
          >
            <Ionicons name="cart-outline" size={26} color="#fff" />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <ThemedText style={styles.cartBadgeText}>{cartCount}</ThemedText>
              </View>
            )}
          </TouchableOpacity>
        </View>
        
        {/* SEARCH BAR WITH CLEAR & VISIBLE COLOR */}
        <View style={[styles.searchBar, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <Ionicons name="search-outline" size={20} color={colors.icon} style={{ marginRight: 8 }} />
          <TextInput 
            placeholder="Tìm tên bánh..."
            placeholderTextColor={colors.icon}
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.icon} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* FILTERS CONTAINER */}
      <View style={{ paddingVertical: 8 }}>
        {/* CATEGORIES SCROLL */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {categories.map(cat => {
            const isSelected = selectedCat === cat.id ||
                              String(selectedCat).toLowerCase() === String(cat.id).toLowerCase() ||
                              String(selectedCat).toLowerCase() === cat.name.toLowerCase();
            return (
              <TouchableOpacity
                key={String(cat.id)}
                style={[
                  styles.catTab,
                  { backgroundColor: isSelected ? colors.tint : colors.cardBg, borderColor: colors.cardBorder }
                ]}
                onPress={() => {
                  setSelectedCat(cat.id);
                  if (currentPage !== 1) {
                    setCurrentPage(1);
                  }
                }}
              >
                <ThemedText style={[styles.catTabText, { color: isSelected ? '#fff' : colors.text }]}>
                  {cat.name}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* PRICE RANGE SCROLL */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.catScroll, { marginTop: 8 }]}>
          {PRICE_FILTERS.map(pf => {
            const isSelected = selectedPriceFilter === pf.id;
            return (
              <TouchableOpacity
                key={pf.id}
                style={[
                  styles.priceChip,
                  { backgroundColor: isSelected ? colors.headerBg : colors.cardBg, borderColor: colors.cardBorder }
                ]}
                onPress={() => setSelectedPriceFilter(pf.id)}
              >
                <Ionicons name="pricetag-outline" size={12} color={isSelected ? '#fff' : colors.text} style={{ marginRight: 4 }} />
                <ThemedText style={[styles.priceChipText, { color: isSelected ? '#fff' : colors.text }]}>
                  {pf.label}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* PRODUCTS GRID OR LOADING */}
      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.tint} />
          <ThemedText style={{ marginTop: 10, opacity: 0.7 }}>Đang tải danh sách bánh...</ThemedText>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          numColumns={2}
          keyExtractor={(item, index) => String(item?.id || item?.MASP || index)}
          renderItem={renderProduct}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="search-outline" size={48} color={colors.icon} />
              <ThemedText style={styles.emptyText}>Không tìm thấy bánh phù hợp</ThemedText>
            </View>
          }
        />
      )}

      {/* PAGINATION CONTROLS */}
      {lastPage > 1 && (
        <View style={[styles.paginationContainer, { backgroundColor: colors.cardBg, borderTopColor: colors.cardBorder }]}>
          <TouchableOpacity
            style={[
              styles.pageBtn,
              { backgroundColor: currentPage > 1 ? colors.tint : colors.cardBorder, opacity: currentPage > 1 ? 1 : 0.5 }
            ]}
            disabled={currentPage <= 1 || isLoading}
            onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          >
            <Ionicons name="chevron-back" size={18} color="#fff" />
            <ThemedText style={styles.pageBtnText}>Trang trước</ThemedText>
          </TouchableOpacity>

          <ThemedText style={styles.pageInfoText}>
            Trang {currentPage} / {lastPage}
          </ThemedText>

          <TouchableOpacity
            style={[
              styles.pageBtn,
              { backgroundColor: currentPage < lastPage ? colors.tint : colors.cardBorder, opacity: currentPage < lastPage ? 1 : 0.5 }
            ]}
            disabled={currentPage >= lastPage || isLoading}
            onPress={() => setCurrentPage(prev => Math.min(lastPage, prev + 1))}
          >
            <ThemedText style={styles.pageBtnText}>Trang sau</ThemedText>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
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
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  cartHeaderBtn: {
    position: 'relative',
    padding: 4,
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  catScroll: {
    paddingHorizontal: 16,
  },
  catTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  catTabText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  priceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  priceChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  productCard: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
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
  badgesContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
    zIndex: 10,
  },
  saleBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  saleBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  newBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
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
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productDetails: {
    padding: 12,
  },
  catName: {
    fontSize: 11,
    opacity: 0.6,
    marginBottom: 2,
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    minHeight: 40,
    lineHeight: 20,
    marginBottom: 8,
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
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 12,
    opacity: 0.6,
    fontSize: 14,
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  pageBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  pageInfoText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
});
