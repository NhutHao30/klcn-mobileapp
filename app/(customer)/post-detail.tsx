import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { newsApi } from '@/services/api/newsApi';
import { formatImageUrl } from '@/config/apiConfig';
import { useAuth } from '@/context/AuthContext';
import LoginRequiredModal from '@/components/LoginRequiredModal';

const formatNewsDate = (raw?: string | null): string => {
  if (!raw) return 'Mới đây';
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

export default function PostDetailPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { isLoggedIn } = useAuth();

  const DEFAULT_POST = {
    title: 'Bí Quyết Chọn Bánh Sinh Nhật Đẹp & Ý Nghĩa Cho Người Thân',
    summary: '',
    date: '10/08/2026',
    author: 'Chef Givral',
    image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800',
    content: `Sinh nhật là dịp đặc biệt để chúng ta bày tỏ tình yêu thương và sự trân trọng dành cho những người thân yêu. Bên cạnh những món quà, chiếc bánh sinh nhật ngọt ngào luôn là tâm điểm không thể thiếu trong mỗi bữa tiệc.

1. Lựa chọn hương vị theo sở thích của người nhận
Nếu người nhận yêu thích vị đắng dịu hòa quyện cùng béo ngậy, bánh Tiramisu hay Bánh Su Kem Socola Bỉ sẽ là sự lựa chọn hoàn hảo. Còn nếu là tín đồ của sự tươi mát, Bánh Kem Dâu Tây Fresh hay Bánh Tart Trái Cây chắc chắn sẽ làm hài lòng bất kỳ ai.

2. Chọn kích thước bánh vừa vặn
Givral Bakery cung cấp các size bánh đa dạng từ 16cm (cho bữa tiệc 4-6 người) đến 24cm (cho bữa tiệc đông người). Hãy ước lượng số lượng khách để chọn chiếc bánh tròn trịa nhất nhé!

3. Cá nhân hóa lời chúc trên bánh
Đừng quên nhắn gửi thông điệp riêng đến Givral Bakery để các nghệ nhân làm bánh viết chữ bằng kem bơ trang trọng lên mặt bánh.`,
    chitiets: [] as any[],
  };

  const [post, setPost] = useState(DEFAULT_POST);
  const [loading, setLoading] = useState(false);

  // Comments States
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  const [loginModalVisible, setLoginModalVisible] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadDetail(String(params.id));
      loadComments(String(params.id));

      const interval = setInterval(() => {
        loadComments(String(params.id), true);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [params.id]);

  const loadDetail = async (id: string) => {
    setLoading(true);
    try {
      const rawData = await newsApi.getNewsDetail(id);
      const data = rawData?.data || rawData;
      if (data) {
        const chiTiets = Array.isArray(data.chitiets) ? data.chitiets : [];
        const chiTietText = chiTiets
          .map((ct: any) => ct?.ARTICLE || ct?.article || ct?.NOIDUNG || ct?.noiDung || '')
          .filter(Boolean)
          .join('\n\n');

        const summaryText =
          data.TOMTAT || data.tomTat || data.MOTA || data.moTa || data.summary || '';

        const mainContent =
          data.NOIDUNG ||
          data.noiDung ||
          chiTietText ||
          data.MOTA ||
          data.moTa ||
          data.TOMTAT ||
          data.tomTat ||
          data.content ||
          DEFAULT_POST.content;

        setPost({
          title: data.TIEUDE || data.tieuDe || data.title || DEFAULT_POST.title,
          summary: summaryText && summaryText !== mainContent ? summaryText : '',
          date: formatNewsDate(data.NGAYDANG || data.ngayDang || data.created_at || data.date),
          author: data.TACGIA || data.tacGia || data.author || 'Givral Bakery',
          image: formatImageUrl(data.HINHANH || data.hinhAnh || data.image || DEFAULT_POST.image),
          content: mainContent,
          chitiets: chiTiets,
        });
      }
    } catch (e) {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async (id: string, silent = false) => {
    if (!silent) setLoadingComments(true);
    try {
      const data = await newsApi.getNewsComments(id);
      const list = Array.isArray(data) ? data : (data?.data || []);
      setComments(list);
    } catch (e) {
      // Ignore
    } finally {
      if (!silent) setLoadingComments(false);
    }
  };

  const handleCommentSubmit = async () => {
    if (!isLoggedIn) {
      setLoginModalVisible(true);
      return;
    }
    if (!newCommentText.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập nội dung bình luận.');
      return;
    }
    setSubmittingComment(true);
    try {
      await newsApi.postNewsComment(String(params.id), newCommentText.trim());
      setNewCommentText('');
      await loadComments(String(params.id));
      Alert.alert('Thành công', 'Đã đăng bình luận thành công!');
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.error || e?.response?.data?.message || 'Gửi bình luận không thành công, vui lòng thử lại.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReplySubmit = async (parentId: string | number) => {
    if (!isLoggedIn) {
      setLoginModalVisible(true);
      return;
    }
    if (!replyContent.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập nội dung phản hồi.');
      return;
    }
    setSubmittingReply(true);
    try {
      await newsApi.postNewsComment(String(params.id), replyContent.trim(), parentId);
      setReplyContent('');
      setReplyingToId(null);
      await loadComments(String(params.id));
      Alert.alert('Thành công', 'Đã gửi phản hồi thành công!');
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.error || e?.response?.data?.message || 'Gửi phản hồi không thành công, vui lòng thử lại.');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(customer)');
    }
  };

  const countTotalComments = (list: any[]): number => {
    let count = 0;
    for (const item of list) {
      count++;
      if (item.replies && Array.isArray(item.replies)) {
        count += countTotalComments(item.replies);
      }
    }
    return count;
  };

  const totalCommentsCount = countTotalComments(comments);

  const getAvatarUrl = (cmt: any) => {
    const avatar =
      cmt.khachhang?.taikhoan?.AVATAR ||
      cmt.khachhang?.AVATAR ||
      cmt.AVATAR ||
      cmt.avatar;
    if (!avatar) return null;
    return formatImageUrl(avatar);
  };

  const renderCommentItem = (cmt: any, isReply = false) => {
    const cmtId = cmt.MABINHLUAN ?? cmt.MABL ?? cmt.id;
    const authorName =
      cmt.HOTEN ||
      cmt.hoTen ||
      cmt.khachhang?.HOTEN ||
      cmt.khachhang?.hoTen ||
      cmt.taikhoan?.USERNAME ||
      cmt.taikhoan?.username ||
      cmt.khachhang?.USERNAME ||
      'Khách hàng';
    const commentBody =
      cmt.NOI_DUNG || cmt.NOIDUNG || cmt.noiDung || cmt.content || '';
    const userRole = cmt.khachhang?.taikhoan?.MAROLE ?? cmt.vaiTroId;
    const isAdmin =
      userRole === 0 ||
      userRole === 1 ||
      userRole === '0' ||
      userRole === '1' ||
      String(cmt.MAKH || '').startsWith('KH_ADMIN') ||
      authorName.includes('Quản trị viên');
    const isReplyingThis = replyingToId !== null && String(replyingToId) === String(cmtId);

    return (
      <View
        key={String(cmtId || Math.random())}
        style={[
          styles.commentContainer,
          isReply && {
            marginLeft: 24,
            borderLeftWidth: 2,
            borderLeftColor: colors.tint,
            paddingLeft: 12,
          },
        ]}
      >
        <View style={styles.commentHeader}>
          <View
            style={[
              styles.avatarCircle,
              { backgroundColor: isAdmin ? '#d35400' : isReply ? '#e67e22' : colors.tint },
            ]}
          >
            {getAvatarUrl(cmt) ? (
              <Image source={{ uri: getAvatarUrl(cmt)! }} style={styles.avatarImage} />
            ) : (
              <ThemedText style={styles.avatarText}>{authorName[0]?.toUpperCase() || 'K'}</ThemedText>
            )}
          </View>

          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
              <ThemedText style={styles.authorName}>{authorName}</ThemedText>
              {cmt.replyTo?.HOTEN && (
                <ThemedText style={{ fontSize: 13, color: colors.tint, marginLeft: 4, fontStyle: 'italic' }}>
                  ▶ @{cmt.replyTo.HOTEN}
                </ThemedText>
              )}
              {isAdmin && (
                <View style={styles.adminBadge}>
                  <ThemedText style={styles.adminBadgeText}>Quản trị viên</ThemedText>
                </View>
              )}
            </View>
            <ThemedText style={styles.commentDate}>
              {formatNewsDate(cmt.NGAYDANG || cmt.ngayDang || cmt.created_at)}
            </ThemedText>
          </View>

          {cmtId !== undefined && (
            <TouchableOpacity
              style={styles.replyButton}
              onPress={() => {
                if (isReplyingThis) {
                  setReplyingToId(null);
                  setReplyContent('');
                } else {
                  setReplyingToId(cmtId);
                  setReplyContent('');
                }
              }}
            >
              <ThemedText style={[styles.replyButtonText, { color: colors.tint }]}>
                {isReplyingThis ? 'Hủy' : 'Trả lời'}
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>

        <ThemedText style={styles.commentContent}>{commentBody}</ThemedText>

        {isReplyingThis && (
          <View style={[styles.replyFormInline, { borderColor: colors.cardBorder }]}>
            <TextInput
              style={[styles.replyInput, { color: colors.text }]}
              placeholder={`Trả lời @${authorName}...`}
              placeholderTextColor={colors.icon}
              value={replyContent}
              onChangeText={setReplyContent}
              multiline
            />
            <View style={styles.replyFormButtons}>
              <TouchableOpacity
                style={styles.replyCancelBtn}
                onPress={() => setReplyingToId(null)}
              >
                <ThemedText>Hủy</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.replySubmitBtn, { backgroundColor: colors.tint }]}
                onPress={() => handleReplySubmit(cmtId)}
                disabled={submittingReply}
              >
                {submittingReply ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={styles.replySubmitBtnText}>Gửi</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Cố định cấu trúc phẳng tối đa 1 cấp thụt lề */}
        {!isReply && cmt.replies && cmt.replies.length > 0 && (
          <View style={styles.repliesList}>
            {cmt.replies.map((reply: any) => renderCommentItem(reply, true))}
          </View>
        )}
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <LoginRequiredModal
        visible={loginModalVisible}
        onClose={() => setLoginModalVisible(false)}
      />

      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle} numberOfLines={1}>
          Chi tiết bài viết
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        ) : (
          <>
            <ThemedText style={styles.postTitle}>{post.title}</ThemedText>

            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={14} color={colors.icon} style={{ marginRight: 4 }} />
              <ThemedText style={styles.metaText}>{post.date}</ThemedText>
              <ThemedText style={styles.dot}>•</ThemedText>
              <Ionicons name="person-outline" size={14} color={colors.icon} style={{ marginRight: 4 }} />
              <ThemedText style={styles.metaText}>{post.author}</ThemedText>
            </View>

            <Image source={{ uri: post.image }} style={styles.postImage} />

            {!!post.summary && (
              <View style={[styles.summaryBox, { backgroundColor: colors.tint + '12', borderLeftColor: colors.tint }]}>
                <ThemedText style={styles.summaryText}>{post.summary}</ThemedText>
              </View>
            )}

            <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <ThemedText style={styles.contentText}>{post.content}</ThemedText>
            </View>

            {/* COMMENTS SECTION */}
            <View style={styles.commentsSection}>
              <ThemedText style={styles.commentsTitle}>Bình luận ({totalCommentsCount})</ThemedText>

              {/* Write Comment Form */}
              <View style={[styles.commentForm, { borderColor: colors.cardBorder }]}>
                <TextInput
                  style={[styles.commentInput, { color: colors.text }]}
                  placeholder="Viết bình luận của bạn..."
                  placeholderTextColor={colors.icon}
                  value={newCommentText}
                  onChangeText={setNewCommentText}
                  multiline
                  numberOfLines={3}
                />
                <TouchableOpacity
                  style={[styles.commentSubmitBtn, { backgroundColor: colors.tint }]}
                  onPress={handleCommentSubmit}
                  disabled={submittingComment}
                >
                  {submittingComment ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <ThemedText style={styles.commentSubmitBtnText}>Gửi bình luận</ThemedText>
                  )}
                </TouchableOpacity>
              </View>

              {/* Comments List */}
              {loadingComments ? (
                <ActivityIndicator size="small" color={colors.tint} style={{ marginTop: 20 }} />
              ) : comments.length === 0 ? (
                <ThemedText style={styles.noCommentsText}>
                  Chưa có bình luận nào cho bài viết này. Hãy là người đầu tiên!
                </ThemedText>
              ) : (
                <View style={styles.commentsList}>
                  {comments.map((cmt) => renderCommentItem(cmt))}
                </View>
              )}
            </View>
          </>
        )}
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
  center: {
    paddingVertical: 100,
    justifyContent: 'center',
    alignItems: 'center',
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
  summaryBox: {
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: 14,
  },
  summaryText: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 21,
    fontWeight: '600',
    opacity: 0.9,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  contentText: {
    fontSize: 15,
    lineHeight: 24,
    opacity: 0.85,
  },
  commentsSection: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    paddingTop: 20,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  commentForm: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  commentInput: {
    minHeight: 60,
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  commentSubmitBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  commentSubmitBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  noCommentsText: {
    textAlign: 'center',
    opacity: 0.5,
    marginVertical: 20,
    fontSize: 14,
  },
  commentsList: {
    marginTop: 10,
  },
  commentContainer: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  authorName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  adminBadge: {
    backgroundColor: '#f1c40f',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  adminBadgeText: {
    color: '#2c3e50',
    fontSize: 9,
    fontWeight: 'bold',
  },
  commentDate: {
    fontSize: 11,
    opacity: 0.4,
    marginTop: 2,
  },
  replyButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  replyButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  commentContent: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.85,
    marginLeft: 46,
  },
  replyFormInline: {
    marginTop: 10,
    marginLeft: 46,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  replyInput: {
    fontSize: 13,
    minHeight: 40,
    textAlignVertical: 'top',
  },
  replyFormButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
    gap: 8,
  },
  replyCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  replySubmitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  replySubmitBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  repliesList: {
    marginTop: 12,
  },
});
