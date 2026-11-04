import axios from 'axios';
import { API_CONFIG, getApiBaseUrl } from '@/config/apiConfig';

let currentAuthToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  currentAuthToken = token;
};

export const getAuthToken = () => currentAuthToken;

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.HEADERS,
});

// Request Interceptor: Dynamically resolve Base URL + Attach JWT Token, Request UUID & Idempotency Key
apiClient.interceptors.request.use(
  (config) => {
    // Luôn lấy lại Base URL động theo IP hiện tại của Expo Go / Wi-Fi / Hotspot
    config.baseURL = getApiBaseUrl();

    if (currentAuthToken) {
      config.headers.Authorization = `Bearer ${currentAuthToken}`;
    }

    // Generate Request UUID for backend logging
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });

    config.headers['X-Request-ID'] = uuid;
    config.headers['X-Client-Platform'] = 'mobile';

    // Attach Idempotency-Key for sensitive checkout requests
    if (
      config.method !== 'get' &&
      config.url &&
      (config.url.includes('/checkout') || config.url.includes('/pos/checkout'))
    ) {
      if (!config.headers['Idempotency-Key']) {
        config.headers['Idempotency-Key'] = uuid;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

// Response Interceptor: Global Error Handler & Single Session Auto Logout
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      currentAuthToken = null;
      try {
        await AsyncStorage.removeItem('@auth_token');
      } catch (e) {}

      const errData = error.response.data;
      const isConcurrent =
        errData?.code === 'CONCURRENT_LOGIN' ||
        String(errData?.error || '').toLowerCase().includes('thiết bị khác') ||
        String(errData?.message || '').toLowerCase().includes('thiết bị khác');

      if (isConcurrent) {
        Alert.alert(
          'Đăng xuất phiên làm việc',
          'Tài khoản của bạn đã được đăng nhập từ một thiết bị khác! Để đảm bảo an toàn, phiên làm việc trên thiết bị này đã kết thúc.',
          [
            {
              text: 'Đăng nhập lại',
              onPress: () => {
                try {
                  router.replace('/login' as any);
                } catch (e) {}
              },
            },
          ],
          { cancelable: false }
        );
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
