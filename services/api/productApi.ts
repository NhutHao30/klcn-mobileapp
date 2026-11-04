import apiClient from '@/services/apiClient';

export const productApi = {
  async getCategories() {
    const response = await apiClient.get('/categories');
    return response.data;
  },

  async getProducts(params?: { category?: string; search?: string; page?: number }) {
    const response = await apiClient.get('/products', { params });
    return response.data;
  },

  async getBestSellers() {
    const response = await apiClient.get('/products/best-sellers');
    return response.data;
  },

  async getHomepageProducts() {
    const response = await apiClient.get('/products/homepage');
    return response.data;
  },

  async getProductDetail(id: string) {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  },
};
