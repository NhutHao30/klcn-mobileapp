import apiClient from '@/services/apiClient';

export interface CustomerAddress {
  id: number;
  nguoidungId: number;
  hoTenNguoiNhan: string;
  soDienThoai: string;
  diaChiChiTiet: string;
  maTinh?: number | null;
  maHuyen?: number | null;
  maXa?: string | null;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface GhnProvince {
  ProvinceID: number;
  ProvinceName: string;
  NameExtension?: string[];
}

export interface GhnWard {
  WardCode: string;
  WardName: string;
  DistrictID: number;
  DistrictName?: string;
}

export const addressApi = {
  async getAddresses(): Promise<CustomerAddress[]> {
    try {
      const response = await apiClient.get('/addresses');
      const rawList = response.data?.data || response.data || [];
      if (!Array.isArray(rawList)) return [];

      let foundDefault = false;
      return rawList.map((a: any) => {
        const rawDef = a.MACDINH ?? a.isDefault ?? a.is_default ?? 0;
        const isOne = Number(rawDef) === 1 || rawDef === true;
        const normalizedDefault = isOne && !foundDefault;
        if (normalizedDefault) {
          foundDefault = true;
        }
        return {
          ...a,
          id: Number(a.id),
          hoTenNguoiNhan: a.hoTenNguoiNhan || a.HOTEN || '',
          soDienThoai: a.soDienThoai || a.SDT || '',
          diaChiChiTiet: a.diaChiChiTiet || a.DIACHI || '',
          maTinh: a.maTinh ? Number(a.maTinh) : null,
          maHuyen: a.maHuyen ? Number(a.maHuyen) : null,
          maXa: a.maXa ? String(a.maXa) : null,
          isDefault: normalizedDefault,
        };
      });
    } catch (e) {
      console.log('Error fetching addresses:', e);
      return [];
    }
  },

  async getDefaultAddress(): Promise<CustomerAddress | null> {
    try {
      const response = await apiClient.get('/addresses/default');
      const data = response.data?.data || null;
      if (!data) return null;
      return {
        ...data,
        isDefault: Number(data.MACDINH ?? data.isDefault ?? data.is_default ?? 1) === 1,
      };
    } catch (e) {
      console.log('Error fetching default address:', e);
      return null;
    }
  },

  async addAddress(payload: {
    diaChiChiTiet: string;
    hoTenNguoiNhan?: string;
    soDienThoai?: string;
    isDefault?: boolean;
    maTinh?: number;
    maHuyen?: number;
    maXa?: string;
  }): Promise<CustomerAddress | null> {
    const response = await apiClient.post('/addresses', payload);
    return response.data?.data || null;
  },

  async updateAddress(id: number, payload: Partial<CustomerAddress>): Promise<CustomerAddress | null> {
    const response = await apiClient.put(`/addresses/${id}`, payload);
    return response.data?.data || null;
  },

  async deleteAddress(id: number): Promise<boolean> {
    await apiClient.delete(`/addresses/${id}`);
    return true;
  },

  async setDefaultAddress(id: number): Promise<boolean> {
    await apiClient.put(`/addresses/${id}/default`);
    return true;
  },

  async getProvinces(): Promise<GhnProvince[]> {
    try {
      const response = await apiClient.get('/ghn/provinces');
      return response.data?.data || [];
    } catch (e) {
      console.log('Error fetching GHN provinces:', e);
      return [];
    }
  },

  async getWardsByProvince(provinceId: number | string): Promise<GhnWard[]> {
    try {
      const response = await apiClient.get(`/ghn/wards-by-province?province_id=${provinceId}`);
      return response.data?.data || [];
    } catch (e) {
      console.log('Error fetching GHN wards by province:', e);
      return [];
    }
  },

  async calculateShippingFee(payload: {
    to_ward_code: string;
    to_district_id: number;
    weight?: number;
  }): Promise<number | null> {
    try {
      const response = await apiClient.post('/ghn/fee', {
        to_ward_code: payload.to_ward_code,
        to_district_id: payload.to_district_id,
        weight: payload.weight ?? 500,
      });
      const feeData = response.data?.data;
      if (feeData && typeof feeData.total === 'number') {
        return feeData.total;
      }
      return null;
    } catch (e) {
      console.log('Error calculating GHN fee:', e);
      return null;
    }
  },
};
