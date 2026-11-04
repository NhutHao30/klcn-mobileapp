import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { adminApi } from '@/services/api/adminApi';
import * as ImagePicker from 'expo-image-picker';

export default function AdminEmployees() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  // Form & OCR State
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [form, setForm] = useState({
    USERNAME: '',
    PASSWORD: '',
    HOTEN: '',
    SDT: '',
    EMAIL: '',
    CHUCVU: 'Nhân viên bán hàng',
    CALAMVIEC: 'Sáng (08:00 - 15:00)',
    LUONG: '7000000',
    CCCD: '',
    DIACHI: '',
    MACUAHANG: '1',
  });
  const [saving, setSaving] = useState(false);
  const [scanningOcr, setScanningOcr] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const users = await adminApi.getUsers();
      if (Array.isArray(users)) {
        const mapped = users
          .filter((u: any) => (u.MAROLE === 1 || u.MAROLE === 2) && u.nhanvien)
          .map((u: any) => ({
            id: u.USERNAME,
            username: u.USERNAME,
            name: u.nhanvien.HOTEN,
            role: u.nhanvien.CHUCVU || 'Nhân viên',
            shift: u.nhanvien.CALAMVIEC || 'Chưa xếp',
            status: u.nhanvien.TRANGTHAI === 'Đang làm việc' ? 'Active' : 'Inactive',
            email: u.EMAIL || 'Chưa cập nhật',
            phone: u.nhanvien.SDT || 'Chưa cập nhật',
            salary: Number(u.nhanvien.LUONG) || 0,
            cccd: u.nhanvien.CCCD || 'Chưa cập nhật',
            address: u.nhanvien.DIACHI || 'Chưa cập nhật',
            storeId: u.nhanvien.MACUAHANG || 1,
            raw: u,
          }));
        setEmployees(mapped);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setForm({
      USERNAME: 'nv_' + Math.floor(100 + Math.random() * 900),
      PASSWORD: 'password123',
      HOTEN: '',
      SDT: '',
      EMAIL: '',
      CHUCVU: 'Nhân viên bán hàng',
      CALAMVIEC: 'Sáng (08:00 - 15:00)',
      LUONG: '7000000',
      CCCD: '',
      DIACHI: '',
      MACUAHANG: '1',
    });
    setShowFormModal(true);
  };

  const handleOpenEdit = (emp: any) => {
    setEditingEmployee(emp);
    setForm({
      USERNAME: emp.username,
      PASSWORD: '',
      HOTEN: emp.name || '',
      SDT: emp.phone === 'Chưa cập nhật' ? '' : emp.phone,
      EMAIL: emp.email === 'Chưa cập nhật' ? '' : emp.email,
      CHUCVU: emp.role || 'Nhân viên bán hàng',
      CALAMVIEC: emp.shift || 'Sáng (08:00 - 15:00)',
      LUONG: String(emp.salary || '7000000'),
      CCCD: emp.cccd === 'Chưa cập nhật' ? '' : emp.cccd,
      DIACHI: emp.address === 'Chưa cập nhật' ? '' : emp.address,
      MACUAHANG: String(emp.storeId || '1'),
    });
    setShowFormModal(true);
  };

  const processOcrImage = async (fileUri: string) => {
    try {
      setScanningOcr(true);
      const formData = new FormData();
      formData.append('image', {
        uri: fileUri,
        name: 'cccd.jpg',
        type: 'image/jpeg',
      } as any);

      const ocrRes = await adminApi.scanCccd(formData);
      const parsed = ocrRes?.parsed_data || ocrRes?.data || ocrRes;

      if (parsed && (parsed.hoTen || parsed.cccd || parsed.diaChi)) {
        setForm(f => ({
          ...f,
          HOTEN: parsed.hoTen || f.HOTEN,
          CCCD: parsed.cccd || parsed.soCCCD || f.CCCD,
          DIACHI: parsed.diaChi || f.DIACHI,
        }));
        Alert.alert('Thành công', `Đã nhận diện thông tin CCCD:\n• Họ tên: ${parsed.hoTen || 'N/A'}\n• Số CCCD: ${parsed.cccd || 'N/A'}`);
      } else {
        Alert.alert('Thông báo', 'Đã quét nhưng không thấy dữ liệu CCCD rõ ràng. Vui lòng chụp rõ các nét chữ trên thẻ.');
      }
    } catch (e: any) {
      Alert.alert('Lỗi OCR', e?.response?.data?.message || 'Không thể nhận diện hình ảnh CCCD.');
    } finally {
      setScanningOcr(false);
    }
  };

  const handleScanCccdOcr = () => {
    Alert.alert(
      'Quét OCR CCCD',
      'Bạn muốn chụp ảnh trực tiếp từ Camera hay chọn ảnh có sẵn từ Thư viện?',
      [
        {
          text: 'Chụp từ Camera',
          onPress: async () => {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
              Alert.alert('Cần cấp quyền', 'Vui lòng cho phép truy cập Camera.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
            if (!result.canceled && result.assets[0]) {
              await processOcrImage(result.assets[0].uri);
            }
          }
        },
        {
          text: 'Chọn từ Thư viện',
          onPress: async () => {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
              Alert.alert('Cần cấp quyền', 'Vui lòng cho phép truy cập thư viện ảnh.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
            if (!result.canceled && result.assets[0]) {
              await processOcrImage(result.assets[0].uri);
            }
          }
        },
        { text: 'Hủy', style: 'cancel' }
      ]
    );
  };


  const handleSave = async () => {
    if (!form.HOTEN.trim() || (!editingEmployee && !form.USERNAME.trim())) {
      Alert.alert('Thiếu thông tin', 'Tài khoản (Username) và Họ tên là bắt buộc.');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        USERNAME: form.USERNAME,
        ...(form.PASSWORD ? { PASSWORD: form.PASSWORD } : {}),
        HOTEN: form.HOTEN,
        SDT: form.SDT,
        EMAIL: form.EMAIL,
        CHUCVU: form.CHUCVU,
        CALAMVIEC: form.CALAMVIEC,
        LUONG: Number(form.LUONG || 0),
        CCCD: form.CCCD,
        DIACHI: form.DIACHI,
        MACUAHANG: Number(form.MACUAHANG || 1),
        MAROLE: form.CHUCVU.toLowerCase().includes('quản lý') ? 1 : 2,
      };

      if (editingEmployee) {
        await adminApi.updateStaff(editingEmployee.username, payload);
        Alert.alert('Thành công', 'Cập nhật nhân viên thành công!');
      } else {
        await adminApi.createStaff(payload);
        Alert.alert('Thành công', 'Tạo tài khoản nhân viên mới thành công!');
      }
      setShowFormModal(false);
      setSelectedEmployee(null);
      await fetchEmployees();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể lưu nhân viên.');
    } finally {
      setSaving(false);
    }
  };

  const performDelete = async (username: string) => {
    try {
      setLoading(true);
      await adminApi.deleteEmployee(username);
      Alert.alert('Thành công', `Đã xóa tài khoản nhân viên ${username}`);
      setSelectedEmployee(null);
      await fetchEmployees();
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể xóa nhân viên này.');
      setLoading(false);
    }
  };

  const handleDeleteStaff = (item: any) => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa/sa thải nhân viên ${item.name} (${item.id})?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa nhân viên', style: 'destructive', onPress: () => performDelete(item.id) }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return '#10b981';
      case 'On Leave': return '#f59e0b';
      case 'Inactive': return '#ef4444';
      default: return colors.text;
    }
  };

  const renderEmployee = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.employeeCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}
      onPress={() => setSelectedEmployee(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.nameRoleContainer}>
          <ThemedText style={styles.employeeName}>{item.name}</ThemedText>
          <View style={styles.roleContainer}>
            <Ionicons name="person-outline" size={14} color={colors.icon} style={styles.roleIcon} />
            <ThemedText style={styles.roleText}>{item.role}</ThemedText>
          </View>
        </View>
        <TouchableOpacity style={styles.moreButton} onPress={() => handleDeleteStaff(item)}>
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <View style={[styles.cardFooter, { borderTopColor: colors.icon + '20' }]}>
        <View style={styles.shiftContainer}>
          <Ionicons name="time-outline" size={16} color={colors.tint} style={styles.shiftIcon} />
          <ThemedText style={styles.shiftText}>Ca: {item.shift}</ThemedText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
          <ThemedText style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status === 'Active' ? 'Đang làm' : 'Nghỉ làm'}
          </ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      {/* FORM MODAL WITH OCR */}
      <Modal visible={showFormModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.icon + '20' }]}>
              <ThemedText style={styles.modalTitle}>
                {editingEmployee ? 'Chỉnh sửa thông tin nhân viên' : 'Thêm nhân viên mới'}
              </ThemedText>
              <TouchableOpacity onPress={() => setShowFormModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* OCR CCCD BUTTON */}
              <TouchableOpacity
                style={[styles.ocrBtn, { borderColor: colors.tint }]}
                onPress={handleScanCccdOcr}
                disabled={scanningOcr}
              >
                {scanningOcr ? (
                  <ActivityIndicator color={colors.tint} />
                ) : (
                  <>
                    <Ionicons name="scan-outline" size={20} color={colors.tint} />
                    <ThemedText style={[styles.ocrBtnText, { color: colors.tint }]}>Quét OCR từ ảnh CCCD</ThemedText>
                  </>
                )}
              </TouchableOpacity>

              <ThemedText style={styles.fieldLabel}>Tài khoản đăng nhập (Username) *</ThemedText>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.icon + '40', backgroundColor: colors.icon + '10' }]}
                value={form.USERNAME}
                onChangeText={v => setForm(f => ({ ...f, USERNAME: v }))}
                placeholder="VD: nv_an, nv_hoa..."
                placeholderTextColor={colors.icon}
                editable={!editingEmployee}
              />

              {!editingEmployee && (
                <>
                  <ThemedText style={styles.fieldLabel}>Mật khẩu *</ThemedText>
                  <TextInput
                    style={[styles.textInput, { color: colors.text, borderColor: colors.icon + '40', backgroundColor: colors.icon + '10' }]}
                    value={form.PASSWORD}
                    onChangeText={v => setForm(f => ({ ...f, PASSWORD: v }))}
                    secureTextEntry
                    placeholder="Mật khẩu..."
                    placeholderTextColor={colors.icon}
                  />
                </>
              )}

              <ThemedText style={styles.fieldLabel}>Họ và tên *</ThemedText>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.icon + '40', backgroundColor: colors.icon + '10' }]}
                value={form.HOTEN}
                onChangeText={v => setForm(f => ({ ...f, HOTEN: v }))}
                placeholder="Nguyễn Văn A"
                placeholderTextColor={colors.icon}
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.fieldLabel}>Số điện thoại</ThemedText>
                  <TextInput
                    style={[styles.textInput, { color: colors.text, borderColor: colors.icon + '40', backgroundColor: colors.icon + '10' }]}
                    value={form.SDT}
                    onChangeText={v => setForm(f => ({ ...f, SDT: v }))}
                    keyboardType="phone-pad"
                    placeholder="090..."
                    placeholderTextColor={colors.icon}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.fieldLabel}>Số CCCD</ThemedText>
                  <TextInput
                    style={[styles.textInput, { color: colors.text, borderColor: colors.icon + '40', backgroundColor: colors.icon + '10' }]}
                    value={form.CCCD}
                    onChangeText={v => setForm(f => ({ ...f, CCCD: v }))}
                    keyboardType="numeric"
                    placeholder="079..."
                    placeholderTextColor={colors.icon}
                  />
                </View>
              </View>

              <ThemedText style={styles.fieldLabel}>Email liên hệ</ThemedText>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.icon + '40', backgroundColor: colors.icon + '10' }]}
                value={form.EMAIL}
                onChangeText={v => setForm(f => ({ ...f, EMAIL: v }))}
                keyboardType="email-address"
                placeholder="email@example.com"
                placeholderTextColor={colors.icon}
              />

              <ThemedText style={styles.fieldLabel}>Chi nhánh làm việc (Nơi làm việc) *</ThemedText>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { id: '1', name: 'Chi nhánh 1 (Q.1)' },
                  { id: '2', name: 'Chi nhánh 2 (Q.3)' },
                  { id: '3', name: 'Chi nhánh 3 (Thủ Đức)' },
                ].map(st => (
                  <TouchableOpacity
                    key={st.id}
                    style={[
                      styles.catChip,
                      { borderColor: colors.icon + '40' },
                      String(form.MACUAHANG) === st.id && { backgroundColor: colors.tint, borderColor: colors.tint }
                    ]}
                    onPress={() => setForm(f => ({ ...f, MACUAHANG: st.id }))}
                  >
                    <ThemedText style={[{ fontSize: 12, fontWeight: '600' }, String(form.MACUAHANG) === st.id && { color: '#fff' }]}>
                      {st.name}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <ThemedText style={styles.fieldLabel}>Chức vụ</ThemedText>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {['Nhân viên bán hàng', 'Thợ làm bánh', 'Quản lý cửa hàng', 'Giao hàng'].map(cv => (
                  <TouchableOpacity
                    key={cv}
                    style={[
                      styles.catChip,
                      { borderColor: colors.icon + '40' },
                      form.CHUCVU === cv && { backgroundColor: colors.tint, borderColor: colors.tint }
                    ]}
                    onPress={() => setForm(f => ({ ...f, CHUCVU: cv }))}
                  >
                    <ThemedText style={[{ fontSize: 12, fontWeight: '600' }, form.CHUCVU === cv && { color: '#fff' }]}>
                      {cv}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <ThemedText style={styles.fieldLabel}>Phân ca làm việc</ThemedText>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {[
                  'Sáng (08:00 - 15:00)',
                  'Chiều (15:00 - 22:00)',
                  'Tối (18:00 - 23:00)',
                  'Cả ngày (Fulltime)',
                ].map(ca => (
                  <TouchableOpacity
                    key={ca}
                    style={[
                      styles.catChip,
                      { borderColor: colors.icon + '40' },
                      form.CALAMVIEC === ca && { backgroundColor: colors.tint, borderColor: colors.tint }
                    ]}
                    onPress={() => setForm(f => ({ ...f, CALAMVIEC: ca }))}
                  >
                    <ThemedText style={[{ fontSize: 12, fontWeight: '600' }, form.CALAMVIEC === ca && { color: '#fff' }]}>
                      {ca}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <ThemedText style={styles.fieldLabel}>Mức lương (₫/Tháng)</ThemedText>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.icon + '40', backgroundColor: colors.icon + '10' }]}
                value={form.LUONG}
                onChangeText={v => setForm(f => ({ ...f, LUONG: v }))}
                keyboardType="numeric"
                placeholder="7000000"
                placeholderTextColor={colors.icon}
              />

              <ThemedText style={styles.fieldLabel}>Địa chỉ thường trú</ThemedText>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.icon + '40', backgroundColor: colors.icon + '10' }]}
                value={form.DIACHI}
                onChangeText={v => setForm(f => ({ ...f, DIACHI: v }))}
                placeholder="123 Đường ABC..."
                placeholderTextColor={colors.icon}
              />

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.tint }, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : (
                  <ThemedText style={styles.saveBtnText}>
                    {editingEmployee ? 'Lưu thay đổi' : 'Tạo nhân viên'}
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
        <ThemedText style={styles.headerTitle}>Nhân viên chi nhánh</ThemedText>
        <TouchableOpacity style={styles.backButton} onPress={fetchEmployees}>
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={[styles.headerActions, { borderBottomColor: colors.icon + '20' }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.icon + '15' }]}>
          <Ionicons name="search" size={20} color={colors.icon} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Tìm nhân viên..."
            placeholderTextColor={colors.icon}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.tint }]} onPress={handleOpenAdd}>
          <Ionicons name="person-add-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          data={employees.filter(e =>
            e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.role.toLowerCase().includes(searchQuery.toLowerCase())
          )}
          keyExtractor={item => String(item.id)}
          renderItem={renderEmployee}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* DETAIL MODAL */}
      {selectedEmployee && (
        <Modal
          visible={!!selectedEmployee}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedEmployee(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.icon + '20' }]}>
                <ThemedText style={styles.modalTitle}>Thông tin nhân sự</ThemedText>
                <TouchableOpacity onPress={() => setSelectedEmployee(null)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.avatarLargeContainer}>
                  <View style={[styles.avatarLarge, { backgroundColor: colors.tint + '15' }]}>
                    <ThemedText style={[styles.avatarLargeText, { color: colors.tint }]}>
                      {selectedEmployee.name.charAt(0)}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.modalName}>{selectedEmployee.name}</ThemedText>
                  <ThemedText style={styles.modalSubtitle}>@{selectedEmployee.id}</ThemedText>
                </View>

                <View style={[styles.detailRow, { borderBottomColor: colors.icon + '10' }]}>
                  <Ionicons name="briefcase-outline" size={20} color={colors.tint} style={styles.detailIcon} />
                  <View style={styles.detailTextCol}>
                    <ThemedText style={styles.detailLabel}>Chức vụ</ThemedText>
                    <ThemedText style={styles.detailValue}>{selectedEmployee.role}</ThemedText>
                  </View>
                </View>

                <View style={[styles.detailRow, { borderBottomColor: colors.icon + '10' }]}>
                  <Ionicons name="time-outline" size={20} color={colors.tint} style={styles.detailIcon} />
                  <View style={styles.detailTextCol}>
                    <ThemedText style={styles.detailLabel}>Ca làm việc</ThemedText>
                    <ThemedText style={styles.detailValue}>{selectedEmployee.shift}</ThemedText>
                  </View>
                </View>

                <View style={[styles.detailRow, { borderBottomColor: colors.icon + '10' }]}>
                  <Ionicons name="cash-outline" size={20} color={colors.tint} style={styles.detailIcon} />
                  <View style={styles.detailTextCol}>
                    <ThemedText style={styles.detailLabel}>Lương cơ bản</ThemedText>
                    <ThemedText style={styles.detailValue}>
                      {selectedEmployee.salary.toLocaleString('vi-VN')}₫
                    </ThemedText>
                  </View>
                </View>

                <View style={[styles.detailRow, { borderBottomColor: colors.icon + '10' }]}>
                  <Ionicons name="mail-outline" size={20} color={colors.tint} style={styles.detailIcon} />
                  <View style={styles.detailTextCol}>
                    <ThemedText style={styles.detailLabel}>Email liên hệ</ThemedText>
                    <ThemedText style={styles.detailValue}>{selectedEmployee.email}</ThemedText>
                  </View>
                </View>

                <View style={[styles.detailRow, { borderBottomColor: colors.icon + '10' }]}>
                  <Ionicons name="call-outline" size={20} color={colors.tint} style={styles.detailIcon} />
                  <View style={styles.detailTextCol}>
                    <ThemedText style={styles.detailLabel}>Số điện thoại</ThemedText>
                    <ThemedText style={styles.detailValue}>{selectedEmployee.phone}</ThemedText>
                  </View>
                </View>

                <View style={[styles.detailRow, { borderBottomColor: colors.icon + '10' }]}>
                  <Ionicons name="card-outline" size={20} color={colors.tint} style={styles.detailIcon} />
                  <View style={styles.detailTextCol}>
                    <ThemedText style={styles.detailLabel}>Số CCCD</ThemedText>
                    <ThemedText style={styles.detailValue}>{selectedEmployee.cccd}</ThemedText>
                  </View>
                </View>

                <View style={[styles.detailRow, { borderBottomColor: colors.icon + '10' }]}>
                  <Ionicons name="location-outline" size={20} color={colors.tint} style={styles.detailIcon} />
                  <View style={styles.detailTextCol}>
                    <ThemedText style={styles.detailLabel}>Địa chỉ liên hệ</ThemedText>
                    <ThemedText style={styles.detailValue}>{selectedEmployee.address}</ThemedText>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.tint, flex: 1 }]}
                    onPress={() => { const emp = selectedEmployee; setSelectedEmployee(null); handleOpenEdit(emp); }}
                  >
                    <Ionicons name="create-outline" size={18} color="#fff" />
                    <ThemedText style={styles.actionBtnText}>Sửa thông tin</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#ef4444', flex: 1 }]}
                    onPress={() => handleDeleteStaff(selectedEmployee)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#fff" />
                    <ThemedText style={styles.actionBtnText}>Xóa nhân viên</ThemedText>
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
  addButton: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16 },
  employeeCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  nameRoleContainer: { flex: 1 },
  employeeName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  roleContainer: { flexDirection: 'row', alignItems: 'center' },
  roleIcon: { marginRight: 6 },
  roleText: { fontSize: 14, opacity: 0.7 },
  moreButton: { padding: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1 },
  shiftContainer: { flexDirection: 'row', alignItems: 'center' },
  shiftIcon: { marginRight: 6 },
  shiftText: { fontSize: 12, opacity: 0.8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
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
  // Form & OCR
  ocrBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, paddingVertical: 12, borderRadius: 10, marginBottom: 10 },
  ocrBtnText: { fontSize: 14, fontWeight: 'bold' },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12, opacity: 0.8 },
  textInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  catChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, marginBottom: 4 },
  saveBtn: { marginTop: 24, marginBottom: 30, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
