import React from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity, Image, SafeAreaView, Dimensions, Platform, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';

const { width } = Dimensions.get('window');

const SERVICE_GROUPS = [
  { id: 'add-product', title: 'Thêm\nsản phẩm', icon: 'add-circle-outline', route: '/(admin)/products' },
  { id: 'add-order', title: 'Tạo\nđơn hàng', icon: 'receipt-outline', route: '/(admin)/invoices' },
  { id: 'vouchers', title: 'Quản lý\nkhuyến mãi', icon: 'ticket-outline', route: '/(admin)/vouchers' },
  { id: 'inventory', title: 'Kiểm kê\nkho', icon: 'cube-outline', route: '/(admin)/inventory' },
  { id: 'chat', title: 'Hỗ trợ\nkhách hàng', icon: 'chatbubble-ellipses-outline', route: '/(admin)/chat' },
];

const FAVORITES = [
  { id: 'customers', title: 'Khách hàng', icon: 'people-outline', route: '/(admin)/customers' },
  { id: 'employees', title: 'Nhân viên', icon: 'briefcase-outline', route: '/(admin)/employees' },
  { id: 'reports', title: 'Báo cáo', icon: 'bar-chart-outline', route: '/(admin)/reports' },
  { id: 'stores', title: 'Chi nhánh', icon: 'storefront-outline', route: '/(admin)/stores' },
  { id: 'news', title: 'Tin tức', icon: 'newspaper-outline', route: '/(admin)/news' },
];

export default function AdminDashboard() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerBg} />
      
      {/* HEADER SECTION */}
      <View style={[styles.headerSection, { backgroundColor: colors.headerBg }]}>
        <SafeAreaView>
          <View style={styles.headerTop}>
            {/* Avatar & Info */}
            <View style={styles.userInfoContainer}>
              <View style={styles.avatarWrapper}>
                <Image 
                  source={{ uri: 'https://ui-avatars.com/api/?name=Admin+Dola&background=f59e0b&color=fff' }} 
                  style={styles.avatar} 
                />
              </View>
              <View style={styles.userNameContainer}>
                <View style={styles.levelBadge}>
                  <ThemedText style={styles.levelText}>Quản lý cửa hàng</ThemedText>
                  <Ionicons name="star" size={12} color="#fff" style={styles.levelIcon} />
                </View>
                <ThemedText style={styles.userName}>DOLA BAKERY</ThemedText>
              </View>
            </View>
            
            {/* Notifications Button */}
            <TouchableOpacity style={styles.searchButton}>
              <Ionicons name="notifications" size={20} color={colors.headerBg} />
            </TouchableOpacity>
          </View>

          {/* Quick Stats Cards (Replacing QR cards) */}
          <View style={styles.quickCardsContainer}>
            <TouchableOpacity style={[styles.quickCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <View style={[styles.quickCardIconBg, { backgroundColor: colors.iconBg }]}>
                <Ionicons name="cash-outline" size={24} color="#475569" />
              </View>
              <View>
                <ThemedText style={[styles.quickCardTitle, { color: colors.cardTextSecondary }]}>Doanh thu hôm nay</ThemedText>
                <ThemedText style={styles.quickCardSubTitle}>$1,245.50</ThemedText>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.quickCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <View style={[styles.quickCardIconBg, { backgroundColor: colors.tint }]}>
                <Ionicons name="cart-outline" size={24} color="#fff" />
              </View>
              <View>
                <ThemedText style={[styles.quickCardTitle, { color: colors.cardTextSecondary }]}>Đơn hàng mới</ThemedText>
                <ThemedText style={styles.quickCardSubTitle}>24 Đơn</ThemedText>
              </View>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* SERVICE GROUPS (HORIZONTAL SCROLL) */}
        <View style={styles.sectionContainer}>
          <ThemedText style={styles.sectionTitle}>Nghiệp vụ cửa hàng</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.serviceGroupsScroll}>
            {SERVICE_GROUPS.map((item, index) => (
              <TouchableOpacity 
                key={item.id} 
                style={styles.serviceGroupItem}
                onPress={() => item.route && router.push(item.route as any)}
              >
                <View style={[styles.serviceIconWrapper, { backgroundColor: colors.tint }]}>
                  <Ionicons name={item.icon as any} size={28} color="#fff" />
                  {index === 0 && (
                    <View style={styles.newBadge}>
                      <ThemedText style={styles.newBadgeText}>Mới</ThemedText>
                    </View>
                  )}
                </View>
                <ThemedText style={styles.serviceGroupText}>{item.title}</ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* BANNER 1 (ACTION BANNER) */}
        <TouchableOpacity style={[styles.actionBanner, { backgroundColor: colors.tint }]}>
          <View style={styles.actionBannerLeft}>
            <View style={styles.actionBannerIconBg}>
              <Ionicons name="storefront" size={24} color={colors.tint} />
              <View style={styles.checkBadge}>
                <Ionicons name="checkmark" size={10} color="#fff" />
              </View>
            </View>
            <View>
              <ThemedText style={styles.actionBannerTitle}>Chi nhánh Trung tâm</ThemedText>
              <ThemedText style={styles.actionBannerSub}>(Nhấn để đổi chi nhánh khác)</ThemedText>
            </View>
          </View>
          <View style={styles.swapIconContainer}>
            <Ionicons name="swap-horizontal" size={20} color={colors.tint} />
          </View>
        </TouchableOpacity>

        {/* BANNER 2 (LARGE IMAGE BANNER) */}
        <TouchableOpacity style={styles.largeBannerContainer}>
          <View style={[styles.largeBanner, { backgroundColor: colors.gold + '20' }]}>
            <Ionicons name="warning-outline" size={48} color={colors.gold} style={{ alignSelf: 'center', marginBottom: 8 }} />
            <ThemedText style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}>CẢNH BÁO TỒN KHO</ThemedText>
            <ThemedText style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 20, color: colors.tint, marginBottom: 8 }}>SẮP HẾT NGUYÊN LIỆU</ThemedText>
            <ThemedText style={{ textAlign: 'center', fontSize: 12, marginBottom: 12 }}>Bột mì, Đường và 3 nguyên liệu khác đang ở mức thấp.</ThemedText>
            <TouchableOpacity style={{ alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 6, borderWidth: 1, borderColor: colors.tint, borderRadius: 16 }}>
              <ThemedText style={{ color: colors.tint, fontSize: 12, fontWeight: 'bold' }}>XEM CHI TIẾT KHO >></ThemedText>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* FAVORITES */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <ThemedText style={styles.sectionTitle}>Truy cập nhanh</ThemedText>
            <TouchableOpacity style={styles.editButton}>
              <ThemedText style={styles.editButtonText}>Tùy chỉnh</ThemedText>
              <Ionicons name="pencil" size={14} color={colors.icon} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.favoritesGrid}>
            {FAVORITES.map((item) => (
              <TouchableOpacity 
                key={item.id}
                style={styles.favoriteItem}
                onPress={() => item.route && router.push(item.route as any)}
              >
                <View style={[styles.favoriteIconWrapper, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                  <Ionicons name={item.icon as any} size={32} color={colors.tint} />
                </View>
                <ThemedText style={styles.favoriteTitle}>{item.title}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSection: {
    paddingBottom: 20,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 10,
    marginBottom: 20,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarWrapper: {
    padding: 2,
    backgroundColor: '#f59e0b',
    borderRadius: 30,
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#fff',
  },
  userNameContainer: {
    flex: 1,
  },
  levelBadge: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  levelText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
    marginRight: 4,
  },
  levelIcon: {
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    padding: 2,
  },
  userName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchButton: {
    width: 36,
    height: 36,
    backgroundColor: '#fff',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  quickCardsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  quickCard: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  quickCardIconBg: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  quickCardTitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  quickCardSubTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  serviceGroupsScroll: {
    paddingRight: 16,
  },
  serviceGroupItem: {
    alignItems: 'center',
    marginRight: 20,
    width: 70,
  },
  serviceIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  newBadge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fff',
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  serviceGroupText: {
    fontSize: 12,
    textAlign: 'center',
  },
  actionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  actionBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBannerIconBg: {
    width: 48,
    height: 48,
    backgroundColor: '#fff',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  checkBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    padding: 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  actionBannerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  actionBannerSub: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
  },
  swapIconContainer: {
    width: 36,
    height: 36,
    backgroundColor: '#fff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  largeBannerContainer: {
    marginBottom: 24,
  },
  largeBanner: {
    padding: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 14,
    color: '#64748b',
    marginRight: 4,
  },
  favoritesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  favoriteItem: {
    width: '31%',
    alignItems: 'center',
    marginBottom: 16,
  },
  favoriteIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  favoriteTitle: {
    fontSize: 13,
    textAlign: 'center',
  },
});
