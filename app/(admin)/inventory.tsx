import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { adminApi } from '@/services/api/adminApi';
import { productApi } from '@/services/api/productApi';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';

export default function AdminInventory() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { user, profile } = useAuth();

  const userBranchId = Number(
    user?.nguoidung?.cuaHangId ||
    user?.nguoidung?.MACUAHANG ||
    user?.nguoidung?.cuahang?.id ||
    user?.nhanvien?.cuaHangId ||
    user?.nhanvien?.MACUAHANG ||
    profile?.storeId ||
    1
  );

  const [activeTab, setActiveTab] = useState('ledger'); // 'ledger' or 'transfer'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [ledger, setLedger] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [selectedTransfer, setSelectedTransfer] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptDetails, setReceiptDetails] = useState<any[]>([]);
  const [submittingReceipt, setSubmittingReceipt] = useState(false);


  // Transfer Creation Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [stores, setStores] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [transferForm, setTransferForm] = useState({
    MACUAHANG_XUAT: '1',
    MACUAHANG_NHAP: '2',
    GHICHU: '',
  });
  const [transferItems, setTransferItems] = useState<Array<{ id?: number, sanPhamId?: number, MASP: string, TENSP: string, SOLUONG: number }>>([]);
  const [selectedProductMasp, setSelectedProductMasp] = useState('');
  const [itemQty, setItemQty] = useState('10');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [activeTab])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'ledger') {
        const res = await adminApi.getInventoryLedger({ _t: Date.now() });
        let raw = res?.data?.data || res?.data || res || [];
        if (raw && typeof raw === 'object' && Array.isArray(raw.data)) {
          raw = raw.data;
        }
        setLedger(Array.isArray(raw) ? raw : []);
      } else {
        const res = await adminApi.getTransfers({ _t: Date.now() });
        const items = Array.isArray(res) ? res : (res?.data || []);
        setTransfers(items);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateTransfer = async () => {
    try {
      setShowCreateModal(true);
      const [storesRes, productsRes] = await Promise.all([
        adminApi.getAdminStores().catch(() => []),
        productApi.getProducts({ size: 100 } as any).catch(() => ({ data: [] })),
      ]);

      const storeList = Array.isArray(storesRes) ? storesRes : (storesRes?.data || []);
      setStores(storeList);

      const prodList = productsRes?.data || [];
      setProductsList(prodList);
      if (prodList.length > 0 && !selectedProductMasp) {
        setSelectedProductMasp(String(prodList[0].id || prodList[0].MASP || prodList[0].maSanPham));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddItemToTransfer = () => {
    if (!selectedProductMasp) {
      Alert.alert('Chưa chọn bánh', 'Vui lòng chọn 1 sản phẩm bánh để thêm.');
      return;
    }
    const qty = parseInt(itemQty, 10);
    if (!qty || qty <= 0) {
      Alert.alert('Số lượng không hợp lệ', 'Vui lòng nhập số lượng lớn hơn 0.');
      return;
    }
    const prod = productsList.find(p => String(p.id) === String(selectedProductMasp) || String(p.MASP || p.maSanPham) === String(selectedProductMasp));
    const name = prod?.TENSP || prod?.tenSanPham || `Bánh #${selectedProductMasp}`;
    const spId = prod?.id ? Number(prod.id) : (Number(selectedProductMasp) || undefined);
    const maspStr = String(prod?.MASP || prod?.maSanPham || selectedProductMasp);

    setTransferItems(prev => {
      const idx = prev.findIndex(item => (spId && item.sanPhamId === spId) || String(item.MASP) === maspStr);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx].SOLUONG += qty;
        return updated;
      }
      return [...prev, { id: spId, sanPhamId: spId, MASP: maspStr, TENSP: name, SOLUONG: qty }];
    });
    setItemQty('10');
  };

  const handleRemoveTransferItem = (masp: string) => {
    setTransferItems(prev => prev.filter(i => String(i.MASP) !== String(masp)));
  };

  const assignedStoreName = useMemo(() => {
    const st = stores.find(s => Number(s.MACUAHANG || s.id) === userBranchId);
    return st?.TENCUAHANG || st?.tenCuaHang || `Chi nhánh ${userBranchId}`;
  }, [stores, userBranchId]);

  const handleCreateTransfer = async () => {
    if (transferItems.length === 0) {
      Alert.alert('Thiếu sản phẩm', 'Vui lòng thêm ít nhất 1 sản phẩm bánh vào phiếu điều chuyển.');
      return;
    }

    try {
      setCreating(true);
      const payload = {
        MACUAHANG_NHAP: userBranchId,
        MACUAHANG_XUAT: null, // Để trống chi nhánh xuất: tùy thuộc vào tình trạng tồn kho của các chi nhánh hỗ trợ
        details: transferItems.map(item => ({
          sanPhamId: item.sanPhamId || item.id,
          id: item.sanPhamId || item.id,
          MASP: item.MASP,
          SOLUONG: item.SOLUONG,
          SOLUONG_CHUYEN: item.SOLUONG,
        })),
        GHICHU: transferForm.GHICHU || 'Yêu cầu điều chuyển kho giữa các chi nhánh',
      };

      await adminApi.createTransferRequest(payload);
      Alert.alert('Thành công', `Đã tạo phiếu yêu cầu điều chuyển với ${transferItems.length} sản phẩm!`);
      setShowCreateModal(false);
      setTransferItems([]);
      if (activeTab === 'transfer') loadData();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || e?.response?.data?.error || 'Không thể tạo phiếu điều chuyển.');
    } finally {
      setCreating(false);
    }
  };

  const getMovementTypeLabel = (type: any) => {
    const sType = String(type ?? '').toUpperCase();
    if (type === 0 || sType === '0' || sType === 'SALE' || sType === 'POS_SALE' || sType === 'XUAT') return 'Xuất bán hàng';
    if (type === 1 || sType === '1' || sType === 'RETURN' || sType === 'TRA_HANG') return 'Khách trả hàng / Hoàn kho';
    if (type === 2 || sType === '2' || sType === 'TRANSFER_OUT' || sType === 'XUAT_DIEU_CHUYEN') return 'Xuất điều chuyển';
    if (type === 3 || sType === '3' || sType === 'TRANSFER_IN' || sType === 'NHAN_DIEU_CHUYEN') return 'Nhận điều chuyển';
    if (type === 4 || sType === '4' || sType === 'PURCHASE' || sType === 'NHAP_KHO' || sType === 'NHAP_LO') return 'Nhập kho lô hàng';
    if (type === 5 || sType === '5' || sType === 'DAMAGE' || sType === 'HUY') return 'Biên bản hủy / Hao hụt';
    if (sType === 'ADJUSTMENT') return 'Điều chỉnh kho';
    if (sType === 'STOCKTAKE') return 'Kiểm kê';
    return String(type ?? 'Khác');
  };

  const getMovementTypeColor = (type: any) => {
    const sType = String(type ?? '').toUpperCase();
    if (type === 0 || sType === '0' || type === 2 || sType === '2' || type === 5 || sType === '5' || sType.includes('OUT') || sType.includes('SALE') || sType.includes('DAMAGE') || sType === 'XUAT') {
      return '#ef4444';
    }
    if (type === 1 || sType === '1' || type === 3 || sType === '3' || type === 4 || sType === '4' || sType.includes('IN') || sType === 'PURCHASE' || sType === 'RETURN' || sType === 'NHAP') {
      return '#10b981';
    }
    return '#f59e0b';
  };

  const getTransferStatusColor = (status: string) => {
    switch (status) {
      case 'Hoàn thành':
      case 'completed': return '#10b981';
      case 'Chờ tiếp nhận':
      case 'pending': return '#f59e0b';
      case 'Đã hủy': return '#ef4444';
      default: return colors.tint;
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* CREATE TRANSFER MODAL */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.icon + '20' }]}>
              <ThemedText style={styles.modalTitle}>Tạo phiếu điều chuyển kho</ThemedText>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* CHI NHÁNH NHẬP (CỐ ĐỊNH THEO QUẢN LÝ ĐANG CÔNG TÁC) */}
              <ThemedText style={styles.fieldLabel}>Chi nhánh nhập (Cửa hàng tiếp nhận bánh) *</ThemedText>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.tint + '15',
                borderWidth: 1.5,
                borderColor: colors.tint,
                padding: 12,
                borderRadius: 12,
                gap: 10,
                marginBottom: 12
              }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.tint, justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="storefront" size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontSize: 14, fontWeight: '700', color: colors.tint }}>
                    {assignedStoreName}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 11, opacity: 0.7, color: colors.text }}>
                    Chi nhánh quản lý đang trực thuộc • Tự động tiếp nhận bánh
                  </ThemedText>
                </View>
                <View style={{ backgroundColor: colors.tint, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                  <ThemedText style={{ fontSize: 10, color: '#fff', fontWeight: 'bold' }}>Cố định</ThemedText>
                </View>
              </View>

              {/* CHI NHÁNH XUẤT (ĐIỀU PHỐI MỞ - TÙY THEO TÌNH TRẠNG KHO) */}
              <ThemedText style={styles.fieldLabel}>Chi nhánh xuất (Cửa hàng hỗ trợ cấp hàng)</ThemedText>
              <View style={{
                backgroundColor: colors.icon + '10',
                borderWidth: 1,
                borderColor: colors.icon + '30',
                padding: 12,
                borderRadius: 12,
                marginBottom: 14
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Ionicons name="git-network-outline" size={18} color="#d97706" />
                  <ThemedText style={{ fontSize: 13, fontWeight: '700', color: '#d97706' }}>
                    Hệ thống điều phối mở (Không chỉ định cụ thể)
                  </ThemedText>
                </View>
                <ThemedText style={{ fontSize: 11, opacity: 0.75, color: colors.text, lineHeight: 16 }}>
                  Yêu cầu chuyển kho sẽ được gửi đến tất cả chi nhánh. Chi nhánh nào còn đủ tồn kho phù hợp sẽ tiếp nhận và xuất hàng hỗ trợ.
                </ThemedText>
              </View>

              {/* DANH SÁCH BÁNH ĐÃ THÊM */}
              <View style={{ marginTop: 12, marginBottom: 8, padding: 12, backgroundColor: colors.icon + '0a', borderRadius: 10, borderWidth: 1, borderColor: colors.icon + '20' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <ThemedText style={{ fontSize: 13, fontWeight: 'bold', color: colors.tint }}>
                    Danh sách sản phẩm trong phiếu ({transferItems.length})
                  </ThemedText>
                </View>
                {transferItems.length === 0 ? (
                  <ThemedText style={{ fontSize: 12, color: colors.icon, fontStyle: 'italic', paddingVertical: 4 }}>
                    Chưa có bánh nào được thêm. Hãy chọn bên dưới và bấm "+ Thêm bánh".
                  </ThemedText>
                ) : (
                  transferItems.map((item, idx) => (
                    <View key={item.MASP} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: idx < transferItems.length - 1 ? 0.5 : 0, borderBottomColor: colors.icon + '20' }}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <ThemedText style={{ fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{item.TENSP}</ThemedText>
                        <ThemedText style={{ fontSize: 11, color: colors.icon }}>Mã: {item.MASP}</ThemedText>
                      </View>
                      <ThemedText style={{ fontSize: 13, fontWeight: 'bold', color: colors.tint, marginRight: 12 }}>x{item.SOLUONG}</ThemedText>
                      <TouchableOpacity onPress={() => handleRemoveTransferItem(item.MASP)} style={{ padding: 4 }}>
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>

              {/* THÊM BÁNH MỚI */}
              <ThemedText style={[styles.fieldLabel, { marginTop: 6 }]}>Chọn sản phẩm thêm vào phiếu *</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                {productsList.map(p => {
                  const masp = String(p.MASP || p.id);
                  const isSelected = selectedProductMasp === masp;
                  return (
                    <TouchableOpacity
                      key={masp}
                      style={[
                        styles.chipBtn,
                        { borderColor: colors.icon + '40' },
                        isSelected && { backgroundColor: colors.tint, borderColor: colors.tint }
                      ]}
                      onPress={() => setSelectedProductMasp(masp)}
                    >
                      <ThemedText style={[{ fontSize: 12, fontWeight: '600' }, isSelected && { color: '#fff' }]}>
                        {p.TENSP || p.tenSanPham} ({masp})
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.fieldLabel}>Số lượng *</ThemedText>
                  <TextInput
                    style={[styles.textInput, { color: colors.text, borderColor: colors.icon + '40', backgroundColor: colors.icon + '10' }]}
                    value={itemQty}
                    onChangeText={setItemQty}
                    keyboardType="numeric"
                    placeholder="VD: 10"
                    placeholderTextColor={colors.icon}
                  />
                </View>
                <TouchableOpacity
                  style={{ alignSelf: 'flex-end', backgroundColor: '#10b981', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  onPress={handleAddItemToTransfer}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <ThemedText style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>Thêm bánh</ThemedText>
                </TouchableOpacity>
              </View>

              <ThemedText style={styles.fieldLabel}>Ghi chú</ThemedText>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.icon + '40', backgroundColor: colors.icon + '10', minHeight: 70, textAlignVertical: 'top' }]}
                value={transferForm.GHICHU}
                onChangeText={v => setTransferForm(f => ({ ...f, GHICHU: v }))}
                multiline
                placeholder="Lý do điều chuyển..."
                placeholderTextColor={colors.icon}
              />

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.tint }, creating && { opacity: 0.6 }]}
                onPress={handleCreateTransfer}
                disabled={creating}
              >
                {creating ? <ActivityIndicator color="#fff" /> : (
                  <ThemedText style={styles.saveBtnText}>Tạo phiếu điều chuyển</ThemedText>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* HEADER */}
      <View style={{ paddingTop: 40, paddingBottom: 16, backgroundColor: colors.headerBg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <ThemedText style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>Kho & Điều chuyển</ThemedText>
        </View>
        <TouchableOpacity onPress={handleOpenCreateTransfer}>
          <Ionicons name="add-circle-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { borderBottomColor: colors.icon + '20' }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ledger' && { borderBottomColor: colors.tint, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('ledger')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'ledger' && { color: colors.tint, fontWeight: 'bold' }]}>
            Sổ cái kho (Log)
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'transfer' && { borderBottomColor: colors.tint, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('transfer')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'transfer' && { color: colors.tint, fontWeight: 'bold' }]}>
            Phiếu điều chuyển
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Header Actions */}
      <View style={[styles.headerActions, { borderBottomColor: colors.icon + '20' }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.icon + '15' }]}>
          <Ionicons name="search" size={20} color={colors.icon} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={activeTab === 'ledger' ? "Tìm sản phẩm..." : "Tìm mã phiếu..."}
            placeholderTextColor={colors.icon}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={[styles.refreshBtn, { backgroundColor: colors.icon + '15' }]} onPress={loadData}>
          <Ionicons name="refresh" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {activeTab === 'ledger' ? (
            ledger
              .filter(item => {
                const name = item.sanpham?.tenSanPham || item.sanpham?.TENSP || '';
                return name.toLowerCase().includes(searchQuery.toLowerCase());
              })
              .map((item, idx) => (
                <View key={item.id || idx} style={[styles.card, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
                  <View style={styles.cardHeader}>
                    <ThemedText style={styles.itemName}>{item.sanpham?.TENSP || `Sản phẩm #${item.MASP}`}</ThemedText>
                    <View style={[styles.statusBadge, { backgroundColor: getMovementTypeColor(item.type) + '15' }]}>
                      <ThemedText style={[styles.statusText, { color: getMovementTypeColor(item.type) }]}>
                        {getMovementTypeLabel(item.type)}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText style={styles.itemSku}>Chi nhánh: {item.cuahang?.tenCuaHang || item.cuahang?.TENCUAHANG || 'Không rõ'} • Note: {item.note || 'Không ghi chú'}</ThemedText>

                  <View style={styles.stockRow}>
                    <ThemedText style={styles.stockLabel}>Thay đổi / Tồn cuối:</ThemedText>
                    <ThemedText style={[styles.stockValue, { color: getMovementTypeColor(item.type) }]}>
                      {item.quantity > 0 ? `+${item.quantity}` : item.quantity} (Tồn cuối: {item.after_quantity})
                    </ThemedText>
                  </View>
                </View>
              ))
          ) : (
            transfers
              .filter(item => (item.ID_PHIEU || '').toString().includes(searchQuery))
              .map((item, idx) => (
                <TouchableOpacity
                  key={item.ID_PHIEU || idx}
                  style={[styles.card, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}
                  onPress={() => setSelectedTransfer(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <ThemedText style={styles.itemName}>Phiếu: #{item.ID_PHIEU}</ThemedText>
                    <View style={[styles.statusBadge, { backgroundColor: getTransferStatusColor(item.TRANGTHAI) + '15' }]}>
                      <ThemedText style={[styles.statusText, { color: getTransferStatusColor(item.TRANGTHAI) }]}>
                        {item.TRANGTHAI}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText style={styles.itemSku}>Ngày lập: {item.created_at ? item.created_at.split(' ')[0] : 'N/A'} • Tạo bởi: {item.TEN_NGUOITAO || 'Hệ thống'}</ThemedText>
                  <View style={styles.transferPath}>
                    <View style={styles.pathNode}>
                      <Ionicons name="location" size={16} color={colors.icon} />
                      <ThemedText style={styles.pathText} numberOfLines={1}>{item.TEN_CH_XUAT}</ThemedText>
                    </View>
                    <Ionicons name="arrow-forward" size={16} color={colors.tint} style={{ marginHorizontal: 8 }} />
                    <View style={styles.pathNode}>
                      <Ionicons name="location" size={16} color={colors.icon} />
                      <ThemedText style={styles.pathText} numberOfLines={1}>{item.TEN_CH_NHAP}</ThemedText>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
          )}
        </ScrollView>
      )}

      {/* TRANSFER DETAILS MODAL */}
      {selectedTransfer && (
        <Modal
          visible={!!selectedTransfer}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedTransfer(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.icon + '20' }]}>
                <ThemedText style={styles.modalTitle}>Chi tiết điều chuyển #{selectedTransfer.ID_PHIEU}</ThemedText>
                <TouchableOpacity onPress={() => setSelectedTransfer(null)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.modalSection}>
                  <ThemedText style={styles.sectionLabel}>Lộ trình điều chuyển</ThemedText>
                  <View style={styles.routeContainer}>
                    <View style={styles.routeItem}>
                      <Ionicons name="log-out" size={20} color="#ef4444" />
                      <View style={{ marginLeft: 12 }}>
                        <ThemedText style={styles.routeRole}>Chi nhánh xuất</ThemedText>
                        <ThemedText style={styles.routeName}>{selectedTransfer.TEN_CH_XUAT}</ThemedText>
                      </View>
                    </View>
                    <View style={styles.routeLine} />
                    <View style={styles.routeItem}>
                      <Ionicons name="log-in" size={20} color="#10b981" />
                      <View style={{ marginLeft: 12 }}>
                        <ThemedText style={styles.routeRole}>Chi nhánh nhận</ThemedText>
                        <ThemedText style={styles.routeName}>{selectedTransfer.TEN_CH_NHAP}</ThemedText>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.icon + '15', marginVertical: 16 }]} />

                <View style={styles.modalSection}>
                  <ThemedText style={styles.sectionLabel}>Thông tin chung</ThemedText>
                  <ThemedText style={styles.infoText}>Người lập: {selectedTransfer.TEN_NGUOITAO || 'Chưa rõ'}</ThemedText>
                  <ThemedText style={styles.infoText}>Người nhận: {selectedTransfer.TEN_NGUOINHAN || 'Chưa nhận'}</ThemedText>
                  <ThemedText style={styles.infoText}>Trạng thái: {selectedTransfer.TRANGTHAI}</ThemedText>
                  <ThemedText style={styles.infoText}>Ghi chú: {selectedTransfer.GHICHU || 'Không có ghi chú'}</ThemedText>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.icon + '15', marginVertical: 16 }]} />

                <View style={styles.modalSection}>
                  <ThemedText style={styles.sectionLabel}>Danh sách sản phẩm điều chuyển</ThemedText>
                  {selectedTransfer.details?.map((detail: any, idx: number) => (
                    <View key={idx} style={[styles.itemRow, { backgroundColor: colors.icon + '05', borderBottomColor: colors.icon + '10' }]}>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={{ fontWeight: 'bold' }}>{detail.TENSP}</ThemedText>
                        <ThemedText style={{ fontSize: 12, opacity: 0.6 }}>Mã SP: {detail.MASP}</ThemedText>
                      </View>
                      <ThemedText style={{ fontSize: 16, fontWeight: 'bold', color: colors.tint }}>
                        x{detail.SOLUONG_XUAT || detail.SOLUONG_CHUYEN || detail.soLuongXuat || detail.SOLUONG || 0}
                      </ThemedText>
                    </View>
                  ))}
                </View>
                <View style={{ height: 20 }} />
              </ScrollView>

              <View style={styles.modalFooter}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {selectedTransfer.TRANGTHAI !== 'Hoàn thành' && selectedTransfer.TRANGTHAI !== 'Đã hủy' && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#10b981', flex: 1 }]}
                        onPress={async () => {
                          if (selectedTransfer.TRANGTHAI === 'Chờ tiếp nhận' || selectedTransfer.TRANGTHAI === 'pending' || selectedTransfer.TRANGTHAI === 'Đang xử lý') {
                            try {
                              await adminApi.updateTransferStatus(selectedTransfer.ID_PHIEU, { TRANGTHAI: 'Đang vận chuyển' });
                              Alert.alert('Thành công', 'Đã phê duyệt tiếp nhận và xuất kho!');
                              setSelectedTransfer(null);
                              loadData();
                            } catch (err: any) {
                              Alert.alert('Lỗi', err?.response?.data?.error || 'Không thể cập nhật trạng thái.');
                            }
                          } else {
                            // Open receipt confirmation modal with actual qty & deficit reason
                            const initial = (selectedTransfer.details || []).map((d: any) => ({
                              ID_CHITIET: d.ID_CHITIET || d.id,
                              MASP: d.MASP,
                              TENSP: d.TENSP || d.MASP,
                              SOLUONG_XUAT: d.SOLUONG_XUAT || d.SOLUONG_CHUYEN || 1,
                              SOLUONG_NHAN: String(d.SOLUONG_XUAT || d.SOLUONG_CHUYEN || 1),
                              LYDO_HAOHUT: '',
                            }));
                            setReceiptDetails(initial);
                            setShowReceiptModal(true);
                          }
                        }}
                      >
                        <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                        <ThemedText style={styles.actionBtnText}>
                          {selectedTransfer.TRANGTHAI === 'Chờ tiếp nhận' || selectedTransfer.TRANGTHAI === 'pending' || selectedTransfer.TRANGTHAI === 'Đang xử lý' ? 'Phê duyệt xuất' : 'Xác nhận nhập kho'}
                        </ThemedText>
                      </TouchableOpacity>


                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#ef4444', flex: 1 }]}
                        onPress={() => {
                          Alert.alert('Xác nhận', 'Bạn có muốn hủy phiếu điều chuyển này?', [
                            { text: 'Quay lại', style: 'cancel' },
                            {
                              text: 'Hủy phiếu',
                              style: 'destructive',
                              onPress: async () => {
                                try {
                                  await adminApi.updateTransferStatus(selectedTransfer.ID_PHIEU, { TRANGTHAI: 'Đã hủy' });
                                  Alert.alert('Thành công', 'Đã hủy phiếu điều chuyển.');
                                  setSelectedTransfer(null);
                                  loadData();
                                } catch {
                                  Alert.alert('Lỗi', 'Không thể hủy phiếu.');
                                }
                              }
                            }
                          ]);
                        }}
                      >
                        <Ionicons name="close-circle-outline" size={18} color="#fff" />
                        <ThemedText style={styles.actionBtnText}>Hủy phiếu</ThemedText>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* RECEIPT CONFIRMATION MODAL */}
      <Modal visible={showReceiptModal} animationType="slide" transparent>

        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.icon + '20' }]}>
              <ThemedText style={styles.modalTitle}>Xác nhận số lượng thực nhận</ThemedText>
              <TouchableOpacity onPress={() => setShowReceiptModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <ThemedText style={{ fontSize: 13, opacity: 0.7, marginBottom: 16 }}>
                Vui lòng kiểm đếm số lượng thực tế nhận được tại kho. Nếu phát sinh hàng hỏng hóc hoặc thiếu, hãy nhập lý do hao hụt bên dưới.
              </ThemedText>

              {receiptDetails.map((item, idx) => (
                <View key={idx} style={{ marginBottom: 16, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.icon + '20', backgroundColor: colors.icon + '05' }}>
                  <ThemedText style={{ fontWeight: 'bold', fontSize: 15, marginBottom: 4 }}>{item.TENSP}</ThemedText>
                  <ThemedText style={{ fontSize: 12, opacity: 0.6, marginBottom: 8 }}>Mã SP: {item.MASP} • Số lượng xuất: x{item.SOLUONG_XUAT}</ThemedText>

                  <ThemedText style={styles.fieldLabel}>Số lượng thực nhận *</ThemedText>
                  <TextInput
                    style={[styles.textInput, { color: colors.text, borderColor: colors.icon + '40', backgroundColor: colors.icon + '10' }]}
                    keyboardType="numeric"
                    value={item.SOLUONG_NHAN}
                    onChangeText={val => {
                      const updated = [...receiptDetails];
                      updated[idx].SOLUONG_NHAN = val;
                      setReceiptDetails(updated);
                    }}
                  />

                  {Number(item.SOLUONG_NHAN) < item.SOLUONG_XUAT && (
                    <>
                      <ThemedText style={[styles.fieldLabel, { color: '#ef4444' }]}>Lý do hao hụt / hỏng hóc *</ThemedText>
                      <TextInput
                        style={[styles.textInput, { color: colors.text, borderColor: '#ef4444', backgroundColor: colors.icon + '10' }]}
                        placeholder="VD: Hộp bánh bị móp vỡ trong quá trình vận chuyển..."
                        placeholderTextColor={colors.icon}
                        value={item.LYDO_HAOHUT}
                        onChangeText={val => {
                          const updated = [...receiptDetails];
                          updated[idx].LYDO_HAOHUT = val;
                          setReceiptDetails(updated);
                        }}
                      />
                    </>
                  )}
                </View>
              ))}

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: '#10b981' }, submittingReceipt && { opacity: 0.6 }]}
                onPress={async () => {
                  try {
                    setSubmittingReceipt(true);
                    const details = receiptDetails.map(d => ({
                      ID_CHITIET: d.ID_CHITIET,
                      MASP: d.MASP,
                      SOLUONG_NHAN: Number(d.SOLUONG_NHAN) || 0,
                      LYDO_HAOHUT: d.LYDO_HAOHUT || null,
                    }));

                    await adminApi.updateTransferStatus(selectedTransfer.ID_PHIEU, {
                      TRANGTHAI: 'Đã nhận hàng',
                      details: details,
                    } as any);
                    Alert.alert('Thành công', 'Đã xác nhận nhập kho thành công!');
                    setShowReceiptModal(false);
                    setSelectedTransfer(null);
                    loadData();
                  } catch (e: any) {
                    Alert.alert('Lỗi', e?.response?.data?.error || e?.response?.data?.message || 'Không thể xác nhận nhận hàng.');
                  } finally {
                    setSubmittingReceipt(false);
                  }
                }}
                disabled={submittingReceipt}
              >
                {submittingReceipt ? <ActivityIndicator color="#fff" /> : (
                  <ThemedText style={styles.saveBtnText}>Hoàn tất nhận hàng & Nhập kho</ThemedText>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },
  tabsContainer: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabText: { fontSize: 15, opacity: 0.7 },
  headerActions: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, alignItems: 'center' },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 12, marginRight: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 40 },
  refreshBtn: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  itemName: { fontSize: 16, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  itemSku: { fontSize: 12, opacity: 0.6, marginBottom: 8 },
  stockRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  stockLabel: { fontSize: 12, opacity: 0.7 },
  stockValue: { fontSize: 13, fontWeight: 'bold' },
  transferPath: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  pathNode: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  pathText: { fontSize: 12, fontWeight: '500', marginLeft: 4 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalBody: { padding: 20 },
  modalSection: { marginBottom: 12 },
  sectionLabel: { fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  routeContainer: { padding: 12, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.03)' },
  routeItem: { flexDirection: 'row', alignItems: 'center' },
  routeRole: { fontSize: 10, opacity: 0.6 },
  routeName: { fontSize: 14, fontWeight: 'bold' },
  routeLine: { height: 16, width: 1, backgroundColor: '#ccc', marginLeft: 10, marginVertical: 4 },
  divider: { height: 1 },
  infoText: { fontSize: 13, marginBottom: 4, opacity: 0.8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderRadius: 8, marginBottom: 6 },
  modalFooter: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  actionBtn: { height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  // Form
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12, opacity: 0.8 },
  textInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  chipBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, marginBottom: 4 },
  saveBtn: { marginTop: 24, marginBottom: 30, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
