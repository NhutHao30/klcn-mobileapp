import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { adminApi } from '@/services/api/adminApi';

interface SystemFeature {
  feature_code: string;
  feature_name: string;
  is_locked: boolean;
  lock_reason?: string;
  icon?: string;
}

const DEFAULT_FEATURES: SystemFeature[] = [
  { feature_code: 'POS', feature_name: 'Bán hàng tại quầy (POS)', is_locked: false, icon: 'calculator-outline' },
  { feature_code: 'ONLINE_ORDER', feature_name: 'Đặt hàng & Mua sắm Online', is_locked: false, icon: 'cart-outline' },
  { feature_code: 'INVENTORY_TRANSFER', feature_name: 'Điều chuyển kho & Nhập xuất', is_locked: false, icon: 'swap-horizontal-outline' },
  { feature_code: 'PROMOTION', feature_name: 'Khuyến mãi & Áp dụng Voucher', is_locked: false, icon: 'ticket-outline' },
  { feature_code: 'STAFF_MGMT', feature_name: 'Quản lý nhân viên & Phân quyền', is_locked: false, icon: 'people-outline' },
  { feature_code: 'STORE_MGMT', feature_name: 'Quản lý chi nhánh cửa hàng', is_locked: false, icon: 'storefront-outline' },
  { feature_code: 'PRODUCT_CATALOG', feature_name: 'Danh mục & Sản phẩm bánh', is_locked: false, icon: 'cube-outline' },
];

export default function AdminFeatureLockScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [features, setFeatures] = useState<SystemFeature[]>(DEFAULT_FEATURES);

  // Modal Reason
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<SystemFeature | null>(null);
  const [reason, setReason] = useState('Nâng cấp và bảo trì hệ thống định kỳ');
  const [updating, setUpdating] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getSystemFeatures();
      const list = res?.data || res || [];
      if (Array.isArray(list) && list.length > 0) {
        // Merge with icons
        const merged = DEFAULT_FEATURES.map((df) => {
          const match = list.find((x: any) => x.feature_code === df.feature_code);
          return match
            ? { ...df, is_locked: Boolean(match.is_locked), lock_reason: match.lock_reason }
            : df;
        });
        setFeatures(merged);
      }
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

  const handleToggle = (f: SystemFeature) => {
    if (!f.is_locked) {
      // Locking requires entering a reason
      setSelectedFeature(f);
      setModalOpen(true);
    } else {
      // Unlocking immediately
      confirmToggle(f, false, '');
    }
  };

  const confirmToggle = async (f: SystemFeature, targetState: boolean, lockReason: string) => {
    try {
      setUpdating(true);
      await adminApi.toggleSystemFeature({
        feature_code: f.feature_code,
        is_locked: targetState,
        reason: lockReason,
      });

      setFeatures((prev) =>
        prev.map((x) =>
          x.feature_code === f.feature_code
            ? { ...x, is_locked: targetState, lock_reason: lockReason }
            : x
        )
      );

      Alert.alert(
        'Thành công',
        targetState
          ? `Đã khóa bảo trì chức năng ${f.feature_name}!`
          : `Đã mở lại chức năng ${f.feature_name} bình thường!`
      );
      setModalOpen(false);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể cập nhật trạng thái bảo trì.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Khóa Bảo Trì Hệ Thống</ThemedText>
          <View style={{ width: 40 }} />
        </View>

        <ThemedText style={styles.headerDesc}>
          Cho phép Ban Quản Trị tạm khóa các phân hệ chức năng trên toàn bộ Website & App Mobile khi đang nâng cấp dữ liệu.
        </ThemedText>
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
        ) : (
          features.map((f) => (
            <View
              key={f.feature_code}
              style={[
                styles.featureCard,
                { backgroundColor: colors.cardBg, borderColor: f.is_locked ? '#f87171' : colors.cardBorder },
              ]}
            >
              <View style={styles.leftRow}>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: f.is_locked ? '#fee2e2' : colors.tint + '15' },
                  ]}
                >
                  <Ionicons
                    name={(f.icon || 'settings-outline') as any}
                    size={22}
                    color={f.is_locked ? '#dc2626' : colors.tint}
                  />
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <ThemedText style={styles.featureName}>{f.feature_name}</ThemedText>
                  <ThemedText
                    style={[
                      styles.statusText,
                      { color: f.is_locked ? '#dc2626' : '#10b981' },
                    ]}
                  >
                    {f.is_locked ? '🔒 Đang tạm khóa bảo trì' : '✅ Đang hoạt động bình thường'}
                  </ThemedText>
                  {f.is_locked && f.lock_reason && (
                    <ThemedText style={styles.reasonText}>Lý do: {f.lock_reason}</ThemedText>
                  )}
                </View>
              </View>

              <Switch
                value={f.is_locked}
                onValueChange={() => handleToggle(f)}
                trackColor={{ false: '#cbd5e1', true: '#f87171' }}
                thumbColor={f.is_locked ? '#dc2626' : '#fff'}
              />
            </View>
          ))
        )}
        <View style={{ height: 60 }} />
      </ScrollView>

      {/* LOCK REASON MODAL */}
      <Modal visible={modalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.background }]}>
            <ThemedText style={styles.modalTitle}>Khóa Bảo Trì Chức Năng</ThemedText>
            <ThemedText style={{ fontSize: 13, opacity: 0.7, marginBottom: 12 }}>
              Bạn đang khóa "{selectedFeature?.feature_name}". Vui lòng nhập lý do hiển thị cho người dùng:
            </ThemedText>

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.icon + '30', height: 70 }]}
              multiline
              value={reason}
              onChangeText={setReason}
              placeholder="VD: Nâng cấp định kỳ..."
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#94a3b8' }]}
                onPress={() => setModalOpen(false)}
              >
                <ThemedText style={styles.modalBtnText}>Hủy</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#dc2626' }]}
                onPress={() => selectedFeature && confirmToggle(selectedFeature, true, reason)}
                disabled={updating}
              >
                {updating ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.modalBtnText}>Xác nhận Khóa</ThemedText>}
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerDesc: { color: 'rgba(255,255,255,0.85)', fontSize: 12, lineHeight: 18 },
  featureCard: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  leftRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  featureName: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  statusText: { fontSize: 12, fontWeight: '600' },
  reasonText: { fontSize: 11, opacity: 0.7, marginTop: 2, fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalBox: { borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 16 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
