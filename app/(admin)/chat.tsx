import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';

const MOCK_CHATS = [
  { id: '1', name: 'Nguyễn Văn A', type: 'customer', message: 'Bánh kem bắp có size 20cm không shop?', time: '10:45 AM', unread: 2, avatar: 'https://i.pravatar.cc/150?img=11' },
  { id: '2', name: 'Trần Thị B', type: 'customer', message: 'Cảm ơn shop, bánh rất ngon!', time: 'Hôm qua', unread: 0, avatar: 'https://i.pravatar.cc/150?img=5' },
  { id: '3', name: 'Lê Văn C (Kho)', type: 'internal', message: 'Đã nhập 50kg bột mì vào kho trung tâm.', time: '09:00 AM', unread: 1, avatar: 'https://i.pravatar.cc/150?img=33' },
  { id: '4', name: 'Nhóm Cửa Hàng 1', type: 'internal', message: 'Hôm nay doanh thu đạt chỉ tiêu nhé mọi người.', time: 'Hôm qua', unread: 0, avatar: 'https://ui-avatars.com/api/?name=CH1&background=0D8ABC&color=fff' },
];

export default function AdminChat() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('customer');

  const filteredChats = MOCK_CHATS.filter(chat => chat.type === activeTab);

  return (
    <ThemedView style={styles.container}>
      <View style={{ paddingTop: 40, paddingBottom: 16, backgroundColor: colors.headerBg, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>Tin nhắn & Hỗ trợ</ThemedText>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { borderBottomColor: colors.icon + '20' }]}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'customer' && { borderBottomColor: colors.tint, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('customer')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'customer' && { color: colors.tint, fontWeight: 'bold' }]}>
            Khách hàng
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'internal' && { borderBottomColor: colors.tint, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('internal')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'internal' && { color: colors.tint, fontWeight: 'bold' }]}>
            Nội bộ
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchWrapper, { borderBottomColor: colors.icon + '20' }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.icon + '15' }]}>
          <Ionicons name="search" size={20} color={colors.icon} style={styles.searchIcon} />
          <TextInput 
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Tìm kiếm tin nhắn..."
            placeholderTextColor={colors.icon}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {filteredChats.map(chat => (
          <TouchableOpacity key={chat.id} style={[styles.chatItem, { borderBottomColor: colors.icon + '20' }]}>
            <Image source={{ uri: chat.avatar }} style={styles.avatar} />
            <View style={styles.chatInfo}>
              <View style={styles.chatHeader}>
                <ThemedText style={styles.chatName}>{chat.name}</ThemedText>
                <ThemedText style={styles.chatTime}>{chat.time}</ThemedText>
              </View>
              <View style={styles.chatFooter}>
                <ThemedText style={[styles.chatMessage, chat.unread > 0 && { color: colors.text, fontWeight: 'bold' }]} numberOfLines={1}>
                  {chat.message}
                </ThemedText>
                {chat.unread > 0 && (
                  <View style={[styles.unreadBadge, { backgroundColor: colors.tint }]}>
                    <ThemedText style={styles.unreadText}>{chat.unread}</ThemedText>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}
        {filteredChats.length === 0 && (
          <ThemedText style={styles.emptyText}>Không có tin nhắn nào</ThemedText>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.tint }]}>
        <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    paddingHorizontal: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 16,
    opacity: 0.7,
  },
  searchWrapper: {
    padding: 12,
    borderBottomWidth: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
  },
  listContent: {
    paddingBottom: 80, // for FAB
  },
  chatItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  chatTime: {
    fontSize: 12,
    opacity: 0.6,
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatMessage: {
    fontSize: 14,
    opacity: 0.7,
    flex: 1,
    paddingRight: 12,
  },
  unreadBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.5,
    marginTop: 40,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
