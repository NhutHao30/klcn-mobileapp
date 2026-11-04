import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Fallback Wi-Fi IP Address of your PC
 */
const MANUAL_WIFI_IP = '192.168.1.2';
const DEFAULT_PRODUCTION_API_URL = 'https://givral-bakery.vercel.app/api';

let runtimeCustomBaseUrl: string | null = null;

/**
 * Kiểm tra xem IP có phải là dải mạng thực (Wi-Fi LAN, iPhone Hotspot 172.20.10.x, Android Hotspot 192.168.43.x)
 * và loại bỏ dải card mạng ảo Hyper-V / WSL / VirtualBox
 */
const isValidPhysicalNetworkIp = (ip: string): boolean => {
  if (!ip || ip === 'localhost' || ip === '127.0.0.1') return false;
  // VirtualBox Host-Only
  if (ip.startsWith('192.168.56.') || ip.startsWith('192.168.197.')) return false;
  // Cho phép iPhone Personal Hotspot (luôn cấp dải 172.20.10.x)
  if (ip.startsWith('172.20.10.')) return true;
  // Loại bỏ các dải 172.16.x.x - 172.31.x.x của WSL / Docker / Hyper-V
  if (ip.startsWith('172.')) return false;
  return true;
};

export const getApiBaseUrl = (): string => {
  // 0. Nếu người dùng cấu hình URL tùy chỉnh ngay trong App
  if (runtimeCustomBaseUrl) {
    return runtimeCustomBaseUrl;
  }

  // 1. Ưu tiên số 1: Biến môi trường EXPO_PUBLIC_API_URL được inject từ EAS Build / .env
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. Môi trường phát triển cục bộ (Expo Go kết nối Metro Bundler)
  if (__DEV__) {
    try {
      const hostUri =
        Constants.expoConfig?.hostUri ||
        (Constants as any).manifest2?.extra?.expoGo?.developer?.manifest?.debuggerHost ||
        (Constants as any).manifest?.debuggerHost ||
        (Constants as any).expoGoConfig?.debuggerHost;

      if (hostUri) {
        const ip = hostUri.split(':')[0];
        if (isValidPhysicalNetworkIp(ip)) {
          return `http://${ip}:8000/api`;
        }
      }
    } catch (e) {
      // Ignore error
    }

    if (MANUAL_WIFI_IP) {
      return `http://${MANUAL_WIFI_IP}:8000/api`;
    }
  }

  // 3. Fallback cho bản Standalone APK / Production
  return DEFAULT_PRODUCTION_API_URL;
};

export const API_CONFIG = {
  get BASE_URL() {
    return getApiBaseUrl();
  },
  TIMEOUT: 15000,
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
};

export const setCustomApiBaseUrl = (url: string | null) => {
  if (!url || !url.trim()) {
    runtimeCustomBaseUrl = null;
    return;
  }
  let cleaned = url.trim().replace(/\/+$/, '');
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    // Nếu chỉ nhập IP (VD: 192.168.1.2 hoặc 172.20.10.4)
    cleaned = cleaned.includes(':') ? `http://${cleaned}` : `http://${cleaned}:8000`;
  }
  if (!cleaned.endsWith('/api')) {
    cleaned = `${cleaned}/api`;
  }
  runtimeCustomBaseUrl = cleaned;
};

/**
 * Helper to convert relative image URLs (/api/proxy-image?...) to absolute URLs accessible on mobile
 */
export const formatImageUrl = (url?: string | null): string => {
  const defaultFallback = 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400';

  if (!url || typeof url !== 'string' || url.trim() === '') {
    return defaultFallback;
  }

  const cleanUrl = url.trim();
  const currentBase = getApiBaseUrl();
  const baseUrlRoot = currentBase.replace(/\/api\/?$/, '');

  // 1. Nếu là URL tuyệt đối (http:// hoặc https://)
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    if (cleanUrl.includes(':9000') || cleanUrl.includes('minio') || cleanUrl.includes('dolabakery')) {
      return `${currentBase}/proxy-image?url=${encodeURIComponent(cleanUrl)}`;
    }
    if (cleanUrl.includes('127.0.0.1') || cleanUrl.includes('localhost')) {
      const pcIp = currentBase.replace('http://', '').replace('https://', '').split(':')[0];
      return cleanUrl.replace('127.0.0.1', pcIp).replace('localhost', pcIp);
    }
    return cleanUrl;
  }

  // 2. Nếu đã là đường dẫn proxy-image
  if (cleanUrl.startsWith('/api/proxy-image') || cleanUrl.startsWith('api/proxy-image')) {
    const path = cleanUrl.startsWith('/') ? cleanUrl : `/${cleanUrl}`;
    return `${baseUrlRoot}${path}`;
  }

  // 3. Nếu là đường dẫn lưu trữ MinIO S3 (products/..., news/..., storage/..., cccd/..., reviews/...)
  if (
    cleanUrl.startsWith('products/') ||
    cleanUrl.startsWith('news/') ||
    cleanUrl.startsWith('cccd/') ||
    cleanUrl.startsWith('reviews/') ||
    cleanUrl.startsWith('storage/') ||
    cleanUrl.startsWith('/storage/') ||
    cleanUrl.startsWith('/products/') ||
    cleanUrl.includes('products/') ||
    cleanUrl.includes('news/')
  ) {
    const cleanPath = cleanUrl.startsWith('/') ? cleanUrl : `/${cleanUrl}`;
    return `${currentBase}/proxy-image?url=${encodeURIComponent(cleanPath)}`;
  }

  // 4. Nếu là asset tĩnh trong public/assets/
  if (cleanUrl.startsWith('/assets/') || cleanUrl.startsWith('assets/')) {
    const cleanPath = cleanUrl.startsWith('/') ? cleanUrl : `/${cleanUrl}`;
    return `${baseUrlRoot}${cleanPath}`;
  }

  // 5. Nếu chỉ là tên file hình ảnh đơn lẻ
  const stripped = cleanUrl.replace(/^\/+/, '');
  return `${baseUrlRoot}/assets/IMG/${stripped}`;
};
