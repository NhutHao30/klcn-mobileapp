import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import { chatApi, ConversationItem, ChatMessage } from '@/services/api/chatApi';
import { useAuth } from '@/context/AuthContext';

const INTERNAL_CHANNELS = [
  { id: 'all', label: '📢 Toàn hệ thống', desc: 'Thông báo & thảo luận chung' },
  { id: 'managers', label: '👔 Ban quản lý', desc: 'Giám đốc & Quản lý chi nhánh' },
  { id: 'branch_1', label: '🏪 Chi nhánh Quận 1', desc: 'Nội bộ cửa hàng Q1' },
];

export default function AdminChat() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { user } = useAuth();
  const myUsername = user?.USERNAME || user?.username || '';

  const [activeTab, setActiveTab] = useState<'customer' | 'internal'>('customer');
  const [searchQuery, setSearchQuery] = useState('');

  // Customer Chat State
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loadingConv, setLoadingConv] = useState(false);
  const [refreshingConv, setRefreshingConv] = useState(false);
  const [selectedConv, setSelectedConv] = useState<ConversationItem | null>(null);
  const [convMessages, setConvMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [msgInput, setMsgInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Internal Chat State
  const [activeChannel, setActiveChannel] = useState('all');
  const [internalMessages, setInternalMessages] = useState<ChatMessage[]>([]);
  const [loadingInternal, setLoadingInternal] = useState(false);
  const [refreshingInternal, setRefreshingInternal] = useState(false);
  const [internalInput, setInternalInput] = useState('');
  const [sendingInternal, setSendingInternal] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const internalFlatListRef = useRef<FlatList>(null);

  // Load customer conversations
  const loadConversations = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshingConv(true);
      else if (conversations.length === 0) setLoadingConv(true);
      const res = await chatApi.getConversations();
      setConversations(res);
    } catch (e) {
      console.error('Failed to load conversations:', e);
    } finally {
      setLoadingConv(false);
      setRefreshingConv(false);
    }
  };

  // Load messages of selected conversation
  const loadMessages = async (convId: number) => {
    try {
      const msgs = await chatApi.getMessages(convId);
      setConvMessages(msgs);
    } catch (e) {
      console.error('Failed to load messages:', e);
    }
  };

  // Open conversation
  const handleOpenConversation = async (conv: ConversationItem) => {
    setSelectedConv(conv);
    setConvMessages([]);
    setLoadingMessages(true);
    await loadMessages(conv.id);
    setLoadingMessages(false);
  };

  // Send message to customer
  const handleSendMessage = async () => {
    if (!msgInput.trim() || !selectedConv || sendingMsg) return;
    const text = msgInput.trim();
    setMsgInput('');
    setSendingMsg(true);
    try {
      await chatApi.sendMessage(selectedConv.id, text);
      await loadMessages(selectedConv.id);
      loadConversations();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.error || 'Không thể gửi tin nhắn.');
    } finally {
      setSendingMsg(false);
    }
  };

  // Load internal messages
  const loadInternalMessages = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshingInternal(true);
      else if (internalMessages.length === 0) setLoadingInternal(true);
      const msgs = await chatApi.getInternalMessages(activeChannel);
      setInternalMessages(msgs);
    } catch (e) {
      console.error('Failed to load internal messages:', e);
    } finally {
      setLoadingInternal(false);
      setRefreshingInternal(false);
    }
  };

  // Send internal message
  const handleSendInternal = async () => {
    if (!internalInput.trim() || sendingInternal) return;
    const text = internalInput.trim();
    setInternalInput('');
    setSendingInternal(true);
    try {
      await chatApi.sendInternalMessage(activeChannel, text);
      await loadInternalMessages();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.error || 'Không thể gửi tin nhắn nội bộ.');
    } finally {
      setSendingInternal(false);
    }
  };

  // Polling hook
  useEffect(() => {
    loadConversations();
    loadInternalMessages();

    const interval = setInterval(() => {
      if (activeTab === 'customer') {
        if (selectedConv) {
          loadMessages(selectedConv.id);
        } else {
          loadConversations();
        }
      } else {
        loadInternalMessages();
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [activeTab, selectedConv?.id, activeChannel]);

  // Filter conversations
  const filteredConversations = conversations.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const name = (item.khachhang?.hoTen || '').toLowerCase();
    const phone = (item.khachhang?.soDienThoai || '').toLowerCase();
    return name.includes(q) || phone.includes(q);
  });

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: '#d97706' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={{ color: '#fff', fontSize: 19, fontWeight: 'bold' }}>
          Tin nhắn & Hỗ trợ CSKH
        </ThemedText>
      </View>

      {/* TABS */}
      <View style={[styles.tabsContainer, { borderBottomColor: colors.icon + '20' }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'customer' && styles.activeTab]}
          onPress={() => setActiveTab('customer')}
        >
          <Ionicons
            name="people-outline"
            size={18}
            color={activeTab === 'customer' ? '#d97706' : colors.icon}
          />
          <ThemedText
            style={[styles.tabText, activeTab === 'customer' && { color: '#d97706', fontWeight: 'bold' }]}
          >
            Khách hàng ({conversations.length})
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'internal' && styles.activeTab]}
          onPress={() => setActiveTab('internal')}
        >
          <Ionicons
            name="chatbubbles-outline"
            size={18}
            color={activeTab === 'internal' ? '#d97706' : colors.icon}
          />
          <ThemedText
            style={[styles.tabText, activeTab === 'internal' && { color: '#d97706', fontWeight: 'bold' }]}
          >
            Chat nội bộ
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* TAB 1: CUSTOMER CHAT */}
      {activeTab === 'customer' && (
        <View style={{ flex: 1 }}>
          {/* SEARCH */}
          <View style={[styles.searchWrapper, { borderBottomColor: colors.icon + '20' }]}>
            <View style={[styles.searchContainer, { backgroundColor: colors.icon + '15' }]}>
              <Ionicons name="search" size={18} color={colors.icon} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Tìm theo tên hoặc số điện thoại khách hàng..."
                placeholderTextColor={colors.icon}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={colors.icon} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {loadingConv ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#d97706" />
              <ThemedText style={{ marginTop: 8, color: '#666' }}>Đang tải danh sách cuộc trò chuyện...</ThemedText>
            </View>
          ) : (
            <FlatList
              data={filteredConversations}
              keyExtractor={(item) => String(item.id)}
              refreshControl={
                <RefreshControl refreshing={refreshingConv} onRefresh={() => loadConversations(true)} colors={['#d97706']} />
              }
              contentContainerStyle={{ paddingBottom: 30 }}
              renderItem={({ item }) => {
                const customerName = item.khachhang?.hoTen || 'Khách hàng #' + item.id;
                const phone = item.khachhang?.soDienThoai || '';
                const lastMsg = item.tinnhans && item.tinnhans.length > 0 ? item.tinnhans[0] : null;
                const lastMsgText = lastMsg ? (lastMsg.noiDung || lastMsg.message || '') : 'Bắt đầu cuộc trò chuyện';
                const lastTime = item.updatedAt ? new Date(item.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
                const isUnread = lastMsg && lastMsg.daDoc === 0 && lastMsg.nguoiGuiType === 0;

                return (
                  <TouchableOpacity
                    style={[styles.chatItem, { borderBottomColor: colors.icon + '20' }]}
                    onPress={() => handleOpenConversation(item)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={{
                        uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(customerName)}&background=FDE68A&color=991B1B&bold=true`,
                      }}
                      style={styles.avatar}
                    />
                    <View style={styles.chatInfo}>
                      <View style={styles.chatHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                          <ThemedText style={styles.chatName} numberOfLines={1}>
                            {customerName}
                          </ThemedText>
                          {phone ? (
                            <View style={styles.phoneBadge}>
                              <ThemedText style={styles.phoneBadgeText}>{phone}</ThemedText>
                            </View>
                          ) : null}
                        </View>
                        <ThemedText style={styles.chatTime}>{lastTime}</ThemedText>
                      </View>
                      <View style={styles.chatFooter}>
                        <ThemedText
                          style={[styles.chatMessage, isUnread && { color: colors.text, fontWeight: 'bold' }]}
                          numberOfLines={1}
                        >
                          {lastMsgText}
                        </ThemedText>
                        {isUnread && (
                          <View style={[styles.unreadBadge, { backgroundColor: '#d97706' }]}>
                            <ThemedText style={styles.unreadText}>Mới</ThemedText>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.centerContainer}>
                  <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
                  <ThemedText style={styles.emptyText}>Chưa có cuộc trò chuyện nào từ khách hàng</ThemedText>
                </View>
              }
            />
          )}
        </View>
      )}

      {/* TAB 2: INTERNAL CHAT */}
      {activeTab === 'internal' && (
        <View style={{ flex: 1 }}>
          {/* CHANNEL SELECTOR */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.channelScroll}
            contentContainerStyle={styles.channelContainer}
          >
            {INTERNAL_CHANNELS.map((ch) => {
              const isActive = activeChannel === ch.id;
              return (
                <TouchableOpacity
                  key={ch.id}
                  style={[
                    styles.channelChip,
                    isActive ? { backgroundColor: '#d97706', borderColor: '#d97706' } : { backgroundColor: colors.icon + '15', borderColor: colors.icon + '25' },
                  ]}
                  onPress={() => setActiveChannel(ch.id)}
                >
                  <ThemedText style={[styles.channelChipText, isActive && { color: '#fff', fontWeight: 'bold' }]}>
                    {ch.label}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* CHANNEL MESSAGES */}
          {loadingInternal ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#d97706" />
              <ThemedText style={{ marginTop: 8, color: '#666' }}>Đang tải tin nhắn nội bộ...</ThemedText>
            </View>
          ) : (
            <FlatList
              ref={internalFlatListRef}
              data={internalMessages}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() => internalFlatListRef.current?.scrollToEnd({ animated: true })}
              refreshControl={
                <RefreshControl refreshing={refreshingInternal} onRefresh={() => loadInternalMessages(true)} colors={['#d97706']} />
              }
              renderItem={({ item }) => {
                const isMe = item.sender_username === myUsername;
                const senderName = item.HOTEN || item.sender_username || 'Nhân viên';
                const timeStr = item.created_at || item.createdAt
                  ? new Date(item.created_at || item.createdAt || '').toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                  : '';

                return (
                  <View style={[styles.msgRow, isMe ? styles.msgRowRight : styles.msgRowLeft]}>
                    {!isMe && (
                      <View style={styles.senderAvatar}>
                        <ThemedText style={styles.senderAvatarText}>{senderName.charAt(0).toUpperCase()}</ThemedText>
                      </View>
                    )}
                    <View style={[styles.msgBubble, isMe ? styles.myBubble : styles.otherBubble]}>
                      {!isMe && <ThemedText style={styles.internalSenderTitle}>{senderName}</ThemedText>}
                      <ThemedText style={[styles.msgText, isMe ? styles.myMsgText : styles.otherMsgText]}>
                        {item.message || item.noiDung}
                      </ThemedText>
                      {timeStr ? (
                        <ThemedText style={[styles.msgTime, isMe ? { color: '#FFCDD2' } : { color: '#888' }]}>
                          {timeStr}
                        </ThemedText>
                      ) : null}
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.centerContainer}>
                  <Ionicons name="chatbox-ellipses-outline" size={44} color="#ccc" />
                  <ThemedText style={styles.emptyText}>Chưa có tin nhắn trong kênh này. Hãy là người đầu tiên nhắn tin!</ThemedText>
                </View>
              }
            />
          )}

          {/* INTERNAL INPUT BAR */}
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={[styles.inputBar, { backgroundColor: colors.background, borderTopColor: colors.icon + '20' }]}>
              <TextInput
                style={[styles.msgInput, { color: colors.text, borderColor: colors.icon + '30' }]}
                placeholder={`Nhắn tin trong kênh ${INTERNAL_CHANNELS.find((c) => c.id === activeChannel)?.label}...`}
                placeholderTextColor={colors.icon}
                value={internalInput}
                onChangeText={setInternalInput}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!internalInput.trim() || sendingInternal) && { opacity: 0.5 }]}
                onPress={handleSendInternal}
                disabled={!internalInput.trim() || sendingInternal}
              >
                {sendingInternal ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* CUSTOMER CONVERSATION MODAL */}
      {selectedConv && (
        <Modal visible={!!selectedConv} animationType="slide" onRequestClose={() => setSelectedConv(null)}>
          <ThemedView style={{ flex: 1 }}>
            {/* MODAL HEADER */}
            <View style={[styles.header, { backgroundColor: '#d97706', justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <TouchableOpacity onPress={() => setSelectedConv(null)} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ color: '#fff', fontSize: 17, fontWeight: 'bold' }} numberOfLines={1}>
                    {selectedConv.khachhang?.hoTen || 'Khách hàng #' + selectedConv.id}
                  </ThemedText>
                  <ThemedText style={{ color: '#FFCDD2', fontSize: 12 }}>
                    {selectedConv.khachhang?.soDienThoai ? `SĐT: ${selectedConv.khachhang.soDienThoai}` : 'Tư vấn trực tuyến'}
                  </ThemedText>
                </View>
              </View>
              <TouchableOpacity onPress={() => loadMessages(selectedConv.id)} style={{ padding: 8 }}>
                <Ionicons name="refresh" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* MESSAGE LIST */}
            {loadingMessages ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#d97706" />
                <ThemedText style={{ marginTop: 8, color: '#666' }}>Đang tải tin nhắn...</ThemedText>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={convMessages}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.messagesList}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                renderItem={({ item }) => {
                  const isCustomer = item.nguoiGuiType === 'khachhang' || item.nguoiGuiType === 0;
                  const isBot = item.nguoiGuiType === 'bot' || item.nguoiGuiType === 2;
                  const time = item.created_at || item.createdAt
                    ? new Date(item.created_at || item.createdAt || '').toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                    : '';

                  return (
                    <View style={[styles.msgRow, !isCustomer ? styles.msgRowRight : styles.msgRowLeft]}>
                      {isCustomer && (
                        <View style={styles.senderAvatar}>
                          <Ionicons name="person" size={14} color="#d97706" />
                        </View>
                      )}
                      <View
                        style={[
                          styles.msgBubble,
                          !isCustomer
                            ? styles.myBubble
                            : isBot
                            ? { backgroundColor: '#EDE9FE', borderLeftWidth: 3, borderLeftColor: '#7C3AED' }
                            : styles.otherBubble,
                        ]}
                      >
                        {isBot ? (
                          <ThemedText style={{ fontSize: 11, fontWeight: 'bold', color: '#7C3AED', marginBottom: 2 }}>
                            🤖 Trợ lý AI Givral
                          </ThemedText>
                        ) : null}
                        <ThemedText
                          style={[
                            styles.msgText,
                            !isCustomer ? styles.myMsgText : styles.otherMsgText,
                          ]}
                        >
                          {item.noiDung || item.message}
                        </ThemedText>
                        {time ? (
                          <ThemedText style={[styles.msgTime, !isCustomer ? { color: '#FFCDD2' } : { color: '#888' }]}>
                            {time}
                          </ThemedText>
                        ) : null}
                      </View>
                    </View>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.centerContainer}>
                    <ThemedText style={styles.emptyText}>Chưa có tin nhắn trong cuộc trò chuyện này</ThemedText>
                  </View>
                }
              />
            )}

            {/* SEND BAR */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <View style={[styles.inputBar, { backgroundColor: colors.background, borderTopColor: colors.icon + '20' }]}>
                <TextInput
                  style={[styles.msgInput, { color: colors.text, borderColor: colors.icon + '30' }]}
                  placeholder="Nhập tin nhắn phản hồi khách hàng..."
                  placeholderTextColor={colors.icon}
                  value={msgInput}
                  onChangeText={setMsgInput}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.sendBtn, (!msgInput.trim() || sendingMsg) && { opacity: 0.5 }]}
                  onPress={handleSendMessage}
                  disabled={!msgInput.trim() || sendingMsg}
                >
                  {sendingMsg ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="send" size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </ThemedView>
        </Modal>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 44,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: { width: 36, height: 36, justifyContent: 'center' },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#d97706',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14 },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 8,
    fontSize: 14,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 14,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#FFE4E6',
  },
  chatInfo: { flex: 1 },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  phoneBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
  },
  phoneBadgeText: { fontSize: 11, color: '#475569', fontWeight: '600' },
  chatTime: { fontSize: 11, color: '#888' },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatMessage: {
    fontSize: 13,
    color: '#666',
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  channelScroll: {
    maxHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  channelContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  channelChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  channelChipText: { fontSize: 13, color: '#475569' },
  messagesList: {
    padding: 16,
    paddingBottom: 24,
  },
  msgRow: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end',
    gap: 8,
  },
  msgRowRight: { justifyContent: 'flex-end' },
  msgRowLeft: { justifyContent: 'flex-start' },
  senderAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  senderAvatarText: { fontSize: 12, fontWeight: 'bold', color: '#d97706' },
  msgBubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  myBubble: {
    backgroundColor: '#d97706',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#F1F5F9',
    borderBottomLeftRadius: 4,
  },
  myMsgText: { color: '#fff', fontSize: 14 },
  otherMsgText: { color: '#1E293B', fontSize: 14 },
  msgText: { lineHeight: 20 },
  msgTime: { fontSize: 10, alignSelf: 'flex-end', marginTop: 4 },
  internalSenderTitle: { fontSize: 11, fontWeight: 'bold', color: '#d97706', marginBottom: 2 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  msgInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#d97706',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

