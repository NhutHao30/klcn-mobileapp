import apiClient, { setAuthToken } from '@/services/apiClient';

export interface LoginPayload {
  USERNAME: string;
  PASSWORD: string;
}

export interface RegisterPayload {
  USERNAME: string;
  PASSWORD: string;
  EMAIL: string;
  HOTEN: string;
  SDT: string;
  otp?: string;
  OTP?: string;
}

export interface SendRegisterOtpPayload {
  USERNAME: string;
  EMAIL: string;
  HOTEN?: string;
  SDT?: string;
  PASSWORD?: string;
}

export interface ResetPasswordPayload {
  EMAIL: string;
  OTP_CODE: string;
  NEW_PASSWORD: string;
}

export const authApi = {
  async login(payload: LoginPayload) {
    const response = await apiClient.post('/login', payload);
    const data = response.data;
    if (data && data.access_token) {
      setAuthToken(data.access_token);
    }
    return data;
  },

  async sendRegisterOtp(payload: SendRegisterOtpPayload) {
    const response = await apiClient.post('/register/send-otp', payload);
    return response.data;
  },

  async register(payload: RegisterPayload) {
    const response = await apiClient.post('/register', {
      ...payload,
      OTP: payload.otp || payload.OTP,
    });
    const data = response.data;
    if (data && data.access_token) {
      setAuthToken(data.access_token);
    }
    return data;
  },

  async forgotPassword(email: string) {
    const response = await apiClient.post('/forgot-password', {
      EMAIL: email,
      email,
    });
    return response.data;
  },

  async resetPassword(payload: ResetPasswordPayload) {
    const response = await apiClient.post('/reset-password', {
      EMAIL: payload.EMAIL,
      email: payload.EMAIL,
      OTP_CODE: payload.OTP_CODE,
      otp: payload.OTP_CODE,
      NEW_PASSWORD: payload.NEW_PASSWORD,
      new_password: payload.NEW_PASSWORD,
    });
    return response.data;
  },

  async getMe() {
    const response = await apiClient.get('/me');
    return response.data;
  },

  async logout() {
    try {
      const response = await apiClient.post('/logout');
      setAuthToken(null);
      return response.data;
    } catch (e) {
      setAuthToken(null);
      return { success: true };
    }
  },

  async updateProfile(profileData: any) {
    const response = await apiClient.post('/profile/update', profileData);
    return response.data;
  },

  async updateSignature(signatureData: string) {
    const response = await apiClient.post('/profile/chu-ky', {
      signature_data: signatureData,
    });
    return response.data;
  },
};
