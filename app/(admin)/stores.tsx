import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import { adminApi } from '@/services/api/adminApi';

export default function AdminStores() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Modal State
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingStore, setEditingStore] = useState<any>(null);
  const [form, setForm] = useState({ TENCUAHANG: '', DIACHI: '', SDT: '', GHN_SHOP_ID: '', TRANGTHAI: 'Đang hoạt động' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getAdminStores();
      const items = Array.isArray(res) ? res : (res?.data || []);
      const mapped = items.map((store: any) => ({
        id: String(store.MACUAHANG || store.id),
        name: store.TENCUAHANG || store.name,
        address: store.DIACHI || store.address,
        phone: store.SDT || store.phone || 'Chưa cập nhật SĐT',
        ghnShopId: store.GHN_SHOP_ID || store.ghn_shop_id || 'Chưa cấu hình',
        manager: store.nhanvien && store.nhanvien[0] ? store.nhanvien[0].HOTEN : (store.manager || 'Chưa có quản lý'),
        employeeCount: store.employees ? store.employees.length : (store.so_nhan_vien || 0),
        newCustomers: store.newCustomers !== undefined ? store.newCustomers : (store.customerCount || 0),
        status: (store.TRANGTHAI === 'Đang hoạt động' || store.status === 'active') ? 'active' : 'maintenance',
        revenue: Number(store.revenue || store.TONG_DOANHTHU) || 0,
        raw: store,
      }));
      setStores(mapped);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingStore(null);
    setForm({ TENCUAHANG: '', DIACHI: '', SDT: '', GHN_SHOP_ID: '', TRANGTHAI: 'Đang hoạt động' });
    setShowFormModal(true);
  };

  const handleOpenEdit = (store: any) => {
    setEditingStore(store);
    setForm({
      TENCUAHANG: store.name || '',
      DIACHI: store.address || '',
      SDT: store.phone === 'Chưa cập nhật SĐT' ? '' : store.phone,
      GHN_SHOP_ID: store.ghnShopId === 'Chưa cấu hình' ? '' : store.ghnShopId,
      TRANGTHAI: store.status === 'active' ? 'Đang hoạt động' : 'Tạm ngưng',
    });
    setShowFormModal(true);
  };


  const handleSave = async () => {
    if (!form.TENCUAHANG.trim() || !form.DIACHI.trim()) {
      Alert.alert('Thiếu thông tin', 'Tên chi nhánh và Địa chỉ là bắt buộc.');
      return;
    }
    try {
      setSaving(true);
      if (editingStore) {
        await adminApi.updateStore(editingStore.id, form);
        Alert.alert('Thành công', 'Cập nhật thông tin chi nhánh thành công!');
      } else {
        await adminApi.createStore(form);
        Alert.alert('Thành công', 'Tạo chi nhánh mới thành công!');
      }
      setShowFormModal(false);
      await fetchStores();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể lưu chi nhánh.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = (store: any) => {
    const isActive = store.status === 'active';
    Alert.alert(
      isActive ? 'Ngừng hoạt động chi nhánh' : 'Kích hoạt chi nhánh',
      `Bạn có muốn ${isActive ? 'ngừng hoạt động' : 'kích hoạt lại'} chi nhánh "${store.name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: isActive ? 'Ngừng hoạt động' : 'Kích hoạt',
          onPress: async () => {
            try {
              await adminApi.toggleStoreStatus(store.id);
              await fetchStores();
            } catch {
              Alert.alert('Lỗi', 'Không thể thay đổi trạng thái chi nhánh.');
            }
          }
        }
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* FORM MODAL */}
      <Modal visible={showFormModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.icon + '20' }]}>
              <ThemedText style={styles.modalTitle}>
                {editingStore ? 'Chỉnh sửa chi nhánh' : 'Thêm chi nhánh mới'}
              </ThemedText>
              <TouchableOpacity onPress={() => setShowFormModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <ThemedText style={styles.fieldLabel}>Tên chi nhánh *</ThemedText>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.icon + '40', backgroundColor: colors.icon + '10' }]}
                value={form.TENCUAHANG}
                onChangeText={v => setForm(f => ({ ...f, TENCUAHANG: v }))}
                placeholder="VD: Chi nhánh 4 - Bình Thạnh"
                placeholderTextColor={colors.icon}
              />

              <ThemedText style={styles.fieldLabel}>Địa chỉ *</ThemedText>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.icon + '40', backgroundColor: colors.icon + '10' }]}
                value={form.DIACHI}
                onChangeText={v => setForm(f => ({ ...f, DIACHI: v }))}
                placeholder="123 Đường Điện Biên Phủ, P.25, Bình Thạnh..."
                placeholderTextColor={colors.icon}
              />

              <ThemedText style={styles.fieldLabel}>Số điện thoại liên hệ</ThemedText>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.icon + '40', backgroundColor: colors.icon + '10' }]}
                value={form.SDT}
                onChangeText={v => setForm(f => ({ ...f, SDT: v }))}
                keyboardType="phone-pad"
                placeholder="0901234567"
                placeholderTextColor={colors.icon}
              />

              <ThemedText style={styles.fieldLabel}>Shop ID Giao Hàng Nhanh (GHN)</ThemedText>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.icon + '40', backgroundColor: colors.icon + '10' }]}
                value={form.GHN_SHOP_ID}
                onChangeText={v => setForm(f => ({ ...f, GHN_SHOP_ID: v }))}
                placeholder="VD: 190284"
                placeholderTextColor={colors.icon}
              />

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.tint }, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : (
                  <ThemedText style={styles.saveBtnText}>
                    {editingStore ? 'Lưu thay đổi' : 'Tạo chi nhánh'}
                  </ThemedText>
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
          <ThemedText style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>Hệ thống Chi nhánh</ThemedText>
        </View>
        <TouchableOpacity onPress={handleOpenAdd}>
          <Ionicons name="add-circle-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={[styles.headerActions, { borderBottomColor: colors.icon + '20' }]}>
        <ThemedText style={styles.summaryText}>Tổng cộng: {stores.length} chi nhánh</ThemedText>
        <TouchableOpacity style={[styles.refreshBtn, { backgroundColor: colors.icon + '15' }]} onPress={fetchStores}>
          <Ionicons name="refresh" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {stores.map(store => (
            <View key={store.id} style={[styles.card, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons name="storefront" size={24} color={colors.tint} style={styles.storeIcon} />
                  <ThemedText style={styles.storeName}>{store.name}</ThemedText>
                </View>
                <TouchableOpacity onPress={() => handleToggleStatus(store)}>
                  <View style={[styles.statusBadge, { backgroundColor: store.status === 'active' ? '#10b98120' : '#ef444420' }]}>
                    <ThemedText style={[styles.statusText, { color: store.status === 'active' ? '#10b981' : '#ef4444' }]}>
                      {store.status === 'active' ? 'Hoạt động' : 'Tạm ngưng'}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={16} color={colors.icon} />
                <ThemedText style={styles.infoText}>{store.address}</ThemedText>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={16} color={colors.icon} />
                <ThemedText style={styles.infoText}>{store.phone}</ThemedText>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={16} color={colors.icon} />
                <ThemedText style={styles.infoText}>Quản lý: {store.manager}</ThemedText>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="cube-outline" size={16} color={colors.icon} />
                <ThemedText style={styles.infoText}>GHN Shop ID: {store.ghnShopId}</ThemedText>
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginVertical: 8, padding: 8, backgroundColor: colors.icon + '08', borderRadius: 8 }}>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <ThemedText style={{ fontSize: 11, opacity: 0.6 }}>Nhân viên</ThemedText>
                  <ThemedText style={{ fontSize: 14, fontWeight: 'bold', color: colors.tint }}>{store.employeeCount} người</ThemedText>
                </View>
                <View style={{ width: 1, backgroundColor: colors.icon + '20' }} />
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <ThemedText style={{ fontSize: 11, opacity: 0.6 }}>Khách hàng mới</ThemedText>
                  <ThemedText style={{ fontSize: 14, fontWeight: 'bold', color: '#10b981' }}>{store.newCustomers} người</ThemedText>
                </View>
              </View>

              <View style={styles.footerRow}>
                <View>
                  <ThemedText style={styles.footerLabel}>Doanh thu tích lũy</ThemedText>
                  <ThemedText style={[styles.footerValue, { color: colors.tint }]}>
                    {(Number(store?.revenue) || 0).toLocaleString('vi-VN')}₫
                  </ThemedText>
                </View>

                <TouchableOpacity
                  style={[styles.editButton, { borderColor: colors.tint }]}
                  onPress={() => handleOpenEdit(store)}
                >
                  <Ionicons name="create-outline" size={14} color={colors.tint} style={{ marginRight: 4 }} />
                  <ThemedText style={[styles.editButtonText, { color: colors.tint }]}>Chỉnh sửa</ThemedText>
                </TouchableOpacity>
              </View>
            </View>

          ))}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  summaryText: { fontSize: 16, fontWeight: 'bold' },
  refreshBtn: { padding: 8, borderRadius: 8 },
  listContent: { padding: 16 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  storeIcon: { marginRight: 8 },
  storeName: { fontSize: 16, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  infoText: { marginLeft: 8, fontSize: 13, opacity: 0.8, flex: 1 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 12, marginTop: 8 },
  footerLabel: { fontSize: 11, opacity: 0.6 },
  footerValue: { fontSize: 15, fontWeight: 'bold' },
  editButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  editButtonText: { fontWeight: 'bold', fontSize: 12 },
  // Form Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalBody: { padding: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12, opacity: 0.8 },
  textInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  saveBtn: { marginTop: 24, marginBottom: 30, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
