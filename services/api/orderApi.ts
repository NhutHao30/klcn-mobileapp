import apiClient from '@/services/apiClient';

export interface CheckoutPayload {
  HOTEN: string;
  SDT: string;
  DIACHI: string;
  GHICHU?: string;
  HINHTHUC_THANHTOAN: string;
  MA_VOUCHER?: string;
  receiptUri?: string | null;
  to_ward_code?: string;
  to_district_id?: number;
  phiVanChuyen?: number;
  CHI_TIET: Array<{
    MASP: string;
    SO_LUONG: number;
    sanPhamId?: number | string;
    soLuong?: number;
    price?: number;
    name?: string;
  }>;
}

export interface CancelOrderPayload {
  ly_do: string;
  ghi_chu?: string;
  ngan_hang_hoan?: string;
  so_tai_khoan_hoan?: string;
  chu_tai_khoan_hoan?: string;
}

export const orderApi = {
  async getSuggestedVouchers(subtotal: number = 0) {
    try {
      const response = await apiClient.post('/vouchers/suggest-for-order', { subtotal });
      return response.data;
    } catch (e) {
      console.log('Error fetching suggested vouchers:', e);
      return { best_voucher: null, available_vouchers: [] };
    }
  },

  async applyVoucher(code: string, subtotal: number = 0) {
    const response = await apiClient.post('/vouchers/apply', {
      voucher_code: code,
      code,
      subtotal,
      total: subtotal,
    });
    return response.data;
  },

  async verifyReceiptOcr(formData: FormData) {
    try {
      const response = await apiClient.post('/payment/verify-receipt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (e: any) {
      if (e?.response?.status === 404) {
        const fallbackRes = await apiClient.post('/payment-receipt/verify', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return fallbackRes.data;
      }
      throw e;
    }
  },

  async checkoutOnline(payload: CheckoutPayload) {
    if (payload.receiptUri) {
      const formData = new FormData();
      formData.append('HOTEN', payload.HOTEN);
      formData.append('SDT', payload.SDT);
      formData.append('DIACHI', payload.DIACHI);
      formData.append('address', payload.DIACHI);
      formData.append('HINHTHUC_THANHTOAN', payload.HINHTHUC_THANHTOAN);
      formData.append('paymentMethod', payload.HINHTHUC_THANHTOAN);
      if (payload.GHICHU) formData.append('GHICHU', payload.GHICHU);
      if (payload.MA_VOUCHER) {
        formData.append('voucher_code', payload.MA_VOUCHER);
        formData.append('maVoucher', payload.MA_VOUCHER);
      }
      if (payload.to_ward_code) formData.append('to_ward_code', String(payload.to_ward_code));
      if (payload.to_district_id) formData.append('to_district_id', String(payload.to_district_id));
      if (typeof payload.phiVanChuyen === 'number') {
        formData.append('phiVanChuyen', String(payload.phiVanChuyen));
        formData.append('shipping_fee', String(payload.phiVanChuyen));
      }
      formData.append('CHI_TIET', JSON.stringify(payload.CHI_TIET));
      formData.append('items', JSON.stringify(payload.CHI_TIET));

      const filename = payload.receiptUri.split('/').pop() || 'receipt.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1].toLowerCase() : 'jpg';
      const type = ext === 'png' ? 'image/png' : 'image/jpeg';

      formData.append('receipt', {
        uri: payload.receiptUri,
        name: filename,
        type: type,
      } as any);

      const response = await apiClient.post('/cart/checkout', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    }

    const response = await apiClient.post('/cart/checkout', {
      HOTEN: payload.HOTEN,
      SDT: payload.SDT,
      DIACHI: payload.DIACHI,
      address: payload.DIACHI,
      GHICHU: payload.GHICHU,
      HINHTHUC_THANHTOAN: payload.HINHTHUC_THANHTOAN,
      paymentMethod: payload.HINHTHUC_THANHTOAN,
      MA_VOUCHER: payload.MA_VOUCHER,
      voucher_code: payload.MA_VOUCHER,
      to_ward_code: payload.to_ward_code,
      to_district_id: payload.to_district_id,
      phiVanChuyen: payload.phiVanChuyen,
      shipping_fee: payload.phiVanChuyen,
      CHI_TIET: payload.CHI_TIET,
      items: payload.CHI_TIET,
    });
    return response.data;
  },

  async getMyOrders() {
    const response = await apiClient.get('/my-orders');
    return response.data?.content || response.data?.data || (Array.isArray(response.data) ? response.data : []);
  },

  async cancelOrder(orderId: string, payload: CancelOrderPayload | string) {
    const body =
      typeof payload === 'string'
        ? { ly_do: payload, lyDoHuy: payload, reason: payload }
        : {
            ly_do: payload.ly_do,
            lyDoHuy: payload.ly_do,
            reason: payload.ly_do,
            ghi_chu: payload.ghi_chu,
            ghiChuHuy: payload.ghi_chu,
            ngan_hang_hoan: payload.ngan_hang_hoan,
            nganHangHoan: payload.ngan_hang_hoan,
            so_tai_khoan_hoan: payload.so_tai_khoan_hoan,
            soTaiKhoanHoan: payload.so_tai_khoan_hoan,
            chu_tai_khoan_hoan: payload.chu_tai_khoan_hoan,
            chuTaiKhoanHoan: payload.chu_tai_khoan_hoan,
          };
    const response = await apiClient.post(`/my-orders/${orderId}/cancel`, body);
    return response.data;
  },
};
