import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import { adminApi } from '@/services/api/adminApi';

const getTodayVN = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getFutureDateVN = (days = 30) => {
  const future = new Date();
  future.setDate(future.getDate() + days);
  const y = future.getFullYear();
  const m = String(future.getMonth() + 1).padStart(2, '0');
  const d = String(future.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const EMPTY_FORM = {
  MA_VOUCHER: '',
  LOAI_GIAM: 'PHAN_TRAM',
  GIA_TRI: '',
  DIEU_KIEN_TOI_THIEU: '',
  SO_LUONG_GIOI_HAN: '100',
  NGAY_BAT_DAU: getTodayVN(),
  NGAY_KET_THUC: getFutureDateVN(30),
  MO_TA: '',
};

export default function AdminVouchers() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchVouchers(); }, []);

  const fetchVouchers = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getVouchers();
      const items = Array.isArray(res) ? res : (res?.data || []);
      const mapped = items.map((v: any) => ({
        id: v.MA_VOUCHER,
        code: v.MA_VOUCHER,
        type: v.LOAI_GIAM === 'PHAN_TRAM' ? 'percent' : 'fixed',
        value: v.GIA_TRI,
        status: v.TRANG_THAI ? 'active' : 'expired',
        usageCount: v.SO_LUONG_DA_DUNG || 0,
        maxUsage: v.SO_LUONG_GIOI_HAN || 100,
        expiry: v.NGAY_KET_THUC ? v.NGAY_KET_THUC.split(' ')[0] : 'N/A',
        raw: v,
      }));
      setVouchers(mapped);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredVouchers = vouchers.filter(v => {
    const matchesTab = activeTab === 'all' ? true : v.status === activeTab;
    const matchesSearch = v.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleOpenAdd = () => {
    setEditingVoucher(null);
    setForm({
      ...EMPTY_FORM,
      MA_VOUCHER: 'KM' + Math.floor(100 + Math.random() * 900),
      NGAY_BAT_DAU: getTodayVN(),
      NGAY_KET_THUC: getFutureDateVN(30),
    });
    setShowFormModal(true);
  };

  const handleOpenEdit = (voucher: any) => {
    setEditingVoucher(voucher);
    setForm({
      MA_VOUCHER: voucher.raw.MA_VOUCHER || '',
      LOAI_GIAM: voucher.raw.LOAI_GIAM || 'PHAN_TRAM',
      GIA_TRI: String(voucher.raw.GIA_TRI || ''),
      DIEU_KIEN_TOI_THIEU: String(voucher.raw.DIEU_KIEN_TOI_THIEU || ''),
      SO_LUONG_GIOI_HAN: String(voucher.raw.SO_LUONG_GIOI_HAN || ''),
      NGAY_BAT_DAU: voucher.raw.NGAY_BAT_DAU ? voucher.raw.NGAY_BAT_DAU.split(' ')[0] : getTodayVN(),
      NGAY_KET_THUC: voucher.raw.NGAY_KET_THUC ? voucher.raw.NGAY_KET_THUC.split(' ')[0] : getFutureDateVN(30),
      MO_TA: voucher.raw.MO_TA || '',
    });
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!form.MA_VOUCHER.trim() || !form.GIA_TRI) {
      Alert.alert('Thiếu thông tin', 'Mã voucher và giá trị giảm là bắt buộc.');
      return;
    }

    const today = getTodayVN();
    if (form.NGAY_KET_THUC && form.NGAY_KET_THUC <= today) {
      Alert.alert('Hạn sử dụng không hợp lệ', 'Ngày kết thúc của Voucher phải lớn hơn ngày hiện tại.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...form,
        GIA_TRI: Number(form.GIA_TRI),
        DIEU_KIEN_TOI_THIEU: Number(form.DIEU_KIEN_TOI_THIEU || 0),
        SO_LUONG_GIOI_HAN: Number(form.SO_LUONG_GIOI_HAN || 100),
        TRANG_THAI: true,
      };

      if (editingVoucher) {
        await adminApi.updateVoucher(editingVoucher.id, payload);
        Alert.alert('Thành công', 'Cập nhật voucher thành công!');
      } else {
        await adminApi.createVoucher(payload);
        Alert.alert('Thành công', 'Tạo voucher mới thành công!');
      }
      setShowFormModal(false);
      await fetchVouchers();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể lưu voucher.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = (voucher: any) => {
    const isActive = voucher.status === 'active';
    Alert.alert(
      isActive ? 'Vô hiệu hóa voucher' : 'Kích hoạt voucher',
      `Bạn có muốn ${isActive ? 'vô hiệu hóa' : 'kích hoạt lại'} voucher "${voucher.code}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: isActive ? 'Vô hiệu hóa' : 'Kích hoạt',
          onPress: async () => {
            try {
              await adminApi.updateVoucher(voucher.id, { TRANG_THAI: !isActive });
              await fetchVouchers();
            } catch {
              Alert.alert('Lỗi', 'Không thể cập nhật trạng thái voucher.');
            }
          }
        }
      ]
    );
  };

  const handleDelete = (voucher: any) => {
    Alert.alert('Xóa voucher', `Xóa voucher "${voucher.code}"? Hành động không thể hoàn tác.`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminApi.deleteVoucher(voucher.id);
            await fetchVouchers();
          } catch {
            Alert.alert('Lỗi', 'Không thể xóa voucher này.');
          }
        }
      }
    ]);
  };

  return (
    <ThemedView style={styles.container}>
      {/* FORM MODAL */}
      <Modal visible={showFormModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.icon + '20' }]}>
              <ThemedText style={styles.modalTitle}>
                {editingVoucher ? 'Chỉnh sửa Voucher' : 'Tạo Voucher mới'}
              </ThemedText>
              <TouchableOpacity onPress={() => setShowFormModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <ThemedText style={styles.fieldLabel}>Mã Voucher *</ThemedText>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.icon + '40', backgroundColor: colors.icon + '10' }]}
                value={form.MA_VOUCHER}
                onChangeText={v => setForm(f => ({ ...f, MA_VOUCHER: v.toUpperCase() }))}
                placeholder="VD: SALE20, GIAM50K..."
                placeholderTextColor={colors.icon}
                editable={!editingVoucher}
              />

              <ThemedText style={styles.fieldLabel}>Loại giảm giá *</ThemedText>
              <View style={styles.typeRow}>
                {[{ value: 'PHAN_TRAM', label: '% Phần trăm' }, { value: 'SO_TIEN', label: '₫ Số tiền' }].map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.typeBtn, { borderColor: colors.icon + '40' }, form.LOAI_GIAM === opt.value && { backgroundColor: colors.tint, borderColor: colors.tint }]}
                    onPress={() => setForm(f => ({ ...f, LOAI_GIAM: opt.value }))}
                  >
                    <ThemedText style={[styles.typeBtnText, form.LOAI_GIAM === opt.value && { color: '#fff' }]}>
                      {opt.label}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <ThemedText style={styles.fieldLabel}>Giá trị giảm *</ThemedText>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.icon + '40', backgroundColor: colors.icon + '10' }]}
                value={form.GIA_TRI}
                onChangeText={v => setForm(f => ({ ...f, GIA_TRI: v }))}
                keyboardType="numeric"
                placeholder={form.LOAI_GIAM === 'PHAN_TRAM' ? 'VD: 20 (20%)' : 'VD: 50000'}
                placeholderTextColor={colors.icon}
              />

              <ThemedText style={styles.fieldLabel}>Điều kiện tối thiểu (₫)</ThemedText>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.icon + '40', backgroundColor: colors.icon + '10' }]}
                value={form.DIEU_KIEN_TOI_THIEU}
                onChangeText={v => setForm(f => ({ ...f, DIEU_KIEN_TOI_THIEU: v }))}
                keyboardType="numeric"
                placeholder="VD: 100000"
                placeholderTextColor={colors.icon}
              />

              <ThemedText style={styles.fieldLabel}>Số lượng giới hạn</ThemedText>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.icon + '40', backgroundColor: colors.icon + '10' }]}
                value={form.SO_LUONG_GIOI_HAN}
                onChangeText={v => setForm(f => ({ ...f, SO_LUONG_GIOI_HAN: v }))}
                keyboardType="numeric"
                placeholder="VD: 100"
                placeholderTextColor={colors.icon}
              />

              <ThemedText style={styles.fieldLabel}>Ngày bắt đầu (Giờ VN: YYYY-MM-DD)</ThemedText>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.icon + '40', backgroundColor: colors.icon + '10' }]}
                value={form.NGAY_BAT_DAU}
                onChangeText={v => setForm(f => ({ ...f, NGAY_BAT_DAU: v }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.icon}
              />

              <ThemedText style={styles.fieldLabel}>Ngày kết thúc (Phải sau ngày hiện tại)</ThemedText>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.icon + '40', backgroundColor: colors.icon + '10' }]}
                value={form.NGAY_KET_THUC}
                onChangeText={v => setForm(f => ({ ...f, NGAY_KET_THUC: v }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.icon}
              />

              <ThemedText style={styles.fieldLabel}>Mô tả</ThemedText>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.icon + '40', backgroundColor: colors.icon + '10', minHeight: 80, textAlignVertical: 'top' }]}
                value={form.MO_TA}
                onChangeText={v => setForm(f => ({ ...f, MO_TA: v }))}
                multiline
                placeholder="Mô tả ngắn về voucher..."
                placeholderTextColor={colors.icon}
              />

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.tint }, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : (
                  <ThemedText style={styles.saveBtnText}>
                    {editingVoucher ? 'Lưu thay đổi' : 'Tạo Voucher'}
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
          <ThemedText style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>Khuyến mãi & Voucher</ThemedText>
        </View>
        <TouchableOpacity onPress={handleOpenAdd}>
          <Ionicons name="add-circle-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search & Refresh */}
      <View style={[styles.headerActions, { borderBottomColor: colors.icon + '20' }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.icon + '15' }]}>
          <Ionicons name="search" size={20} color={colors.icon} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Tìm mã voucher..."
            placeholderTextColor={colors.icon}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={[styles.refreshBtn, { backgroundColor: colors.icon + '15' }]} onPress={fetchVouchers}>
          <Ionicons name="refresh" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { borderBottomColor: colors.icon + '20' }]}>
        {['active', 'expired', 'all'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: colors.tint, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab)}
          >
            <ThemedText style={[styles.tabText, activeTab === tab && { color: colors.tint, fontWeight: 'bold' }]}>
              {tab === 'active' ? 'Đang chạy' : tab === 'expired' ? 'Đã hết hạn' : 'Tất cả'}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {filteredVouchers.length === 0 && (
            <ThemedText style={{ textAlign: 'center', marginTop: 40, opacity: 0.5 }}>Không có voucher nào</ThemedText>
          )}
          {filteredVouchers.map(voucher => (
            <View key={voucher.id} style={[styles.voucherCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
              <View style={styles.voucherLeft}>
                <View style={[styles.voucherValueBox, { backgroundColor: voucher.status === 'active' ? colors.tint + '20' : colors.icon + '20' }]}>
                  <ThemedText style={[styles.voucherValue, { color: voucher.status === 'active' ? colors.tint : colors.icon }]}>
                    {voucher.type === 'percent' ? `${voucher.value}%` : `-${voucher.value >= 1000 ? (voucher.value / 1000) + 'K' : voucher.value}`}
                  </ThemedText>
                  <ThemedText style={styles.voucherType}>Giảm</ThemedText>
                </View>
              </View>
              <View style={styles.voucherRight}>
                <View style={styles.voucherHeaderRow}>
                  <ThemedText style={styles.voucherCode}>{voucher.code}</ThemedText>
                  <View style={[styles.statusBadge, { backgroundColor: voucher.status === 'active' ? '#10b98120' : '#ef444420' }]}>
                    <ThemedText style={[styles.statusText, { color: voucher.status === 'active' ? '#10b981' : '#ef4444' }]}>
                      {voucher.status === 'active' ? 'Active' : 'Expired'}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.progressSection}>
                  <View style={styles.progressTextRow}>
                    <ThemedText style={styles.progressText}>Đã dùng: {voucher.usageCount}/{voucher.maxUsage}</ThemedText>
                    <ThemedText style={styles.progressText}>HSD: {voucher.expiry}</ThemedText>
                  </View>
                  <View style={[styles.progressBarBg, { backgroundColor: colors.icon + '20' }]}>
                    <View style={[styles.progressBarFill, { backgroundColor: colors.tint, width: `${Math.min((voucher.usageCount / Math.max(voucher.maxUsage, 1)) * 100, 100)}%` }]} />
                  </View>
                </View>
                <View style={styles.actionRow}>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.tint + '20' }]} onPress={() => handleOpenEdit(voucher)}>
                    <Ionicons name="create-outline" size={15} color={colors.tint} />
                    <ThemedText style={[styles.actionBtnText, { color: colors.tint }]}>Sửa</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: voucher.status === 'active' ? '#f59e0b20' : '#10b98120' }]} onPress={() => handleToggleStatus(voucher)}>
                    <Ionicons name={voucher.status === 'active' ? 'pause-circle-outline' : 'play-circle-outline'} size={15} color={voucher.status === 'active' ? '#f59e0b' : '#10b981'} />
                    <ThemedText style={[styles.actionBtnText, { color: voucher.status === 'active' ? '#f59e0b' : '#10b981' }]}>
                      {voucher.status === 'active' ? 'Vô hiệu' : 'Kích hoạt'}
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ef444420' }]} onPress={() => handleDelete(voucher)}>
                    <Ionicons name="trash-outline" size={15} color="#ef4444" />
                    <ThemedText style={[styles.actionBtnText, { color: '#ef4444' }]}>Xóa</ThemedText>
                  </TouchableOpacity>
                </View>
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
  headerActions: { flexDirection: 'row', padding: 16, borderBottomWidth: 1 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 12, marginRight: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 40 },
  refreshBtn: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  tabsContainer: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabText: { fontSize: 14, opacity: 0.7 },
  listContent: { padding: 16 },
  voucherCard: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },
  voucherLeft: { padding: 12, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: 'rgba(0,0,0,0.05)', borderStyle: 'dashed' },
  voucherValueBox: { width: 64, height: 64, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  voucherValue: { fontSize: 18, fontWeight: 'bold' },
  voucherType: { fontSize: 10, opacity: 0.8 },
  voucherRight: { flex: 1, padding: 12 },
  voucherHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  voucherCode: { fontSize: 15, fontWeight: 'bold', letterSpacing: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  progressSection: { marginBottom: 8 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressText: { fontSize: 11, opacity: 0.6 },
  progressBarBg: { height: 6, borderRadius: 3, width: '100%', overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  actionRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  actionBtnText: { fontSize: 12, fontWeight: '600' },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalBody: { padding: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14, opacity: 0.8 },
  textInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  typeBtnText: { fontSize: 13, fontWeight: '600' },
  saveBtn: { marginTop: 24, marginBottom: 40, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
