import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const PAYMENT_METHODS = [
  { id: 'cod', title: 'Thanh toán khi nhận hàng (COD)', icon: 'cash-outline' },
  { id: 'bank', title: 'Chuyển khoản Ngân hàng (QR Code)', icon: 'qr-code-outline' },
  { id: 'vnpay', title: 'Ví VNPay / MoMo', icon: 'wallet-outline' },
];

import FloatingNotification from '@/components/FloatingNotification';

export default function CustomerCheckoutPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [name, setName] = useState('Nguyễn Văn A');
  const [phone, setPhone] = useState('0987654321');
  const [address, setAddress] = useState('123 Đường Lê Lợi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh');
  const [note, setNote] = useState('');
  const [showNotification, setShowNotification] = useState(false);

  const handleConfirmOrder = () => {
    setShowNotification(true);
    setTimeout(() => {
      router.replace('/(customer)/orders');
    }, 1800);
  };

  return (
    <ThemedView style={styles.container}>
      <FloatingNotification 
        visible={showNotification}
        title="Đặt hàng thành công! 🎉"
        message="Dola Bakery đang chuẩn bị bánh cho bạn. Đơn hàng #DH-89201"
        type="success"
        onClose={() => setShowNotification(false)}
      />
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Thanh toán đơn hàng</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* SHIPPING ADDRESS */}
        <ThemedText style={styles.sectionHeaderTitle}>Thông tin giao hàng</ThemedText>
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Họ và tên người nhận</ThemedText>
            <TextInput 
              style={[styles.input, { color: colors.text, borderColor: colors.cardBorder }]}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Số điện thoại</ThemedText>
            <TextInput 
              style={[styles.input, { color: colors.text, borderColor: colors.cardBorder }]}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Địa chỉ nhận bánh</ThemedText>
            <TextInput 
              style={[styles.input, { color: colors.text, borderColor: colors.cardBorder }]}
              value={address}
              onChangeText={setAddress}
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Ghi chú cho cửa hàng (Ví dụ: Ghi chữ trên bánh)</ThemedText>
            <TextInput 
              style={[styles.input, { color: colors.text, borderColor: colors.cardBorder }]}
              placeholder="Nhập lời chúc hoặc yêu cầu thêm..."
              placeholderTextColor={colors.icon}
              value={note}
              onChangeText={setNote}
            />
          </View>
        </View>

        {/* PAYMENT METHOD */}
        <ThemedText style={styles.sectionHeaderTitle}>Phương thức thanh toán</ThemedText>
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          {PAYMENT_METHODS.map((method, index) => (
            <React.Fragment key={method.id}>
              <TouchableOpacity 
                style={styles.paymentRow}
                onPress={() => setPaymentMethod(method.id)}
              >
                <View style={styles.paymentLeft}>
                  <Ionicons name={method.icon as any} size={22} color={colors.tint} style={{ marginRight: 12 }} />
                  <ThemedText style={styles.paymentTitle}>{method.title}</ThemedText>
                </View>

                <View style={[
                  styles.radioOuter,
                  { borderColor: paymentMethod === method.id ? colors.tint : colors.icon }
                ]}>
                  {paymentMethod === method.id && (
                    <View style={[styles.radioInner, { backgroundColor: colors.tint }]} />
                  )}
                </View>
              </TouchableOpacity>
              {index < PAYMENT_METHODS.length - 1 && (
                <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* ORDER ITEMS SUMMARY */}
        <ThemedText style={styles.sectionHeaderTitle}>Đơn hàng (3 sản phẩm)</ThemedText>
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Tiền bánh</ThemedText>
            <ThemedText style={styles.summaryValue}>324.000₫</ThemedText>
          </View>

          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Phí giao hàng</ThemedText>
            <ThemedText style={styles.summaryValue}>Miễn phí</ThemedText>
          </View>

          <View style={styles.summaryRow}>
            <ThemedText style={[styles.summaryLabel, { color: '#10b981' }]}>Giảm giá</ThemedText>
            <ThemedText style={[styles.summaryValue, { color: '#10b981' }]}>-30.000₫</ThemedText>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          <View style={styles.summaryRow}>
            <ThemedText style={styles.totalLabel}>Tổng thanh toán</ThemedText>
            <ThemedText style={[styles.totalValue, { color: colors.tint }]}>294.000₫</ThemedText>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.confirmBtn, { backgroundColor: colors.tint }]}
          onPress={handleConfirmOrder}
        >
          <ThemedText style={styles.confirmBtnText}>XÁC NHẬN ĐẶT HÀNG</ThemedText>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 8,
    opacity: 0.8,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 6,
    opacity: 0.7,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  confirmBtn: {
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
