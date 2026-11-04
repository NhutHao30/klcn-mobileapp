import React from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCart, WishlistItem } from '@/context/CartContext';
import { formatImageUrl } from '@/config/apiConfig';
import FloatingNotification from '@/components/FloatingNotification';

export default function CustomerWishlistPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { wishlistItems, toggleWishlist, addToCart, notificationMsg, clearNotification } = useCart();

  const renderWishlistItem = ({ item }: { item: WishlistItem }) => (
    <TouchableOpacity 
      style={[styles.itemCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
      onPress={() => router.push({ pathname: '/(customer)/product-detail', params: { id: item.id } })}
    >
      <Image source={{ uri: formatImageUrl(item.image) }} style={styles.itemImage} />

      <View style={styles.itemInfo}>
        <ThemedText style={styles.itemName} numberOfLines={2}>{item.name}</ThemedText>
        
        <View style={styles.priceRow}>
          <ThemedText style={[styles.salePrice, { color: colors.tint }]}>
            {(item.price || 0).toLocaleString('vi-VN')}₫
          </ThemedText>
          {item.originalPrice ? (
            <ThemedText style={styles.originalPrice}>
              {item.originalPrice.toLocaleString('vi-VN')}₫
            </ThemedText>
          ) : null}
        </View>
      </View>

      <View style={styles.actionColumn}>
        <TouchableOpacity style={styles.removeBtn} onPress={() => toggleWishlist(item)}>
          <Ionicons name="close" size={20} color={colors.icon} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.addCartBtn, { backgroundColor: colors.tint }]}
          onPress={() => addToCart(item)}
        >
          <Ionicons name="cart" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <FloatingNotification 
        visible={!!notificationMsg} 
        message={notificationMsg || ''} 
        onClose={clearNotification} 
      />

      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <ThemedText style={styles.headerTitle}>Sản phẩm yêu thích ({wishlistItems.length})</ThemedText>
      </View>

      {wishlistItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-dislike-outline" size={80} color={colors.icon} style={{ opacity: 0.5, marginBottom: 16 }} />
          <ThemedText style={styles.emptyText}>Chưa có bánh nào trong danh sách yêu thích</ThemedText>
          <TouchableOpacity 
            style={[styles.exploreBtn, { backgroundColor: colors.tint }]}
            onPress={() => router.push('/(customer)/products')}
          >
            <ThemedText style={styles.exploreText}>Khám phá bánh Givral</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={wishlistItems}
          keyExtractor={(item, index) => String(item?.id || index)}
          renderItem={renderWishlistItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
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
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 20,
  },
  exploreBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  exploreText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: 'center',
  },
  itemImage: {
    width: 76,
    height: 76,
    borderRadius: 12,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  salePrice: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  originalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  actionColumn: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 76,
  },
  removeBtn: {
    padding: 4,
  },
  addCartBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
