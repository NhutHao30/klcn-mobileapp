import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { adminApi } from '@/services/api/adminApi';

export default function AdminCustomers() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [form, setForm] = useState({ HOTEN: '', SDT: '', EMAIL: '', DIACHI: '', NGAYSINH: '', GIOITINH: 'Nam' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getCustomers();
      const items = Array.isArray(res) ? res : (res?.data || []);
      const mapped = items.map((c: any) => ({
        id: c.maKH || c.MAKH,
        name: c.hoTen || c.HOTEN || 'Khách vãng lai',
        email: c.email || c.EMAIL || 'Chưa cập nhật email',
        phone: c.sdt || c.SDT || 'Chưa có SĐT',
        orders: c.totalOrders || 0,
        spent: Number(c.totalSpent) || 0,
        rank: c.membershipRank || 'Đồng',
        points: c.diemTichLuy || c.DIEM_TICH_LUY || 0,
        birthday: c.ngaySinh || c.NGAYSINH || 'Chưa cập nhật',
        gender: c.gioiTinh || c.GIOITINH || 'Chưa cập nhật',
        address: c.diaChi || c.DIACHI || 'Chưa cập nhật',
        raw: c,
      }));
      setCustomers(mapped);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setForm({ HOTEN: '', SDT: '', EMAIL: '', DIACHI: '', NGAYSINH: '', GIOITINH: 'Nam' });
    setShowFormModal(true);
  };

  const handleOpenEdit = (customer: any) => {
    setEditingCustomer(customer);
    setForm({
      HOTEN: customer.name || '',
      SDT: customer.phone === 'Chưa có SĐT' ? '' : customer.phone,
      EMAIL: customer.email === 'Chưa cập nhật email' ? '' : customer.email,
      DIACHI: customer.address === 'Chưa cập nhật' ? '' : customer.address,
      NGAYSINH: customer.birthday === 'Chưa cập nhật' ? '' : customer.birthday,
      GIOITINH: customer.gender === 'Chưa cập nhật' ? 'Nam' : customer.gender,
    });
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!form.HOTEN.trim()) {
      Alert.alert('Thiếu thông tin', 'Họ tên khách hàng là bắt buộc.');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        ...form,
        hoTen: form.HOTEN,
        sdt: form.SDT,
        email: form.EMAIL,
        diaChi: form.DIACHI,
        ngaySinh: form.NGAYSINH,
        gioiTinh: form.GIOITINH,
      };
      if (editingCustomer) {
        await adminApi.updateCustomer(editingCustomer.id, payload);
        Alert.alert('Thành công', 'Cập nhật thông tin khách hàng thành công!');
      } else {
        await adminApi.createCustomer(payload);
        Alert.alert('Thành công', 'Tạo khách hàng mới thành công!');
      }

      setShowFormModal(false);
      setSelectedCustomer(null);
      await fetchCustomers();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể lưu thông tin khách hàng.');
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = (customer: any) => {
    Alert.alert(
      'Vô hiệu hóa tài khoản',
      `Vô hiệu hóa tài khoản của "${customer.name}"? Khách hàng sẽ không thể đăng nhập.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Vô hiệu hóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminApi.deleteCustomer(customer.id);
              setSelectedCustomer(null);
              Alert.alert('Thành công', `Đã vô hiệu hóa tài khoản của ${customer.name}.`);
              await fetchCustomers();
            } catch {
              Alert.alert('Lỗi', 'Không thể vô hiệu hóa tài khoản này.');
            }
          }
        }
      ]
    );
  };

  const renderCustomer = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.customerCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}
      onPress={() => setSelectedCustomer(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.avatarContainer, { backgroundColor: colors.tint + '20' }]}>
        <ThemedText style={[styles.avatarText, { color: colors.tint }]}>
          {item.name.charAt(0)}
        </ThemedText>
      </View>

      <View style={styles.customerInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <ThemedText style={styles.customerName}>{item.name}</ThemedText>
          <View style={{ backgroundColor: colors.tint, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
            <ThemedText style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{item.rank}</ThemedText>
          </View>
        </View>
        <View style={styles.contactRow}>
          <Ionicons name="mail-outline" size={14} color={colors.icon} style={styles.contactIcon} />
          <ThemedText style={styles.contactText}>{item.email}</ThemedText>
        </View>
        <View style={styles.contactRow}>
          <Ionicons name="call-outline" size={14} color={colors.icon} style={styles.contactIcon} />
          <ThemedText style={styles.contactText}>{item.phone}</ThemedText>
        </View>
      </View>

      <View style={styles.statsColumn}>
        <View style={styles.statItem}>
          <ThemedText style={styles.statLabel}>Đơn hàng</ThemedText>
          <ThemedText style={styles.statValue}>{item.orders}</ThemedText>
        </View>
        <View style={styles.statItem}>
          <ThemedText style={styles.statLabel}>Đã mua</ThemedText>
          <ThemedText style={[styles.statValue, { color: colors.tint }]}>{item.spent.toLocaleString('vi-VN')}₫</ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      {/* FORM MODAL */}
      <Modal visible={showFormModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.icon + '20' }]}>
              <ThemedText style={styles.modalTitle}>
                {editingCustomer ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng mới'}
              </ThemedText>
              <TouchableOpacity onPress={() => setShowFormModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {[
                { key: 'HOTEN', label: 'Họ tên *', placeholder: 'Nguyễn Văn A' },
                { key: 'SDT', label: 'Số điện thoại', placeholder: '0901234567', keyboard: 'phone-pad' },
                { key: 'EMAIL', label: 'Email', placeholder: 'email@example.com', keyboard: 'email-address' },
                { key: 'DIACHI', label: 'Địa chỉ', placeholder: '123 Đường ABC, TP.HCM' },
                { key: 'NGAYSINH', label: 'Ngày sinh (YYYY-MM-DD)', placeholder: '1990-01-01' },
              ].map(field => (
                <View key={field.key}>
                  <ThemedText style={styles.fieldLabel}>{field.label}</ThemedText>
                  <TextInput
                    style={[styles.textInput, { color: colors.text, borderColor: colors.icon + '40', backgroundColor: colors.icon + '10' }]}
                    value={(form as any)[field.key]}
                    onChangeText={v => setForm(f => ({ ...f, [field.key]: v }))}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.icon}
                    keyboardType={(field as any).keyboard || 'default'}
                  />
                </View>
              ))}
              <ThemedText style={styles.fieldLabel}>Giới tính</ThemedText>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
                {['Nam', 'Nữ', 'Khác'].map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.typeBtn, { borderColor: colors.icon + '40' }, form.GIOITINH === g && { backgroundColor: colors.tint, borderColor: colors.tint }]}
                    onPress={() => setForm(f => ({ ...f, GIOITINH: g }))}
                  >
                    <ThemedText style={[{ fontSize: 13, fontWeight: '600' }, form.GIOITINH === g && { color: '#fff' }]}>{g}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.tint }, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : (
                  <ThemedText style={styles.saveBtnText}>
                    {editingCustomer ? 'Lưu thay đổi' : 'Tạo khách hàng'}
                  </ThemedText>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Khách hàng thành viên</ThemedText>
        <TouchableOpacity style={styles.backButton} onPress={fetchCustomers}>
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={[styles.headerActions, { borderBottomColor: colors.icon + '20' }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.icon + '15' }]}>
          <Ionicons name="search" size={20} color={colors.icon} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Tìm khách hàng..."
            placeholderTextColor={colors.icon}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={[styles.filterButton, { backgroundColor: colors.tint }]} onPress={handleOpenAdd}>
          <Ionicons name="person-add-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          data={customers.filter(c =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.phone.includes(searchQuery)
          )}
          keyExtractor={item => String(item.id || Math.random())}
          renderItem={renderCustomer}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* DETAIL MODAL */}
      {selectedCustomer && (
        <Modal
          visible={!!selectedCustomer}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedCustomer(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.icon + '20' }]}>
                <ThemedText style={styles.modalTitle}>Thông tin khách hàng</ThemedText>
                <TouchableOpacity onPress={() => setSelectedCustomer(null)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.avatarLargeContainer}>
                  <View style={[styles.avatarLarge, { backgroundColor: colors.tint + '15' }]}>
                    <ThemedText style={[styles.avatarLargeText, { color: colors.tint }]}>
                      {selectedCustomer.name.charAt(0)}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.modalName}>{selectedCustomer.name}</ThemedText>
                  <ThemedText style={styles.modalSubtitle}>Mã số: {selectedCustomer.id}</ThemedText>
                </View>

                {[
                  { icon: 'ribbon-outline', label: 'Hạng thành viên', value: `${selectedCustomer.rank} (Tích luỹ: ${selectedCustomer.points} điểm)` },
                  { icon: 'cart-outline', label: 'Số đơn hàng', value: `${selectedCustomer.orders} đơn hàng` },
                  { icon: 'cash-outline', label: 'Tổng chi tiêu', value: `${selectedCustomer.spent.toLocaleString('vi-VN')}₫` },
                  { icon: 'mail-outline', label: 'Email liên hệ', value: selectedCustomer.email },
                  { icon: 'call-outline', label: 'Số điện thoại', value: selectedCustomer.phone },
                  { icon: 'calendar-outline', label: 'Ngày sinh & Giới tính', value: `${selectedCustomer.birthday} (${selectedCustomer.gender})` },
                  { icon: 'location-outline', label: 'Địa chỉ liên hệ', value: selectedCustomer.address },
                ].map((row, i) => (
                  <View key={i} style={[styles.detailRow, { borderBottomColor: colors.icon + '10' }]}>
                    <Ionicons name={row.icon as any} size={20} color={colors.tint} style={styles.detailIcon} />
                    <View style={styles.detailTextCol}>
                      <ThemedText style={styles.detailLabel}>{row.label}</ThemedText>
                      <ThemedText style={styles.detailValue}>{row.value}</ThemedText>
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.modalFooter}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.tint, flex: 1 }]}
                    onPress={() => { const cust = selectedCustomer; setSelectedCustomer(null); handleOpenEdit(cust); }}
                  >
                    <Ionicons name="create-outline" size={18} color="#fff" />
                    <ThemedText style={styles.actionBtnText}>Sửa thông tin</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#ef4444', flex: 1 }]}
                    onPress={() => handleDisable(selectedCustomer)}
                  >
                    <Ionicons name="ban-outline" size={18} color="#fff" />
                    <ThemedText style={styles.actionBtnText}>Vô hiệu hóa</ThemedText>
                  </TouchableOpacity>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16 },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerActions: { flexDirection: 'row', padding: 16, alignItems: 'center', borderBottomWidth: 1 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 12, height: 40, marginRight: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: '100%' },
  filterButton: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16 },
  customerCard: { flexDirection: 'row', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16, alignItems: 'center' },
  avatarContainer: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { fontSize: 20, fontWeight: 'bold' },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  contactRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  contactIcon: { marginRight: 6 },
  contactText: { fontSize: 12, opacity: 0.7 },
  statsColumn: { alignItems: 'flex-end', justifyContent: 'center' },
  statItem: { alignItems: 'flex-end', marginBottom: 8 },
  statLabel: { fontSize: 12, opacity: 0.6 },
  statValue: { fontSize: 14, fontWeight: 'bold' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalBody: { padding: 20 },
  avatarLargeContainer: { alignItems: 'center', marginBottom: 24 },
  avatarLarge: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarLargeText: { fontSize: 32, fontWeight: 'bold' },
  modalName: { fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, opacity: 0.6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  detailIcon: { marginRight: 16 },
  detailTextCol: { flex: 1 },
  detailLabel: { fontSize: 12, opacity: 0.5, marginBottom: 2 },
  detailValue: { fontSize: 15, fontWeight: '500' },
  modalFooter: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  actionBtn: { height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  // Form
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14, opacity: 0.8 },
  textInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  saveBtn: { marginTop: 24, marginBottom: 40, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
