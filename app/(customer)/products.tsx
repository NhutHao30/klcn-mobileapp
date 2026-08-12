import React, { useState } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, Image, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import CustomerNavDrawer from '@/components/CustomerNavDrawer';

const CATEGORIES = ['Tất cả', 'Bánh kếp', 'Bánh su kem', 'Bánh mì nướng', 'Bánh ngọt', 'Bánh sinh nhật'];

const ALL_PRODUCTS = [
  { id: '1', name: 'Bánh Kem Dâu Tây Fresh', category: 'Bánh sinh nhật', price: 250000, salePrice: 199000, discount: 20, rating: 4.9, image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400' },
  { id: '2', name: 'Bánh Mì Sừng Bò Croissant', category: 'Bánh mì nướng', price: 45000, salePrice: 35000, discount: 22, rating: 4.8, image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400' },
  { id: '3', name: 'Bánh Su Kem Socola Bỉ', category: 'Bánh su kem', price: 120000, salePrice: 90000, discount: 25, rating: 5.0, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400' },
  { id: '4', name: 'Bánh Tart Trái Cây Tươi', category: 'Bánh ngọt', price: 180000, salePrice: 145000, discount: 19, rating: 4.7, image: 'https://images.unsplash.com/photo-1519869325930-281384150729?w=400' },
  { id: '5', name: 'Bánh Tiramisu Phô Mai', category: 'Bánh ngọt', price: 220000, salePrice: null, discount: 0, rating: 5.0, image: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400' },
  { id: '6', name: 'Bánh Mì Nướng Bơ Tỏi', category: 'Bánh mì nướng', price: 55000, salePrice: null, discount: 0, rating: 4.9, image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=400' },
];

export default function CustomerProductsPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [selectedCat, setSelectedCat] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);

  const filteredProducts = ALL_PRODUCTS.filter(p => {
    const matchesCat = selectedCat === 'Tất cả' || p.category === selectedCat;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const renderProduct = ({ item }: { item: typeof ALL_PRODUCTS[0] }) => (
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
      </View>

      <View style={styles.productDetails}>
        <ThemedText style={styles.catName}>{item.category}</ThemedText>
        <ThemedText style={styles.productName} numberOfLines={2}>{item.name}</ThemedText>
        
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
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <CustomerNavDrawer 
        visible={drawerVisible} 
        onClose={() => setDrawerVisible(false)} 
      />

      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <TouchableOpacity onPress={() => setDrawerVisible(true)} style={{ paddingRight: 12 }}>
            <Ionicons name="menu" size={28} color="#fff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Danh mục Bánh Dola</ThemedText>
        </View>
        
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={colors.icon} style={{ marginRight: 8 }} />
          <TextInput 
            placeholder="Tìm tên bánh..."
            placeholderTextColor={colors.icon}
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* CATEGORY TABS HORIZONTAL */}
      <View style={{ paddingVertical: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {CATEGORIES.map(cat => {
            const isSelected = selectedCat === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.catTab,
                  { backgroundColor: isSelected ? colors.tint : colors.cardBg, borderColor: colors.cardBorder }
                ]}
                onPress={() => setSelectedCat(cat)}
              >
                <ThemedText style={[styles.catTabText, { color: isSelected ? '#fff' : colors.text }]}>
                  {cat}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* PRODUCTS GRID */}
      <FlatList
        data={filteredProducts}
        numColumns={2}
        keyExtractor={item => item.id}
        renderItem={renderProduct}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
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
    marginBottom: 12,
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
    height: 36,
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
});
