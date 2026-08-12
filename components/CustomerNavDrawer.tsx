import React from 'react';
import { StyleSheet, View, TouchableOpacity, Modal, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';

import { useLanguage } from '@/context/LanguageContext';

interface CustomerNavDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export default function CustomerNavDrawer({ visible, onClose }: CustomerNavDrawerProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { t } = useLanguage();

  const navigateTo = (route: string) => {
    onClose();
    setTimeout(() => {
      if (route === '/(admin)') {
        router.replace('/(admin)' as any);
      } else {
        router.push(route as any);
      }
    }, 150);
  };

  const MENU_ITEMS = [
    { title: t('store_locations'), icon: 'storefront-outline', route: '/(customer)/stores', color: '#f7a840' },
    { title: t('news'), icon: 'newspaper-outline', route: '/(customer)/posts', color: '#3b82f6' },
    { title: t('about_us'), icon: 'information-circle-outline', route: '/(customer)/about', color: '#10b981' },
    { title: t('contact_us'), icon: 'call-outline', route: '/(customer)/contact', color: '#8b5cf6' },
    { title: t('faq'), icon: 'help-circle-outline', route: '/(customer)/faq', color: '#ec4899' },
    { title: 'Trang Quản trị Admin', icon: 'shield-checkmark-outline', route: '/(admin)', color: '#ef4444' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {/* BACKDROP TOUCH TO CLOSE */}
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        {/* SIDE DRAWER CONTAINER */}
        <View style={[styles.drawerContainer, { backgroundColor: colors.background }]}>
          
          {/* DRAWER HEADER */}
          <View style={[styles.drawerHeader, { backgroundColor: colors.headerBg }]}>
            <View style={styles.brandGroup}>
              <Ionicons name="restaurant" size={26} color="#fff" style={{ marginRight: 8 }} />
              <ThemedText style={styles.brandTitle}>DOLA BAKERY</ThemedText>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.menuScroll}>
            
            <ThemedText style={styles.sectionLabel}>DANH MỤC KHÁM PHÁ</ThemedText>

            {MENU_ITEMS.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.menuRow, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                onPress={() => navigateTo(item.route)}
              >
                <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
                  <Ionicons name={item.icon as any} size={22} color={item.color} />
                </View>
                <ThemedText style={styles.menuTitle}>{item.title}</ThemedText>
                <Ionicons name="chevron-forward" size={18} color={colors.icon} />
              </TouchableOpacity>
            ))}

            <View style={[styles.promoBox, { backgroundColor: colors.tint + '15', borderColor: colors.tint + '40' }]}>
              <Ionicons name="gift-outline" size={24} color={colors.tint} style={{ marginBottom: 6 }} />
              <ThemedText style={[styles.promoTitle, { color: colors.tint }]}>Ưu Đãi Độc Quyền App</ThemedText>
              <ThemedText style={styles.promoDesc}>Nhập mã DOLA30 giảm 30.000₫ cho mọi đơn hàng từ 150.000₫</ThemedText>
            </View>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  drawerContainer: {
    width: '80%',
    maxWidth: 320,
    height: '100%',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  closeBtn: {
    padding: 4,
  },
  menuScroll: {
    padding: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    opacity: 0.5,
    marginBottom: 12,
    letterSpacing: 1,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
  },
  promoBox: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 16,
    alignItems: 'center',
  },
  promoTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  promoDesc: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 18,
  },
});
