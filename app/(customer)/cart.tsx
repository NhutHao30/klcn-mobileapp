import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Image, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { useCart } from '@/context/CartContext';
import { formatImageUrl } from '@/config/apiConfig';

const MOCK_FALLBACK_CART = [
  { id: '1', name: 'Bánh Kem Dâu Tây Fresh', price: 199000, quantity: 1, image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=300' },
  { id: '2', name: 'Bánh Mì Sừng Bò Croissant', price: 35000, quantity: 2, image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=300' },
];

export default function CustomerCartPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { cartItems, updateQuantity, removeFromCart } = useCart();

  const [voucherCode, setVoucherCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);

  const displayCart = cartItems;

  const applyVoucher = () => {
    if (voucherCode.toUpperCase() === 'DOLA30' || voucherCode.toUpperCase() === 'GIVRAL30') {
      setAppliedDiscount(30000);
    } else if (voucherCode.toUpperCase() === 'FREESHIP') {
      setAppliedDiscount(15000);
    }
  };

  const subtotal = displayCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = subtotal > 300000 ? 0 : 25000;
  const total = Math.max(0, subtotal + shippingFee - appliedDiscount);

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Giỏ hàng ({displayCart.length})</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      {displayCart.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color={colors.icon} style={{ opacity: 0.5, marginBottom: 16 }} />
          <ThemedText style={styles.emptyText}>Giỏ hàng của bạn đang trống</ThemedText>
          <TouchableOpacity 
            style={[styles.shopNowBtn, { backgroundColor: colors.tint }]}
            onPress={() => router.push('/(customer)/products')}
          >
            <ThemedText style={styles.shopNowText}>Mua sắm ngay</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            
            {/* CART ITEMS */}
            {displayCart.map((item) => (
              <View key={item.id} style={[styles.cartCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                <Image source={{ uri: formatImageUrl(item.image) }} style={styles.itemImage} />

                <View style={styles.itemDetails}>
                  <View style={styles.itemTopRow}>
                    <ThemedText style={styles.itemName} numberOfLines={1}>{item.name}</ThemedText>
                    <TouchableOpacity onPress={() => removeFromCart(item.id)}>
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>

                  <ThemedText style={[styles.itemPrice, { color: colors.tint }]}>
                    {item.price.toLocaleString('vi-VN')}₫
                  </ThemedText>

                  <View style={styles.itemBottomRow}>
                    <View style={styles.qtyContainer}>
                      <TouchableOpacity 
                        style={[styles.qtyBtn, { borderColor: colors.cardBorder }]}
                        onPress={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <Ionicons name="remove" size={14} color={colors.text} />
                      </TouchableOpacity>
                      <ThemedText style={styles.qtyText}>{item.quantity}</ThemedText>
                      <TouchableOpacity 
                        style={[styles.qtyBtn, { borderColor: colors.cardBorder }]}
                        onPress={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Ionicons name="add" size={14} color={colors.text} />
                      </TouchableOpacity>
                    </View>

                    <ThemedText style={styles.itemTotal}>
                      {(item.price * item.quantity).toLocaleString('vi-VN')}₫
                    </ThemedText>
                  </View>
                </View>
              </View>
            ))}

            {/* VOUCHER SECTION */}
            <View style={[styles.voucherSection, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <ThemedText style={styles.sectionTitle}>Mã giảm giá / Voucher</ThemedText>
              <View style={styles.voucherInputRow}>
                <TextInput 
                  style={[styles.voucherInput, { color: colors.text, borderColor: colors.cardBorder }]}
                  value={voucherCode}
                  onChangeText={setVoucherCode}
                  autoCapitalize="characters"
                />
                <TouchableOpacity 
                  style={[styles.applyBtn, { backgroundColor: colors.tint }]}
                  onPress={applyVoucher}
                >
                  <ThemedText style={styles.applyBtnText}>Áp dụng</ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            {/* BILL SUMMARY */}
            <View style={[styles.summarySection, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <ThemedText style={styles.sectionTitle}>Chi tiết thanh toán</ThemedText>

              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Tạm tính</ThemedText>
                <ThemedText style={styles.summaryValue}>{subtotal.toLocaleString('vi-VN')}₫</ThemedText>
              </View>

              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Phí giao hàng (Freeship đơn từ 300k)</ThemedText>
                <ThemedText style={styles.summaryValue}>
                  {shippingFee === 0 ? 'Miễn phí' : `${shippingFee.toLocaleString('vi-VN')}₫`}
                </ThemedText>
              </View>

              {appliedDiscount > 0 && (
                <View style={styles.summaryRow}>
                  <ThemedText style={[styles.summaryLabel, { color: '#10b981' }]}>Giảm giá Voucher</ThemedText>
                  <ThemedText style={[styles.summaryValue, { color: '#10b981' }]}>
                    -{appliedDiscount.toLocaleString('vi-VN')}₫
                  </ThemedText>
                </View>
              )}

              <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

              <View style={styles.summaryRow}>
                <ThemedText style={styles.totalLabel}>Tổng cộng</ThemedText>
                <ThemedText style={[styles.totalValue, { color: colors.tint }]}>
                  {total.toLocaleString('vi-VN')}₫
                </ThemedText>
              </View>
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* BOTTOM CHECKOUT BAR */}
          <View style={[styles.bottomBar, { backgroundColor: colors.cardBg, borderTopColor: colors.cardBorder }]}>
            <View style={styles.bottomPriceGroup}>
              <ThemedText style={styles.bottomTotalLabel}>Tổng thanh toán:</ThemedText>
              <ThemedText style={[styles.bottomTotalValue, { color: colors.tint }]}>
                {total.toLocaleString('vi-VN')}₫
              </ThemedText>
            </View>

            <TouchableOpacity 
              style={[styles.checkoutBtn, { backgroundColor: colors.tint }]}
              onPress={() => router.push('/(customer)/checkout')}
            >
              <ThemedText style={styles.checkoutBtnText}>ĐẶT HÀNG</ThemedText>
            </TouchableOpacity>
          </View>
        </>
      )}
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
  shopNowBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  shopNowText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cartCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemName: {
    fontSize: 15,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginHorizontal: 10,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  voucherSection: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  voucherInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  voucherInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  applyBtn: {
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  summarySection: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
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
  divider: {
    height: 1,
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
  },
  bottomPriceGroup: {
    flex: 1,
  },
  bottomTotalLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
  bottomTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  checkoutBtn: {
    paddingHorizontal: 28,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkoutBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
