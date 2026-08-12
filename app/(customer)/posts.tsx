import React from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const POSTS = [
  {
    id: '1',
    title: 'Bí Quyết Chọn Bánh Sinh Nhật Đẹp & Ý Nghĩa Cho Người Thân',
    summary: 'Một chiếc bánh sinh nhật không chỉ ngọt ngào về hương vị mà còn gửi gắm những lời chúc tốt đẹp nhất đến người nhận.',
    date: '10/08/2026',
    author: 'Chef Dola',
    image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=500'
  },
  {
    id: '2',
    title: 'Xu Hướng Bánh Mì Croissant Sừng Bò Chuẩn Phong Cách Pháp 2026',
    summary: 'Khám phá quy trình nhào bột 27 lớp ngập tràn bơ tươi Thụy Sĩ tạo nên lớp vỏ giòn rụm khó cưỡng của Croissant Dola Bakery.',
    date: '08/08/2026',
    author: 'Trương Nhựt Hào',
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500'
  },
  {
    id: '3',
    title: 'Top 5 Loại Bánh Su Kem Được Yêu Thích Nhất Mùa Hè',
    summary: 'Cùng Dola Bakery điểm danh 5 hương vị su kem thanh mát xua tan cái nóng: Matcha Nhật Bản, Socola Bỉ, Dâu tây tươi...',
    date: '02/08/2026',
    author: 'Dola Bakery Admin',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500'
  },
];

export default function PostsPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const renderPost = ({ item }: { item: typeof POSTS[0] }) => (
    <TouchableOpacity 
      style={[styles.postCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
      onPress={() => router.push({ pathname: '/(customer)/post-detail', params: { id: item.id } })}
    >
      <Image source={{ uri: item.image }} style={styles.postImage} />
      
      <View style={styles.postDetails}>
        <View style={styles.metaRow}>
          <ThemedText style={styles.metaText}>{item.date}</ThemedText>
          <ThemedText style={styles.dot}>•</ThemedText>
          <ThemedText style={styles.metaText}>{item.author}</ThemedText>
        </View>

        <ThemedText style={styles.postTitle} numberOfLines={2}>{item.title}</ThemedText>
        <ThemedText style={styles.postSummary} numberOfLines={2}>{item.summary}</ThemedText>

        <View style={styles.readMoreRow}>
          <ThemedText style={[styles.readMoreText, { color: colors.tint }]}>Đọc tiếp</ThemedText>
          <Ionicons name="arrow-forward" size={16} color={colors.tint} />
        </View>
      </View>
    </TouchableOpacity>
  );

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
        <ThemedText style={styles.headerTitle}>Tin tức & Cẩm nang</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={POSTS}
        keyExtractor={item => item.id}
        renderItem={renderPost}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
  listContent: {
    padding: 16,
  },
  postCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  postImage: {
    width: '100%',
    height: 160,
  },
  postDetails: {
    padding: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  metaText: {
    fontSize: 12,
    opacity: 0.6,
  },
  dot: {
    marginHorizontal: 6,
    opacity: 0.5,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  postSummary: {
    fontSize: 13,
    lineHeight: 20,
    opacity: 0.8,
    marginBottom: 12,
  },
  readMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readMoreText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 4,
  },
});
