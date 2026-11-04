import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const FAQS = [
  {
    id: '1',
    question: 'Bánh tại Givral Bakery được bảo quản như thế nào?',
    answer: 'Bánh kem và bánh su kem tươi khuyến khích bảo quản trong ngăn mát tủ lạnh từ 2°C - 5°C. Bánh sẽ giữ được độ ngon và độ mịn tốt nhất trong vòng 48 giờ kể từ khi mua.'
  },
  {
    id: '2',
    question: 'Tôi cần đặt bánh sinh nhật trước bao nhiêu lâu?',
    answer: 'Để Givral Bakery chuẩn bị trang trí bánh tỉ mỉ nhất theo đúng mẫu mã yêu cầu, bạn vui lòng đặt trước từ 2 đến 4 tiếng đối với mẫu có sẵn, hoặc 24 tiếng đối với mẫu bánh thiết kế riêng.'
  },
  {
    id: '3',
    question: 'Chính sách miễn phí giao hàng (Freeship) ra sao?',
    answer: 'Givral Bakery áp dụng miễn phí vận chuyển 100% cho mọi đơn hàng bánh từ 300.000₫ trở lên trong bán kính 10km tại khu vực TP.HCM.'
  },
  {
    id: '4',
    question: 'Nếu bánh giao bị hỏng hoặc sai mẫu thì phải làm sao?',
    answer: 'Trường hợp bánh bị dập nát hoặc không đúng với mô tả lúc đặt, Givral Bakery sẽ hỗ trợ đổi trả bánh mới lập tức trong ngày hoặc hoàn tiền 100% qua hotline 19006750.'
  },
  {
    id: '5',
    question: 'Cửa hàng có các phương thức thanh toán nào?',
    answer: 'Bạn có thể linh hoạt thanh toán bằng Tiền mặt khi nhận hàng (COD), Chuyển khoản ngân hàng qua mã VietQR, Ví điện tử Momo, VNPay hoặc thẻ Visa/Mastercard.'
  },
];

export default function FAQPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [expandedIds, setExpandedIds] = useState<string[]>(['1']);

  const toggleAccordion = (id: string) => {
    if (expandedIds.includes(id)) {
      setExpandedIds(expandedIds.filter(item => item !== id));
    } else {
      setExpandedIds([...expandedIds, id]);
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
        <ThemedText style={styles.headerTitle}>Hỏi đáp thường gặp (FAQ)</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <ThemedText style={styles.subtitle}>
          Giải đáp các thắc mắc phổ biến về dịch vụ đặt bánh, giao hàng và bảo quản tại Givral Bakery.
        </ThemedText>

        {FAQS.map(faq => {
          const isOpen = expandedIds.includes(faq.id);
          return (
            <View 
              key={faq.id} 
              style={[styles.faqCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
            >
              <TouchableOpacity 
                style={styles.faqHeader}
                onPress={() => toggleAccordion(faq.id)}
              >
                <Ionicons name="help-circle-outline" size={22} color={colors.tint} style={{ marginRight: 10 }} />
                <ThemedText style={styles.faqQuestion}>{faq.question}</ThemedText>
                <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={20} color={colors.icon} />
              </TouchableOpacity>

              {isOpen && (
                <View style={[styles.faqBody, { borderTopColor: colors.cardBorder }]}>
                  <ThemedText style={styles.faqAnswer}>{faq.answer}</ThemedText>
                </View>
              )}
            </View>
          );
        })}

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
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 16,
    lineHeight: 20,
  },
  faqCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: 'bold',
    marginRight: 8,
  },
  faqBody: {
    padding: 16,
    borderTopWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.8,
  },
});
