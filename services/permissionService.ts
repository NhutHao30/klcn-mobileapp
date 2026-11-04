import { Alert, Linking } from 'react-native';
import * as Camera from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

export const permissionService = {
  /**
   * Request system camera permission with user prompt dialog
   */
  async requestCameraPermission(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Camera.Camera.getCameraPermissionsAsync();
      
      if (existingStatus === 'granted') {
        return true;
      }

      const { status } = await Camera.Camera.requestCameraPermissionsAsync();
      
      if (status === 'granted') {
        return true;
      } else {
        Alert.alert(
          'Quyền Camera',
          'Givral Bakery cần quyền sử dụng Camera để quét mã QR / Barcode bánh. Vui lòng cấp quyền trong Cài đặt điện thoại.',
          [
            { text: 'Hủy', style: 'cancel' },
            { text: 'Mở Cài đặt', onPress: () => Linking.openSettings() },
          ]
        );
        return false;
      }
    } catch (e) {
      return true;
    }
  },

  /**
   * Request media library permission for picking avatar photos
   */
  async requestMediaLibraryPermission(): Promise<boolean> {
    try {
      const { status: existingStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
      
      if (existingStatus === 'granted') {
        return true;
      }

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status === 'granted') {
        return true;
      } else {
        Alert.alert(
          'Quyền Thư viện Ảnh',
          'Givral Bakery cần quyền truy cập Thư viện ảnh để chọn ảnh đại diện / tài liệu. Vui lòng cấp quyền trong Cài đặt điện thoại.',
          [
            { text: 'Hủy', style: 'cancel' },
            { text: 'Mở Cài đặt', onPress: () => Linking.openSettings() },
          ]
        );
        return false;
      }
    } catch (e) {
      return true;
    }
  },
};
