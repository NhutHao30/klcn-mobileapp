import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, TextInput, Image, ActivityIndicator, Alert, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter, useFocusEffect } from 'expo-router';
import { productApi } from '@/services/api/productApi';
import { adminApi } from '@/services/api/adminApi';
import { formatImageUrl } from '@/config/apiConfig';
import * as ImagePicker from 'expo-image-picker';

const DEFAULT_CATEGORIES = [
  { id: 'LSP001', name: 'Bánh Kem' },
  { id: 'LSP002', name: 'Bánh Ngọt' },
  { id: 'LSP003', name: 'Bánh Mì' },
  { id: 'LSP004', name: 'Bánh Tráng Miệng' },
  { id: 'LSP005', name: 'Bánh Khô' },
  { id: 'LSP006', name: 'Bánh Đông Lạnh' },
];

export default function AdminProducts() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Form modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [form, setForm] = useState({
    MASP: '',
    TENSP: '',
    MALOAI: 'LSP001',
    GIABAN: '',
    SOLUONG: '50',
    DVT: 'Cái',
    GHICHU: '',
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [])
  );

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await productApi.getProducts({ size: 200, _t: Date.now() } as any);
      if (res && res.data) {
        const mapped = res.data.map((p: any) => {
          let branchStock = [];
          if (p.TONKHO_CHITIET) {
            try {
              branchStock = typeof p.TONKHO_CHITIET === 'string' ? JSON.parse(p.TONKHO_CHITIET) : p.TONKHO_CHITIET;
            } catch (err) {
              branchStock = [];
            }
          }
          const rawStock =
            p.TONKHO_THUCTE !== undefined && p.TONKHO_THUCTE !== null
              ? p.TONKHO_THUCTE
              : p.soLuongTon !== undefined && p.soLuongTon !== null
              ? p.soLuongTon
              : p.SOLUONG_TON !== undefined && p.SOLUONG_TON !== null
              ? p.SOLUONG_TON
              : p.so_luong_ton || 0;

          return {
            id: p.MASP || p.id,
            name: p.TENSP || p.tenSanPham,
            price: Number(p.GIABAN || p.giaBan) || 0,
            stock: Number(rawStock) || 0,
            category: p.loaisanpham ? p.loaisanpham.TENLOAI : (p.loaiSanPham?.tenLoai || 'Bánh khác'),
            categoryId: p.MALOAI || p.loaiId || 'L001',
            dvt: p.DVT || p.donViTinh || 'Cái',
            image: formatImageUrl(p.HINHANH || p.hinhAnh),
            description: p.GHICHU || p.MOTA || p.moTa || 'Chưa có mô tả chi tiết.',
            deletedAt: p.deleted_at,
            branchStock: branchStock,
            raw: p,
          };
        });
        setProducts(mapped);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Cần cấp quyền', 'Vui lòng cho phép truy cập thư viện ảnh.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setImageUri(null);
    setForm({
      MASP: 'SP' + Math.floor(100 + Math.random() * 900),
      TENSP: '',
      MALOAI: 'LSP001',
      GIABAN: '',
      SOLUONG: '50',
      DVT: 'Cái',
      GHICHU: '',
    });

    setShowFormModal(true);
  };

  const handleOpenEdit = (product: any) => {
    setEditingProduct(product);
    setImageUri(product.image || null);
    setForm({
      MASP: product.id,
      TENSP: product.name,
      MALOAI: product.categoryId,
      GIABAN: String(product.price),
      SOLUONG: String(product.stock),
      DVT: product.dvt,
      GHICHU: product.description === 'Chưa có mô tả chi tiết.' ? '' : product.description,
    });
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!form.TENSP.trim() || !form.GIABAN) {
      Alert.alert('Thiếu thông tin', 'Tên sản phẩm và Giá bán là bắt buộc.');
      return;
    }
    try {
      setSaving(true);
      if (editingProduct) {
        // Update product JSON payload
        const payload = {
          MASP: form.MASP,
          MALOAI: form.MALOAI,
          TENSP: form.TENSP,
          GIABAN: Number(form.GIABAN),
          SOLUONG: Number(form.SOLUONG || 0),
          DVT: form.DVT,
          GHICHU: form.GHICHU,
        };
        await adminApi.updateProduct(editingProduct.id, payload);
        Alert.alert('Thành công', 'Cập nhật sản phẩm thành công!');
      } else {
        // Create product FormData
        const formData = new FormData();
        formData.append('MASP', form.MASP);
        formData.append('MALOAI', form.MALOAI);
        formData.append('TENSP', form.TENSP);
        formData.append('GIABAN', String(form.GIABAN));
        formData.append('SOLUONG', String(form.SOLUONG || 0));
        formData.append('DVT', form.DVT);
        formData.append('GHICHU', form.GHICHU || '');

        if (imageUri && !imageUri.startsWith('http')) {
          formData.append('HINHANH', {
            uri: imageUri,
            name: 'product.jpg',
            type: 'image/jpeg',
          } as any);
        } else {
          // Send dummy image blob if user didn't select image file
          const dummyUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
          formData.append('HINHANH', {
            uri: dummyUri,
            name: 'default.png',
            type: 'image/png',
          } as any);
        }

        await adminApi.createProduct(formData);
        Alert.alert('Thành công', 'Tạo sản phẩm mới thành công!');
      }
      setShowFormModal(false);
      setSelectedProduct(null);
      await fetchProducts();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể lưu sản phẩm. Vui lòng kiểm tra lại hình ảnh và thông tin.');
    } finally {
      setSaving(false);
    }
  };

  const handleDisableProduct = (product: any) => {
    Alert.alert(
      'Vô hiệu hóa sản phẩm',
      `Bạn có chắc chắn muốn vô hiệu hóa/ngừng bán sản phẩm "${product.name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Vô hiệu hóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminApi.deleteProduct(product.id);
              setSelectedProduct(null);
              Alert.alert('Thành công', `Đã vô hiệu hóa sản phẩm ${product.name}.`);
              await fetchProducts();
            } catch {
              Alert.alert('Lỗi', 'Không thể vô hiệu hóa sản phẩm này.');
            }
          }
        }
      ]
    );
  };

  const handleRestoreProduct = async (product: any) => {
    try {
      await adminApi.restoreProduct(product.id);
      setSelectedProduct(null);
      Alert.alert('Thành công', `Đã khôi phục sản phẩm ${product.name}.`);
      await fetchProducts();
    } catch {
      Alert.alert('Lỗi', 'Không thể khôi phục sản phẩm này.');
    }
  };

  const renderProduct = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.productCard,
        { backgroundColor: colors.background, borderColor: colors.icon + '20' },
        item.deletedAt && { opacity: 0.5 }
      ]}
      onPress={() => setSelectedProduct(item)}
      activeOpacity={0.7}
    >
      <Image source={{ uri: item.image }} style={styles.productImage} />
      <View style={styles.productInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <ThemedText style={styles.productName}>{item.name}</ThemedText>
          {item.deletedAt && (
            <View style={{ backgroundColor: '#ef4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
              <ThemedText style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>Ngừng bán</ThemedText>
            </View>
          )}
        </View>
        <ThemedText style={styles.productCategory}>{item.category} ({item.dvt})</ThemedText>
        <View style={styles.priceRow}>
          <ThemedText style={[styles.productPrice, { color: colors.tint }]}>
            {item.price.toLocaleString('vi-VN')}₫
          </ThemedText>
          <ThemedText style={[styles.productStock, { color: item.stock < 10 ? '#ef4444' : colors.text }]}>
            Tồn: {item.stock}
          </ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      {/* FORM MODAL (ADD / EDIT) */}
      <Modal visible={showFormModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.icon + '20' }]}>
              <ThemedText style={styles.modalTitle}>
                {editingProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
              </ThemedText>
              <TouchableOpacity onPress={() => setShowFormModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* IMAGE PICKER */}
              <ThemedText style={styles.fieldLabel}>Hình ảnh sản phẩm</ThemedText>
              <TouchableOpacity style={[styles.imagePickerBox, { borderColor: colors.icon + '40' }]} onPress={handlePickImage}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.pickedImage} />
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <Ionicons name="camera-outline" size={32} color={colors.tint} />
                    <ThemedText style={{ fontSize: 12, color: colors.tint, marginTop: 4 }}>Chọn hình ảnh sản phẩm</ThemedText>
                  </View>
                )}
              </TouchableOpacity>

              <ThemedText style={styles.fieldLabel}>Mã SP *</ThemedText>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.icon + '40', backgroundColor: colors.icon + '10' }]}
                value={form.MASP}
                onChangeText={v => setForm(f => ({ ...f, MASP: v }))}
                placeholder="VD: SP001"
                placeholderTextColor={colors.icon}
                editable={!editingProduct}
              />

              <ThemedText style={styles.fieldLabel}>Tên sản phẩm *</ThemedText>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.icon + '40', backgroundColor: colors.icon + '10' }]}
                value={form.TENSP}
                onChangeText={v => setForm(f => ({ ...f, TENSP: v }))}
                placeholder="VD: Bánh Kem Dâu Tươi..."
                placeholderTextColor={colors.icon}
              />

              <ThemedText style={styles.fieldLabel}>Danh mục sản phẩm</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.catChip,
                      { borderColor: colors.icon + '40' },
                      form.MALOAI === cat.id && { backgroundColor: colors.tint, borderColor: colors.tint }
                    ]}
                    onPress={() => setForm(f => ({ ...f, MALOAI: cat.id }))}
                  >
                    <ThemedText style={[{ fontSize: 13, fontWeight: '600' }, form.MALOAI === cat.id && { color: '#fff' }]}>
                      {cat.name}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.fieldLabel}>Giá bán (₫) *</ThemedText>
                  <TextInput
                    style={[styles.textInput, { color: colors.text, borderColor: colors.icon + '40', backgroundColor: colors.icon + '10' }]}
                    value={form.GIABAN}
                    onChangeText={v => setForm(f => ({ ...f, GIABAN: v }))}
                    keyboardType="numeric"
                    placeholder="VD: 50000"
                    placeholderTextColor={colors.icon}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.fieldLabel}>Số lượng tồn</ThemedText>
                  <TextInput
                    style={[styles.textInput, { color: colors.text, borderColor: colors.icon + '40', backgroundColor: colors.icon + '10' }]}
                    value={form.SOLUONG}
                    onChangeText={v => setForm(f => ({ ...f, SOLUONG: v }))}
                    keyboardType="numeric"
                    placeholder="VD: 20"
                    placeholderTextColor={colors.icon}
                  />
                </View>
              </View>

              <ThemedText style={styles.fieldLabel}>Đơn vị tính</ThemedText>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {['Cái', 'Hộp', 'Ổ', 'Ly'].map(dvt => (
                  <TouchableOpacity
                    key={dvt}
                    style={[
                      styles.catChip,
                      { flex: 1, alignItems: 'center', borderColor: colors.icon + '40' },
                      form.DVT === dvt && { backgroundColor: colors.tint, borderColor: colors.tint }
                    ]}
                    onPress={() => setForm(f => ({ ...f, DVT: dvt }))}
                  >
                    <ThemedText style={[{ fontSize: 13, fontWeight: '600' }, form.DVT === dvt && { color: '#fff' }]}>
                      {dvt}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <ThemedText style={styles.fieldLabel}>Ghi chú / Mô tả</ThemedText>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.icon + '40', backgroundColor: colors.icon + '10', minHeight: 70, textAlignVertical: 'top' }]}
                value={form.GHICHU}
                onChangeText={v => setForm(f => ({ ...f, GHICHU: v }))}
                multiline
                placeholder="Mô tả sản phẩm..."
                placeholderTextColor={colors.icon}
              />

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.tint }, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : (
                  <ThemedText style={styles.saveBtnText}>
                    {editingProduct ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
                  </ThemedText>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* HEADER */}
      <View style={{ paddingTop: 40, backgroundColor: colors.headerBg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, paddingVertical: 16 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <ThemedText style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>Quản lý sản phẩm</ThemedText>
        </View>
        <TouchableOpacity onPress={handleOpenAdd}>
          <Ionicons name="add-circle-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* SEARCH BAR */}
      <View style={[styles.headerActions, { borderBottomColor: colors.icon + '20' }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.icon + '15' }]}>
          <Ionicons name="search" size={20} color={colors.icon} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Tìm kiếm sản phẩm..."
            placeholderTextColor={colors.icon}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={[styles.refreshBtn, { backgroundColor: colors.icon + '15' }]} onPress={fetchProducts}>
          <Ionicons name="refresh" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          data={products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))}
          keyExtractor={item => String(item.id)}
          renderItem={renderProduct}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* DETAIL MODAL WITH QR CODE */}
      {selectedProduct && (
        <Modal
          visible={!!selectedProduct}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedProduct(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.icon + '20' }]}>
                <ThemedText style={styles.modalTitle}>Chi tiết sản phẩm</ThemedText>
                <TouchableOpacity onPress={() => setSelectedProduct(null)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.avatarLargeContainer}>
                  <Image source={{ uri: selectedProduct.image }} style={styles.productImageLarge} />
                  <ThemedText style={styles.modalName}>{selectedProduct.name}</ThemedText>
                  <ThemedText style={styles.modalSubtitle}>Mã SP: {selectedProduct.id}</ThemedText>
                </View>

                {/* QR CODE GENERATED FROM MASP */}
                <View style={[styles.qrContainer, { borderColor: colors.icon + '20', backgroundColor: '#fff' }]}>
                  <Image
                    source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(selectedProduct.id)}` }}
                    style={{ width: 130, height: 130 }}
                  />
                  <ThemedText style={{ fontSize: 11, color: '#333', marginTop: 4, fontWeight: 'bold' }}>
                    Mã QR Quét POS: {selectedProduct.id}
                  </ThemedText>
                </View>

                {/* Product Metadata */}
                <View style={[styles.detailRow, { borderBottomColor: colors.icon + '10' }]}>
                  <Ionicons name="pricetag-outline" size={20} color={colors.tint} style={styles.detailIcon} />
                  <View style={styles.detailTextCol}>
                    <ThemedText style={styles.detailLabel}>Giá bán lẻ</ThemedText>
                    <ThemedText style={[styles.detailValue, { fontWeight: 'bold', color: colors.tint }]}>
                      {selectedProduct.price.toLocaleString('vi-VN')}₫
                    </ThemedText>
                  </View>
                </View>

                <View style={[styles.detailRow, { borderBottomColor: colors.icon + '10' }]}>
                  <Ionicons name="grid-outline" size={20} color={colors.tint} style={styles.detailIcon} />
                  <View style={styles.detailTextCol}>
                    <ThemedText style={styles.detailLabel}>Danh mục & ĐVT</ThemedText>
                    <ThemedText style={styles.detailValue}>{selectedProduct.category} ({selectedProduct.dvt})</ThemedText>
                  </View>
                </View>

                <View style={[styles.detailRow, { borderBottomColor: colors.icon + '10' }]}>
                  <Ionicons name="cube-outline" size={20} color={colors.tint} style={styles.detailIcon} />
                  <View style={styles.detailTextCol}>
                    <ThemedText style={styles.detailLabel}>Tổng tồn kho thực tế</ThemedText>
                    <ThemedText style={styles.detailValue}>{selectedProduct.stock} sản phẩm</ThemedText>
                  </View>
                </View>

                <View style={[styles.detailRow, { borderBottomColor: colors.icon + '10' }]}>
                  <Ionicons name="document-text-outline" size={20} color={colors.tint} style={styles.detailIcon} />
                  <View style={styles.detailTextCol}>
                    <ThemedText style={styles.detailLabel}>Mô tả sản phẩm</ThemedText>
                    <ThemedText style={[styles.detailValue, { fontSize: 14, fontWeight: 'normal', opacity: 0.8 }]}>
                      {selectedProduct.description}
                    </ThemedText>
                  </View>
                </View>

                {/* Store Stock Level */}
                <View style={{ marginTop: 20 }}>
                  <ThemedText style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>
                    Tồn kho chi tiết theo Chi nhánh
                  </ThemedText>

                  {selectedProduct.branchStock.length === 0 ? (
                    <ThemedText style={{ opacity: 0.6, fontSize: 14 }}>Không có dữ liệu tồn kho chi nhánh.</ThemedText>
                  ) : (
                    selectedProduct.branchStock.map((branch: any, idx: number) => (
                      <View
                        key={idx}
                        style={[styles.productDetailRow, { borderBottomColor: colors.icon + '10', backgroundColor: colors.icon + '05' }]}
                      >
                        <View style={{ flex: 1 }}>
                          <ThemedText style={styles.productDetailName}>{branch.TENCUAHANG}</ThemedText>
                          <ThemedText style={styles.productDetailQty}>Mã chi nhánh: #{branch.MACUAHANG}</ThemedText>
                        </View>
                        <ThemedText style={[styles.productDetailPrice, { color: branch.SOLUONG_TON < 5 ? '#ef4444' : colors.text }]}>
                          Tồn: {branch.SOLUONG_TON}
                        </ThemedText>
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.tint, flex: 1 }]}
                    onPress={() => { const prod = selectedProduct; setSelectedProduct(null); handleOpenEdit(prod); }}
                  >
                    <Ionicons name="create-outline" size={18} color="#fff" />
                    <ThemedText style={styles.actionBtnText}>Sửa</ThemedText>
                  </TouchableOpacity>

                  {selectedProduct.deletedAt ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#10b981', flex: 1 }]}
                      onPress={() => handleRestoreProduct(selectedProduct)}
                    >
                      <Ionicons name="refresh-outline" size={18} color="#fff" />
                      <ThemedText style={styles.actionBtnText}>Khôi phục</ThemedText>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#ef4444', flex: 1 }]}
                      onPress={() => handleDisableProduct(selectedProduct)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#fff" />
                      <ThemedText style={styles.actionBtnText}>Vô hiệu hóa</ThemedText>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerActions: { flexDirection: 'row', padding: 16, alignItems: 'center', borderBottomWidth: 1 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 12, height: 40, marginRight: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: '100%' },
  refreshBtn: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16 },
  productCard: { flexDirection: 'row', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12, alignItems: 'center' },
  productImage: { width: 64, height: 64, borderRadius: 8, marginRight: 12 },
  productImageLarge: { width: 100, height: 100, borderRadius: 12, marginBottom: 12 },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: 'bold' },
  productCategory: { fontSize: 12, opacity: 0.6, marginVertical: 2 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  productPrice: { fontSize: 14, fontWeight: 'bold' },
  productStock: { fontSize: 12, fontWeight: '500' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalBody: { padding: 20 },
  avatarLargeContainer: { alignItems: 'center', marginBottom: 16 },
  modalName: { fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  modalSubtitle: { fontSize: 13, opacity: 0.6 },
  qrContainer: { padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', marginVertical: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  detailIcon: { marginRight: 14 },
  detailTextCol: { flex: 1 },
  detailLabel: { fontSize: 12, opacity: 0.5, marginBottom: 2 },
  detailValue: { fontSize: 14, fontWeight: '500' },
  productDetailRow: { flexDirection: 'row', padding: 10, borderRadius: 8, marginBottom: 6, alignItems: 'center' },
  productDetailName: { fontSize: 14, fontWeight: 'bold' },
  productDetailQty: { fontSize: 12, opacity: 0.6 },
  productDetailPrice: { fontSize: 14, fontWeight: 'bold' },
  modalFooter: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  actionBtn: { height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  // Form & Image
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12, opacity: 0.8 },
  textInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  catChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, marginRight: 8 },
  imagePickerBox: { height: 100, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  pickedImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  saveBtn: { marginTop: 24, marginBottom: 30, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
