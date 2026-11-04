import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { adminApi } from '@/services/api/adminApi';
import { useAuth } from '@/context/AuthContext';

export default function AttendanceScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const nowTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getChamCong();
      const list = Array.isArray(res) ? res : (res?.data || []);
      setHistory(list);

      const currentUsername = user?.USERNAME || user?.username;
      const todayRecord = list.find((item: any) => {
        const itemDate = (item.NGAYCHAMCONG || item.ngayChamCong || item.created_at || '').split('T')[0];
        const itemUser = item.USERNAME || item.username;
        return itemDate === todayStr && itemUser === currentUsername;
      });

      if (todayRecord) {
        setHasCheckedInToday(true);
      }
    } catch (e: any) {
      console.error('Error fetching attendance:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  const handleCheckIn = async () => {
    const currentUsername = user?.USERNAME || user?.username;
    if (!currentUsername) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin tài khoản người dùng.');
      return;
    }

    try {
      setSubmitting(true);
      await adminApi.postChamCong({
        USERNAME: currentUsername,
        NGAYCHAMCONG: todayStr,
        TRANGTHAI: true,
      });

      Alert.alert('Thành công 🎉', `Điểm danh chấm công thành công lúc ${nowTime}! Chúc bạn một ca làm việc hiệu quả.`);
      setHasCheckedInToday(true);
      fetchAttendanceData();
    } catch (e: any) {
      const msg = e.response?.data?.message || e.response?.data?.error || e.message || 'Lỗi khi chấm công.';
      Alert.alert('Chấm công thất bại', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Chấm công</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAttendanceData(); }} colors={[colors.tint]} />}
      >
        {/* CHECK-IN CARD */}
        <View style={[styles.checkInCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <View style={[styles.todayHeader, { gap: 8 }]}>
            <View style={{ flex: 1, paddingRight: 6 }}>
              <ThemedText style={styles.todayDateText}>Hôm nay, {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</ThemedText>
              <ThemedText style={[styles.employeeName, { color: colors.tint }]}>{user?.HOTEN || user?.name || user?.USERNAME || 'Nhân viên'}</ThemedText>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: hasCheckedInToday ? '#dcfce7' : '#fef3c7' }]}>
              <Ionicons name={hasCheckedInToday ? 'checkmark-circle' : 'time-outline'} size={16} color={hasCheckedInToday ? '#16a34a' : '#d97706'} />
              <ThemedText style={[styles.statusText, { color: hasCheckedInToday ? '#16a34a' : '#d97706' }]}>
                {hasCheckedInToday ? 'Đã điểm danh' : 'Chưa điểm danh'}
              </ThemedText>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.punchButton,
              { backgroundColor: hasCheckedInToday ? '#10b981' : colors.tint },
              (submitting || hasCheckedInToday) && { opacity: hasCheckedInToday ? 0.85 : 0.6 }
            ]}
            onPress={handleCheckIn}
            disabled={submitting || hasCheckedInToday}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name={hasCheckedInToday ? 'checkmark-done-circle' : 'finger-print'} size={32} color="#fff" />
                <ThemedText style={styles.punchButtonText}>
                  {hasCheckedInToday ? 'ĐÃ ĐIỂM DANH HÔM NAY' : 'CHẤM CÔNG VÀO CA'}
                </ThemedText>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ATTENDANCE HISTORY LIST */}
        <View style={styles.historySection}>
          <ThemedText style={styles.sectionTitle}>Lịch Sử Chấm Công Gần Đây</ThemedText>

          {loading && !refreshing ? (
            <ActivityIndicator style={{ marginTop: 24 }} color={colors.tint} />
          ) : history.length === 0 ? (
            <View style={[styles.emptyBox, { borderColor: colors.cardBorder }]}>
              <Ionicons name="calendar-outline" size={36} color={colors.icon} />
              <ThemedText style={{ color: colors.icon, marginTop: 8 }}>Chưa có bản ghi chấm công nào.</ThemedText>
            </View>
          ) : (
            history.slice(0, 15).map((item, idx) => {
              const dateVal = item.NGAYCHAMCONG || item.ngayChamCong || item.created_at || '';
              const cleanDate = dateVal.split('T')[0];
              const uName = item.USERNAME || item.username || user?.USERNAME || 'Nhân viên';
              return (
                <View key={item.id || idx} style={[styles.historyRow, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                  <View style={styles.rowLeft}>
                    <View style={[styles.dateIconCircle, { backgroundColor: colors.tint + '15' }]}>
                      <Ionicons name="calendar" size={18} color={colors.tint} />
                    </View>
                    <View style={{ flex: 1, paddingRight: 6 }}>
                      <ThemedText style={styles.rowDate}>{cleanDate}</ThemedText>
                      <ThemedText style={[styles.rowUser, { color: colors.cardTextSecondary }]}>@{uName}</ThemedText>
                    </View>
                  </View>
                  <View style={styles.rowRight}>
                    <View style={[styles.chip, { backgroundColor: '#dcfce7' }]}>
                      <ThemedText style={{ color: '#16a34a', fontSize: 12, fontWeight: 'bold' }}>Hợp lệ</ThemedText>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 44,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  scrollContent: { padding: 16 },
  checkInCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  todayDateText: { fontSize: 13, color: '#888' },
  employeeName: { fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    flexShrink: 0,
    alignSelf: 'flex-start',
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  punchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  punchButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  historySection: { marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  emptyBox: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateIconCircle: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  rowDate: { fontSize: 14, fontWeight: 'bold' },
  rowUser: { fontSize: 12, marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
});
