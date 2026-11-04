import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import { adminApi } from '@/services/api/adminApi';
import apiClient from '@/services/apiClient';
import { formatImageUrl } from '@/config/apiConfig';
import * as ImagePicker from 'expo-image-picker';

export default function AdminNews() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Comments State
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<any>(null);

  // Create / Edit News Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [newsForm, setNewsForm] = useState({ TIEUDE: '', TOMTAT: '', NOIDUNG: '' });
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchNews();
  }, []);

  // Tự động cập nhật bình luận mới mỗi 4 giây khi đang mở xem bài viết
  useEffect(() => {
    if (!selectedArticle?.id) return;
    const interval = setInterval(async () => {
      try {
        const res = await adminApi.getNewsComments(selectedArticle.id);
        const items = Array.isArray(res) ? res : (res?.data || []);
        setComments(items);
      } catch (e) {
        // silent
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedArticle?.id]);

  const fetchNews = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const res = await adminApi.getAdminNews();
      const items = Array.isArray(res) ? res : (res?.data || []);
      const mapped = items.map((item: any) => {
        const chiTietText = Array.isArray(item.chitiets)
          ? item.chitiets
              .map((ct: any) => ct?.ARTICLE || ct?.article || ct?.NOIDUNG || ct?.noiDung || '')
              .filter(Boolean)
              .join('\n\n')
          : '';
        const summaryText =
          item.TOMTAT ||
          item.tomTat ||
          item.MOTA ||
          item.moTa ||
          item.summary ||
          (chiTietText ? chiTietText.slice(0, 150) : 'Không có tóm tắt');
        const contentText =
          item.NOIDUNG ||
          item.noiDung ||
          chiTietText ||
          item.MOTA ||
          item.moTa ||
          item.TOMTAT ||
          item.tomTat ||
          item.content ||
          'Không có nội dung';
        const rawDate = item.NGAYDANG || item.ngayDang || item.created_at;

        return {
          id: String(item.MATINTUC || item.MABAIVIET || item.id),
          title: item.TIEUDE || item.tieuDe || item.title || 'Bài viết không tiêu đề',
          summary: summaryText,
          content: contentText,
          author: item.TACGIA || item.tacGia || item.author || 'Admin Givral',
          date: rawDate ? String(rawDate).split(' ')[0].split('T')[0] : 'Vừa xong',
          image: formatImageUrl(item.HINHANH || item.hinhAnh || item.image),
          trangThai: item.trangThai !== undefined ? Number(item.trangThai) : 1,
          raw: item,
        };
      });
      setNews(mapped);

      if (selectedArticle) {
        const updatedSelected = mapped.find((m: any) => String(m.id) === String(selectedArticle.id));
        if (updatedSelected) {
          setSelectedArticle(updatedSelected);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleOpenArticle = async (article: any) => {
    setSelectedArticle(article);
    setComments([]);
    try {
      setLoadingComments(true);
      const res = await adminApi.getNewsComments(article.id);
      const items = Array.isArray(res) ? res : (res?.data || []);
      setComments(items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingArticle(null);
    setNewsForm({ TIEUDE: '', TOMTAT: '', NOIDUNG: '' });
    setImageUri(null);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (article: any) => {
    setEditingArticle(article);
    setNewsForm({
      TIEUDE: article.title || '',
      TOMTAT: article.summary && article.summary !== 'Không có tóm tắt' ? article.summary : '',
      NOIDUNG: article.content && article.content !== 'Không có nội dung' ? article.content : '',
    });
    setImageUri(article.image || null);
    setShowAddModal(true);
  };

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Quyền truy cập', 'Cần cấp quyền truy cập thư viện ảnh.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveNews = async () => {
    if (!newsForm.TIEUDE.trim() || !newsForm.NOIDUNG.trim()) {
      Alert.alert('Thiếu thông tin', 'Tiêu đề và nội dung tin tức là bắt buộc.');
      return;
    }
    try {
      setSaving(true);
      const titleTrimmed = newsForm.TIEUDE.trim();
      const summaryTrimmed = (newsForm.TOMTAT || newsForm.TIEUDE).trim();
      const contentTrimmed = newsForm.NOIDUNG.trim();

      const formData = new FormData();
      formData.append('TIEUDE', titleTrimmed);
      formData.append('tieuDe', titleTrimmed);
      formData.append('TOMTAT', summaryTrimmed);
      formData.append('tomTat', summaryTrimmed);
      formData.append('MOTA', summaryTrimmed);
      formData.append('moTa', summaryTrimmed);
      formData.append('NOIDUNG', contentTrimmed);
      formData.append('noiDung', contentTrimmed);
      formData.append('ARTICLE', contentTrimmed);

      if (imageUri) {
        const isRemote = imageUri.startsWith('http://') || imageUri.startsWith('https://');
        if (!isRemote) {
          formData.append('HINHANH', {
            uri: imageUri,
            name: 'news.jpg',
            type: 'image/jpeg',
          } as any);
        } else {
          formData.append('HINHANH', imageUri);
        }
      }

      if (editingArticle) {
        formData.append('_method', 'PUT');
        await apiClient.post(`/admin/news/${editingArticle.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        Alert.alert('Thành công', 'Đã cập nhật bài viết tin tức thành công!');
      } else {
        await adminApi.createNews(formData);
        Alert.alert('Thành công', 'Đăng bài viết tin tức mới thành công!');
      }

      setShowAddModal(false);
      setEditingArticle(null);
      setNewsForm({ TIEUDE: '', TOMTAT: '', NOIDUNG: '' });
      setImageUri(null);
      await fetchNews();
    } catch (e: any) {
      Alert.alert(
        'Lỗi',
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          (editingArticle ? 'Không thể cập nhật tin tức.' : 'Không thể đăng tin tức.')
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNews = (article: any) => {
    Alert.alert('Xóa tin tức', `Xóa bài viết "${article.title}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminApi.deleteNews(article.id);
            setSelectedArticle(null);
            Alert.alert('Thành công', 'Đã xóa tin tức.');
            await fetchNews();
          } catch {
            Alert.alert('Lỗi', 'Không thể xóa tin tức này.');
          }
        },
      },
    ]);
  };

  const handleToggleNewsVisibility = async (article: any) => {
    try {
      const res = await adminApi.toggleNewsVisibility(article.id);
      Alert.alert('Thông báo', res?.message || 'Đã thay đổi trạng thái hiển thị!');
      await fetchNews();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.error || 'Không thể đổi trạng thái bài viết.');
    }
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || !selectedArticle) return;
    try {
      const parentId = replyingTo ? (replyingTo.MABINHLUAN || replyingTo.MABL || replyingTo.id) : undefined;
      const text = commentText.trim();
      await apiClient.post(`/news/${selectedArticle.id}/comments`, {
        noidung: text,
        NOIDUNG: text,
        NOI_DUNG: text,
        noiDung: text,
        ...(parentId ? { parent_id: parentId, PARENT_ID: parentId, parentId } : {}),
      });
      setCommentText('');
      setReplyingTo(null);
      const res = await adminApi.getNewsComments(selectedArticle.id);
      setComments(Array.isArray(res) ? res : (res?.data || []));
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.error || e?.response?.data?.message || 'Không thể gửi bình luận.');
    }
  };

  const handleDeleteComment = (commentId: any) => {
    Alert.alert('Xóa bình luận', 'Xóa bình luận này khỏi bài viết?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminApi.deleteNewsComment(commentId);
            const res = await adminApi.getNewsComments(selectedArticle.id);
            setComments(Array.isArray(res) ? res : (res?.data || []));
          } catch {
            Alert.alert('Lỗi', 'Không thể xóa bình luận.');
          }
        },
      },
    ]);
  };

  const filteredNews = news.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (item.title || '').toLowerCase().includes(q) ||
      (item.summary || '').toLowerCase().includes(q) ||
      String(item.id || '').toLowerCase().includes(q)
    );
  });

  const renderNewsItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}
      onPress={() => handleOpenArticle(item)}
      activeOpacity={0.75}
    >
      {item.image ? <Image source={{ uri: item.image }} style={styles.cardImage} /> : null}
      <View style={styles.cardContent}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[styles.codeBadge, { backgroundColor: colors.tint + '18' }]}>
              <ThemedText style={{ fontSize: 11, fontWeight: 'bold', color: colors.tint }}>#{item.id}</ThemedText>
            </View>
            <View style={{
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 6,
              backgroundColor: item.trangThai === 0 ? '#fee2e2' : '#dcfce7',
            }}>
              <ThemedText style={{
                fontSize: 10,
                fontWeight: 'bold',
                color: item.trangThai === 0 ? '#b91c1c' : '#15803d',
              }}>
                {item.trangThai === 0 ? 'Đang ẩn' : 'Hiển thị'}
              </ThemedText>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity
              style={[styles.cardActionBtn, { backgroundColor: item.trangThai === 0 ? '#10b98118' : '#f59e0b18' }]}
              onPress={() => handleToggleNewsVisibility(item)}
            >
              <Ionicons name={item.trangThai === 0 ? "eye-outline" : "eye-off-outline"} size={15} color={item.trangThai === 0 ? "#10b981" : "#f59e0b"} />
              <ThemedText style={{ fontSize: 11, color: item.trangThai === 0 ? "#10b981" : "#f59e0b", fontWeight: '600' }}>
                {item.trangThai === 0 ? 'Hiện' : 'Ẩn'}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cardActionBtn, { backgroundColor: '#3b82f618' }]}
              onPress={() => handleOpenEditModal(item)}
            >
              <Ionicons name="create-outline" size={15} color="#3b82f6" />
              <ThemedText style={{ fontSize: 11, color: '#3b82f6', fontWeight: '600' }}>Sửa</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cardActionBtn, { backgroundColor: '#ef444418' }]}
              onPress={() => handleDeleteNews(item)}
            >
              <Ionicons name="trash-outline" size={15} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        <ThemedText style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </ThemedText>
        <ThemedText style={styles.cardSummary} numberOfLines={2}>
          {item.summary}
        </ThemedText>
        <View style={styles.cardFooter}>
          <ThemedText style={styles.cardAuthor}>Tác giả: {item.author}</ThemedText>
          <ThemedText style={styles.cardDate}>{item.date}</ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      {/* CREATE / EDIT NEWS MODAL */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.icon + '20' }]}>
              <ThemedText style={styles.modalTitle}>
                {editingArticle ? `Chỉnh sửa bài viết #${editingArticle.id}` : 'Đăng tin tức mới'}
              </ThemedText>
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  setEditingArticle(null);
                }}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <ThemedText style={styles.fieldLabel}>Hình ảnh bài viết</ThemedText>
              <TouchableOpacity
                style={[styles.imagePickerBox, { borderColor: colors.icon + '40' }]}
                onPress={handlePickImage}
              >
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <Ionicons name="image-outline" size={32} color={colors.tint} />
                    <ThemedText style={{ fontSize: 12, color: colors.tint, marginTop: 4 }}>
                      Chọn ảnh bài viết
                    </ThemedText>
                  </View>
                )}
              </TouchableOpacity>

              <ThemedText style={styles.fieldLabel}>Tiêu đề bài viết *</ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  { color: colors.text, borderColor: colors.icon + '40', backgroundColor: colors.icon + '10' },
                ]}
                value={newsForm.TIEUDE}
                onChangeText={(v) => setNewsForm((f) => ({ ...f, TIEUDE: v }))}
                placeholder="Tiêu đề bài viết tin tức..."
                placeholderTextColor={colors.icon}
              />

              <ThemedText style={styles.fieldLabel}>Tóm tắt ngắn (MOTA / TOMTAT)</ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  { color: colors.text, borderColor: colors.icon + '40', backgroundColor: colors.icon + '10' },
                ]}
                value={newsForm.TOMTAT}
                onChangeText={(v) => setNewsForm((f) => ({ ...f, TOMTAT: v }))}
                placeholder="Tóm tắt ngắn gọn..."
                placeholderTextColor={colors.icon}
              />

              <ThemedText style={styles.fieldLabel}>Nội dung chi tiết *</ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    color: colors.text,
                    borderColor: colors.icon + '40',
                    backgroundColor: colors.icon + '10',
                    minHeight: 140,
                    textAlignVertical: 'top',
                  },
                ]}
                value={newsForm.NOIDUNG}
                onChangeText={(v) => setNewsForm((f) => ({ ...f, NOIDUNG: v }))}
                multiline
                placeholder="Nội dung bài viết (các đoạn cách nhau bằng dòng trống)..."
                placeholderTextColor={colors.icon}
              />

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.tint }, saving && { opacity: 0.6 }]}
                onPress={handleSaveNews}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.saveBtnText}>
                    {editingArticle ? 'Lưu cập nhật bài viết' : 'Đăng bài viết'}
                  </ThemedText>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* HEADER */}
      <View
        style={{
          paddingTop: 40,
          paddingBottom: 16,
          backgroundColor: colors.headerBg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <ThemedText style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>Quản lý Tin Tức</ThemedText>
        </View>
        <TouchableOpacity onPress={handleOpenCreateModal}>
          <Ionicons name="add-circle-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* SEARCH BAR */}
      <View style={[styles.searchBox, { backgroundColor: colors.icon + '12', borderColor: colors.icon + '25' }]}>
        <Ionicons name="search-outline" size={18} color={colors.icon} style={{ marginRight: 8 }} />
        <TextInput
          style={{ flex: 1, color: colors.text, fontSize: 14 }}
          placeholder="Tìm theo mã, tiêu đề bài viết..."
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

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          data={filteredNews}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderNewsItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchNews(true)}
              colors={[colors.tint]}
              tintColor={colors.tint}
            />
          }
        />
      )}

      {/* ARTICLE DETAIL & COMMENTS MODAL */}
      {selectedArticle && (
        <Modal
          visible={!!selectedArticle}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedArticle(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.icon + '20' }]}>
                <ThemedText style={styles.modalTitle} numberOfLines={1}>
                  Bài viết: {selectedArticle.title}
                </ThemedText>
                <TouchableOpacity onPress={() => setSelectedArticle(null)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {selectedArticle.image ? (
                  <Image source={{ uri: selectedArticle.image }} style={styles.detailImage} />
                ) : null}

                <ThemedText style={styles.detailTitle}>{selectedArticle.title}</ThemedText>
                <ThemedText style={styles.detailMeta}>
                  Mã: #{selectedArticle.id} • Đăng bởi: {selectedArticle.author} • {selectedArticle.date}
                </ThemedText>
                {selectedArticle.summary && selectedArticle.summary !== selectedArticle.content ? (
                  <ThemedText style={[styles.detailSummary, { color: colors.tint }]}>
                    {selectedArticle.summary}
                  </ThemedText>
                ) : null}
                <ThemedText style={styles.detailContent}>{selectedArticle.content}</ThemedText>

                <View style={styles.detailActionRow}>
                  <TouchableOpacity
                    style={[styles.editNewsBtn, {
                      borderColor: selectedArticle.trangThai === 0 ? '#10b981' : '#f59e0b',
                      backgroundColor: selectedArticle.trangThai === 0 ? '#10b98115' : '#f59e0b15',
                      flex: 1.2
                    }]}
                    onPress={() => handleToggleNewsVisibility(selectedArticle)}
                  >
                    <Ionicons name={selectedArticle.trangThai === 0 ? "eye-outline" : "eye-off-outline"} size={16} color={selectedArticle.trangThai === 0 ? '#10b981' : '#f59e0b'} />
                    <ThemedText style={{ color: selectedArticle.trangThai === 0 ? '#10b981' : '#f59e0b', fontWeight: 'bold', fontSize: 13 }}>
                      {selectedArticle.trangThai === 0 ? 'Hiện bài viết' : 'Ẩn bài viết'}
                    </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.editNewsBtn, { borderColor: '#3b82f6', backgroundColor: '#3b82f610', flex: 1 }]}
                    onPress={() => handleOpenEditModal(selectedArticle)}
                  >
                    <Ionicons name="create-outline" size={16} color="#3b82f6" />
                    <ThemedText style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: 13 }}>
                      Chỉnh sửa
                    </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.deleteNewsBtn, { borderColor: '#ef4444', backgroundColor: '#ef444410', flex: 0.8 }]}
                    onPress={() => handleDeleteNews(selectedArticle)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    <ThemedText style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 13 }}>
                      Xóa
                    </ThemedText>
                  </TouchableOpacity>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.icon + '20', marginVertical: 16 }]} />

                {/* COMMENTS SECTION */}
                <ThemedText style={styles.commentsHeading}>Bình luận bài viết ({comments.length})</ThemedText>

                {loadingComments ? (
                  <ActivityIndicator color={colors.tint} style={{ marginVertical: 16 }} />
                ) : comments.length === 0 ? (
                  <ThemedText style={{ opacity: 0.5, fontSize: 13, marginVertical: 10 }}>
                    Chưa có bình luận nào cho bài viết này.
                  </ThemedText>
                ) : (
                  comments.map((item: any, idx: number) => {
                    const commentId = item.MABINHLUAN || item.MABL || item.id;
                    const commentAuthor =
                      item.HOTEN ||
                      item.hoTen ||
                      item.khachhang?.HOTEN ||
                      item.taikhoan?.USERNAME ||
                      item.user ||
                      'Người dùng';
                    const commentBody = item.NOI_DUNG || item.NOIDUNG || item.noiDung || item.content || '';
                    const commentDate = item.NGAYDANG || (item.created_at ? item.created_at.split('T')[0] : 'Gần đây');

                    return (
                      <View
                        key={String(commentId || idx)}
                        style={[styles.commentBox, { backgroundColor: colors.icon + '08' }]}
                      >
                        <View style={styles.commentHeader}>
                          <ThemedText style={styles.commentUser}>{commentAuthor}</ThemedText>
                          <TouchableOpacity onPress={() => handleDeleteComment(commentId)}>
                            <Ionicons name="trash-outline" size={16} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                        <ThemedText style={styles.commentBody}>{commentBody}</ThemedText>
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: 4,
                          }}
                        >
                          <ThemedText style={{ fontSize: 11, opacity: 0.5 }}>{commentDate}</ThemedText>
                          <TouchableOpacity onPress={() => setReplyingTo(item)}>
                            <ThemedText style={{ fontSize: 12, color: colors.tint, fontWeight: 'bold' }}>
                              Trả lời
                            </ThemedText>
                          </TouchableOpacity>
                        </View>

                        {/* Render Replies */}
                        {item.replies &&
                          item.replies.map((reply: any, rIdx: number) => {
                            const replyId = reply.MABINHLUAN || reply.MABL || reply.id || rIdx;
                            const replyAuthor =
                              reply.HOTEN ||
                              reply.hoTen ||
                              reply.khachhang?.HOTEN ||
                              reply.taikhoan?.USERNAME ||
                              'Admin';
                            const replyBody =
                              reply.NOI_DUNG || reply.NOIDUNG || reply.noiDung || reply.content || '';
                            const replyDate = reply.NGAYDANG || (reply.created_at ? reply.created_at.split('T')[0] : 'Gần đây');

                            return (
                              <View key={String(replyId)} style={[styles.replyBox, { borderLeftColor: colors.tint }]}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, flexWrap: 'wrap' }}>
                                    <ThemedText style={styles.commentUser}>{replyAuthor}</ThemedText>
                                    {reply.replyTo?.HOTEN && (
                                      <ThemedText style={{ fontSize: 11, color: '#888' }}>
                                        trả lời <ThemedText style={{ fontSize: 11, fontWeight: 'bold', color: colors.tint }}>@{reply.replyTo.HOTEN}</ThemedText>
                                      </ThemedText>
                                    )}
                                  </View>
                                  {(reply.MABINHLUAN || reply.MABL || reply.id) && (
                                    <TouchableOpacity
                                      onPress={() => handleDeleteComment(reply.MABINHLUAN || reply.MABL || reply.id)}
                                    >
                                      <Ionicons name="trash-outline" size={14} color="#ef4444" />
                                    </TouchableOpacity>
                                  )}
                                </View>
                                <ThemedText style={styles.commentBody}>{replyBody}</ThemedText>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                  <ThemedText style={{ fontSize: 10, opacity: 0.5 }}>{replyDate}</ThemedText>
                                  <TouchableOpacity onPress={() => setReplyingTo(reply)}>
                                    <ThemedText style={{ fontSize: 11, color: colors.tint, fontWeight: 'bold' }}>
                                      Trả lời
                                    </ThemedText>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            );
                          })}
                      </View>
                    );
                  })
                )}
                <View style={{ height: 20 }} />
              </ScrollView>

              {/* COMMENT INPUT BAR */}
              <View
                style={[
                  styles.commentInputRow,
                  { borderTopColor: colors.icon + '20', backgroundColor: colors.background },
                ]}
              >
                {replyingTo && (
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      paddingHorizontal: 12,
                      paddingTop: 4,
                    }}
                  >
                    <ThemedText style={{ fontSize: 11, color: colors.tint }}>
                      Đang trả lời:{' '}
                      {replyingTo.HOTEN ||
                        replyingTo.hoTen ||
                        replyingTo.khachhang?.HOTEN ||
                        replyingTo.user ||
                        'Bình luận'}
                    </ThemedText>
                    <TouchableOpacity onPress={() => setReplyingTo(null)}>
                      <Ionicons name="close" size={14} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 8 }}>
                  <TextInput
                    style={[styles.commentInput, { color: colors.text, backgroundColor: colors.icon + '10' }]}
                    placeholder="Viết phản hồi / bình luận..."
                    placeholderTextColor={colors.icon}
                    value={commentText}
                    onChangeText={setCommentText}
                  />
                  <TouchableOpacity
                    style={[styles.sendCommentBtn, { backgroundColor: colors.tint }]}
                    onPress={handleSendComment}
                  >
                    <Ionicons name="send" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
  },
  listContent: { padding: 16 },
  card: { borderRadius: 12, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },
  cardImage: { width: '100%', height: 160, resizeMode: 'cover' },
  cardContent: { padding: 14 },
  codeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  cardSummary: { fontSize: 13, opacity: 0.7, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardAuthor: { fontSize: 12, opacity: 0.6 },
  cardDate: { fontSize: 12, opacity: 0.6 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 10 },
  modalBody: { padding: 16 },
  detailImage: { width: '100%', height: 180, borderRadius: 12, marginBottom: 12 },
  detailTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  detailMeta: { fontSize: 12, opacity: 0.6, marginBottom: 10 },
  detailSummary: { fontSize: 13, fontStyle: 'italic', fontWeight: '600', marginBottom: 10, lineHeight: 20 },
  detailContent: { fontSize: 14, lineHeight: 22, opacity: 0.9, marginBottom: 16 },
  detailActionRow: { flexDirection: 'row', gap: 10, marginVertical: 8 },
  editNewsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  deleteNewsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  divider: { height: 1 },
  commentsHeading: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  commentBox: { padding: 12, borderRadius: 10, marginBottom: 8 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  commentUser: { fontWeight: 'bold', fontSize: 13 },
  commentBody: { fontSize: 13, opacity: 0.8 },
  replyBox: { marginTop: 6, marginLeft: 12, paddingLeft: 8, borderLeftWidth: 2 },
  commentInputRow: { borderTopWidth: 1 },
  commentInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 14,
    fontSize: 13,
    marginRight: 8,
  },
  sendCommentBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  // Form
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12, opacity: 0.8 },
  textInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  imagePickerBox: {
    height: 130,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  saveBtn: { marginTop: 24, marginBottom: 30, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
