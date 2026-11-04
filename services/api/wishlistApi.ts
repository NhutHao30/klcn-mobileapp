import apiClient from '@/services/apiClient';

export interface WishlistApiItem {
  id: string | number;
  masp: string | number;
  MASP: string | number;
  name: string;
  tenSP: string;
  price: number;
  salePrice?: number;
  image: string;
  category?: string;
}

export const wishlistApi = {
  async getWishlist(): Promise<WishlistApiItem[]> {
    try {
      const response = await apiClient.get('/wishlist');
      const data = response.data;
      return Array.isArray(data) ? data : (data?.data || []);
    } catch (e) {
      console.log('Error fetching wishlist from backend:', e);
      return [];
    }
  },

  async addToWishlist(masp: string | number) {
    const response = await apiClient.post('/wishlist', { masp });
    return response.data;
  },

  async removeFromWishlist(masp: string | number) {
    const response = await apiClient.delete(`/wishlist/${masp}`);
    return response.data;
  },
};
