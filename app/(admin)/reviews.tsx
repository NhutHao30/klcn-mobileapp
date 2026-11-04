import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { adminApi } from '@/services/api/adminApi';
import { formatImageUrl } from '@/config/apiConfig';

type StarFilter = 'ALL' | '5' | '4' | 'LOW';
type StatusFilter = 'ALL' | 'VISIBLE' | 'HIDDEN' | 'UNREPLIED';

export default function AdminReviewsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [starFilter, setStarFilter] = useState<StarFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Reply Modal State
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [togglingId, setTogglingId] = useState<string | number | null>(null);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getAdminReviews();
      const raw = res?.data?.data || res?.data || res?.content || (Array.isArray(res) ? res : []);
      setReviews(Array.isArray(raw) ? raw : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const normalizedReviews = useMemo(() => {
    return reviews.map((rev, idx) => {
      const id = rev.id || rev.MADG || rev.maDG || idx + 1;
      const customerName =
        rev.hoTenKH ||
        rev.tenKhachHang ||
        rev.HOTEN ||
        rev.nguoi_dung?.ho_ten ||
        rev.khach_hang?.HOTEN ||
        rev.username ||
        'Khách hàng Givral';
      const productName =
        rev.tenSP || rev.TENSP || rev.san_pham?.TENSP || rev.san_pham?.ten_sp || 'Bánh Givral';
      const stars = Number(rev.soSao ?? rev.SO_SAO ?? rev.so_sao ?? rev.rating ?? 5);
      const content =
        rev.noiDung || rev.NOI_DUNG || rev.noi_dung || rev.binhLuan || 'Khách hàng đánh giá tốt.';
      const rawImg = rev.hinhAnh || rev.HINHANH || rev.hinh_anh || rev.image || null;
      const reply = rev.phanHoi || rev.PHAN_HOI || rev.phan_hoi || '';
      const isHidden =
        rev.trangThai === 0 ||
        rev.TRANG_THAI === 0 ||
        rev.trang_thai === 0 ||
        rev.is_hidden === true ||
        rev.hienThi === false ||
        rev.HIEN_THI === false;
      const createdAt = rev.ngayDanhGia || rev.NGAY_TAO || rev.created_at || 'Gần đây';

      return {
        id,
        customerName,
        productName,
        stars,
        content,
        rawImg,
        reply,
        isHidden,
        createdAt,
        raw: rev,
      };
    });
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return normalizedReviews.filter((r) => {
      if (starFilter === '5' && r.stars !== 5) return false;
      if (starFilter === '4' && r.stars !== 4) return false;
      if (starFilter === 'LOW' && r.stars > 3) return false;

      if (statusFilter === 'VISIBLE' && r.isHidden) return false;
      if (statusFilter === 'HIDDEN' && !r.isHidden) return false;
      if (statusFilter === 'UNREPLIED' && r.reply.trim() !== '') return false;

      if (q) {
        const match =
          r.customerName.toLowerCase().includes(q) ||
          r.productName.toLowerCase().includes(q) ||
          r.content.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [normalizedReviews, starFilter, statusFilter, searchQuery]);

  const handleToggleVisibility = async (rev: any) => {
    try {
      setTogglingId(rev.id);
      await adminApi.toggleReviewVisibility(rev.id);
      setReviews((prev) =>
        prev.map((item) => {
          const itemId = item.id || item.MADG || item.maDG;
          if (String(itemId) === String(rev.id)) {
            const nextHidden = !rev.isHidden;
            return {
              ...item,
              is_hidden: nextHidden,
              hienThi: !nextHidden,
              trangThai: nextHidden ? 0 : 1,
              trang_thai: nextHidden ? 0 : 1,
            };
          }
          return item;
        })
      );
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể đổi trạng thái hiển thị đánh giá.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleOpenReply = (rev: any) => {
    setSelectedReview(rev);
    setReplyText(rev.reply || '');
    setReplyModalOpen(true);
  };

  const handleSubmitReply = async () => {
    if (!selectedReview) return;
    if (!replyText.trim()) {
      Alert.alert('Thiếu nội dung', 'Vui lòng nhập nội dung phản hồi của CSKH.');
      return;
    }

    try {
      setSubmittingReply(true);
      await adminApi.replyReview(selectedReview.id, replyText.trim());
      setReviews((prev) =>
        prev.map((item) => {
          const itemId = item.id || item.MADG || item.maDG;
          if (String(itemId) === String(selectedReview.id)) {
            return {
              ...item,
              phanHoi: replyText.trim(),
              PHAN_HOI: replyText.trim(),
              phan_hoi: replyText.trim(),
            };
          }
          return item;
        })
      );
      Alert.alert('Thành công', 'Đã gửi phản hồi CSKH cho đánh giá sản phẩm!');
      setReplyModalOpen(false);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể gửi phản hồi đánh giá.');
    } finally {
      setSubmittingReply(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: '#B71C1C' }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <ThemedText style={styles.headerTitle}>Quản Lý Đánh Giá Sản Phẩm</ThemedText>
            <ThemedText style={{ color: '#FDE047', fontSize: 11, fontWeight: '600' }}>
              Chăm sóc khách hàng • Phản hồi & Kiểm duyệt
            </ThemedText>
          </View>
          <TouchableOpacity onPress={loadReviews} style={styles.backButton}>
            <Ionicons name="refresh" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo tên khách hàng, tên bánh, nội dung..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* FILTER BAR */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}
        >
          {[
            { key: 'ALL', label: `Tất cả (${normalizedReviews.length})` },
            { key: '5', label: '⭐ 5 sao' },
            { key: '4', label: '⭐ 4 sao' },
            { key: 'LOW', label: '⚠️ 1-3 sao' },
          ].map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, starFilter === f.key && styles.filterChipActive]}
              onPress={() => setStarFilter(f.key as StarFilter)}
            >
              <ThemedText
                style={[
                  styles.filterChipText,
                  starFilter === f.key && { color: '#FFF', fontWeight: '700' },
                ]}
              >
                {f.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
        >
          {[
            { key: 'ALL', label: 'Mọi trạng thái' },
            { key: 'UNREPLIED', label: 'Chưa trả lời' },
            { key: 'VISIBLE', label: 'Đang hiển thị' },
            { key: 'HIDDEN', label: 'Đã ẩn' },
          ].map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[styles.subFilterChip, statusFilter === s.key && styles.subFilterChipActive]}
              onPress={() => setStatusFilter(s.key as StatusFilter)}
            >
              <ThemedText
                style={[
                  styles.subFilterChipText,
                  statusFilter === s.key && { color: '#B71C1C', fontWeight: '800' },
                ]}
              >
                {s.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* REVIEW LIST */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadReviews} colors={['#B71C1C']} />
        }
        contentContainerStyle={{ padding: 16 }}
      >
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#B71C1C" />
            <ThemedText style={{ marginTop: 12, opacity: 0.6 }}>
              Đang tải danh sách đánh giá khách hàng...
            </ThemedText>
          </View>
        ) : filteredReviews.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Ionicons name="star-outline" size={56} color={colors.cardTextSecondary} />
            <ThemedText style={{ marginTop: 12, fontSize: 16, fontWeight: 'bold' }}>
              Không có đánh giá nào phù hợp
            </ThemedText>
            <ThemedText style={{ marginTop: 4, opacity: 0.6 }}>
              Thử đổi bộ lọc số sao hoặc trạng thái hiển thị.
            </ThemedText>
          </View>
        ) : (
          filteredReviews.map((rev) => (
            <View
              key={String(rev.id)}
              style={[
                styles.reviewCard,
                { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
                rev.isHidden && { opacity: 0.72, borderColor: '#FCA5A5' },
              ]}
            >
              {/* Top Row: Customer + Status Badge */}
              <View style={styles.cardTopRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View style={styles.customerAvatar}>
                    <Ionicons name="person" size={18} color="#B71C1C" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.customerName} numberOfLines={1}>
                      {rev.customerName}
                    </ThemedText>
                    <ThemedText style={styles.productNameText} numberOfLines={1}>
                      🎂 {rev.productName}
                    </ThemedText>
                  </View>
                </View>

                <View
                  style={[
                    styles.visibilityBadge,
                    { backgroundColor: rev.isHidden ? '#FEE2E2' : '#DCFCE7' },
                  ]}
                >
                  <Ionicons
                    name={rev.isHidden ? 'eye-off-outline' : 'eye-outline'}
                    size={13}
                    color={rev.isHidden ? '#DC2626' : '#15803D'}
                  />
                  <ThemedText
                    style={[
                      styles.visibilityBadgeText,
                      { color: rev.isHidden ? '#DC2626' : '#15803D' },
                    ]}
                  >
                    {rev.isHidden ? 'Đã ẩn' : 'Hiển thị'}
                  </ThemedText>
                </View>
              </View>

              {/* Stars + Date */}
              <View style={styles.starsRow}>
                <View style={{ flexDirection: 'row', gap: 2 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Ionicons
                      key={s}
                      name={s <= rev.stars ? 'star' : 'star-outline'}
                      size={16}
                      color="#F59E0B"
                    />
                  ))}
                </View>
                <ThemedText style={styles.dateText}>{String(rev.createdAt).split('T')[0]}</ThemedText>
              </View>

              {/* Review Content */}
              <ThemedText style={styles.reviewContentText}>{rev.content}</ThemedText>

              {/* Customer Uploaded Review Image */}
              {rev.rawImg && (
                <Image
                  source={{ uri: formatImageUrl(rev.rawImg) }}
                  style={styles.reviewAttachedImage}
                  resizeMode="cover"
                />
              )}

              {/* CSKH Reply Box */}
              {rev.reply ? (
                <View style={styles.cskhReplyBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Ionicons name="chatbubble-ellipses" size={14} color="#B71C1C" />
                    <ThemedText style={styles.cskhReplyTitle}>
                      Phản hồi từ Givral Bakery (CSKH):
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.cskhReplyContent}>{rev.reply}</ThemedText>
                </View>
              ) : null}

              {/* Action Buttons: Ẩn/Hiện & Trả lời */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    { backgroundColor: rev.isHidden ? '#ECFDF5' : '#FEF2F2' },
                  ]}
                  onPress={() => handleToggleVisibility(rev)}
                  disabled={togglingId === rev.id}
                >
                  {togglingId === rev.id ? (
                    <ActivityIndicator size="small" color="#B71C1C" />
                  ) : (
                    <>
                      <Ionicons
                        name={rev.isHidden ? 'eye-outline' : 'eye-off-outline'}
                        size={16}
                        color={rev.isHidden ? '#059669' : '#DC2626'}
                      />
                      <ThemedText
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: rev.isHidden ? '#059669' : '#DC2626',
                        }}
                      >
                        {rev.isHidden ? 'Hiện đánh giá' : 'Ẩn đánh giá'}
                      </ThemedText>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#B71C1C' }]}
                  onPress={() => handleOpenReply(rev)}
                >
                  <Ionicons name="return-down-forward-outline" size={16} color="#FFF" />
                  <ThemedText style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>
                    {rev.reply ? 'Sửa phản hồi' : 'Trả lời đánh giá'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 60 }} />
      </ScrollView>

      {/* REPLY MODAL */}
      <Modal
        visible={replyModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setReplyModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Phản hồi đánh giá khách hàng</ThemedText>
              <TouchableOpacity onPress={() => setReplyModalOpen(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedReview && (
              <View style={styles.quoteReviewBox}>
                <ThemedText style={{ fontWeight: '700', fontSize: 13 }}>
                  {selectedReview.customerName} ({selectedReview.stars} ⭐) —{' '}
                  {selectedReview.productName}
                </ThemedText>
                <ThemedText style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                  "{selectedReview.content}"
                </ThemedText>
              </View>
            )}

            <ThemedText style={{ fontSize: 13, fontWeight: '700', marginBottom: 6 }}>
              Nội dung phản hồi CSKH:
            </ThemedText>
            <TextInput
              style={[styles.replyInput, { color: colors.text, borderColor: colors.cardBorder }]}
              multiline
              placeholder="Cảm ơn quý khách đã tin tưởng Givral Bakery..."
              placeholderTextColor="#94A3B8"
              value={replyText}
              onChangeText={setReplyText}
            />

            {/* Quick reply templates */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 14 }}
              contentContainerStyle={{ gap: 8 }}
            >
              {[
                'Cảm ơn quý khách đã yêu thích bánh của Givral Bakery! Hẹn gặp lại quý khách.',
                'Givral Bakery xin ghi nhận góp ý của quý khách và sẽ nâng cao chất lượng phục vụ.',
              ].map((tpl, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.quickTemplateChip}
                  onPress={() => setReplyText(tpl)}
                >
                  <ThemedText style={styles.quickTemplateText} numberOfLines={1}>
                    Mẫu {i + 1}: {tpl}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#94A3B8' }]}
                onPress={() => setReplyModalOpen(false)}
              >
                <ThemedText style={styles.modalBtnText}>Hủy</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#B71C1C' }]}
                onPress={handleSubmitReply}
                disabled={submittingReply}
              >
                {submittingReply ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.modalBtnText}>Gửi phản hồi</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 44,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  filterSection: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#B71C1C',
    borderColor: '#B71C1C',
  },
  filterChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  subFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subFilterChipActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#B71C1C',
  },
  subFilterChipText: {
    fontSize: 11,
    color: '#64748B',
  },
  reviewCard: {
    borderRadius: 14,
    padding: 15,
    borderWidth: 1,
    marginBottom: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '700',
  },
  productNameText: {
    fontSize: 12,
    color: '#B45309',
    fontWeight: '600',
  },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  visibilityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 11,
    color: '#64748B',
  },
  reviewContentText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  reviewAttachedImage: {
    width: '100%',
    height: 170,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: '#F1F5F9',
  },
  cskhReplyBox: {
    backgroundColor: '#FFFBEB',
    borderLeftWidth: 3,
    borderLeftColor: '#B71C1C',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  cskhReplyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B71C1C',
  },
  cskhReplyContent: {
    fontSize: 13,
    color: '#451A03',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  quoteReviewBox: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  replyInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    height: 100,
    textAlignVertical: 'top',
    fontSize: 14,
    marginBottom: 10,
  },
  quickTemplateChip: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 260,
  },
  quickTemplateText: {
    fontSize: 11,
    color: '#B71C1C',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
