import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function PostDetailPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const post = {
    title: 'Bí Quyết Chọn Bánh Sinh Nhật Đẹp & Ý Nghĩa Cho Người Thân',
    date: '10/08/2026',
    author: 'Chef Dola',
    image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800',
    content: `Sinh nhật là dịp đặc biệt để chúng ta bày tỏ tình yêu thương và sự trân trọng dành cho những người thân yêu. Bên cạnh những món quà, chiếc bánh sinh nhật ngọt ngào luôn là tâm điểm không thể thiếu trong mỗi bữa tiệc.

1. Lựa chọn hương vị theo sở thích của người nhận
Nếu người nhận yêu thích vị đắng dịu hòa quyện cùng béo ngậy, bánh Tiramisu hay Bánh Su Kem Socola Bỉ sẽ là sự lựa chọn hoàn hảo. Còn nếu là tín đồ của sự tươi mát, Bánh Kem Dâu Tây Fresh hay Bánh Tart Trái Cây chắc chắn sẽ làm hài lòng bất kỳ ai.

2. Chọn kích thước bánh vừa vặn
Dola Bakery cung cấp các size bánh đa dạng từ 16cm (cho bữa tiệc 4-6 người) đến 24cm (cho bữa tiệc đông người). Hãy ước lượng số lượng khách để chọn chiếc bánh tròn trịa nhất nhé!

3. Cá nhân hóa lời chúc trên bánh
Đừng quên nhắn gửi thông điệp riêng đến Dola Bakery để các nghệ nhân làm bánh viết chữ bằng kem bơ trang trọng lên mặt bánh.`
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
        <ThemedText style={styles.headerTitle} numberOfLines={1}>Chi tiết bài viết</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <ThemedText style={styles.postTitle}>{post.title}</ThemedText>
        
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.icon} style={{ marginRight: 4 }} />
          <ThemedText style={styles.metaText}>{post.date}</ThemedText>
          <ThemedText style={styles.dot}>•</ThemedText>
          <Ionicons name="person-outline" size={14} color={colors.icon} style={{ marginRight: 4 }} />
          <ThemedText style={styles.metaText}>{post.author}</ThemedText>
        </View>

        <Image source={{ uri: post.image }} style={styles.postImage} />

        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <ThemedText style={styles.contentText}>{post.content}</ThemedText>
        </View>

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
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  postTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 28,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  metaText: {
    fontSize: 13,
    opacity: 0.6,
  },
  dot: {
    marginHorizontal: 8,
    opacity: 0.5,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 16,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  contentText: {
    fontSize: 15,
    lineHeight: 24,
    opacity: 0.85,
  },
});
