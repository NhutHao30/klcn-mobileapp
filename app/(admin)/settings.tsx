import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCustomTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

const SETTINGS_MENU = [
  {
    title: 'Hồ sơ cá nhân & Ký số',
    items: [
      { id: 'profile', title: 'Thông tin cá nhân', icon: 'person-outline', route: '/(admin)/profile' },
      { id: 'signature-approval', title: 'Duyệt & Ký số biên bản', icon: 'finger-print-outline', route: '/(admin)/signature-approval' },
      { id: 'security', title: 'Bảo mật & Mật khẩu', icon: 'shield-checkmark-outline', route: '/(admin)/security' },
    ]
  },
  {
    title: 'Quản trị hệ thống & Bảo trì',
    items: [
      { id: 'feature-lock', title: 'Khóa bảo trì tính năng', icon: 'lock-closed-outline', route: '/(admin)/feature-lock' },
      { id: 'audit', title: 'Nhật ký hoạt động (Audit)', icon: 'list-outline', route: '/(admin)/audit' },
      { id: 'roles', title: 'Phân quyền nhân viên', icon: 'key-outline', route: '/(admin)/roles' },
      { id: 'branches', title: 'Quản lý chi nhánh', icon: 'storefront-outline', route: '/(admin)/stores' },
    ]
  },
  {
    title: 'Cài đặt ứng dụng',
    items: [
      { id: 'notifications', title: 'Thông báo', icon: 'notifications-outline', route: '/(admin)/notifications' },
      { id: 'appearance', title: 'Giao diện (Sáng/Tối)', icon: 'moon-outline' },
      { id: 'language', title: 'Ngôn ngữ', icon: 'language-outline', route: '/(admin)/language' },
    ]
  }
];

export default function AdminSettings() {
  const router = useRouter();
  const { colors, toggleTheme } = useCustomTheme();
  const { user, profile, role, logout } = useAuth();

  const vaiTroId = Number(
    user?.vaiTroId || user?.role_id || (user?.vaitro ? user?.vaitro.id : 0) || profile?.roleId || 0
  );
  const userRole = Number(
    user?.MAROLE !== undefined ? user?.MAROLE : (user?.QUYEN !== undefined ? user?.QUYEN : role)
  );

  const isAdmin = vaiTroId === 1 || userRole === 0;
  const isDirector = vaiTroId === 8 || userRole === 5;
  const isManager = vaiTroId === 2 || userRole === 1;
  const isWarehouse = vaiTroId === 4;
  const isAccountant = vaiTroId === 7 || userRole === 6;
  const canSign = !isAdmin && (isDirector || isManager || isWarehouse || isAccountant);

  const displayName =
    profile?.fullName || user?.nguoidung?.hoTen || user?.HOTEN || user?.name || user?.username || 'Nhân viên';
  const displayEmail = profile?.email || user?.email || user?.EMAIL || 'user@givralbakery.com.vn';
  const displayRole =
    profile?.roleLabel || user?.vaitro?.tenVaiTro || (isAdmin ? 'Quản trị viên Hệ thống' : 'Nhân viên Givral Bakery');
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    displayName
  )}&background=d97706&color=fff&bold=true`;

  const filteredMenu = [
    {
      title: 'Hồ sơ cá nhân & Ký số',
      items: [
        { id: 'profile', title: 'Thông tin cá nhân', icon: 'person-outline', route: '/(admin)/profile' },
        ...(canSign
          ? [
              {
                id: 'signature-manage',
                title: 'Quản lý Chữ ký Số cá nhân',
                icon: 'create-outline',
                route: '/(admin)/profile',
              },
              {
                id: 'signature-approval',
                title: 'Duyệt & Ký số biên bản',
                icon: 'finger-print-outline',
                route: '/(admin)/signature-approval',
              },
            ]
          : []),
        { id: 'security', title: 'Bảo mật & Mật khẩu', icon: 'shield-checkmark-outline', route: '/(admin)/security' },
      ],
    },
    ...(isAdmin
      ? [
          {
            title: 'Quản trị hệ thống & Bảo mật (Dành riêng Admin)',
            items: [
              {
                id: 'feature-lock',
                title: 'Khóa bảo trì tính năng',
                icon: 'lock-closed-outline',
                route: '/(admin)/feature-lock',
              },
              { id: 'audit', title: 'Nhật ký hoạt động (Audit Logs)', icon: 'list-outline', route: '/(admin)/audit' },
              {
                id: 'roles',
                title: 'Quản trị tài khoản & Phân quyền',
                icon: 'key-outline',
                route: '/(admin)/roles',
              },
            ],
          },
        ]
      : []),
    {
      title: 'Cài đặt ứng dụng',
      items: [
        { id: 'notifications', title: 'Thông báo', icon: 'notifications-outline', route: '/(admin)/notifications' },
        { id: 'appearance', title: 'Giao diện (Sáng/Tối)', icon: 'moon-outline' },
        { id: 'language', title: 'Ngôn ngữ', icon: 'language-outline', route: '/(admin)/language' },
      ],
    },
  ];

  const handleMenuPress = (item: any) => {
    if (item.id === 'appearance') {
      toggleTheme();
    } else if (item.route) {
      router.push(item.route as any);
    }
  };

  const handleLogout = async () => {
    try {
      if (logout) {
        await logout();
      }
    } catch (e) {}
    router.replace('/login');
  };

  return (
    <ThemedView style={styles.container}>
      <View style={{ paddingTop: 40, backgroundColor: '#d97706' }}>
        <ThemedText style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', padding: 16 }}>Cài đặt</ThemedText>
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Image 
            source={{ uri: avatarUrl }} 
            style={styles.avatar} 
          />
          <View style={styles.profileInfo}>
            <ThemedText style={styles.profileName}>{displayName}</ThemedText>
            <ThemedText style={styles.profileEmail}>{displayEmail}</ThemedText>
            <View style={[styles.roleBadge, { backgroundColor: '#d97706' + '20' }]}>
              <ThemedText style={[styles.roleText, { color: '#d97706' }]}>{displayRole}</ThemedText>
            </View>
          </View>
        </View>

        {/* Menu Sections */}
        {filteredMenu.map((section, index) => (
          <View key={'section-' + index} style={styles.menuSection}>
            <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
            <View style={[styles.menuCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity 
                  key={item.id} 
                  style={[
                    styles.menuItem, 
                    itemIndex < section.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.icon + '20' }
                  ]}
                  onPress={() => handleMenuPress(item)}
                >
                  <View style={[styles.menuIconBg, { backgroundColor: colors.icon + '15' }]}>
                    <Ionicons name={item.icon as any} size={20} color={colors.text} />
                  </View>
                  <ThemedText style={styles.menuItemTitle}>{item.title}</ThemedText>
                  <Ionicons name="chevron-forward" size={20} color={colors.icon} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#ef4444" style={styles.logoutIcon} />
          <ThemedText style={styles.logoutText}>Đăng xuất</ThemedText>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileEmail: {
    opacity: 0.7,
    marginBottom: 8,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  menuSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    opacity: 0.6,
    marginBottom: 8,
    marginLeft: 8,
    textTransform: 'uppercase',
  },
  menuCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuIconBg: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemTitle: {
    flex: 1,
    fontSize: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#ef444415',
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
