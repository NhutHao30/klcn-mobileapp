import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  PanResponder,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/services/api/authApi';

interface Point {
  x: number;
  y: number;
}

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user, profile, refreshProfile, isLoggedIn } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Digital signature state
  const vaiTroId = Number(
    user?.vaiTroId || user?.role_id || (user?.vaitro ? user?.vaitro.id : 0) || profile?.roleId || 0
  );
  const isAdmin = vaiTroId === 1;
  const canSign = !isAdmin && [2, 4, 7, 8].includes(vaiTroId);

  const [existingSignature, setExistingSignature] = useState<string | null>(null);
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [isSavingSignature, setIsSavingSignature] = useState(false);
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);

  // Lấy dữ liệu mới nhất khi mở màn hình
  useEffect(() => {
    refreshProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Đồng bộ form khi dữ liệu người dùng thay đổi
  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName);
      setPhone(profile.phone);
      setBirthDate(profile.birthDate);
      if (profile.signature) {
        setExistingSignature(profile.signature);
      }
    }
  }, [profile]);

  const avatarUrl = (user as any)?.avatar || (user as any)?.nguoidung?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(
    profile?.fullName || 'Givral Bakery'
  )}&background=d97706&color=fff&bold=true`;

  const handleSave = async () => {
    if (!isLoggedIn) {
      Alert.alert('Thông báo', 'Bạn cần đăng nhập để cập nhật hồ sơ.');
      return;
    }
    if (!fullName.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập họ và tên.');
      return;
    }
    if (!/^(0|\+84)\d{9}$/.test(phone.trim())) {
      Alert.alert('Thông báo', 'Số điện thoại không hợp lệ.');
      return;
    }

    let ngaySinh: string | undefined;
    if (birthDate.trim()) {
      const m = birthDate.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (!m) {
        Alert.alert('Thông báo', 'Ngày sinh phải theo dạng dd/mm/yyyy.');
        return;
      }
      ngaySinh = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    }

    try {
      setIsSaving(true);
      await authApi.updateProfile({
        hoTen: fullName.trim(),
        soDienThoai: phone.trim(),
        ngaySinh,
      });
      await refreshProfile();
      Alert.alert('Thành công', 'Đã cập nhật thông tin cá nhân.');
    } catch (e: any) {
      const data = e?.response?.data;
      Alert.alert(
        'Cập nhật không thành công',
        data?.error || data?.message || (e?.response ? 'Có lỗi xảy ra.' : 'Không kết nối được máy chủ.')
      );
    } finally {
      setIsSaving(false);
    }
  };

  const [scrollEnabled, setScrollEnabled] = useState(true);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Smooth quadratic bezier path calculation
  const pointsToSmoothPath = (pts: Point[]) => {
    if (!pts || pts.length === 0) return '';
    if (pts.length === 1) {
      return `M ${pts[0].x} ${pts[0].y} L ${pts[0].x + 0.5} ${pts[0].y + 0.5}`;
    }
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const midX = (p0.x + p1.x) / 2;
      const midY = (p0.y + p1.y) / 2;
      d += ` Q ${p0.x} ${p0.y}, ${midX} ${midY}`;
    }
    const last = pts[pts.length - 1];
    d += ` L ${last.x} ${last.y}`;
    return d;
  };

  // High performance PanResponder with gesture lock
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false, // Khóa cử chỉ không cho ScrollView cướp nét vẽ
      onPanResponderGrant: (evt) => {
        setScrollEnabled(false);
        const { locationX, locationY } = evt.nativeEvent;
        const pt = { x: Math.round(locationX), y: Math.round(locationY) };
        lastPointRef.current = pt;
        setCurrentStroke([pt]);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const pt = { x: Math.round(locationX), y: Math.round(locationY) };
        if (lastPointRef.current) {
          const dx = pt.x - lastPointRef.current.x;
          const dy = pt.y - lastPointRef.current.y;
          // Lọc rung lắc < 2px để nét ký mượt mà và phản hồi tức thì theo ngón tay
          if (Math.hypot(dx, dy) < 2) return;
        }
        lastPointRef.current = pt;
        setCurrentStroke((prev) => [...prev, pt]);
      },
      onPanResponderRelease: () => {
        setScrollEnabled(true);
        setCurrentStroke((curr) => {
          if (curr.length > 0) {
            setStrokes((all) => [...all, curr]);
          }
          return [];
        });
        lastPointRef.current = null;
      },
      onPanResponderTerminate: () => {
        setScrollEnabled(true);
        setCurrentStroke((curr) => {
          if (curr.length > 0) {
            setStrokes((all) => [...all, curr]);
          }
          return [];
        });
        lastPointRef.current = null;
      },
    })
  ).current;

  const handleClearSignature = () => {
    setStrokes([]);
    setCurrentStroke([]);
    lastPointRef.current = null;
  };

  const generateSvgString = () => {
    const allStrokes = [...strokes, ...(currentStroke.length > 0 ? [currentStroke] : [])];
    if (allStrokes.length === 0) return null;

    const paths = allStrokes.map(pointsToSmoothPath).filter(Boolean);
    const pathD = paths.join(' ');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 160" width="320" height="160"><path d="${pathD}" fill="none" stroke="#1E293B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" /></svg>`;
  };

  const handleSaveSignature = async () => {
    const svgContent = generateSvgString();
    if (!svgContent) {
      Alert.alert('Chưa có chữ ký', 'Vui lòng dùng ngón tay vẽ chữ ký của bạn lên khung ký trước khi lưu.');
      return;
    }

    try {
      setIsSavingSignature(true);
      const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
      await authApi.updateSignature(dataUri);
      setExistingSignature(dataUri);
      setIsDrawingOpen(false);
      handleClearSignature();
      await refreshProfile();
      Alert.alert('Thành công', 'Đã lưu mẫu chữ ký số cá nhân thành công! Bạn có thể sử dụng chữ ký này để ký duyệt biên bản.');
    } catch (e: any) {
      const data = e?.response?.data;
      Alert.alert('Lỗi lưu chữ ký', data?.message || data?.error || 'Không thể lưu chữ ký số.');
    } finally {
      setIsSavingSignature(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: '#d97706' }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Hồ sơ cá nhân & Ký số</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView scrollEnabled={scrollEnabled} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.avatarSection}>
          <Image 
            source={{ uri: avatarUrl }} 
            style={styles.avatar} 
          />
          <TouchableOpacity style={[styles.editAvatarBtn, { backgroundColor: '#d97706' }]}>
            <Ionicons name="camera" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        {profile && (
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <ThemedText style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>
              {profile.fullName || user?.username}
            </ThemedText>
            <View style={[styles.rolePill, { backgroundColor: '#d97706' + '20' }]}>
              <ThemedText style={{ color: '#d97706', fontSize: 12, fontWeight: '700' }}>
                {profile.roleLabel}
                {profile.storeName ? ` • ${profile.storeName}` : ''}
              </ThemedText>
            </View>
          </View>
        )}

        {/* THÔNG TIN CÁ NHÂN CARD */}
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <ThemedText style={styles.cardHeaderTitle}>Thông tin liên hệ</ThemedText>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Họ và tên</ThemedText>
            <View style={[styles.inputContainer, { borderColor: colors.cardBorder }]}>
              <Ionicons name="person-outline" size={20} color={colors.icon} style={styles.inputIcon} />
              <TextInput 
                style={[styles.input, { color: colors.text }]}
                value={fullName}
                onChangeText={setFullName}
                placeholderTextColor={colors.icon}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Email nội bộ</ThemedText>
            <View style={[styles.inputContainer, { borderColor: colors.cardBorder, backgroundColor: colors.background }]}>
              <Ionicons name="mail-outline" size={20} color={colors.icon} style={styles.inputIcon} />
              <TextInput 
                style={[styles.input, { color: colors.icon }]}
                value={profile?.email ?? ''}
                editable={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Số điện thoại</ThemedText>
            <View style={[styles.inputContainer, { borderColor: colors.cardBorder }]}>
              <Ionicons name="call-outline" size={20} color={colors.icon} style={styles.inputIcon} />
              <TextInput 
                style={[styles.input, { color: colors.text }]}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholderTextColor={colors.icon}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Ngày sinh</ThemedText>
            <View style={[styles.inputContainer, { borderColor: colors.cardBorder }]}>
              <Ionicons name="calendar-outline" size={20} color={colors.icon} style={styles.inputIcon} />
              <TextInput 
                style={[styles.input, { color: colors.text }]}
                value={birthDate}
                onChangeText={setBirthDate}
                placeholder="dd/mm/yyyy"
                placeholderTextColor={colors.icon}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: '#d97706', opacity: isSaving ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.saveBtnText}>Lưu thông tin cá nhân</ThemedText>
            )}
          </TouchableOpacity>
        </View>

        {/* CHỮ KÝ SỐ CÁ NHÂN SECTION (Dành cho QLCN, Kho, Kế toán, Giám đốc) */}
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="finger-print" size={20} color="#d97706" />
              </View>
              <ThemedText style={styles.cardHeaderTitle}>Chữ Ký Số Cá Nhân</ThemedText>
            </View>
            {canSign && (
              <View style={styles.signerBadge}>
                <ThemedText style={styles.signerBadgeText}>Thẩm quyền ký</ThemedText>
              </View>
            )}
          </View>

          <ThemedText style={styles.signatureDesc}>
            {canSign
              ? 'Chữ ký điện tử nội bộ được dùng để xác thực và niêm phong các biên bản nhập kho, chuyển kho và hủy hàng hóa.'
              : 'Mẫu chữ ký số đại diện cá nhân dùng trong việc ký kết và xác thực nội bộ hệ thống Givral Bakery.'}
          </ThemedText>

          {/* HIỂN THỊ CHỮ KÝ HIỆN TẠI NẾU CÓ */}
          {existingSignature && !isDrawingOpen && (
            <View style={styles.existingSignatureBox}>
              <ThemedText style={styles.signaturePreviewLabel}>Mẫu chữ ký số đã đăng ký:</ThemedText>
              <View style={styles.signatureImagePreviewWrap}>
                <Image
                  source={{ uri: existingSignature }}
                  style={styles.signaturePreviewImg}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.signatureStatusRow}>
                <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                <ThemedText style={styles.signatureActiveText}>Đang hoạt động & Hợp lệ</ThemedText>
              </View>
              <TouchableOpacity
                style={styles.redrawBtn}
                onPress={() => setIsDrawingOpen(true)}
              >
                <Ionicons name="create-outline" size={18} color="#d97706" />
                <ThemedText style={styles.redrawBtnText}>Vẽ lại chữ ký mới</ThemedText>
              </TouchableOpacity>
            </View>
          )}

          {/* KHUNG VẼ CHỮ KÝ SỐ TRỰC TIẾP TRÊN MOBILE */}
          {(!existingSignature || isDrawingOpen) && (
            <View style={styles.padWrapper}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <ThemedText style={styles.drawInstructionText}>
                  Dùng ngón tay ký vào khung bên dưới:
                </ThemedText>
                {existingSignature && (
                  <TouchableOpacity onPress={() => setIsDrawingOpen(false)}>
                    <ThemedText style={{ fontSize: 13, color: '#64748B', fontWeight: '600' }}>Hủy bỏ</ThemedText>
                  </TouchableOpacity>
                )}
              </View>

              <View
                style={styles.signatureCanvas}
                {...panResponder.panHandlers}
              >
                <Svg style={StyleSheet.absoluteFill}>
                  {strokes.map((s, idx) => (
                    <Path
                      key={`stroke-${idx}`}
                      d={pointsToSmoothPath(s)}
                      stroke="#1E293B"
                      strokeWidth={2.5}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                  {currentStroke.length > 0 && (
                    <Path
                      d={pointsToSmoothPath(currentStroke)}
                      stroke="#1E293B"
                      strokeWidth={2.5}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </Svg>
                {strokes.length === 0 && currentStroke.length === 0 && (
                  <View style={styles.padPlaceholder}>
                    <Ionicons name="pencil-outline" size={28} color="#CBD5E1" />
                    <ThemedText style={styles.placeholderText}>Ký tên tại đây</ThemedText>
                  </View>
                )}
              </View>

              <View style={styles.signatureActionsRow}>
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={handleClearSignature}
                  disabled={isSavingSignature}
                >
                  <Ionicons name="trash-outline" size={16} color="#DC2626" />
                  <ThemedText style={styles.clearBtnText}>Xóa nét</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveSignatureBtn, { opacity: isSavingSignature ? 0.7 : 1 }]}
                  onPress={handleSaveSignature}
                  disabled={isSavingSignature}
                >
                  {isSavingSignature ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done" size={18} color="#fff" />
                      <ThemedText style={styles.saveSignatureBtnText}>Lưu chữ ký số</ThemedText>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {canSign && (
            <TouchableOpacity
              style={styles.viewApprovalBtn}
              onPress={() => router.push('/(admin)/signature-approval')}
            >
              <Ionicons name="documents-outline" size={18} color="#d97706" />
              <ThemedText style={styles.viewApprovalBtnText}>
                Đến màn hình Duyệt & Ký số biên bản
              </ThemedText>
              <Ionicons name="chevron-forward" size={16} color="#d97706" />
            </TouchableOpacity>
          )}
        </View>
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
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: 18,
    position: 'relative',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#FDE68A',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: '37%',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  rolePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginTop: 6,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signerBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  signerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  signatureDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 14,
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    color: '#334155',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  saveBtn: {
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  existingSignatureBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  signaturePreviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  signatureImagePreviewWrap: {
    height: 100,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  signaturePreviewImg: {
    width: '90%',
    height: 80,
  },
  signatureStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  signatureActiveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  redrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d97706',
    gap: 6,
    backgroundColor: '#FFFBEB',
  },
  redrawBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#d97706',
  },
  padWrapper: {
    marginBottom: 12,
  },
  drawInstructionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  signatureCanvas: {
    height: 150,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  padPlaceholder: {
    alignItems: 'center',
    pointerEvents: 'none',
  },
  placeholderText: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    fontStyle: 'italic',
  },
  signatureActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    gap: 6,
  },
  clearBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
  saveSignatureBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d97706',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  saveSignatureBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  viewApprovalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginTop: 6,
  },
  viewApprovalBtnText: {
    flex: 1,
    marginHorizontal: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
});
