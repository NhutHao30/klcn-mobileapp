import apiClient from '@/services/apiClient';

export const cartApi = {
  async getCart() {
    try {
      const response = await apiClient.get('/cart');
      return response.data;
    } catch (e) {
      console.log('Error fetching remote cart:', e);
      return null;
    }
  },

  async addToCart(masp: string, quantity: number = 1) {
    try {
      const response = await apiClient.post('/cart/add', { masp, quantity });
      return response.data;
    } catch (e) {
      console.log('Error adding item to remote cart:', e);
      return null;
    }
  },

  async updateQuantity(masp: string, quantity: number) {
    try {
      const response = await apiClient.put('/cart/update', { masp, quantity });
      return response.data;
    } catch (e) {
      console.log('Error updating quantity in remote cart:', e);
      return null;
    }
  },

  async removeFromCart(masp: string) {
    try {
      const response = await apiClient.delete(`/cart/remove/${masp}`);
      return response.data;
    } catch (e) {
      console.log('Error removing item from remote cart:', e);
      return null;
    }
  },
};
