import apiClient from '../apiClient';

export interface ChatMessage {
  id: number;
  cuocTroChuyenId?: number;
  nguoiGuiType?: 'khachhang' | 'nhanvien' | 'bot' | number;
  noiDung?: string;
  message?: string;
  daDoc?: number;
  createdAt?: string;
  created_at?: string;
  HOTEN?: string;
  sender_username?: string;
}

export interface ConversationItem {
  id: number;
  khachHangId: number;
  trangThaiChat: string;
  createdAt?: string;
  updatedAt?: string;
  khachhang?: {
    id: number;
    hoTen: string;
    soDienThoai?: string;
    taikhoan?: {
      email?: string;
      username?: string;
    };
  };
  tinnhans?: ChatMessage[];
}

export const chatApi = {
  // === KHÁCH HÀNG CHAT ===
  async getConversations(): Promise<ConversationItem[]> {
    const res = await apiClient.get('/chat/conversations');
    return Array.isArray(res.data) ? res.data : [];
  },

  async getMessages(conversationId: number | string): Promise<ChatMessage[]> {
    const res = await apiClient.get(`/chat/conversations/${conversationId}/messages`);
    return Array.isArray(res.data) ? res.data : [];
  },

  async sendMessage(conversationId: number | string, content: string): Promise<any> {
    const res = await apiClient.post(`/chat/conversations/${conversationId}/messages`, {
      NOIDUNG: content,
    });
    return res.data;
  },

  // === CHAT NỘI BỘ ===
  async getInternalMessages(channel: string): Promise<ChatMessage[]> {
    const res = await apiClient.get(`/chat/internal/${channel}/messages`);
    return Array.isArray(res.data) ? res.data : [];
  },

  async sendInternalMessage(channel: string, content: string): Promise<any> {
    const res = await apiClient.post(`/chat/internal/${channel}/messages`, {
      NOIDUNG: content,
    });
    return res.data;
  },
};

