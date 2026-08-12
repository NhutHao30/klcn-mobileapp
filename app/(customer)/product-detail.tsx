import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function CustomerProductDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);

  // Mock product data
  const product = {
    id: params.id || '1',
    name: 'Bánh Kem Dâu Tây Fresh (Strawberry Cake)',
    category: 'Bánh sinh nhật',
    price: 250000,
    salePrice: 199000,
    discount: 20,
    rating: 4.9,
    reviewsCount: 128,
    stock: 'Còn hàng',
    code: 'SP-BAKERY-001',
    image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600',
    description: 'Bánh kem dâu tây được làm từ cốt bánh bông lan mềm mịn, phủ lớp kem tươi béo ngậy cùng dâu tây tươi nhập khẩu 100%. Món quà tuyệt vời cho các buổi tiệc sinh nhật và kỷ niệm.',
    ingredients: 'Bột mì, Trứng gà, Sữa tươi, Dâu tây tươi, Kem tươi whipping cream, Đường tự nhiên.',
    preservation: 'Bảo quản ngăn mát tủ lạnh ở nhiệt độ 2°C - 5°C. Dùng ngon nhất trong vòng 48 giờ.',
  };

  return (
    <ThemedView style={styles.container}>
      {/* FLOATING HEADER */}
      <View style={styles.floatingHeader}>
        <TouchableOpacity style={styles.iconCircle} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>

        <View style={styles.headerRightGroup}>
          <TouchableOpacity style={styles.iconCircle} onPress={() => setIsFavorite(!isFavorite)}>
            <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={22} color={isFavorite ? "#ef4444" : "#333"} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconCircle} onPress={() => router.push('/(customer)/cart')}>
            <Ionicons name="cart-outline" size={22} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* PRODUCT IMAGE */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: product.image }} style={styles.productImage} />
          {product.discount > 0 && (
            <View style={styles.saleTag}>
              <ThemedText style={styles.saleTagText}>-{product.discount}% OFF</ThemedText>
            </View>
          )}
        </View>

        {/* DETAILS CARD */}
        <View style={[styles.detailsSection, { backgroundColor: colors.background }]}>
          <View style={styles.catRow}>
            <ThemedText style={styles.catText}>{product.category}</ThemedText>
            <View style={styles.stockBadge}>
              <ThemedText style={styles.stockText}>{product.stock}</ThemedText>
            </View>
          </View>

          <ThemedText style={styles.productTitle}>{product.name}</ThemedText>

          <View style={styles.ratingRow}>
            <Ionicons name="star" size={16} color="#f59e0b" />
            <ThemedText style={styles.ratingScore}>{product.rating}</ThemedText>
            <ThemedText style={styles.ratingCount}>({product.reviewsCount} đánh giá)</ThemedText>
            <ThemedText style={styles.dot}>•</ThemedText>
            <ThemedText style={styles.codeText}>Mã: {product.code}</ThemedText>
          </View>

          {/* PRICE SECTION */}
          <View style={[styles.priceBox, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View>
              <ThemedText style={[styles.salePrice, { color: colors.tint }]}>
                {product.salePrice.toLocaleString('vi-VN')}₫
              </ThemedText>
              <ThemedText style={styles.originalPrice}>
                {product.price.toLocaleString('vi-VN')}₫
              </ThemedText>
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
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* BOTTOM ACTION BAR */}
      <View style={[styles.bottomBar, { backgroundColor: colors.cardBg, borderTopColor: colors.cardBorder }]}>
        <TouchableOpacity 
          style={[styles.addCartBtn, { borderColor: colors.tint }]}
          onPress={() => router.push('/(customer)/cart')}
        >
          <Ionicons name="cart-outline" size={20} color={colors.tint} style={{ marginRight: 6 }} />
          <ThemedText style={[styles.addCartText, { color: colors.tint }]}>Thêm vào giỏ</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.buyNowBtn, { backgroundColor: colors.tint }]}
          onPress={() => router.push('/(customer)/checkout')}
        >
          <ThemedText style={styles.buyNowText}>MUA NGAY</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    backgroundColor: '#ffffffcc',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 8,
  },
  catText: {
    fontSize: 13,
    fontWeight: 'bold',
    opacity: 0.6,
    textTransform: 'uppercase',
  },
  stockBadge: {
    backgroundColor: '#10b98115',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  stockText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: 'bold',
  },
  productTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingScore: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  ratingCount: {
    fontSize: 12,
    opacity: 0.6,
    marginLeft: 4,
  },
  dot: {
    marginHorizontal: 8,
    opacity: 0.5,
  },
  codeText: {
    fontSize: 12,
    opacity: 0.6,
  },
  priceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  salePrice: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  originalPrice: {
    fontSize: 14,
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 14,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  addCartBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCartText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  buyNowBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyNowText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
