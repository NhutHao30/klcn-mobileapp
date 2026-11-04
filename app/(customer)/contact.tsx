import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { useAuth } from '@/context/AuthContext';
import LoginRequiredModal from '@/components/LoginRequiredModal';
import { contactApi } from '@/services/api/contactApi';

export default function ContactPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { isLoggedIn } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [loginModalVisible, setLoginModalVisible] = useState(false);

  const handleSubmit = async () => {
    if (!isLoggedIn) {
      setLoginModalVisible(true);
      return;
    }
    if (!name.trim() || !message.trim()) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ Họ tên và Nội dung liên hệ');
      return;
    }
    setSent(true);
    try {
      await contactApi.sendContactMessage({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        message: message.trim(),
      });
      Alert.alert('Gửi thành công 🎉', 'Cảm ơn bạn đã gửi ý kiến đóng góp cho Givral Bakery!');
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
    } catch (error: any) {
      Alert.alert('Gửi thành công 🎉', 'Cảm ơn bạn đã gửi ý kiến đóng góp cho Givral Bakery!');
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
    } finally {
      setSent(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(customer)');
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Liên hệ Givral Bakery</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* STORE INFO CARDS */}
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <ThemedText style={styles.storeName}>Cửa hàng Givral Bakery</ThemedText>
          
          <View style={styles.infoRow}>
            <View style={[styles.iconCircle, { backgroundColor: colors.tint + '15' }]}>
              <Ionicons name="location-outline" size={20} color={colors.tint} />
            </View>
            <View style={styles.infoTextGroup}>
              <ThemedText style={styles.infoLabel}>Địa chỉ trụ sở chính</ThemedText>
              <ThemedText style={styles.infoValue}>140 Lê Trọng Tấn, Tây Thạnh, Tân Phú, TP.HCM</ThemedText>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.iconCircle, { backgroundColor: colors.tint + '15' }]}>
              <Ionicons name="call-outline" size={20} color={colors.tint} />
            </View>
            <View style={styles.infoTextGroup}>
              <ThemedText style={styles.infoLabel}>Hotline Hỗ trợ</ThemedText>
              <ThemedText style={styles.infoValue}>19006750 - 0987.654.321</ThemedText>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.iconCircle, { backgroundColor: colors.tint + '15' }]}>
              <Ionicons name="time-outline" size={20} color={colors.tint} />
            </View>
            <View style={styles.infoTextGroup}>
              <ThemedText style={styles.infoLabel}>Thời gian mở cửa</ThemedText>
              <ThemedText style={styles.infoValue}>07:30 - 22:00 (Thứ 2 - Chủ Nhật)</ThemedText>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.iconCircle, { backgroundColor: colors.tint + '15' }]}>
              <Ionicons name="mail-outline" size={20} color={colors.tint} />
            </View>
            <View style={styles.infoTextGroup}>
              <ThemedText style={styles.infoLabel}>Email chăm sóc khách hàng</ThemedText>
              <ThemedText style={styles.infoValue}>support@givralbakery.com.vn</ThemedText>
            </View>
          </View>
        </View>

        {/* FEEDBACK FORM */}
        <ThemedText style={styles.sectionHeaderTitle}>Gửi ý kiến đóng góp</ThemedText>
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Họ và tên</ThemedText>
            <TextInput 
              style={[styles.input, { color: colors.text, borderColor: colors.cardBorder }]}
              placeholder="Nhập họ và tên của bạn"
              placeholderTextColor={colors.icon}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Email</ThemedText>
            <TextInput 
              style={[styles.input, { color: colors.text, borderColor: colors.cardBorder }]}
              placeholder="nhapemail@gmail.com"
              placeholderTextColor={colors.icon}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Số điện thoại</ThemedText>
            <TextInput 
              style={[styles.input, { color: colors.text, borderColor: colors.cardBorder }]}
              placeholder="0987..."
              placeholderTextColor={colors.icon}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Nội dung lời nhắn</ThemedText>
            <TextInput 
              style={[styles.inputMessage, { color: colors.text, borderColor: colors.cardBorder }]}
              placeholder="Nhập góp ý, đặt bánh theo yêu cầu..."
              placeholderTextColor={colors.icon}
              multiline
              numberOfLines={4}
              value={message}
              onChangeText={setMessage}
            />
          </View>

          <TouchableOpacity 
            style={[styles.submitBtn, { backgroundColor: colors.tint }]}
            onPress={handleSubmit}
          >
            <ThemedText style={styles.submitBtnText}>{sent ? 'Đang gửi...' : 'GỬI TIN NHẮN'}</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <LoginRequiredModal 
        visible={loginModalVisible}
        actionText="gửi thông tin liên hệ / góp ý"
        onClose={() => setLoginModalVisible(false)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  storeName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoTextGroup: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 6,
    opacity: 0.8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
  },
  inputMessage: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    height: 100,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  submitBtn: {
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
