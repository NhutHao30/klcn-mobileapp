import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, FlatList, TextInput, Modal, Alert, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { permissionService } from '@/services/permissionService';
import { soundService } from '@/services/soundService';
import { CameraView } from 'expo-camera';
import { adminApi } from '@/services/api/adminApi';
import { productApi } from '@/services/api/productApi';
import { formatImageUrl } from '@/config/apiConfig';

export default function POSScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [cart, setCart] = useState<{ product: any; qty: number }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [cameraFront, setCameraFront] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'TIEN_MAT' | 'CHUYEN_KHOAN' | 'THE'>('TIEN_MAT');

  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      setFetchError(null);
      const res = await productApi.getProducts({ size: 100 } as any);
      const items = Array.isArray(res) ? res : (res?.data || []);
      if (items && items.length > 0) {
        const mapped = items.map((p: any) => ({
          id: p.MASP,
          code: p.MASP,
          name: p.TENSP,
          price: Number(p.GIABAN) || 0,
          stock: p.TONKHO_THUCTE || 0,
          image: formatImageUrl(p.HINHANH),
        }));
        setProducts(mapped);
      }
    } catch (e: any) {
      setFetchError(e?.message || 'Không thể kết nối đến máy chủ API.');
    } finally {
      setLoadingProducts(false);
    }
  };


  const handleOpenScanner = async () => {
    const granted = await permissionService.requestCameraPermission();
    if (granted) {
      setScanned(false);
      setIsScanning(true);
    }
  };

  const handleBarcodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);
    soundService.playScanBeep();

    const cleanData = String(data || '').trim().toUpperCase();
    const cleanWithoutHash = cleanData.replace(/^#+/, '').trim();
    const spMatch = cleanWithoutHash.match(/^SP0*(\d+)$/i) || cleanWithoutHash.match(/^0*(\d+)$/);
    const numId = spMatch && spMatch[1] ? parseInt(spMatch[1], 10) : null;

    const matched = products.find(p => {
      const pId = parseInt(p.id, 10);
      if (numId !== null && !isNaN(pId) && pId === numId) return true;

      const code = String(p.code || p.id || '').toUpperCase();
      const codeWithoutHash = code.replace(/^#+/, '');
      const pNumId = parseInt(p.id, 10);
      const spPad3 = !isNaN(pNumId) ? `SP${String(pNumId).padStart(3, '0')}` : '';

      return (
        code === cleanData ||
        codeWithoutHash === cleanWithoutHash ||
        spPad3 === cleanData ||
        spPad3 === cleanWithoutHash ||
        p.name.toLowerCase().includes(cleanData.toLowerCase())
      );
    });

    if (matched) {
      addToCart(matched);
      Alert.alert('Đã quét mã!', `Mã: ${data}\nSản phẩm: ${matched.name}\nGiá: ${matched.price.toLocaleString('vi-VN')}₫`);
    } else {
      Alert.alert('Thông báo', `Không tìm thấy sản phẩm phù hợp với mã: ${data}`);
    }
    setIsScanning(false);
  };

  const addToCart = (product: any) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}

    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { product, qty: 1 }]);
    }
  };

  const handleIncreaseQty = (productId: string) => {
    setCart(cart.map(item => item.product.id === productId ? { ...item, qty: item.qty + 1 } : item));
  };

  const handleDecreaseQty = (productId: string) => {
    const existing = cart.find(item => item.product.id === productId);
    if (existing && existing.qty > 1) {
      setCart(cart.map(item => item.product.id === productId ? { ...item, qty: item.qty - 1 } : item));
    } else {
      handleRemoveItem(productId);
    }
  };

  const handleRemoveItem = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const handleSimulateScan = (product: any) => {
    soundService.playScanBeep();
    addToCart(product);
    setIsScanning(false);
    Alert.alert('Đã quét mã!', `Sản phẩm: ${product.name} - Giá: ${product.price.toLocaleString('vi-VN')}₫`);
  };

  const total = cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);

  const [showQrModal, setShowQrModal] = useState(false);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if ((paymentMethod === 'CHUYEN_KHOAN' || paymentMethod === 'THE') && !showQrModal) {
      setShowQrModal(true);
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        CHI_TIET: cart.map(item => ({
          MASP: item.product.code || item.product.id,
          SO_LUONG: item.qty,
          DON_GIA: item.product.price,
        })),
        TONG_TIEN: total,
        HINHTHUC_THANHTOAN: paymentMethod,
      };

      await adminApi.createPosCheckout(payload);
      setShowQrModal(false);
      Alert.alert('Thành công', `Thanh toán thành công đơn hàng POS!\nHình thức: ${paymentMethod === 'THE' ? 'Thẻ máy POS' : paymentMethod === 'CHUYEN_KHOAN' ? 'Chuyển khoản QR' : 'Tiền mặt'}\nTổng tiền: ${total.toLocaleString('vi-VN')}₫`);
      setCart([]);
      fetchProducts(); // Refresh stock
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể hoàn tất thanh toán đơn POS.');
    } finally {
      setSubmitting(false);
    }
  };


  const renderProduct = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.productItem, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}
      onPress={() => addToCart(item)}
      activeOpacity={0.7}
    >
      <Image source={{ uri: item.image }} style={styles.productImage} />
      <ThemedText style={styles.productName} numberOfLines={1}>{item.name}</ThemedText>
      <ThemedText style={[styles.productPrice, { color: colors.tint }]}>{item.price.toLocaleString('vi-VN')}₫</ThemedText>
      <ThemedText style={{ fontSize: 10, opacity: 0.6 }}>Tồn: {item.stock}</ThemedText>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      {/* SCANNER CAMERA MODAL */}
      <Modal visible={isScanning} animationType="slide" transparent={false}>
        <View style={styles.scannerModalContainer}>
          <View style={styles.cameraViewfinder}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing={cameraFront ? 'front' : 'back'}
              enableTorch={flashOn}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />

            <View style={[styles.scanFrame, { borderColor: colors.tint }]}>
              <View style={[styles.scanLine, { backgroundColor: colors.tint }]} />
            </View>

            <View style={styles.cameraControls}>
              <TouchableOpacity
                style={[styles.controlCircle, { backgroundColor: flashOn ? colors.tint : 'rgba(0,0,0,0.6)' }]}
                onPress={() => setFlashOn(!flashOn)}
              >
                <Ionicons name={flashOn ? "flash" : "flash-off"} size={22} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlCircle, { backgroundColor: cameraFront ? colors.tint : 'rgba(0,0,0,0.6)' }]}
                onPress={() => setCameraFront(!cameraFront)}
              >
                <Ionicons name="camera-reverse" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <ThemedText style={styles.scannerGuideText}>
              Đưa mã vạch / QR sản phẩm vào khung hình
            </ThemedText>
          </View>

          <View style={styles.simulateScanSection}>
            <ThemedText style={{ color: '#fff', fontSize: 13, marginBottom: 8, textAlign: 'center' }}>
              Hoặc bấm chọn sản phẩm thực tế để giả lập quét mã:
            </ThemedText>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 50, marginBottom: 12 }}>
              {products.slice(0, 6).map(prod => (
                <TouchableOpacity
                  key={prod.id}
                  style={styles.mockScanBtn}
                  onPress={() => handleSimulateScan(prod)}
                >
                  <ThemedText style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{prod.name}</ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.closeScannerBtn} onPress={() => setIsScanning(false)}>
              <ThemedText style={{ color: '#ef4444', fontWeight: 'bold' }}>Đóng Camera Quét</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <View style={styles.headerTitleRow}>
          <ThemedText style={styles.headerTitle}>Bán Hàng & Quét Mã (POS)</ThemedText>
          <TouchableOpacity style={styles.scanButton} onPress={handleOpenScanner}>
            <Ionicons name="barcode-outline" size={22} color={colors.headerBg} />
            <ThemedText style={styles.scanText}>Quét Barcode</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {/* Products List */}
        <View style={styles.productsSection}>
          <View style={[styles.searchContainer, { backgroundColor: colors.icon + '15' }]}>
            <Ionicons name="search" size={20} color={colors.icon} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Tìm sản phẩm..."
              placeholderTextColor={colors.icon}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {loadingProducts ? (
            <ActivityIndicator size="large" color={colors.tint} style={{ marginTop: 20 }} />
          ) : fetchError ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Ionicons name="wifi-outline" size={36} color="#ef4444" style={{ marginBottom: 8 }} />
              <ThemedText style={{ color: '#ef4444', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>
                {fetchError}
              </ThemedText>
              <TouchableOpacity
                style={{ backgroundColor: colors.tint, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
                onPress={fetchProducts}
              >
                <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Thử lại</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.code.toLowerCase().includes(searchQuery.toLowerCase()))}
              keyExtractor={item => String(item.id)}
              renderItem={renderProduct}
              numColumns={2}
              columnWrapperStyle={styles.productRow}
              showsVerticalScrollIndicator={false}
            />
          )}

        </View>

        {/* Cart Section */}
        <View style={[styles.cartSection, { borderTopColor: colors.icon + '20' }]}>
          <ThemedText style={styles.cartTitle}>Đơn hàng ({cart.reduce((a, b) => a + b.qty, 0)} món)</ThemedText>
          <ScrollView style={styles.cartList}>
            {cart.length === 0 ? (
              <ThemedText style={styles.emptyCart}>Chưa có sản phẩm nào trong giỏ</ThemedText>
            ) : (
              cart.map((item) => (
                <View key={item.product.id} style={styles.cartItem}>
                  <View style={styles.cartItemLeft}>
                    <ThemedText style={styles.cartItemName} numberOfLines={1}>{item.product.name}</ThemedText>
                    <ThemedText style={[styles.cartItemPrice, { color: colors.tint }]}>
                      {(item.product.price * item.qty).toLocaleString('vi-VN')}₫
                    </ThemedText>
                  </View>
                  <View style={styles.cartItemRight}>
                    <View style={styles.qtyContainer}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => handleDecreaseQty(item.product.id)}
                      >
                        <Ionicons name="remove" size={14} color={colors.text} />
                      </TouchableOpacity>
                      <ThemedText style={styles.qtyText}>{item.qty}</ThemedText>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => handleIncreaseQty(item.product.id)}
                      >
                        <Ionicons name="add" size={14} color={colors.text} />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleRemoveItem(item.product.id)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Payment Method Selector */}
          <View style={{ flexDirection: 'row', gap: 6, marginVertical: 8 }}>
            {[
              { id: 'TIEN_MAT', label: 'Tiền mặt' },
              { id: 'CHUYEN_KHOAN', label: 'Chuyển khoản' },
              { id: 'THE', label: 'Thẻ' }
            ].map(pm => (
              <TouchableOpacity
                key={pm.id}
                style={[
                  styles.pmChip,
                  { borderColor: colors.icon + '30' },
                  paymentMethod === pm.id && { backgroundColor: colors.tint, borderColor: colors.tint }
                ]}
                onPress={() => setPaymentMethod(pm.id as any)}
              >
                <ThemedText style={[{ fontSize: 11, fontWeight: '600' }, paymentMethod === pm.id && { color: '#fff' }]}>
                  {pm.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.cartFooter, { borderTopColor: colors.icon + '20' }]}>
            <View style={styles.totalRow}>
              <ThemedText style={styles.totalLabel}>Tổng cộng:</ThemedText>
              <ThemedText style={[styles.totalValue, { color: colors.tint }]}>{total.toLocaleString('vi-VN')}₫</ThemedText>
            </View>
            <TouchableOpacity
              style={[styles.checkoutButton, { backgroundColor: cart.length > 0 && !submitting ? colors.tint : colors.icon }]}
              disabled={cart.length === 0 || submitting}
              onPress={handleCheckout}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.checkoutText}>Thanh toán POS</ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {/* VIETQR PAYMENT MODAL */}
      <Modal visible={showQrModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.background, borderRadius: 20, padding: 20, width: '100%', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 12 }}>
              <ThemedText style={{ fontSize: 18, fontWeight: 'bold' }}>
                {paymentMethod === 'THE' ? 'Thanh toán thẻ máy POS' : 'Quét mã VietQR chuyển khoản'}
              </ThemedText>
              <TouchableOpacity onPress={() => setShowQrModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Image
              source={{ uri: `https://img.vietqr.io/image/MB-0369147258-compact2.png?amount=${total}&addInfo=POS%20Thanh%20Toan` }}
              style={{ width: 220, height: 220, borderRadius: 12, marginVertical: 12 }}
            />

            <ThemedText style={{ fontSize: 16, fontWeight: 'bold', color: colors.tint, marginVertical: 4 }}>
              Số tiền: {total.toLocaleString('vi-VN')}₫
            </ThemedText>
            <ThemedText style={{ fontSize: 12, opacity: 0.7, textAlign: 'center', marginBottom: 16 }}>
              {paymentMethod === 'THE'
                ? 'Hướng dẫn khách quẹt thẻ trên thiết bị POS hoặc quét mã QR ngân hàng phía trên.'
                : 'Mở ứng dụng Ngân hàng / E-Banking bất kỳ để quét mã thanh toán.'}
            </ThemedText>

            <TouchableOpacity
              style={{ backgroundColor: colors.tint, width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}
              onPress={handleCheckout}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : (
                <ThemedText style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                  Xác nhận đã thanh toán ({total.toLocaleString('vi-VN')}₫)
                </ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 40, paddingBottom: 16, paddingHorizontal: 16 },
  headerTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  scanButton: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignItems: 'center' },
  scanText: { color: '#000', fontWeight: 'bold', marginLeft: 6, fontSize: 13 },
  content: { flex: 1 },
  productsSection: { flex: 3, padding: 12 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 12, height: 40, marginBottom: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: '100%' },
  productRow: { justifyContent: 'space-between' },
  productItem: { width: '48%', padding: 10, borderRadius: 12, borderWidth: 1, marginBottom: 10, alignItems: 'center' },
  productImage: { width: 50, height: 50, borderRadius: 8, marginBottom: 6 },
  productName: { fontWeight: 'bold', fontSize: 13, marginBottom: 2, textAlign: 'center' },
  productPrice: { fontSize: 13, fontWeight: 'bold' },
  cartSection: { flex: 2, padding: 12, borderTopWidth: 1 },
  cartTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 8 },
  cartList: { flex: 1 },
  emptyCart: { textAlign: 'center', opacity: 0.5, marginTop: 20, fontSize: 13 },
  cartItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  cartItemLeft: { flex: 1 },
  cartItemName: { fontSize: 13, fontWeight: 'bold' },
  cartItemPrice: { fontSize: 12 },
  cartItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', borderRadius: 6 },
  qtyBtn: { padding: 4 },
  qtyText: { paddingHorizontal: 8, fontSize: 13, fontWeight: 'bold' },
  deleteBtn: { padding: 4 },
  pmChip: { flex: 1, paddingVertical: 6, borderRadius: 6, borderWidth: 1, alignItems: 'center' },
  cartFooter: { paddingTop: 8, borderTopWidth: 1 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  totalLabel: { fontSize: 15, fontWeight: 'bold' },
  totalValue: { fontSize: 18, fontWeight: 'bold' },
  checkoutButton: { paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  checkoutText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  // Scanner Modal
  scannerModalContainer: { flex: 1, backgroundColor: '#000' },
  cameraViewfinder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: 220, height: 220, borderWidth: 2, borderRadius: 16, overflow: 'hidden', justifyContent: 'center' },
  scanLine: { height: 2, width: '100%' },
  cameraControls: { position: 'absolute', top: 50, right: 20, flexDirection: 'row', gap: 12 },
  controlCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  scannerGuideText: { position: 'absolute', bottom: 30, color: '#fff', fontSize: 13, textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  simulateScanSection: { padding: 16, backgroundColor: '#111' },
  mockScanBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#333', borderRadius: 8, marginRight: 8, justifyContent: 'center' },
  closeScannerBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 8 },
});
