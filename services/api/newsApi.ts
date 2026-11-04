import apiClient from '@/services/apiClient';

export const newsApi = {
  async getNews(params?: { limit?: number; page?: number; search?: string }) {
    const response = await apiClient.get('/news', { params });
    return response.data;
  },

  async getNewsDetail(id: string | number) {
    const response = await apiClient.get(`/news/${id}`);
    return response.data;
  },

  async getNewsComments(id: string | number) {
    const response = await apiClient.get(`/news/${id}/comments`);
    return response.data;
  },

  async postNewsComment(id: string | number, content: string, parentId?: string | number | null) {
    const response = await apiClient.post(`/news/${id}/comments`, {
      noidung: content,
      NOIDUNG: content,
      NOI_DUNG: content,
      noiDung: content,
      parent_id: parentId ?? null,
      PARENT_ID: parentId ?? null,
      parentId: parentId ?? null,
    });
    return response.data;
  },
};

