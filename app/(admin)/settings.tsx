import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCustomTheme } from '@/context/ThemeContext';

const SETTINGS_MENU = [
  {
    title: 'Hồ sơ cá nhân',
    items: [
      { id: 'profile', title: 'Thông tin cá nhân', icon: 'person-outline', route: '/(admin)/profile' },
      { id: 'security', title: 'Bảo mật & Mật khẩu', icon: 'shield-checkmark-outline', route: '/(admin)/security' },
    ]
  },
  {
    title: 'Quản trị hệ thống',
    items: [
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

  const handleMenuPress = (item: any) => {
    if (item.id === 'appearance') {
      toggleTheme();
    } else if (item.route) {
      router.push(item.route as any);
    }
  };

  const handleLogout = () => {
    router.replace('/');
  };

  return (
    <ThemedView style={styles.container}>
      <View style={{ paddingTop: 40, backgroundColor: colors.headerBg }}>
        <ThemedText style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', padding: 16 }}>Cài đặt</ThemedText>
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Image 
            source={{ uri: 'https://ui-avatars.com/api/?name=Admin+Dola&background=f59e0b&color=fff' }} 
            style={styles.avatar} 
          />
          <View style={styles.profileInfo}>
            <ThemedText style={styles.profileName}>Dola Bakery Admin</ThemedText>
            <ThemedText style={styles.profileEmail}>admin@dolabakery.com</ThemedText>
            <View style={[styles.roleBadge, { backgroundColor: colors.tint + '20' }]}>
              <ThemedText style={[styles.roleText, { color: colors.tint }]}>Quản lý cấp cao</ThemedText>
            </View>
          </View>
        </View>

        {/* Menu Sections */}
        {SETTINGS_MENU.map((section, index) => (
          <View key={index} style={styles.menuSection}>
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
