import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { adminApi } from '@/services/api/adminApi';

const DEFAULT_ROLES = [
  { id: 0, name: 'Quản trị viên (Admin)', color: '#ef4444', desc: 'Toàn quyền quản trị hệ thống, cửa hàng và tài chính', members: [] },
  { id: 1, name: 'Quản lý cửa hàng (Manager)', color: '#f59e0b', desc: 'Quản lý nhân sự, đơn hàng, kho và điều chuyển chi nhánh', members: [] },
  { id: 2, name: 'Nhân viên bán hàng (Staff)', color: '#3b82f6', desc: 'Tạo đơn hàng POS, bán hàng và kiểm kho sản phẩm', members: [] },
];

export default function RolesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [rolesList, setRolesList] = useState<any[]>(DEFAULT_ROLES);

  useEffect(() => {
    fetchRolesData();
  }, []);

  const fetchRolesData = async () => {
    try {
      setLoading(true);
      const users = await adminApi.getUsers();
      const userList = Array.isArray(users) ? users : (users?.data || []);

      const updated = DEFAULT_ROLES.map(role => {
        const filtered = userList.filter((u: any) => u.MAROLE === role.id && u.MAROLE !== 3);
        const members = filtered.map((u: any) => ({
          username: u.USERNAME,
          email: u.EMAIL || 'Chưa cập nhật',
          fullName: u.nhanvien?.HOTEN || u.USERNAME,
          roleId: u.MAROLE,
          raw: u,
        }));
        return {
          ...role,
          usersCount: members.length,
          members: members
        };
      });
      setRolesList(updated);
    } catch (e) {

      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeUserRole = (member: any) => {
    Alert.alert(
      'Thay đổi quyền hạn',
      `Thay đổi vai trò cho tài khoản "${member.username}" (${member.fullName})`,
      [
        { text: 'Chuyển thành Quản lý', onPress: () => updateUserRole(member.username, 1) },
        { text: 'Chuyển thành Nhân viên', onPress: () => updateUserRole(member.username, 2) },
        { text: 'Hủy', style: 'cancel' }
      ]
    );
  };

  const updateUserRole = async (username: string, newRoleId: number) => {
    try {
      setLoading(true);
      await adminApi.updateStaff(username, { MAROLE: newRoleId });
      Alert.alert('Thành công', `Đã cập nhật quyền hạn cho ${username}.`);
      setSelectedRole(null);
      await fetchRolesData();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể thay đổi quyền hạn.');
      setLoading(false);
    }
  };

  const renderRoleCard = ({ item }: { item: any }) => {
    return (
      <View style={[styles.roleCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
        <View style={styles.roleHeader}>
          <View style={styles.roleTitleGroup}>
            <View style={[styles.roleDot, { backgroundColor: item.color }]} />
            <ThemedText style={styles.roleName}>{item.name}</ThemedText>
          </View>
          <View style={[styles.badge, { backgroundColor: item.color + '15' }]}>
            <ThemedText style={[styles.badgeText, { color: item.color }]}>{item.usersCount || 0} người</ThemedText>
          </View>
        </View>

        <ThemedText style={styles.roleDesc}>{item.desc}</ThemedText>

        <View style={[styles.divider, { backgroundColor: colors.icon + '20' }]} />

        <TouchableOpacity style={styles.actionBtn} onPress={() => setSelectedRole(item)}>
          <ThemedText style={[styles.actionBtnText, { color: colors.tint }]}>Xem danh sách thành viên</ThemedText>
          <Ionicons name="chevron-forward" size={16} color={colors.tint} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Phân quyền nhân viên</ThemedText>
        <TouchableOpacity style={styles.headerRight} onPress={fetchRolesData}>
          <Ionicons name="refresh" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          data={rolesList}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderRoleCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* MEMBER DETAILS MODAL */}
      {selectedRole && (
        <Modal
          visible={!!selectedRole}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedRole(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.icon + '20' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={[styles.roleDot, { backgroundColor: selectedRole.color, marginRight: 8 }]} />
                  <ThemedText style={styles.modalTitle} numberOfLines={1}>{selectedRole.name}</ThemedText>
                </View>
                <TouchableOpacity onPress={() => setSelectedRole(null)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <ThemedText style={{ fontSize: 13, opacity: 0.7, marginBottom: 16 }}>
                  {selectedRole.desc}
                </ThemedText>

                <ThemedText style={{ fontSize: 15, fontWeight: 'bold', marginBottom: 12 }}>
                  Danh sách tài khoản thuộc nhóm ({selectedRole.members.length})
                </ThemedText>

                {selectedRole.members.length === 0 ? (
                  <ThemedText style={{ opacity: 0.6, fontSize: 13, fontStyle: 'italic', marginVertical: 12 }}>
                    Chưa có người dùng nào thuộc nhóm quyền này.
                  </ThemedText>
                ) : (
                  selectedRole.members.map((member: any, idx: number) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.memberRow, { borderBottomColor: colors.icon + '10', backgroundColor: colors.icon + '05' }]}
                      onPress={() => handleChangeUserRole(member)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.memberAvatar, { backgroundColor: selectedRole.color + '15' }]}>
                        <ThemedText style={[styles.memberAvatarText, { color: selectedRole.color }]}>
                          {member.fullName.charAt(0)}
                        </ThemedText>
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.memberName}>{member.fullName}</ThemedText>
                        <ThemedText style={styles.memberSub}>@{member.username} • {member.email}</ThemedText>
                      </View>
                      <Ionicons name="ellipsis-vertical" size={18} color={colors.icon} />
                    </TouchableOpacity>
                  ))
                )}
                <View style={{ height: 40 }} />
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16 },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerRight: { width: 40, alignItems: 'flex-end', justifyContent: 'center' },
  listContent: { padding: 16 },
  roleCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  roleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  roleTitleGroup: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  roleDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  roleName: { fontSize: 15, fontWeight: 'bold' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  roleDesc: { fontSize: 13, opacity: 0.7, marginTop: 4, marginBottom: 12 },
  divider: { height: 1, marginBottom: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  actionBtnText: { fontSize: 13, fontWeight: 'bold', marginRight: 4 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 16, fontWeight: 'bold' },
  modalBody: { padding: 20 },
  memberRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  memberAvatarText: { fontSize: 18, fontWeight: 'bold' },
  memberName: { fontSize: 14, fontWeight: 'bold' },
  memberSub: { fontSize: 12, opacity: 0.6 },
});
