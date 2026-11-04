import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { adminApi } from '@/services/api/adminApi';

const formatVNTime = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  if (typeof dateStr === 'string' && dateStr.includes(' ') && !dateStr.includes('T')) {
    const [datePart, timePart] = dateStr.split(' ');
    const [y, m, d] = datePart.split('-');
    const timePieces = timePart.split(':');
    const h = timePieces[0];
    const min = timePieces[1];
    return `${h}:${min} - ${d}/${m}/${y}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return (
    d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
    ' - ' +
    d.toLocaleDateString('vi-VN')
  );
};

const formatJsonValue = (val: any): string => {
  if (!val) return '';
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return val;
    }
  }
  if (typeof val === 'object') {
    return JSON.stringify(val, null, 2);
  }
  return String(val);
};

export default function AuditScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getAuditLogs();
      const items = Array.isArray(res) ? res : res?.data?.data || res?.data || [];
      const mapped = (Array.isArray(items) ? items : []).map((log: any) => {
        let type = 'info';
        const actionText = log.action || log.HANH_DONG || log.hanh_dong || 'Hành động hệ thống';
        const actionLower = actionText.toLowerCase();

        if (
          actionLower.includes('delete') ||
          actionLower.includes('xóa') ||
          actionLower.includes('vô hiệu') ||
          actionLower.includes('hủy')
        ) {
          type = 'delete';
        } else if (
          actionLower.includes('update') ||
          actionLower.includes('cập nhật') ||
          actionLower.includes('sửa')
        ) {
          type = 'edit';
        } else if (actionLower.includes('login') || actionLower.includes('đăng nhập')) {
          type = 'login';
        } else if (actionLower.includes('logout') || actionLower.includes('đăng xuất')) {
          type = 'logout';
        } else if (
          actionLower.includes('create') ||
          actionLower.includes('add') ||
          actionLower.includes('thêm') ||
          actionLower.includes('tạo') ||
          actionLower.includes('ký')
        ) {
          type = 'add';
        }

        const roleText =
          log.role_name ||
          log.tenVaiTro ||
          (log.MAROLE === 0
            ? 'Admin'
            : log.MAROLE === 1
            ? 'Quản lý chi nhánh'
            : log.MAROLE === 3
            ? 'Khách hàng'
            : 'Nhân viên');

        const description =
          log.description ||
          log.moTa ||
          log.mo_ta ||
          log.MO_TA ||
          log.chi_tiet ||
          '';

        const oldValues = formatJsonValue(
          log.oldValues || log.old_values || log.OLD_VALUES || log.du_lieu_cu
        );
        const newValues = formatJsonValue(
          log.newValues || log.new_values || log.NEW_VALUES || log.du_lieu_moi
        );
        const userAgent =
          log.userAgent || log.user_agent || log.USER_AGENT || 'Givral Mobile / Web Client';
        const ipAddress =
          log.ipAddress || log.IP_ADDRESS || log.ip_address || log.ip || '127.0.0.1';

        return {
          id: String(log.id || log.MADG || Math.random()),
          action: actionText,
          description,
          oldValues,
          newValues,
          userAgent,
          user: log.USERNAME || log.username || log.user?.username || log.user || 'Hệ thống',
          fullName:
            log.HOTEN || log.hoTen || log.user?.HOTEN || log.nguoi_dung?.ho_ten || 'Nhân sự Givral',
          role: roleText,
          storeId: log.MACUAHANG || log.cua_hang_id || 'Toàn hệ thống',
          ip: ipAddress,
          time: formatVNTime(log.created_at || log.NGAY_TAO || log.thoi_gian),
          type: type,
          raw: log,
        };
      });
      setLogs(mapped);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'login':
        return { name: 'log-in-outline', color: '#3b82f6' };
      case 'logout':
        return { name: 'log-out-outline', color: '#64748b' };
      case 'add':
        return { name: 'add-circle-outline', color: '#10b981' };
      case 'edit':
        return { name: 'create-outline', color: '#f59e0b' };
      case 'delete':
        return { name: 'trash-outline', color: '#ef4444' };
      default:
        return { name: 'document-text-outline', color: '#64748b' };
    }
  };

  const renderLogItem = ({ item }: { item: any }) => {
    const iconConfig = getIconForType(item.type);

    return (
      <TouchableOpacity
        style={[
          styles.logCard,
          { backgroundColor: colors.background, borderColor: colors.icon + '20' },
        ]}
        onPress={() => setSelectedLog(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrapper, { backgroundColor: iconConfig.color + '15' }]}>
          <Ionicons name={iconConfig.name as any} size={24} color={iconConfig.color} />
        </View>

        <View style={styles.logInfo}>
          <ThemedText style={styles.logAction} numberOfLines={2}>
            {item.action}
          </ThemedText>
          {item.description ? (
            <ThemedText style={styles.logDescription} numberOfLines={2}>
              {item.description}
            </ThemedText>
          ) : null}
          <View style={styles.logMeta}>
            <ThemedText style={styles.logUser}>
              {item.user} ({item.role})
            </ThemedText>
            <ThemedText style={styles.dotSeparator}>•</ThemedText>
            <ThemedText style={styles.logIp}>IP: {item.ip}</ThemedText>
          </View>
          <ThemedText style={styles.logTime}>{item.time}</ThemedText>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: '#B71C1C' }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <ThemedText style={styles.headerTitle}>Nhật Ký Audit Hệ Thống</ThemedText>
          <ThemedText style={{ color: '#FDE047', fontSize: 11, fontWeight: '600' }}>
            Truy vết thao tác, dữ liệu cũ/mới & Địa chỉ IP
          </ThemedText>
        </View>
        <TouchableOpacity onPress={fetchLogs} style={styles.backButton}>
          <Ionicons name="refresh" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#B71C1C" />
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={renderLogItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* DETAIL MODAL */}
      {selectedLog && (
        <Modal
          visible={!!selectedLog}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedLog(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.icon + '20' }]}>
                <ThemedText style={styles.modalTitle}>Chi tiết nhật ký hệ thống</ThemedText>
                <TouchableOpacity onPress={() => setSelectedLog(null)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={[styles.detailRow, { borderBottomColor: colors.icon + '10' }]}>
                  <Ionicons
                    name="flash-outline"
                    size={20}
                    color="#B71C1C"
                    style={styles.detailIcon}
                  />
                  <View style={styles.detailTextCol}>
                    <ThemedText style={styles.detailLabel}>Hành động</ThemedText>
                    <ThemedText style={[styles.detailValue, { fontWeight: 'bold' }]}>
                      {selectedLog.action}
                    </ThemedText>
                  </View>
                </View>

                {selectedLog.description ? (
                  <View style={[styles.detailRow, { borderBottomColor: colors.icon + '10' }]}>
                    <Ionicons
                      name="document-text-outline"
                      size={20}
                      color="#B71C1C"
                      style={styles.detailIcon}
                    />
                    <View style={styles.detailTextCol}>
                      <ThemedText style={styles.detailLabel}>Mô tả chi tiết (Description)</ThemedText>
                      <ThemedText style={styles.detailValue}>{selectedLog.description}</ThemedText>
                    </View>
                  </View>
                ) : null}

                <View style={[styles.detailRow, { borderBottomColor: colors.icon + '10' }]}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color="#B71C1C"
                    style={styles.detailIcon}
                  />
                  <View style={styles.detailTextCol}>
                    <ThemedText style={styles.detailLabel}>Tài khoản thực hiện</ThemedText>
                    <ThemedText style={styles.detailValue}>
                      {selectedLog.user} ({selectedLog.role}) — {selectedLog.fullName}
                    </ThemedText>
                  </View>
                </View>

                <View style={[styles.detailRow, { borderBottomColor: colors.icon + '10' }]}>
                  <Ionicons
                    name="globe-outline"
                    size={20}
                    color="#B71C1C"
                    style={styles.detailIcon}
                  />
                  <View style={styles.detailTextCol}>
                    <ThemedText style={styles.detailLabel}>Địa chỉ IP (ipAddress)</ThemedText>
                    <ThemedText style={[styles.detailValue, { fontWeight: '700' }]}>
                      {selectedLog.ip}
                    </ThemedText>
                  </View>
                </View>

                <View style={[styles.detailRow, { borderBottomColor: colors.icon + '10' }]}>
                  <Ionicons
                    name="hardware-chip-outline"
                    size={20}
                    color="#B71C1C"
                    style={styles.detailIcon}
                  />
                  <View style={styles.detailTextCol}>
                    <ThemedText style={styles.detailLabel}>Thiết bị / Trình duyệt (UserAgent)</ThemedText>
                    <ThemedText style={[styles.detailValue, { fontSize: 12 }]}>
                      {selectedLog.userAgent}
                    </ThemedText>
                  </View>
                </View>

                <View style={[styles.detailRow, { borderBottomColor: colors.icon + '10' }]}>
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color="#B71C1C"
                    style={styles.detailIcon}
                  />
                  <View style={styles.detailTextCol}>
                    <ThemedText style={styles.detailLabel}>Thời gian (Giờ Việt Nam GMT+7)</ThemedText>
                    <ThemedText style={styles.detailValue}>{selectedLog.time}</ThemedText>
                  </View>
                </View>

                {selectedLog.oldValues ? (
                  <View style={styles.jsonDiffBox}>
                    <ThemedText style={[styles.jsonDiffTitle, { color: '#DC2626' }]}>
                      Dữ liệu trước khi thay đổi (oldValues):
                    </ThemedText>
                    <ThemedText style={styles.jsonCodeText}>{selectedLog.oldValues}</ThemedText>
                  </View>
                ) : null}

                {selectedLog.newValues ? (
                  <View style={[styles.jsonDiffBox, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                    <ThemedText style={[styles.jsonDiffTitle, { color: '#059669' }]}>
                      Dữ liệu sau khi thay đổi (newValues):
                    </ThemedText>
                    <ThemedText style={styles.jsonCodeText}>{selectedLog.newValues}</ThemedText>
                  </View>
                ) : null}

                <View style={{ height: 30 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 46,
    paddingBottom: 14,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  listContent: { padding: 16 },
  logCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    marginTop: 2,
  },
  logInfo: { flex: 1 },
  logAction: { fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  logDescription: { fontSize: 12, opacity: 0.75, marginBottom: 4 },
  logMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  logUser: { fontSize: 12, fontWeight: 'bold', color: '#B71C1C' },
  dotSeparator: { fontSize: 12, marginHorizontal: 6, opacity: 0.5 },
  logIp: { fontSize: 11, color: '#0284C7', fontWeight: '600' },
  logTime: { fontSize: 11, opacity: 0.55, marginTop: 2 },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalBody: { padding: 20 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  detailIcon: { marginRight: 14, marginTop: 2 },
  detailTextCol: { flex: 1 },
  detailLabel: { fontSize: 12, opacity: 0.55, marginBottom: 2 },
  detailValue: { fontSize: 14, fontWeight: '500' },
  jsonDiffBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  jsonDiffTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  jsonCodeText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#1E293B',
  },
});
