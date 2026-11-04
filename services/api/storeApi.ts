import apiClient from '@/services/apiClient';

export const storeApi = {
  async getPublicStores() {
    const response = await apiClient.get('/stores');
    return response.data;
  },
};
