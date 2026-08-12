import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, FlatList, TextInput, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { permissionService } from '@/services/permissionService';
import { soundService } from '@/services/soundService';
import { CameraView } from 'expo-camera';

// Mock Data for POS
const POS_PRODUCTS = [
  { id: '1', name: 'Tiramisu Phô Mai', price: 220000, image: '🎂', code: 'SP-001' },
  { id: '2', name: 'Croissant Sừng Bò', price: 35000, image: '🥐', code: 'SP-002' },
  { id: '3', name: 'Bánh Su Kem Socola', price: 90000, image: '🍡', code: 'SP-003' },
  { id: '4', name: 'Bánh Kem Dâu Tây', price: 199000, image: '🍩', code: 'SP-004' },
  { id: '5', name: 'Bánh Mì Bơ Tỏi', price: 55000, image: '🥖', code: 'SP-005' },
  { id: '6', name: 'Bánh Tart Trái Cây', price: 145000, image: '🧁', code: 'SP-006' },
];

export default function POSScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [cart, setCart] = useState<{product: any, qty: number}[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [cameraFront, setCameraFront] = useState(false);
  const [scanned, setScanned] = useState(false);

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
    
    // Find matched product or pick first
    const matched = POS_PRODUCTS.find(p => p.code === data || p.name.toLowerCase().includes(data.toLowerCase())) || POS_PRODUCTS[0];
    addToCart(matched);
    setIsScanning(false);
    Alert.alert('Đã quét mã Camera!', `Mã vạch: ${data}\nSản phẩm: ${matched.name}\nGiá: ${matched.price.toLocaleString('vi-VN')}₫`);
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

  const handleSimulateScan = (product: any) => {
    soundService.playScanBeep();
    addToCart(product);
    setIsScanning(false);
    Alert.alert('Đã quét mã!', `Sản phẩm: ${product.name} - Giá: ${product.price.toLocaleString('vi-VN')}₫`);
  };

  const total = cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);

  const renderProduct = ({ item }: { item: typeof POS_PRODUCTS[0] }) => (
    <TouchableOpacity 
      style={[styles.productItem, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}
      onPress={() => addToCart(item)}
    >
      <ThemedText style={styles.productEmoji}>{item.image}</ThemedText>
      <ThemedText style={styles.productName}>{item.name}</ThemedText>
      <ThemedText style={[styles.productPrice, { color: colors.tint }]}>{item.price.toLocaleString('vi-VN')}₫</ThemedText>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      {/* SCANNER CAMERA MODAL */}
      <Modal visible={isScanning} animationType="slide" transparent={false}>
        <View style={styles.scannerModalContainer}>
          <View style={styles.cameraViewfinder}>
            {/* LIVE CAMERA FEED FROM PHONE LENS */}
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
              Đưa mã vạch / QR sản phẩm bánh vào khung hình
            </ThemedText>
          </View>

          <View style={styles.simulateScanSection}>
            <ThemedText style={{ color: '#fff', fontSize: 13, marginBottom: 8, textAlign: 'center' }}>
              Bấm chọn sản phẩm mẫu bên dưới để giả lập quét mã Camera:
            </ThemedText>
            
            <View style={styles.mockScanGrid}>
              {POS_PRODUCTS.slice(0, 4).map(prod => (
                <TouchableOpacity 
                  key={prod.id} 
                  style={styles.mockScanBtn}
                  onPress={() => handleSimulateScan(prod)}
                >
                  <ThemedText style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>Quét {prod.name}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>

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
            <ThemedText style={styles.scanText}>Quét mã Barcode</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {/* Products List (Left/Top side) */}
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
          <FlatList
            data={POS_PRODUCTS.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))}
            keyExtractor={item => item.id}
            renderItem={renderProduct}
            numColumns={2}
            columnWrapperStyle={styles.productRow}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* Cart Section (Right/Bottom side) */}
        <View style={[styles.cartSection, { borderTopColor: colors.icon + '20' }]}>
          <ThemedText style={styles.cartTitle}>Đơn hàng hiện tại</ThemedText>
          <ScrollView style={styles.cartList}>
            {cart.length === 0 ? (
              <ThemedText style={styles.emptyCart}>Chưa có sản phẩm nào</ThemedText>
            ) : (
              cart.map((item) => (
                <View key={item.product.id} style={styles.cartItem}>
                  <ThemedText style={styles.cartItemName}>{item.qty}x {item.product.name}</ThemedText>
                  <ThemedText style={styles.cartItemPrice}>${(item.product.price * item.qty).toFixed(2)}</ThemedText>
                </View>
              ))
            )}
          </ScrollView>
          <View style={[styles.cartFooter, { borderTopColor: colors.icon + '20' }]}>
            <View style={styles.totalRow}>
              <ThemedText style={styles.totalLabel}>Tổng cộng:</ThemedText>
              <ThemedText style={[styles.totalValue, { color: colors.tint }]}>${total.toFixed(2)}</ThemedText>
            </View>
            <TouchableOpacity style={[styles.checkoutButton, { backgroundColor: colors.tint }]}>
              <ThemedText style={styles.checkoutText}>Thanh toán</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  scanButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
  },
  scanText: {
    color: '#000',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  productsSection: {
    flex: 3,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
  },
  productRow: {
    justifyContent: 'space-between',
  },
  productItem: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
  },
  productEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  productName: {
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  productPrice: {
    fontWeight: 'bold',
  },
  cartSection: {
    flex: 2,
    borderTopWidth: 1,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  cartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  cartList: {
    flex: 1,
  },
  emptyCart: {
    textAlign: 'center',
    opacity: 0.5,
    marginTop: 20,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cartItemName: {
    fontSize: 14,
  },
  cartItemPrice: {
    fontWeight: 'bold',
  },
  cartFooter: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  checkoutButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkoutText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  scannerModalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraViewfinder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  scanFrame: {
    width: 240,
    height: 240,
    borderWidth: 2,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  scanLine: {
    width: '100%',
    height: 2,
  },
  cameraControls: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
    gap: 12,
  },
  controlCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerGuideText: {
    color: '#fff',
    fontSize: 13,
    marginTop: 20,
    textAlign: 'center',
    opacity: 0.8,
  },
  simulateScanSection: {
    padding: 20,
    backgroundColor: '#111',
  },
  mockScanGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 16,
  },
  mockScanBtn: {
    backgroundColor: '#222',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  closeScannerBtn: {
    padding: 12,
    alignItems: 'center',
  },
});
