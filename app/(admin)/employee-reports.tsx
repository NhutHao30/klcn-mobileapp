import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { adminApi } from '@/services/api/adminApi';

export default function EmployeeReportsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCount: 0,
    activeCount: 0,
    totalSalary: 0,
    avgSalary: 0,
    roleCounts: {} as Record<string, number>,
  });
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    fetchEmployeeStats();
  }, []);

  const fetchEmployeeStats = async () => {
    try {
      setLoading(true);
      const users = await adminApi.getUsers();
      if (Array.isArray(users)) {
        const staff = users
          .filter((u: any) => (u.MAROLE === 1 || u.MAROLE === 2) && u.nhanvien)
          .map((u: any) => ({
            username: u.USERNAME,
            fullName: u.nhanvien.HOTEN,
            role: u.nhanvien.CHUCVU || 'Nhân viên',
            salary: Number(u.nhanvien.LUONG) || 0,
            status: u.nhanvien.TRANGTHAI || 'Đang làm việc',
          }));

        const totalCount = staff.length;
        const activeCount = staff.filter((s: any) => s.status === 'Đang làm việc').length;
        const totalSalary = staff
          .filter((s: any) => s.status === 'Đang làm việc')
          .reduce((sum: number, s: any) => sum + s.salary, 0);
        const avgSalary = activeCount > 0 ? Math.round(totalSalary / activeCount) : 0;

        const roleCounts: Record<string, number> = {};
        staff.forEach((s: any) => {
          if (s.status === 'Đang làm việc') {
            roleCounts[s.role] = (roleCounts[s.role] || 0) + 1;
          }
        });

        setStats({
          totalCount,
          activeCount,
          totalSalary,
          avgSalary,
          roleCounts,
        });
        setEmployees(staff);
      }
    } catch (e) {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const getMaxSalary = () => {
    if (employees.length === 0) return 1;
    return Math.max(...employees.map(e => e.salary)) || 1;
  };

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(admin)/reports')}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Báo cáo Nhân sự</ThemedText>
        <TouchableOpacity style={styles.backButton} onPress={fetchEmployeeStats}>
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* STATS GRID */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
              <Ionicons name="people-outline" size={22} color={colors.tint} />
              <ThemedText style={styles.statLabel}>Tổng nhân sự</ThemedText>
              <ThemedText style={styles.statValue}>{stats.totalCount} người</ThemedText>
              <ThemedText style={styles.statSub}>Đang làm: {stats.activeCount}</ThemedText>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
              <Ionicons name="cash-outline" size={22} color={colors.tint} />
              <ThemedText style={styles.statLabel}>Quỹ lương tháng</ThemedText>
              <ThemedText style={[styles.statValue, { color: colors.tint }]}>
                {stats.totalSalary.toLocaleString('vi-VN')}₫
              </ThemedText>
              <ThemedText style={styles.statSub}>Lương TB: {stats.avgSalary.toLocaleString('vi-VN')}₫</ThemedText>
            </View>
          </View>

          {/* ROLE BREAKDOWN */}
          <View style={[styles.sectionCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
            <ThemedText style={styles.sectionTitle}>Phân bổ vị trí công việc</ThemedText>
            {Object.keys(stats.roleCounts).length === 0 ? (
              <ThemedText style={{ opacity: 0.6, fontSize: 13, fontStyle: 'italic' }}>Chưa có vị trí làm việc nào.</ThemedText>
            ) : (
              Object.entries(stats.roleCounts).map(([role, count]) => {
                const percentage = stats.activeCount > 0 ? (count / stats.activeCount) * 100 : 0;
                return (
                  <View key={role} style={styles.roleRow}>
                    <View style={styles.roleTextRow}>
                      <ThemedText style={styles.roleName}>{role}</ThemedText>
                      <ThemedText style={styles.roleCount}>{count} nhân viên ({percentage.toFixed(0)}%)</ThemedText>
                    </View>
                    <View style={[styles.progressBarBg, { backgroundColor: colors.icon + '15' }]}>
                      <View style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: colors.tint }]} />
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* SALARY LIST */}
          <View style={[styles.sectionCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
            <ThemedText style={styles.sectionTitle}>Mức lương & Trạng thái</ThemedText>
            {employees.map((employee, idx) => {
              const maxSal = getMaxSalary();
              const percent = maxSal > 0 ? (employee.salary / maxSal) * 100 : 0;
              return (
                <View key={idx} style={styles.empRow}>
                  <View style={styles.empHeader}>
                    <View>
                      <ThemedText style={styles.empName}>{employee.fullName}</ThemedText>
                      <ThemedText style={styles.empSub}>@{employee.username} • {employee.role}</ThemedText>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <ThemedText style={[styles.empSalary, { color: colors.tint }]}>
                        {employee.salary.toLocaleString('vi-VN')}₫
                      </ThemedText>
                      <ThemedText style={[styles.empStatus, { color: employee.status === 'Đang làm việc' ? '#10b981' : '#ef4444' }]}>
                        {employee.status}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={[styles.salaryBarBg, { backgroundColor: colors.icon + '10' }]}>
                    <View style={[styles.salaryBarFill, { width: `${percent}%`, backgroundColor: colors.tint + '70' }]} />
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statSub: {
    fontSize: 11,
    opacity: 0.5,
  },
  sectionCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  roleRow: {
    marginBottom: 14,
  },
  roleTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  roleName: {
    fontSize: 14,
    fontWeight: '500',
  },
  roleCount: {
    fontSize: 12,
    opacity: 0.6,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  empRow: {
    marginBottom: 16,
  },
  empHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  empName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  empSub: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  empSalary: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  empStatus: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  salaryBarBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  salaryBarFill: {
    height: '100%',
    borderRadius: 2,
  },
});
