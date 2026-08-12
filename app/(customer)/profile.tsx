import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { useState } from 'react';
import { permissionService } from '@/services/permissionService';
import * as ImagePicker from 'expo-image-picker';
import { useCustomTheme } from '@/context/ThemeContext';

export default function CustomerProfilePage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { colors, toggleTheme } = useCustomTheme();
  const [avatarUri, setAvatarUri] = useState('https://ui-avatars.com/api/?name=Khach+Hang&background=f59e0b&color=fff');

  const handlePickAvatar = async () => {
    const granted = await permissionService.requestMediaLibraryPermission();
    if (granted) {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAvatarUri(result.assets[0].uri);
      }
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <ThemedText style={styles.headerTitle}>Tài khoản cá nhân</ThemedText>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* USER INFO CARD */}
        <View style={[styles.profileCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <TouchableOpacity style={{ position: 'relative' }} onPress={handlePickAvatar}>
            <Image 
              source={{ uri: avatarUri }}
              style={styles.avatar}
            />
            <View style={[styles.cameraBadge, { backgroundColor: colors.tint }]}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <View style={styles.profileInfo}>
            <ThemedText style={styles.userName}>Nguyễn Văn A</ThemedText>
            <ThemedText style={styles.userEmail}>khachhang@gmail.com</ThemedText>
            
            <View style={[styles.tierBadge, { backgroundColor: colors.tint + '20' }]}>
              <Ionicons name="ribbon-outline" size={14} color={colors.tint} style={{ marginRight: 4 }} />
              <ThemedText style={[styles.tierText, { color: colors.tint }]}>Thành viên Vàng (240 Điểm)</ThemedText>
            </View>
          </View>
        </View>

        {/* CUSTOMER QUICK ACTIONS */}
        <View style={[styles.menuCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(customer)/orders')}>
            <View style={[styles.iconBg, { backgroundColor: colors.tint + '15' }]}>
              <Ionicons name="receipt-outline" size={20} color={colors.tint} />
            </View>
            <ThemedText style={styles.menuTitle}>Đơn hàng của tôi</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={colors.icon} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(customer)/wishlist')}>
            <View style={[styles.iconBg, { backgroundColor: colors.tint + '15' }]}>
              <Ionicons name="heart-outline" size={20} color={colors.tint} />
            </View>
            <ThemedText style={styles.menuTitle}>Sản phẩm yêu thích</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={colors.icon} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.iconBg, { backgroundColor: colors.tint + '15' }]}>
              <Ionicons name="location-outline" size={20} color={colors.tint} />
            </View>
            <ThemedText style={styles.menuTitle}>Sổ địa chỉ nhận hàng</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={colors.icon} />
          </TouchableOpacity>
        </View>

        {/* SYSTEM & APP SETTINGS */}
        <ThemedText style={styles.sectionHeaderTitle}>Cài đặt & Quản trị</ThemedText>
        
        <View style={[styles.menuCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          
          {/* LIGHT / DARK MODE */}
          <TouchableOpacity style={styles.menuItem} onPress={toggleTheme}>
            <View style={[styles.iconBg, { backgroundColor: colors.tint + '15' }]}>
              <Ionicons name="moon-outline" size={20} color={colors.tint} />
            </View>
            <ThemedText style={styles.menuTitle}>Giao diện (Sáng/Tối)</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={colors.icon} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          {/* SWITCH TO ADMIN */}
          <TouchableOpacity style={styles.menuItem} onPress={() => router.replace('/(admin)')}>
            <View style={[styles.iconBg, { backgroundColor: '#3b82f615' }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#3b82f6" />
            </View>
            <ThemedText style={styles.menuTitle}>Chuyển sang Trang Admin</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={colors.icon} />
          </TouchableOpacity>

        </View>

        {/* SYSTEM & APP SETTINGS */}
        <ThemedText style={styles.sectionHeaderTitle}>Cài đặt & Quản trị</ThemedText>
        
        <View style={[styles.menuCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          
          {/* SWITCH TO ADMIN */}
          <TouchableOpacity style={styles.menuItem} onPress={() => router.replace('/(admin)')}>
            <View style={[styles.iconBg, { backgroundColor: '#3b82f615' }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#3b82f6" />
            </View>
            <ThemedText style={styles.menuTitle}>Chuyển sang Trang Admin</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={colors.icon} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          {/* LIGHT / DARK MODE */}
          <TouchableOpacity style={styles.menuItem} onPress={toggleTheme}>
            <View style={[styles.iconBg, { backgroundColor: colors.tint + '15' }]}>
              <Ionicons name="moon-outline" size={20} color={colors.tint} />
            </View>
            <ThemedText style={styles.menuTitle}>Giao diện (Sáng/Tối)</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={colors.icon} />
          </TouchableOpacity>

        </View>

        {/* LOGOUT BUTTON */}
        <TouchableOpacity 
          style={styles.logoutBtn}
          onPress={() => router.replace('/')}
        >
          <Ionicons name="log-out-outline" size={22} color="#ef4444" style={{ marginRight: 8 }} />
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
  header: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    opacity: 0.6,
    marginBottom: 6,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 8,
    opacity: 0.6,
    marginLeft: 4,
  },
  menuCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  divider: {
    height: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#ef444415',
    marginTop: 8,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
