import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'CUSTOMER_NOTIFICATION_SETTINGS';

// Thiết lập cách hiển thị thông báo khi ứng dụng đang mở (Foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  private initialized = false;

  async init() {
    if (this.initialized) return;

    try {
      if (Platform.OS === 'android') {
        // Cấu hình Kênh thông báo Android với độ ưu tiên cao nhất (MAX)
        // để thông báo hiển thị NỔI trên màn hình (Heads-up banner) và hiển thị trên màn hình khóa (PUBLIC)
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Givral Bakery Thông Báo Chung',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#c81f34',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });

        await Notifications.setNotificationChannelAsync('orders', {
          name: 'Trạng thái đơn hàng',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 300, 200, 300],
          lightColor: '#eab308',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });

        await Notifications.setNotificationChannelAsync('promotions', {
          name: 'Ưu đãi & Khuyến mãi',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 200, 100, 200],
          lightColor: '#10b981',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });
      }

      this.initialized = true;
    } catch (e) {
      console.warn('Lỗi khởi tạo Notification Channel:', e);
    }
  }

  async requestPermission(): Promise<boolean> {
    try {
      await this.init();
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      return finalStatus === 'granted';
    } catch (e) {
      console.warn('Lỗi xin quyền Notifications:', e);
      return false;
    }
  }

  async isPushEnabled(): Promise<boolean> {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.pushEnabled === false) return false;
      }
      return true;
    } catch (e) {
      return true;
    }
  }

  /**
   * Gửi thông báo nổi cục bộ ngay lập tức (hiển thị banner trên đầu màn hình và màn hình khóa)
   */
  async sendLocalNotification(
    title: string,
    body: string,
    data: Record<string, any> = {},
    channelId: string = 'orders'
  ) {
    try {
      await this.init();
      const enabled = await this.isPushEnabled();
      if (!enabled) return;

      const hasPermission = await this.requestPermission();
      if (!hasPermission) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          channelId: Platform.OS === 'android' ? channelId : undefined,
        } as any,
        trigger: null, // Gửi ngay lập tức
      });
    } catch (e) {
      console.warn('Lỗi gửi thông báo nổi:', e);
    }
  }
}

export const notificationService = new NotificationService();
