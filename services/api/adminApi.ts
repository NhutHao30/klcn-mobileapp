import apiClient from '@/services/apiClient';

export interface PosCheckoutPayload {
  MACHINHANH?: string;
  CHI_TIET: Array<{
    MASP: string;
    SO_LUONG: number;
    DON_GIA: number;
  }>;
  TONG_TIEN: number;
  HINHTHUC_THANHTOAN: 'TIEN_MAT' | 'CHUYEN_KHOAN' | 'THE';
}

export const adminApi = {
  async getBiDashboard() {
    const response = await apiClient.get('/admin/reports/bi-dashboard');
    return response.data;
  },

  async getRevenueReport() {
    const response = await apiClient.get('/admin/reports/revenue');
    return response.data;
  },

  async getCancelStats(params?: object) {
    const response = await apiClient.get('/admin/reports/cancel-stats', { params });
    return response.data;
  },

  async confirmOrderRefund(orderId: string | number, payload?: object) {
    const response = await apiClient.post(`/admin/orders/${orderId}/confirm-refund`, payload || {});
    return response.data;
  },

  async getAdminStores() {
    const response = await apiClient.get('/admin/stores');
    return response.data;
  },

  async createStore(payload: object) {
    const response = await apiClient.post('/admin/stores', payload);
    return response.data;
  },

  async updateStore(id: string | number, payload: object) {
    const response = await apiClient.put(`/admin/stores/${id}`, payload);
    return response.data;
  },

  async toggleStoreStatus(id: string | number) {
    const response = await apiClient.put(`/admin/stores/${id}/status`, {});
    return response.data;
  },

  async getAuditLogs() {
    const response = await apiClient.get('/admin/audit-logs');
    return response.data;
  },

  async getVouchers() {
    const response = await apiClient.get('/admin/vouchers');
    return response.data;
  },

  async getInvoices(params?: any) {
    const response = await apiClient.get('/hoa-don', { params });
    return response.data;
  },

  async getUsers() {
    const response = await apiClient.get('/admin/users');
    return response.data;
  },

  async getCustomers() {
    const response = await apiClient.get('/customers');
    return response.data;
  },

  async updateInvoiceStatus(id: string, payload: { TRANG_THAI?: string; trangThai?: string }) {
    const response = await apiClient.put(`/hoa-don/${id}`, payload);
    return response.data;
  },

  async deleteEmployee(username: string) {
    const response = await apiClient.delete(`/admin/staff/${username}`);
    return response.data;
  },

  async promoteCustomer(makh: string) {
    const response = await apiClient.get(`/admin/promote-customer/${makh}`);
    return response.data;
  },

  async createPosCheckout(payload: PosCheckoutPayload) {
    const response = await apiClient.post('/admin/pos/checkout', payload);
    return response.data;
  },

  async getTopProducts() {
    const response = await apiClient.get('/admin/reports/top-products');
    return response.data;
  },

  async getInvoiceDetails(id: string) {
    const response = await apiClient.get(`/hoa-don/${id}/chi-tiet`);
    return response.data;
  },

  async getInventoryLedger(params?: object) {
    const response = await apiClient.get('/admin/inventory/ledger', { params });
    return response.data;
  },

  async getTransfers(params?: object) {
    const response = await apiClient.get('/admin/transfers', { params });
    return response.data;
  },

  async getChamCong(params?: { thang?: number; nam?: number }) {
    const response = await apiClient.get('/admin/cham-cong', { params });
    return response.data;
  },

  async postChamCong(payload: { USERNAME: string; NGAYCHAMCONG: string; TRANGTHAI: boolean }) {
    const response = await apiClient.post('/admin/cham-cong', payload);
    return response.data;
  },

  // ========================= VOUCHER CRUD =========================
  async createVoucher(payload: object) {
    const response = await apiClient.post('/admin/vouchers', payload);
    return response.data;
  },

  async updateVoucher(id: string, payload: object) {
    const response = await apiClient.put(`/admin/vouchers/${id}`, payload);
    return response.data;
  },

  async deleteVoucher(id: string) {
    const response = await apiClient.delete(`/admin/vouchers/${id}`);
    return response.data;
  },

  // ========================= PRODUCT CRUD =========================
  async createProduct(formData: FormData) {
    const response = await apiClient.post('/admin/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async updateProduct(id: string, payload: object) {
    const response = await apiClient.put(`/admin/products/${id}`, payload);
    return response.data;
  },

  async deleteProduct(id: string) {
    const response = await apiClient.delete(`/admin/products/${id}`);
    return response.data;
  },

  async restoreProduct(id: string) {
    const response = await apiClient.put(`/admin/products/${id}/restore`, {});
    return response.data;
  },

  // ========================= CUSTOMER CRUD =========================
  async createCustomer(payload: object) {
    const response = await apiClient.post('/customers', payload);
    return response.data;
  },

  async updateCustomer(id: string, payload: object) {
    const response = await apiClient.put(`/customers/${id}`, payload);
    return response.data;
  },

  async deleteCustomer(id: string) {
    const response = await apiClient.delete(`/customers/${id}`);
    return response.data;
  },

  // ========================= STAFF CRUD =========================
  async createStaff(payload: object) {
    const response = await apiClient.post('/admin/staff', payload);
    return response.data;
  },

  async updateStaff(username: string, payload: object) {
    const response = await apiClient.put(`/admin/staff/${username}`, payload);
    return response.data;
  },

  async scanCccd(formData: FormData) {
    const response = await apiClient.post('/admin/staff/scan-cccd', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // ========================= TRANSFERS =========================
  async getAdminProducts(params?: object) {
    const response = await apiClient.get('/products', {
      params: { size: 200, limit: 200, _t: Date.now(), ...(params || {}) },
    });
    return response.data;
  },

  async createTransferRequest(payload: object) {
    const response = await apiClient.post('/admin/transfers/requests', payload);
    return response.data;
  },

  async updateTransferStatus(id: string | number, payload: { TRANGTHAI: string }) {
    const response = await apiClient.put(`/admin/transfers/${id}/status`, payload);
    return response.data;
  },

  // ========================= NEWS & COMMENTS =========================
  async getAdminNews() {
    const response = await apiClient.get('/admin/news');
    return response.data;
  },

  async createNews(formData: FormData) {
    const response = await apiClient.post('/admin/news', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async updateNews(id: string | number, formData: FormData) {
    formData.append('_method', 'PUT');
    const response = await apiClient.post(`/admin/news/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async deleteNews(id: string | number) {
    const response = await apiClient.delete(`/admin/news/${id}`);
    return response.data;
  },

  async toggleNewsVisibility(id: string | number) {
    const response = await apiClient.put(`/admin/news/${id}/toggle-visibility`, {});
    return response.data;
  },

  async getNewsComments(newsId: string | number) {
    const response = await apiClient.get(`/news/${newsId}/comments`);
    return response.data;
  },

  async postNewsComment(newsId: string | number, payload: { NOI_DUNG: string; PARENT_ID?: number }) {
    const response = await apiClient.post(`/news/${newsId}/comments`, payload);
    return response.data;
  },

  async deleteNewsComment(commentId: string | number) {
    const response = await apiClient.delete(`/admin/news/comments/${commentId}`);
    return response.data;
  },

  // ========================= PRE-ORDERS (ĐẶT HÀNG TRƯỚC) =========================
  async getPreOrders(params?: { search?: string; trangThai?: string; size?: number }) {
    const response = await apiClient.get('/admin/pre-orders', { params });
    return response.data;
  },

  async getPreOrderById(id: string) {
    const response = await apiClient.get(`/admin/pre-orders/${id}`);
    return response.data?.data || response.data;
  },

  async createPreOrder(payload: object) {
    const response = await apiClient.post('/admin/pre-orders', payload);
    return response.data;
  },

  async updatePreOrderStatus(id: string, trangThai: string) {
    const response = await apiClient.put(`/admin/pre-orders/${id}/status`, { trang_thai: trangThai });
    return response.data;
  },

  async completePreOrderPayment(id: string, phuongThucThanhToan: string) {
    const response = await apiClient.post(`/admin/pre-orders/${id}/complete-payment`, {
      phuong_thuc_thanh_toan: phuongThucThanhToan,
    });
    return response.data;
  },

  async lookupCustomerBySdt(sdt: string) {
    const response = await apiClient.get('/customers/lookup', { params: { sdt } });
    return response.data;
  },

  // ========================= LÔ HÀNG & CẢNH BÁO HSD =========================
  async getLoHangs(params?: object) {
    const response = await apiClient.get('/lo-hang', { params });
    return response.data;
  },

  async getCanhBaoHsd() {
    try {
      const response = await apiClient.get('/lo-hang/canh-bao-hsd');
      return response.data;
    } catch {
      const fallback = await apiClient.get('/lo-hang/canh-bao');
      return fallback.data;
    }
  },

  async getLoHangDetail(id: string | number) {
    const response = await apiClient.get(`/lo-hang/${id}`);
    return response.data;
  },

  async createLoHang(payload: object) {
    const response = await apiClient.post('/lo-hang', payload);
    return response.data;
  },

  async updateTrangThaiLo(id: string | number, payload: object) {
    const response = await apiClient.patch(`/lo-hang/${id}/trang-thai`, payload);
    return response.data;
  },

  // ========================= NHÀ CUNG CẤP & HÓA ĐƠN NHẬP =========================
  async getNhaCungCaps() {
    const response = await apiClient.get('/nha-cung-cap');
    return response.data;
  },

  async createNhaCungCap(payload: object) {
    const response = await apiClient.post('/nha-cung-cap', payload);
    return response.data;
  },

  async getHoaDonNhaps(params?: object) {
    const response = await apiClient.get('/hoadon-nhap', { params });
    return response.data;
  },

  async getHoaDonNhapDetail(id: string | number) {
    const response = await apiClient.get(`/hoadon-nhap/${id}`);
    return response.data;
  },

  async createHoaDonNhap(payload: object) {
    const response = await apiClient.post('/hoadon-nhap', payload);
    return response.data;
  },

  async approveImportOrder(id: string | number) {
    const response = await apiClient.post(`/hoadon-nhap/duyet-yeu-cau/${id}`, {});
    return response.data;
  },

  async xacNhanNhapKho(id: string | number, payload?: object) {
    const response = await apiClient.post(`/hoadon-nhap/${id}/xac-nhan-nhap-kho`, payload || {});
    return response.data;
  },

  async getBranchRequests() {
    const response = await apiClient.get('/admin/transfers/requests');
    return response.data;
  },

  // ========================= DUYỆT & KÝ SỐ ĐA BÊN =========================
  async getPendingSignatures() {
    const response = await apiClient.get('/chu-ky/danh-sach-cho-ky');
    return response.data;
  },

  async signDocument(payload: { loai_tai_lieu: string; tai_lieu_id: number | string; pin?: string; signature_data?: string }) {
    const response = await apiClient.post('/chu-ky/xac-nhan', payload);
    return response.data;
  },

  // ========================= BIÊN BẢN HỦY SẢN PHẨM =========================
  async getBienBanHuys(params?: object) {
    const response = await apiClient.get('/bien-ban-huy', { params });
    return response.data;
  },

  async getBienBanHuyDetail(id: string | number) {
    const response = await apiClient.get(`/bien-ban-huy/${id}`);
    return response.data;
  },

  async createBienBanHuy(payload: object) {
    const response = await apiClient.post('/bien-ban-huy', payload);
    return response.data;
  },

  // ========================= CA LÀM VIỆC POS (POS SHIFTS) =========================
  async getPosShifts(params?: object) {
    const response = await apiClient.get('/admin/pos/shifts', { params });
    return response.data;
  },

  async getActivePosShift(params?: object) {
    const response = await apiClient.get('/admin/pos/shifts/active', { params });
    return response.data;
  },

  async openPosShift(payload: { so_tien_dau_ca: number; ghi_chu?: string; cuahang_id?: number }) {
    const response = await apiClient.post('/admin/pos/shifts/open', payload);
    return response.data;
  },

  async closePosShift(payload: { so_tien_thuc_te: number; ghi_chu?: string }) {
    const response = await apiClient.post('/admin/pos/shifts/close', payload);
    return response.data;
  },

  // ========================= DANH MỤC LOẠI SẢN PHẨM =========================
  async getCategories() {
    const response = await apiClient.get('/categories');
    return response.data;
  },

  async createCategory(payload: object) {
    const response = await apiClient.post('/admin/categories', payload);
    return response.data;
  },

  async updateCategory(id: string | number, payload: object) {
    const response = await apiClient.put(`/admin/categories/${id}`, payload);
    return response.data;
  },

  async deleteCategory(id: string | number) {
    const response = await apiClient.delete(`/admin/categories/${id}`);
    return response.data;
  },

  // ========================= KHÓA BẢO TRÌ TÍNH NĂNG =========================
  async getSystemFeatures() {
    const response = await apiClient.get('/system/features');
    return response.data;
  },

  async toggleSystemFeature(payload: { feature_code: string; is_locked: boolean; reason?: string }) {
    const response = await apiClient.post('/admin/system/features/toggle', payload);
    return response.data;
  },

  // ========================= QUẢN LÝ ĐÁNH GIÁ SẢN PHẨM (CSKH) =========================
  async getAdminReviews(params?: object) {
    const response = await apiClient.get('/admin/reviews', { params });
    return response.data;
  },

  async toggleReviewVisibility(id: string | number) {
    const response = await apiClient.put(`/admin/reviews/${id}/toggle-visibility`, {});
    return response.data;
  },

  async replyReview(id: string | number, phanHoi: string) {
    const response = await apiClient.post(`/admin/reviews/${id}/reply`, {
      phan_hoi: phanHoi,
      phanHoi: phanHoi,
      PHAN_HOI: phanHoi,
    });
    return response.data;
  },

  // ========================= GIÁM SÁT HỆ THỐNG & ANALYTICS =========================
  async getSystemPerformance() {
    const response = await apiClient.get('/admin/system/performance');
    return response.data;
  },

  async getSystemErrors(params?: object) {
    const response = await apiClient.get('/admin/system/errors', { params });
    return response.data;
  },

  async getUserAnalytics(params?: object) {
    const response = await apiClient.get('/admin/analytics/users', { params });
    return response.data;
  },

  async getBehaviorAnalytics(params?: object) {
    const response = await apiClient.get('/admin/analytics/behavior', { params });
    return response.data;
  },
};
