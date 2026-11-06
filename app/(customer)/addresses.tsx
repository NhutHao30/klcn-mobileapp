import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { addressApi, CustomerAddress, GhnProvince, GhnWard } from '@/services/api/addressApi';
import { useAuth } from '@/context/AuthContext';

export default function CustomerAddressesPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();

  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 2-Level Administrative Units (Province -> Ward, NO District)
  const [provinces, setProvinces] = useState<GhnProvince[]>([]);
  const [wards, setWards] = useState<GhnWard[]>([]);
  const [loadingWards, setLoadingWards] = useState(false);

  const [selectedProvince, setSelectedProvince] = useState<GhnProvince | null>(null);
  const [selectedWard, setSelectedWard] = useState<GhnWard | null>(null);

  // Picker Modal State (Province or Ward with search filter)
  const [pickerType, setPickerType] = useState<'province' | 'ward' | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');

  const defaultAddressId = useMemo(() => {
    const found = addresses.find((a) => a.isDefault === true || Number(a.isDefault) === 1);
    return found ? found.id : null;
  }, [addresses]);

  const loadAddresses = async () => {
    try {
      const data = await addressApi.getAddresses();
      setAddresses(data);
    } catch (e) {
      console.error('Lỗi tải danh sách địa chỉ:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAddresses();
    addressApi.getProvinces().then((list) => {
      if (Array.isArray(list)) setProvinces(list);
    });
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAddresses();
  }, []);

  const fetchWardsForProvince = async (provinceId: number, preselectWardCode?: string | null) => {
    setLoadingWards(true);
    try {
      const wardList = await addressApi.getWardsByProvince(provinceId);
      setWards(wardList);
      if (preselectWardCode) {
        const matched = wardList.find((w) => String(w.WardCode) === String(preselectWardCode));
        if (matched) setSelectedWard(matched);
      }
    } finally {
      setLoadingWards(false);
    }
  };

  const handleSelectProvince = (prov: GhnProvince) => {
    setSelectedProvince(prov);
    setSelectedWard(null);
    setWards([]);
    setPickerType(null);
    setPickerSearch('');
    fetchWardsForProvince(prov.ProvinceID);
  };

  const handleSelectWard = (ward: GhnWard) => {
    setSelectedWard(ward);
    setPickerType(null);
    setPickerSearch('');
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setName(user?.HOTEN || '');
    setPhone(user?.SDT || '');
    setStreetAddress('');
    setSelectedProvince(null);
    setSelectedWard(null);
    setWards([]);
    setIsDefault(addresses.length === 0);
    setModalVisible(true);
  };

  const handleOpenEdit = (addr: CustomerAddress) => {
    setEditingId(addr.id);
    setName(addr.hoTenNguoiNhan);
    setPhone(addr.soDienThoai);
    setStreetAddress(addr.diaChiChiTiet);
    setIsDefault(addr.id === defaultAddressId);

    if (addr.maTinh && provinces.length > 0) {
      const prov = provinces.find((p) => Number(p.ProvinceID) === Number(addr.maTinh)) || null;
      setSelectedProvince(prov);
      if (prov) {
        fetchWardsForProvince(prov.ProvinceID, addr.maXa);
      }
    } else {
      setSelectedProvince(null);
      setSelectedWard(null);
      setWards([]);
    }

    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !phone.trim() || !streetAddress.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ Họ tên, Số điện thoại và Địa chỉ số nhà/tên đường!');
      return;
    }

    let finalFullAddress = streetAddress.trim();
    if (selectedWard && !finalFullAddress.toLowerCase().includes(selectedWard.WardName.toLowerCase())) {
      finalFullAddress += `, ${selectedWard.WardName}`;
    }
    if (selectedProvince && !finalFullAddress.toLowerCase().includes(selectedProvince.ProvinceName.toLowerCase())) {
      finalFullAddress += `, ${selectedProvince.ProvinceName}`;
    }

    const payload = {
      hoTenNguoiNhan: name.trim(),
      soDienThoai: phone.trim(),
      diaChiChiTiet: finalFullAddress,
      maTinh: selectedProvince ? Number(selectedProvince.ProvinceID) : undefined,
      maHuyen: selectedWard ? Number(selectedWard.DistrictID) : undefined,
      maXa: selectedWard ? String(selectedWard.WardCode) : undefined,
      isDefault,
    };

    setIsSaving(true);
    try {
      if (editingId) {
        await addressApi.updateAddress(editingId, payload);
        Alert.alert('Thành công', 'Đã cập nhật địa chỉ!');
      } else {
        await addressApi.addAddress(payload);
        Alert.alert('Thành công', 'Đã thêm địa chỉ mới vào sổ địa chỉ!');
      }
      setModalVisible(false);
      loadAddresses();
    } catch (e: any) {
      Alert.alert('Lỗi', e.response?.data?.error || 'Không thể lưu địa chỉ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await addressApi.setDefaultAddress(id);
      Alert.alert('Thành công', 'Đã đặt làm địa chỉ mặc định!');
      loadAddresses();
    } catch (e: any) {
      Alert.alert('Lỗi', e.response?.data?.error || 'Không thể đặt mặc định');
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      'Xóa địa chỉ',
      'Bạn có chắc chắn muốn xóa địa chỉ này khỏi sổ địa chỉ của mình?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await addressApi.deleteAddress(id);
              Alert.alert('Thành công', 'Đã xóa địa chỉ!');
              loadAddresses();
            } catch (e: any) {
              Alert.alert('Lỗi', e.response?.data?.error || 'Không thể xóa địa chỉ');
            }
          },
        },
      ]
    );
  };

  const filteredProvinces = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    const cleanList = provinces.filter((p) => {
      const id = Number(p.ProvinceID);
      const name = String(p.ProvinceName || '').toLowerCase();
      if (id === 298 || id === 2002) return false;
      if (name.includes('test') || name.includes('alert') || name.includes('hà nội 02')) return false;
      return true;
    });
    if (!q) return cleanList;
    return cleanList.filter((p) => p.ProvinceName.toLowerCase().includes(q));
  }, [provinces, pickerSearch]);

  const filteredWards = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return wards;
    return wards.filter(
      (w) =>
        w.WardName.toLowerCase().includes(q) ||
        (w.DistrictName && w.DistrictName.toLowerCase().includes(q))
    );
  }, [wards, pickerSearch]);

  const renderAddressCard = ({ item }: { item: CustomerAddress }) => {
    const isDef = item.id === defaultAddressId;
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.cardBg,
            borderColor: isDef ? colors.tint : colors.cardBorder,
            borderWidth: isDef ? 2 : 1,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <ThemedText style={styles.personName}>{item.hoTenNguoiNhan}</ThemedText>
              {isDef && (
                <View style={styles.defaultBadge}>
                  <ThemedText style={styles.defaultText}>Mặc định</ThemedText>
                </View>
              )}
            </View>
            <ThemedText style={styles.phoneText}>SĐT: {item.soDienThoai}</ThemedText>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.smallBtn, { backgroundColor: colors.tint + '15' }]}
              onPress={() => handleOpenEdit(item)}
            >
              <Ionicons name="create-outline" size={16} color={colors.tint} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.smallBtn, { backgroundColor: '#ef444415' }]}
              onPress={() => handleDelete(item.id)}
            >
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

        <ThemedText style={styles.addressText}>{item.diaChiChiTiet}</ThemedText>

        {!isDef && (
          <TouchableOpacity
            style={[styles.setDefaultBtn, { borderColor: colors.cardBorder }]}
            onPress={() => handleSetDefault(item.id)}
          >
            <Ionicons name="checkmark-circle-outline" size={16} color={colors.text} style={{ opacity: 0.7 }} />
            <ThemedText style={styles.setDefaultText}>Thiết lập làm địa chỉ mặc định</ThemedText>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Sổ địa chỉ nhận hàng</ThemedText>
        <TouchableOpacity style={styles.addHeaderBtn} onPress={handleOpenAdd}>
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.tint} />
          <ThemedText style={{ marginTop: 12, opacity: 0.7 }}>Đang tải sổ địa chỉ...</ThemedText>
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item: any, idx: number) => `addr-${item?.id ?? item?.MADC ?? idx}-${idx}`}
          renderItem={renderAddressCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.tint]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="location-outline" size={64} color={colors.text} style={{ opacity: 0.25 }} />
              <ThemedText style={styles.emptyTitle}>Chưa có địa chỉ nào được lưu</ThemedText>
              <ThemedText style={styles.emptySubtitle}>
                Thêm địa chỉ giao hàng để không phải nhập lại mỗi khi đặt bánh nhé!
              </ThemedText>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.tint }]}
                onPress={handleOpenAdd}
              >
                <Ionicons name="add-circle-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
                <ThemedText style={styles.primaryBtnText}>Thêm địa chỉ ngay</ThemedText>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* MODAL THÊM / SỬA ĐỊA CHỈ (2 CẤP: TỈNH/TP -> PHƯỜNG/XÃ, KHÔNG QUẬN/HUYỆN) */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                {editingId ? 'Chỉnh sửa địa chỉ' : 'Thêm địa chỉ mới'}
              </ThemedText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              <ThemedText style={styles.inputLabel}>Họ và tên người nhận *</ThemedText>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.cardBorder }]}
                placeholder="VD: Trương Văn Khách"
                placeholderTextColor={colors.icon}
                value={name}
                onChangeText={setName}
              />

              <ThemedText style={styles.inputLabel}>Số điện thoại *</ThemedText>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.cardBorder }]}
                placeholder="VD: 0903685241"
                placeholderTextColor={colors.icon}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />

              <ThemedText style={styles.inputLabel}>Tỉnh / Thành phố</ThemedText>
              <TouchableOpacity
                style={[styles.selectorBtn, { borderColor: colors.cardBorder }]}
                onPress={() => {
                  setPickerSearch('');
                  setPickerType('province');
                }}
              >
                <ThemedText
                  style={{
                    color: selectedProvince ? colors.text : colors.icon,
                    fontSize: 14,
                    flex: 1,
                  }}
                >
                  {selectedProvince ? selectedProvince.ProvinceName : 'Chọn Tỉnh / Thành phố'}
                </ThemedText>
                <Ionicons name="chevron-down" size={18} color={colors.icon} />
              </TouchableOpacity>

              <ThemedText style={styles.inputLabel}>Phường / Xã (Địa giới hành chính mới)</ThemedText>
              <TouchableOpacity
                style={[
                  styles.selectorBtn,
                  {
                    borderColor: colors.cardBorder,
                    opacity: selectedProvince ? 1 : 0.6,
                  },
                ]}
                disabled={!selectedProvince || loadingWards}
                onPress={() => {
                  setPickerSearch('');
                  setPickerType('ward');
                }}
              >
                {loadingWards ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <ActivityIndicator size="small" color={colors.tint} />
                    <ThemedText style={{ fontSize: 13, opacity: 0.7 }}>Đang tải danh sách Phường/Xã...</ThemedText>
                  </View>
                ) : (
                  <ThemedText
                    style={{
                      color: selectedWard ? colors.text : colors.icon,
                      fontSize: 14,
                      flex: 1,
                    }}
                  >
                    {selectedWard
                      ? ((selectedWard as any).FullName || `${selectedWard.WardName}${(selectedWard as any).DistrictName ? ` (${(selectedWard as any).DistrictName})` : ''}`)
                      : selectedProvince
                      ? 'Chọn Phường / Xã'
                      : 'Vui lòng chọn Tỉnh/Thành phố trước'}
                  </ThemedText>
                )}
                <Ionicons name="chevron-down" size={18} color={colors.icon} />
              </TouchableOpacity>

              <ThemedText style={styles.inputLabel}>Số nhà, tên đường / Địa chỉ chi tiết *</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.cardBorder, minHeight: 68, textAlignVertical: 'top' },
                ]}
                placeholder="VD: 140 Lê Trọng Tấn"
                placeholderTextColor={colors.icon}
                value={streetAddress}
                onChangeText={setStreetAddress}
                multiline
              />

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setIsDefault(!isDefault)}
              >
                <Ionicons
                  name={isDefault ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={isDefault ? colors.tint : colors.icon}
                />
                <ThemedText style={styles.checkboxText}>Đặt làm địa chỉ nhận hàng mặc định</ThemedText>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelModalBtn, { borderColor: colors.cardBorder }]}
                onPress={() => setModalVisible(false)}
              >
                <ThemedText style={styles.cancelModalText}>Hủy</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitModalBtn, { backgroundColor: colors.tint }]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={styles.submitModalText}>Lưu địa chỉ</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL CHỌN TỈNH/THÀNH HOẶC PHƯỜNG/XÃ */}
      <Modal visible={pickerType !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg, maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                {pickerType === 'province' ? 'Chọn Tỉnh / Thành phố' : 'Chọn Phường / Xã'}
              </ThemedText>
              <TouchableOpacity onPress={() => setPickerType(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBox, { borderColor: colors.cardBorder }]}>
              <Ionicons name="search-outline" size={18} color={colors.icon} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={pickerType === 'province' ? 'Tìm Tỉnh/Thành phố...' : 'Tìm Phường/Xã...'}
                placeholderTextColor={colors.icon}
                value={pickerSearch}
                onChangeText={setPickerSearch}
              />
            </View>

            <FlatList
              data={(pickerType === 'province' ? filteredProvinces : filteredWards) as any[]}
              keyExtractor={(item, idx) =>
                pickerType === 'province' ? String(item.ProvinceID) : `${item.WardCode}-${idx}`
              }
              style={{ maxHeight: 340 }}
              renderItem={({ item }) => {
                const isProv = pickerType === 'province';
                const label = isProv
                  ? item.ProvinceName
                  : (item.FullName || `${item.WardName}${item.DistrictName ? ` (${item.DistrictName})` : ''}`);
                const isSelected = isProv
                  ? selectedProvince?.ProvinceID === item.ProvinceID
                  : selectedWard?.WardCode === item.WardCode;
                return (
                  <TouchableOpacity
                    style={[
                      styles.pickerOption,
                      { borderBottomColor: colors.cardBorder },
                      isSelected && { backgroundColor: colors.tint + '15' },
                    ]}
                    onPress={() => (isProv ? handleSelectProvince(item) : handleSelectWard(item))}
                  >
                    <ThemedText style={{ fontWeight: isSelected ? 'bold' : '500', flex: 1 }}>
                      {label}
                    </ThemedText>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color={colors.tint} />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <ThemedText style={{ textAlign: 'center', paddingVertical: 20, opacity: 0.6 }}>
                  Không tìm thấy kết quả phù hợp
                </ThemedText>
              }
            />
          </View>
        </View>
      </Modal>
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
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addHeaderBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  personName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  defaultBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultText: {
    color: '#15803d',
    fontSize: 11,
    fontWeight: 'bold',
  },
  phoneText: {
    fontSize: 13,
    opacity: 0.65,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  smallBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  addressText: {
    fontSize: 13,
    opacity: 0.85,
    lineHeight: 18,
  },
  setDefaultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  setDefaultText: {
    fontSize: 12,
    opacity: 0.7,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBox: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 6,
    textAlign: 'center',
    marginBottom: 20,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    marginBottom: 6,
  },
  checkboxText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  cancelModalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelModalText: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitModalBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  submitModalText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 10,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
  },
});
