import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';

const MOCK_NEWS = [
  { id: '1', title: 'Ra mắt BST Bánh Mùa Thu 2026', date: '10/08/2026', status: 'published', views: 1240, image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80' },
  { id: '2', title: 'Khuyến mãi Trung Thu giảm 20%', date: '12/08/2026', status: 'draft', views: 0, image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80' },
  { id: '3', title: 'Top 5 Bánh ngọt bán chạy nhất', date: '01/08/2026', status: 'published', views: 3500, image: 'https://images.unsplash.com/photo-1483695028939-5bb13f8648b0?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80' },
];

export default function AdminNews() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <View style={{ paddingTop: 40, paddingBottom: 16, backgroundColor: colors.headerBg, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>Tin tức & Blog</ThemedText>
      </View>

      <View style={[styles.headerActions, { borderBottomColor: colors.icon + '20' }]}>
        <ThemedText style={styles.summaryText}>Tổng cộng: {MOCK_NEWS.length} bài viết</ThemedText>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.tint }]}>
          <Ionicons name="create" size={20} color="#fff" />
          <ThemedText style={styles.addButtonText}>Viết bài</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {MOCK_NEWS.map(news => (
          <View key={news.id} style={[styles.card, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
            <Image source={{ uri: news.image }} style={styles.newsImage} />
            
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <View style={[styles.statusBadge, { backgroundColor: news.status === 'published' ? '#10b98120' : '#64748b20' }]}>
                  <ThemedText style={[styles.statusText, { color: news.status === 'published' ? '#10b981' : '#64748b' }]}>
                    {news.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}
                  </ThemedText>
                </View>
                <TouchableOpacity>
                  <Ionicons name="ellipsis-vertical" size={20} color={colors.icon} />
                </TouchableOpacity>
              </View>

              <ThemedText style={styles.newsTitle} numberOfLines={2}>{news.title}</ThemedText>
              
              <View style={styles.footerRow}>
                <View style={styles.footerItem}>
                  <Ionicons name="calendar-outline" size={14} color={colors.icon} />
                  <ThemedText style={styles.footerText}>{news.date}</ThemedText>
                </View>
                <View style={styles.footerItem}>
                  <Ionicons name="eye-outline" size={14} color={colors.icon} />
                  <ThemedText style={styles.footerText}>{news.views} lượt xem</ThemedText>
                </View>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    paddingHorizontal: 16,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  listContent: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  newsImage: {
    width: '100%',
    height: 150,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    lineHeight: 22,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    opacity: 0.6,
    marginLeft: 4,
  },
});
