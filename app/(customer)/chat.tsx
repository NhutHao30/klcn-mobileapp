import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useColorScheme,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';
import { chatApi, ChatMessage } from '@/services/api/chatApi';
import apiClient from '@/services/apiClient';
import LoginRequiredModal from '@/components/LoginRequiredModal';

export default function CustomerChatPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { isLoggedIn, user } = useAuth();

  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loginModalVisible, setLoginModalVisible] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const pollIntervalRef = useRef<any>(null);

  // 1. Khởi tạo hoặc lấy đoạn chat đang hoạt động
  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      setLoginModalVisible(true);
      return;
    }

    let isMounted = true;

    const initChat = async () => {
      try {
        setLoading(true);
        // Bắt đầu hoặc lấy đoạn chat
        const startRes = await apiClient.post('/chat/start');
        const cId = startRes.data?.id;
        if (isMounted && cId) {
          setConversationId(cId);
          // Lấy tin nhắn
          const msgs = await chatApi.getMessages(cId);
          if (isMounted) {
            setMessages(msgs);
          }
        }
      } catch (err: any) {
        console.error('Error init chat:', err);
        // Thử lấy danh sách cuộc trò chuyện
        try {
          const list = await chatApi.getConversations();
          if (isMounted && list.length > 0) {
            setConversationId(list[0].id);
            const msgs = await chatApi.getMessages(list[0].id);
            if (isMounted) setMessages(msgs);
          }
        } catch (e) {}
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initChat();

    return () => {
      isMounted = false;
    };
  }, [isLoggedIn]);

  // 2. Định kỳ cập nhật tin nhắn mới mỗi 3.5 giây
  useEffect(() => {
    if (!conversationId) return;

    pollIntervalRef.current = setInterval(async () => {
      try {
        const latestMsgs = await chatApi.getMessages(conversationId);
        if (Array.isArray(latestMsgs) && latestMsgs.length > 0) {
          setMessages(prev => {
            const serverTexts = new Set(
              latestMsgs
                .filter(m => m.nguoiGuiType === 'khachhang' || m.nguoiGuiType === 0)
                .map(m => (m.noiDung || '').trim())
            );
            const pendingTemps = prev.filter(m => 
              typeof m.id === 'number' && m.id > 1700000000000 &&
              !serverTexts.has((m.noiDung || '').trim())
            );
            return [...latestMsgs, ...pendingTemps];
          });
        }
      } catch (e) {
        // im lặng bỏ qua lỗi polling
      }
    }, 3500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [conversationId]);

  // Tự động cuộn xuống cuối
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Gửi tin nhắn
  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text) return;

    if (!isLoggedIn) {
      setLoginModalVisible(true);
      return;
    }

    if (!conversationId) {
      Alert.alert('Thông báo', 'Đang kết nối tới tổng đài CSKH, vui lòng thử lại sau giây lát!');
      return;
    }

    setInputText('');
    setSending(true);

    // Tạo tin nhắn tạm thời hiển thị ngay trên UI
    const tempId = Date.now();
    const tempMsg: ChatMessage = {
      id: tempId,
      cuocTroChuyenId: conversationId,
      nguoiGuiType: 'khachhang',
      noiDung: text,
      daDoc: 0,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await chatApi.sendMessage(conversationId, text);
      setMessages((prev) => {
        const withoutTemp = prev.filter(m => m.id !== tempId);
        const serverMsg = res?.data || res;
        const list = withoutTemp.some(m => m.id === serverMsg.id) ? withoutTemp : [...withoutTemp, serverMsg];
        if (res?.bot_reply) {
          return list.some(m => m.id === res.bot_reply.id) ? list : [...list, res.bot_reply];
        }
        return list;
      });
    } catch (err: any) {
      console.error('Send message error:', err);
      Alert.alert('Lỗi', 'Không thể gửi tin nhắn. Vui lòng kiểm tra lại kết nối!');
    } finally {
      setSending(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(customer)');
    }
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isMine =
      item.nguoiGuiType === 'khachhang' ||
      item.nguoiGuiType === 0 ||
      (item as any).LOAINGUOIGUI === 'khachhang';

    const isBot =
      item.nguoiGuiType === 'bot' ||
      item.nguoiGuiType === 2 ||
      (item as any).isBot === true;

    const content = item.noiDung || item.message || '';
    const timeStr = item.createdAt
      ? new Date(item.createdAt).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    return (
      <View
        style={[
          styles.messageRow,
          isMine ? styles.messageRowMine : styles.messageRowTheirs,
        ]}
      >
        {!isMine && (
          <View
            style={[
              styles.avatarContainer,
              { backgroundColor: isBot ? '#6366f1' : '#d97706' },
            ]}
          >
            <Ionicons
              name={isBot ? 'hardware-chip-outline' : 'headset-outline'}
              size={16}
              color="#ffffff"
            />
          </View>
        )}

        <View style={{ maxWidth: '78%' }}>
          {!isMine && (
            <ThemedText style={styles.senderLabel}>
              {isBot ? 'Trợ lý Givral AI' : 'CSKH Givral Bakery'}
            </ThemedText>
          )}

          <View
            style={[
              styles.bubble,
              isMine
                ? [styles.bubbleMine, { backgroundColor: colors.tint }]
                : [
                    styles.bubbleTheirs,
                    {
                      backgroundColor:
                        colorScheme === 'dark' ? '#1e293b' : '#ffffff',
                      borderColor:
                        colorScheme === 'dark' ? '#334155' : '#e2e8f0',
                    },
                  ],
            ]}
          >
            <ThemedText
              style={[
                styles.messageText,
                isMine
                  ? { color: '#ffffff' }
                  : { color: colorScheme === 'dark' ? '#f1f5f9' : '#1e293b' },
              ]}
            >
              {content}
            </ThemedText>
          </View>

          {timeStr ? (
            <ThemedText
              style={[
                styles.timeText,
                isMine ? { textAlign: 'right', marginRight: 4 } : { marginLeft: 4 },
              ]}
            >
              {timeStr}
            </ThemedText>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <View style={styles.headerAvatar}>
            <Ionicons name="headset" size={20} color="#d97706" />
          </View>
          <View>
            <ThemedText style={styles.headerTitle}>Hỗ trợ & Tư vấn Givral</ThemedText>
            <View style={styles.statusRow}>
              <View style={styles.onlineDot} />
              <ThemedText style={styles.statusText}>Trực tuyến 24/7 (CSKH & Trợ lý AI)</ThemedText>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.faqButton}
          onPress={() => router.push('/(customer)/faq')}
        >
          <Ionicons name="help-circle-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* CHAT BODY */}
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
            <ThemedText style={{ marginTop: 12, color: colors.icon }}>
              Đang kết nối trung tâm hỗ trợ...
            </ThemedText>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) => String(item.id || index)}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.welcomeCard}>
                  <Ionicons name="chatbubbles" size={42} color={colors.tint} />
                  <ThemedText style={styles.welcomeTitle}>
                    Xin chào {user?.HOTEN || user?.USERNAME || 'bạn'}! 👋
                  </ThemedText>
                  <ThemedText style={styles.welcomeSub}>
                    Givral Bakery luôn sẵn sàng hỗ trợ bạn chọn loại bánh ưng ý, tra cứu địa chỉ chi nhánh hoặc theo dõi đơn hàng.
                  </ThemedText>
                </View>
              </View>
            }
          />
        )}

        {/* INPUT BAR */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#ffffff',
              borderTopColor: colorScheme === 'dark' ? '#1e293b' : '#f1f5f9',
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colorScheme === 'dark' ? '#1e293b' : '#f8fafc',
                color: colorScheme === 'dark' ? '#f8fafc' : '#0f172a',
                borderColor: colorScheme === 'dark' ? '#334155' : '#e2e8f0',
              },
            ]}
            placeholder="Nhập câu hỏi hoặc yêu cầu tư vấn..."
            placeholderTextColor="#94a3b8"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: inputText.trim() ? colors.tint : '#94a3b8',
              },
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="send" size={18} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <LoginRequiredModal
        visible={loginModalVisible}
        actionText="trò chuyện với nhân viên CSKH và Trợ lý AI"
        onClose={() => {
          setLoginModalVisible(false);
          router.replace('/(customer)');
        }}
      />
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
    paddingTop: Platform.OS === 'ios' ? 50 : 38,
    paddingBottom: 14,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  faqButton: {
    padding: 6,
    marginLeft: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#22c55e',
  },
  statusText: {
    color: '#fef08a',
    fontSize: 11,
    fontWeight: '500',
  },
  keyboardContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  welcomeCard: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    maxWidth: 340,
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400e',
    marginTop: 10,
    marginBottom: 6,
    textAlign: 'center',
  },
  welcomeSub: {
    fontSize: 13,
    color: '#78350f',
    textAlign: 'center',
    lineHeight: 18,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 6,
    gap: 8,
  },
  messageRowMine: {
    justifyContent: 'flex-end',
  },
  messageRowTheirs: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  senderLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 2,
    marginLeft: 4,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleMine: {
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  timeText: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

