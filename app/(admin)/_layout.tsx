import React from 'react';
import { Tabs } from 'expo-router';
import { useColorScheme, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function AdminLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const adminGold = '#d97706'; // Màu vàng chủ đạo Bakery thống nhất với phía khách hàng

  const { user, profile, role } = useAuth();
  const vaiTroId = Number(
    user?.vaiTroId || user?.role_id || (user?.vaitro ? user?.vaitro.id : 0) || profile?.roleId || 0
  );
  const userRole = Number(
    user?.MAROLE !== undefined ? user?.MAROLE : user?.QUYEN !== undefined ? user?.QUYEN : role
  );
  const isAdmin = vaiTroId === 1 || (!vaiTroId && userRole === 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: adminGold,
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#F1F5F9',
          elevation: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          backgroundColor: colors.background,
          height: Platform.OS === 'ios' ? 76 : 64,
          paddingBottom: Platform.OS === 'ios' ? 18 : 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        key="index"
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={23} color={color} />
          ),
        }}
      />

      {/* Tab 2: Phân tích cho Admin HOẶC Hóa đơn cho Nhân viên bán hàng */}
      <Tabs.Screen
        key="analytics"
        name="analytics"
        options={
          isAdmin
            ? {
                title: 'Phân tích',
                tabBarIcon: ({ color, focused }) => (
                  <Ionicons name={focused ? 'pie-chart' : 'pie-chart-outline'} size={23} color={color} />
                ),
              }
            : { href: null }
        }
      />
      <Tabs.Screen
        key="invoices"
        name="invoices"
        options={
          !isAdmin
            ? {
                title: 'Hóa đơn',
                tabBarIcon: ({ color, focused }) => (
                  <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={23} color={color} />
                ),
              }
            : { href: null }
        }
      />

      {/* Tab 3 Trung tâm: Giám sát Hệ thống cho Admin HOẶC Quét QR Bán hàng cho Nhân viên */}
      <Tabs.Screen
        key="system-monitor"
        name="system-monitor"
        options={
          isAdmin
            ? {
                title: '',
                tabBarIcon: () => (
                  <View
                    style={{
                      width: 56,
                      height: 52,
                      borderRadius: 16,
                      backgroundColor: adminGold,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: 14,
                      elevation: 6,
                      shadowColor: adminGold,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.35,
                      shadowRadius: 6,
                      borderWidth: 2,
                      borderColor: '#FFF',
                    }}
                  >
                    <Ionicons name="server-outline" size={26} color="#fff" />
                  </View>
                ),
              }
            : { href: null }
        }
      />
      <Tabs.Screen
        key="scanner"
        name="scanner"
        options={
          !isAdmin
            ? {
                title: '',
                tabBarIcon: () => (
                  <View
                    style={{
                      width: 56,
                      height: 52,
                      borderRadius: 16,
                      backgroundColor: adminGold,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: 14,
                      elevation: 6,
                      shadowColor: adminGold,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.35,
                      shadowRadius: 6,
                      borderWidth: 2,
                      borderColor: '#FFF',
                    }}
                  >
                    <Ionicons name="scan-outline" size={26} color="#fff" />
                  </View>
                ),
              }
            : { href: null }
        }
      />

      <Tabs.Screen
        key="notifications"
        name="notifications"
        options={{
          title: 'Thông báo',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={23} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        key="settings"
        name="settings"
        options={{
          title: 'Cài đặt',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={23} color={color} />
          ),
        }}
      />

      {/* Ẩn các màn hình chi tiết khỏi tab bar nhưng vẫn điều hướng được */}
      <Tabs.Screen key="products" name="products" options={{ href: null }} />
      <Tabs.Screen key="customers" name="customers" options={{ href: null }} />
      <Tabs.Screen key="employees" name="employees" options={{ href: null }} />
      <Tabs.Screen key="reports" name="reports" options={{ href: null }} />
      <Tabs.Screen key="employee-reports" name="employee-reports" options={{ href: null }} />
      <Tabs.Screen key="customer-reports" name="customer-reports" options={{ href: null }} />
      <Tabs.Screen key="vouchers" name="vouchers" options={{ href: null }} />
      <Tabs.Screen key="chat" name="chat" options={{ href: null }} />
      <Tabs.Screen key="inventory" name="inventory" options={{ href: null }} />
      <Tabs.Screen key="stores" name="stores" options={{ href: null }} />
      <Tabs.Screen key="news" name="news" options={{ href: null }} />
      <Tabs.Screen key="profile" name="profile" options={{ href: null }} />
      <Tabs.Screen key="security" name="security" options={{ href: null }} />
      <Tabs.Screen key="audit" name="audit" options={{ href: null }} />
      <Tabs.Screen key="roles" name="roles" options={{ href: null }} />
      <Tabs.Screen key="language" name="language" options={{ href: null }} />
      <Tabs.Screen key="pre-orders" name="pre-orders" options={{ href: null }} />
      <Tabs.Screen key="batches" name="batches" options={{ href: null }} />
      <Tabs.Screen key="import-batch" name="import-batch" options={{ href: null }} />
      <Tabs.Screen key="signature-approval" name="signature-approval" options={{ href: null }} />
      <Tabs.Screen key="disposal" name="disposal" options={{ href: null }} />
      <Tabs.Screen key="categories" name="categories" options={{ href: null }} />
      <Tabs.Screen key="feature-lock" name="feature-lock" options={{ href: null }} />
      <Tabs.Screen key="attendance" name="attendance" options={{ href: null }} />
      <Tabs.Screen key="reviews" name="reviews" options={{ href: null }} />
    </Tabs>
  );
}
