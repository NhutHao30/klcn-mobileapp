import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { adminApi } from '@/services/api/adminApi';

export default function AdminCategoriesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  // Modal Create / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editCat, setEditCat] = useState<any>(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getCategories();
      const list = Array.isArray(res) ? res : (res?.data || []);
      setCategories(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditCat(null);
    setName('');
    setDesc('');
    setModalOpen(true);
  };

  const openEditModal = (cat: any) => {
    setEditCat(cat);
    setName(cat.TENLOAI || cat.name || '');
    setDesc(cat.MO_TA || cat.description || '');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên loại bánh!');
      return;
    }

    try {
      setSaving(true);
      if (editCat) {
        const id = editCat.MALOAI || editCat.id;
        await adminApi.updateCategory(id, { TENLOAI: name, MO_TA: desc });
        Alert.alert('Thành công', 'Đã cập nhật danh mục!');
      } else {
        await adminApi.createCategory({ TENLOAI: name, MO_TA: desc });
        Alert.alert('Thành công', 'Đã thêm loại bánh mới!');
      }
      setModalOpen(false);
      loadData();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể lưu danh mục.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (cat: any) => {
    const id = cat.MALOAI || cat.id;
    Alert.alert('Xác nhận xóa', `Bạn có chắc muốn xóa loại bánh "${cat.TENLOAI || cat.name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminApi.deleteCategory(id);
            Alert.alert('Thành công', 'Đã xóa loại bánh!');
            loadData();
          } catch (e: any) {
            Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể xóa loại bánh này.');
          }
        },
      },
    ]);
  };

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Danh Mục Loại Bánh</ThemedText>
          <TouchableOpacity style={styles.backButton} onPress={openCreateModal}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} colors={[colors.tint]} />}
        contentContainerStyle={{ padding: 16 }}
      >
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        ) : categories.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Ionicons name="shapes-outline" size={56} color={colors.cardTextSecondary} />
            <ThemedText style={{ marginTop: 12, fontSize: 16, fontWeight: 'bold' }}>Chưa có danh mục nào</ThemedText>
          </View>
        ) : (
          categories.map((c, idx) => (
            <View
              key={String(c.MALOAI || c.id || idx)}
              style={[styles.catCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
            >
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.catName}>{c.TENLOAI || c.name}</ThemedText>
                <ThemedText style={[styles.catDesc, { color: colors.cardTextSecondary }]}>
                  {c.MO_TA || c.description || 'Chưa có mô tả cho loại bánh này.'}
                </ThemedText>
              </View>

              <View style={styles.actionIcons}>
                <TouchableOpacity onPress={() => openEditModal(c)} style={{ padding: 6 }}>
                  <Ionicons name="create-outline" size={20} color={colors.tint} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(c)} style={{ padding: 6 }}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 60 }} />
      </ScrollView>

      {/* CREATE / EDIT MODAL */}
      <Modal visible={modalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.background }]}>
            <ThemedText style={styles.modalTitle}>
              {editCat ? 'Cập Nhật Loại Bánh' : 'Thêm Loại Bánh Mới'}
            </ThemedText>

            <ThemedText style={styles.fieldLabel}>Tên loại bánh:</ThemedText>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.icon + '30' }]}
              placeholder="VD: Bánh Kem Sinh Nhật"
              value={name}
              onChangeText={setName}
            />

            <ThemedText style={styles.fieldLabel}>Mô tả:</ThemedText>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.icon + '30', height: 70 }]}
              multiline
              placeholder="Mô tả hương vị, đặc điểm..."
              value={desc}
              onChangeText={setDesc}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#94a3b8' }]}
                onPress={() => setModalOpen(false)}
              >
                <ThemedText style={styles.modalBtnText}>Hủy</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.tint }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.modalBtnText}>Lưu</ThemedText>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 44,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  catCard: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catName: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  catDesc: { fontSize: 13 },
  actionIcons: { flexDirection: 'row', gap: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalBox: { borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 12 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
