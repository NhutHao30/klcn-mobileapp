import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { newsApi } from '@/services/api/newsApi';
import { formatImageUrl } from '@/config/apiConfig';

const POSTS = [
  {
    id: 'TT001',
    title: 'Bí Quyết Chọn Bánh Sinh Nhật Đẹp & Ý Nghĩa Cho Người Thân',
    summary: 'Một chiếc bánh sinh nhật không chỉ ngọt ngào về hương vị mà còn gửi gắm những lời chúc tốt đẹp nhất đến người nhận.',
    content: 'Một chiếc bánh sinh nhật không chỉ ngọt ngào về hương vị mà còn gửi gắm những lời chúc tốt đẹp nhất đến người nhận.',
    date: '10/08/2026',
    author: 'Chef Givral',
    image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=500',
  },
  {
    id: 'TT002',
    title: 'Xu Hướng Bánh Mì Croissant Sừng Bò Chuẩn Phong Cách Pháp 2026',
    summary: 'Khám phá quy trình nhào bột 27 lớp ngập tràn bơ tươi Thụy Sĩ tạo nên lớp vỏ giòn rụm khó cưỡng của Croissant Givral Bakery.',
    content: 'Khám phá quy trình nhào bột 27 lớp ngập tràn bơ tươi Thụy Sĩ tạo nên lớp vỏ giòn rụm khó cưỡng của Croissant Givral Bakery.',
    date: '08/08/2026',
    author: 'Trương Nhựt Hào',
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500',
  },
  {
    id: 'TT003',
    title: 'Top 5 Loại Bánh Su Kem Được Yêu Thích Nhất Mùa Hè',
    summary: 'Cùng Givral Bakery điểm danh 5 hương vị su kem thanh mát xua tan cái nóng: Matcha Nhật Bản, Socola Bỉ, Dâu tây tươi...',
    content: 'Cùng Givral Bakery điểm danh 5 hương vị su kem thanh mát xua tan cái nóng: Matcha Nhật Bản, Socola Bỉ, Dâu tây tươi...',
    date: '02/08/2026',
    author: 'Givral Bakery Admin',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500',
  },
];

const formatNewsDate = (raw?: string | null): string => {
  if (!raw) return 'Mới cập nhật';
  const str = String(raw).trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('vi-VN');
  }
  return str;
};

export default function PostsPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [postsList, setPostsList] = useState<typeof POSTS>(POSTS);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadNews = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await newsApi.getNews();
      const items = Array.isArray(data) ? data : (data?.data || []);
      if (items.length > 0) {
        setPostsList(
          items.map((post: any, index: number) => {
            const chiTietText = Array.isArray(post.chitiets)
              ? post.chitiets
                  .map((ct: any) => ct?.ARTICLE || ct?.article || ct?.NOIDUNG || ct?.noiDung || '')
                  .filter(Boolean)
                  .join('\n\n')
              : '';
            const summaryText =
              post.TOMTAT ||
              post.tomTat ||
              post.MOTA ||
              post.moTa ||
              post.summary ||
              (chiTietText ? chiTietText.slice(0, 160) : '');
            const contentText =
              post.NOIDUNG ||
              post.noiDung ||
              chiTietText ||
              post.MOTA ||
              post.moTa ||
              post.TOMTAT ||
              post.tomTat ||
              post.content ||
              '';

            return {
              id: String(post.MATINTUC || post.MABAIVIET || post.id || index + 1),
              title: post.TIEUDE || post.tieuDe || post.title || 'Bài viết Givral Bakery',
              summary: summaryText,
              content: contentText,
              date: formatNewsDate(post.NGAYDANG || post.ngayDang || post.created_at || post.date),
              author: post.TACGIA || post.tacGia || post.author || 'Givral Bakery',
              image: formatImageUrl(
                post.HINHANH ||
                  post.hinhAnh ||
                  post.image ||
                  'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=500'
              ),
            };
          })
        );
      }
    } catch (e) {
      // Fallback to default postsList
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNews(false);
  }, [loadNews]);

  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return postsList;
    return postsList.filter(
      (item) =>
        (item.title || '').toLowerCase().includes(q) ||
        (item.summary || '').toLowerCase().includes(q) ||
        (item.content || '').toLowerCase().includes(q) ||
        (item.author || '').toLowerCase().includes(q) ||
        String(item.id || '').toLowerCase().includes(q)
    );
  }, [postsList, searchQuery]);

  const renderPost = ({ item }: { item: typeof POSTS[0] }) => (
    <TouchableOpacity
      style={[styles.postCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
      onPress={() => router.push({ pathname: '/(customer)/post-detail', params: { id: item.id } })}
      activeOpacity={0.85}
    >
      <Image source={{ uri: item.image }} style={styles.postImage} />

      <View style={styles.postDetails}>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={13} color={colors.icon} style={{ marginRight: 4 }} />
          <ThemedText style={styles.metaText}>{item.date}</ThemedText>
          <ThemedText style={styles.dot}>•</ThemedText>
          <Ionicons name="person-outline" size={13} color={colors.icon} style={{ marginRight: 4 }} />
          <ThemedText style={styles.metaText}>{item.author}</ThemedText>
        </View>

        <ThemedText style={styles.postTitle} numberOfLines={2}>
          {item.title}
        </ThemedText>
        {!!item.summary && (
          <ThemedText style={styles.postSummary} numberOfLines={2}>
            {item.summary}
          </ThemedText>
        )}

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
        <TouchableOpacity style={styles.refreshHeaderBtn} onPress={() => loadNews(true)}>
          <Ionicons name="refresh-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* SEARCH BAR */}
      <View style={[styles.searchContainer, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
        <Ionicons name="search-outline" size={20} color={colors.icon} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Tìm kiếm bài viết, mẹo chọn bánh..."
          placeholderTextColor={colors.icon}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.icon} />
          </TouchableOpacity>
        )}
      </View>

      {loading && postsList.length === 0 ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          data={filteredPosts}
          keyExtractor={(item: any, index: number) => String(item?.id || item?.MATINTUC || item?.MABAIVIET || index)}
          renderItem={renderPost}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadNews(true)}
              colors={[colors.tint]}
              tintColor={colors.tint}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="newspaper-outline" size={48} color={colors.icon} style={{ opacity: 0.4, marginBottom: 10 }} />
              <ThemedText style={styles.emptyText}>
                Không tìm thấy bài viết nào phù hợp với "{searchQuery}".
              </ThemedText>
            </View>
          }
        />
      )}
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
  refreshHeaderBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  listContent: {
    padding: 16,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
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
