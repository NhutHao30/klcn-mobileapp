import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet, View, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Modal, ScrollView, Platform, Image,
  PanResponder, DimensionValue,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { adminApi } from '@/services/api/adminApi';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Constants ───────────────────────────────────────────────────────────────
const TRANG_THAI_FILTERS = [
  { value: '',              label: 'Tất cả' },
  { value: 'cho_xac_nhan', label: 'Chờ xác nhận' },
  { value: 'da_coc',       label: 'Đã cọc' },
  { value: 'san_sang',     label: 'Sẵn sàng' },
  { value: 'da_giao',      label: 'Đã giao' },
  { value: 'da_huy',       label: 'Đã hủy' },
];

const BADGE_CFG: Record<string, { bg: string; text: string; label: string }> = {
  cho_xac_nhan: { bg: '#e5e7eb', text: '#374151', label: 'Chờ xác nhận' },
  da_coc:       { bg: '#fef3c7', text: '#92400e', label: 'Đã cọc' },
  san_sang:     { bg: '#dbeafe', text: '#1e40af', label: 'Sẵn sàng' },
  da_giao:      { bg: '#d1fae5', text: '#065f46', label: 'Đã giao' },
  da_huy:       { bg: '#fee2e2', text: '#991b1b', label: 'Đã hủy' },
};

const fmt = (n: number) =>
  Number(n || 0).toLocaleString('vi-VN') + ' ₫';

const formatLocalYMDHMS = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const emptyRow = () => ({ ten_sp: '', masp: '', so_luong: '1', don_gia: '', ghi_chu_sp: '' });
const emptyForm = () => ({
  hoten_kh: '', sdt_kh: '', makh: '',
  ngay_hen_lay: new Date(Date.now() + 3600000 * 2), // +2 giờ mặc định
  hinh_thuc_nhan: 'tai_cua_hang',
  dia_chi_giao: '',
  phi_giao_hang: '',
  ghi_chu: '', tien_coc: '', phuong_thuc_coc: 'Tiền mặt',
  chu_ky: '',
  chi_tiet: [emptyRow()],
});

// ─── Component Vẽ Nét Bút Ký Mượt Mà Chuẩn Toạ Độ Tâm (Pure React Native) ───
const RenderStrokeSegments = ({
  strokes,
  thickness = 3.5,
  color = '#1e3a8a',
}: {
  strokes: Array<Array<{ x: number; y: number }>>;
  thickness?: number;
  color?: string;
}) => {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {strokes.map((stroke, sIdx) => {
        if (!stroke || stroke.length === 0) return null;
        if (stroke.length === 1) {
          const pt = stroke[0];
          return (
            <View
              key={`dot-${sIdx}-0`}
              style={{
                position: 'absolute',
                left: pt.x - thickness / 2,
                top: pt.y - thickness / 2,
                width: thickness,
                height: thickness,
                borderRadius: thickness / 2,
                backgroundColor: color,
              }}
            />
          );
        }
        return (
          <React.Fragment key={`stroke-${sIdx}`}>
            {stroke.map((pt, pIdx) => {
              if (pIdx === 0) {
                return (
                  <View
                    key={`dot-${sIdx}-0`}
                    style={{
                      position: 'absolute',
                      left: pt.x - thickness / 2,
                      top: pt.y - thickness / 2,
                      width: thickness,
                      height: thickness,
                      borderRadius: thickness / 2,
                      backgroundColor: color,
                    }}
                  />
                );
              }
              const prev = stroke[pIdx - 1];
              const dx = pt.x - prev.x;
              const dy = pt.y - prev.y;
              const len = Math.hypot(dx, dy);
              if (len < 0.3) return null;
              const midX = (prev.x + pt.x) / 2;
              const midY = (prev.y + pt.y) / 2;
              const angle = Math.atan2(dy, dx) * (180 / Math.PI);

              return (
                <React.Fragment key={`seg-${sIdx}-${pIdx}`}>
                  {/* Đoạn thẳng xoay quanh tâm trung điểm (midX, midY) */}
                  <View
                    style={{
                      position: 'absolute',
                      left: midX - len / 2,
                      top: midY - thickness / 2,
                      width: len,
                      height: thickness,
                      backgroundColor: color,
                      borderRadius: thickness / 2,
                      transform: [{ rotate: `${angle}deg` }],
                    }}
                  />
                  {/* Khớp nối tròn tại điểm đỉnh để nét uốn lượn mượt mà */}
                  <View
                    style={{
                      position: 'absolute',
                      left: pt.x - thickness / 2,
                      top: pt.y - thickness / 2,
                      width: thickness,
                      height: thickness,
                      borderRadius: thickness / 2,
                      backgroundColor: color,
                    }}
                  />
                </React.Fragment>
              );
            })}
          </React.Fragment>
        );
      })}
    </View>
  );
};

// ─── Hàm Chuyển SVG Path Thành Toạ Độ Vẽ Lại ────────────────────────────────
const parseSvgToStrokes = (svgOrDataUri: string): Array<Array<{ x: number; y: number }>> => {
  if (!svgOrDataUri) return [];
  const decoded = svgOrDataUri.startsWith('data:image/svg+xml')
    ? decodeURIComponent(svgOrDataUri.replace(/^data:image\/svg\+xml(?:;utf8)?,/, ''))
    : svgOrDataUri;

  const match = decoded.match(/<path[^>]*d="([^"]+)"/);
  if (!match) return [];
  const d = match[1];
  const strokes: Array<Array<{ x: number; y: number }>> = [];
  const parts = d.split('M').filter(Boolean);
  parts.forEach(p => {
    const coords = p.trim().split(/[L\s]+/).filter(Boolean);
    const stroke: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < coords.length; i += 2) {
      const x = parseFloat(coords[i]);
      const y = parseFloat(coords[i + 1]);
      if (!isNaN(x) && !isNaN(y)) stroke.push({ x, y });
    }
    if (stroke.length > 0) strokes.push(stroke);
  });
  return strokes;
};

// ─── Component Hiển Thị Preview Chữ Ký (Tự Động Thu Phóng Fit Vừa Khung) ────
const RenderSignature = ({
  uri,
  width = '100%',
  height = 140,
}: {
  uri: string;
  width?: DimensionValue;
  height?: number;
}) => {
  const [boxLayout, setBoxLayout] = useState<{ width: number; height: number }>({ width: 340, height });

  if (!uri) return null;

  // Kiểm tra nếu là chữ ký tự động theo tên dạng SVG Text
  const decoded = uri.startsWith('data:image/svg+xml')
    ? decodeURIComponent(uri.replace(/^data:image\/svg\+xml(?:;utf8)?,/, ''))
    : uri;

  const textMatch = decoded.match(/<text[^>]*>([^<]+)<\/text>/);
  if (textMatch) {
    return (
      <View
        onLayout={e => {
          const { width: w, height: h } = e.nativeEvent.layout;
          if (w > 0 && h > 0) setBoxLayout({ width: Math.round(w), height: Math.round(h) });
        }}
        style={{ width, height, alignItems: 'center', justifyContent: 'center', padding: 8 }}
      >
        <ThemedText style={{ fontStyle: 'italic', fontWeight: '700', fontSize: 24, color: '#1e3a8a', textAlign: 'center' }}>
          ✍️ {textMatch[1].trim()}
        </ThemedText>
        <View style={{ width: 140, height: 2, backgroundColor: '#2563eb', marginTop: 4, borderRadius: 1 }} />
      </View>
    );
  }

  // Nếu là chữ ký vẽ tay SVG Path
  const parsedStrokes = parseSvgToStrokes(uri);
  if (parsedStrokes.length > 0) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    parsedStrokes.forEach(s => {
      s.forEach(pt => {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      });
    });

    const contentW = Math.max(1, maxX - minX);
    const contentH = Math.max(1, maxY - minY);
    const pad = 12;
    const availW = Math.max(10, boxLayout.width - pad * 2);
    const availH = Math.max(10, boxLayout.height - pad * 2);

    // Tính tỷ lệ thu phóng (scale) để toàn bộ chữ ký fit vừa vặn khung mà không bị cắt mép
    const scale = Math.min(availW / contentW, availH / contentH, 1.0);
    const drawW = contentW * scale;
    const drawH = contentH * scale;
    const offsetX = (boxLayout.width - drawW) / 2;
    const offsetY = (boxLayout.height - drawH) / 2;

    const scaledStrokes = parsedStrokes.map(stroke =>
      stroke.map(pt => ({
        x: (pt.x - minX) * scale + offsetX,
        y: (pt.y - minY) * scale + offsetY,
      }))
    );
    const scaledThickness = Math.max(1.8, 3.2 * scale);

    return (
      <View
        onLayout={e => {
          const { width: w, height: h } = e.nativeEvent.layout;
          if (w > 0 && h > 0) setBoxLayout({ width: Math.round(w), height: Math.round(h) });
        }}
        style={{ width, height, position: 'relative', overflow: 'hidden' }}
      >
        <RenderStrokeSegments strokes={scaledStrokes} thickness={scaledThickness} color="#1e3a8a" />
      </View>
    );
  }

  // Nếu là ảnh base64 hoặc URL ảnh
  if (uri.startsWith('data:image') || uri.startsWith('http')) {
    return <Image source={{ uri }} style={{ width: typeof width === 'number' ? width : 260, height, resizeMode: 'contain' }} />;
  }

  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
      <ThemedText style={{ fontStyle: 'italic', color: '#1e40af', fontWeight: '600' }}>{uri}</ThemedText>
    </View>
  );
};
// ─── Modal Bảng Ký Tên Chuyên Dụng (Mượt Mà 60FPS Không Phụ Thuộc) ───────────
const DedicatedSignatureModal = ({
  visible,
  customerName,
  initialSignature,
  onSave,
  onClose,
}: {
  visible: boolean;
  customerName: string;
  initialSignature?: string;
  onSave: (base64: string) => void;
  onClose: () => void;
}) => {
  const [strokes, setStrokes] = useState<Array<Array<{ x: number; y: number }>>>([]);
  const [currentStroke, setCurrentStroke] = useState<Array<{ x: number; y: number }>>([]);
  const [canvasLayout, setCanvasLayout] = useState<{ width: number; height: number }>({ width: 360, height: 300 });

  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        lastPointRef.current = { x: locationX, y: locationY };
        setCurrentStroke([{ x: locationX, y: locationY }]);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        if (lastPointRef.current) {
          const dx = locationX - lastPointRef.current.x;
          const dy = locationY - lastPointRef.current.y;
          // Lọc rung lắc vi mô (< 2.5px) để nét vẽ lượn mượt mà mà không làm chậm máy
          if (Math.hypot(dx, dy) < 2.5) return;
        }
        lastPointRef.current = { x: locationX, y: locationY };
        setCurrentStroke(prev => [...prev, { x: locationX, y: locationY }]);
      },
      onPanResponderRelease: () => {
        setCurrentStroke(curr => {
          if (curr.length > 0) {
            setStrokes(all => [...all, curr]);
          }
          return [];
        });
        lastPointRef.current = null;
      },
    })
  ).current;

  const undo = () => {
    setStrokes(prev => prev.slice(0, -1));
  };

  const clear = () => {
    setStrokes([]);
    setCurrentStroke([]);
    lastPointRef.current = null;
  };

  const handleAutoSign = () => {
    const name = customerName.trim() || 'Khách hàng';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="150" viewBox="0 0 400 150">
      <text x="50%" y="60%" font-family="Brush Script MT, cursive, serif" font-size="44" font-weight="bold" font-style="italic" fill="#1e3a8a" text-anchor="middle">
        ${name}
      </text>
      <path d="M 50 110 Q 200 135 350 105" fill="none" stroke="#2563eb" stroke-width="3" stroke-linecap="round"/>
    </svg>`;
    const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    onSave(dataUri);
    onClose();
  };

  const handleConfirm = () => {
    const allStrokes = currentStroke.length > 0 ? [...strokes, currentStroke] : strokes;
    if (allStrokes.length === 0 && !initialSignature) {
      Alert.alert('Chưa ký', 'Vui lòng ký tên hoặc chọn "Ký tự động" trước khi lưu.');
      return;
    }
    if (allStrokes.length > 0) {
      let pathD = '';
      allStrokes.forEach(s => {
        if (!s || s.length === 0) return;
        if (s.length === 1) {
          pathD += `M ${s[0].x.toFixed(1)} ${s[0].y.toFixed(1)} L ${(s[0].x + 0.1).toFixed(1)} ${(s[0].y + 0.1).toFixed(1)} `;
        } else {
          pathD += `M ${s[0].x.toFixed(1)} ${s[0].y.toFixed(1)} `;
          for (let i = 1; i < s.length; i++) {
            pathD += `L ${s[i].x.toFixed(1)} ${s[i].y.toFixed(1)} `;
          }
        }
      });
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasLayout.width}" height="${canvasLayout.height}" viewBox="0 0 ${canvasLayout.width} ${canvasLayout.height}"><path d="${pathD}" fill="none" stroke="#1e3a8a" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
      onSave(dataUri);
    }
    onClose();
  };

  const allActiveStrokes = currentStroke.length > 0 ? [...strokes, currentStroke] : strokes;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={padStyles.overlay}>
        <View style={padStyles.modalBox}>
          {/* Header */}
          <View style={padStyles.header}>
            <View style={{ flex: 1 }}>
              <ThemedText style={padStyles.title}>✍️ Ký Tên Xác Nhận Đặt Bánh</ThemedText>
              <ThemedText style={padStyles.sub} numberOfLines={1}>
                {customerName ? `Khách hàng: ${customerName}` : 'Dùng ngón tay ký nét liền vào ô bên dưới'}
              </ThemedText>
            </View>
            <TouchableOpacity onPress={onClose} style={padStyles.closeBtn}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Vùng Canvas Vẽ Chữ Ký - Rộng Rãi & Mượt Mà */}
          <View
            style={padStyles.canvasContainer}
            onLayout={(e) => setCanvasLayout({ width: Math.round(e.nativeEvent.layout.width), height: Math.round(e.nativeEvent.layout.height) })}
            {...panResponder.panHandlers}
          >
            {allActiveStrokes.length === 0 && (
              <ThemedText style={padStyles.watermark}>✍️ Ký tại đây</ThemedText>
            )}

            {/* Render các nét ký mượt mà không cản trở cử chỉ ngón tay nhờ pointerEvents="none" */}
            <RenderStrokeSegments strokes={allActiveStrokes} thickness={3.5} color="#1e3a8a" />
          </View>

          {/* Action Tools */}
          <View style={padStyles.toolsRow}>
            <TouchableOpacity onPress={undo} disabled={strokes.length === 0} style={[padStyles.toolBtn, { opacity: strokes.length === 0 ? 0.4 : 1 }]}>
              <Ionicons name="arrow-undo-outline" size={17} color="#4b5563" />
              <ThemedText style={padStyles.toolBtnText}>Hoàn tác</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity onPress={clear} style={padStyles.toolBtn}>
              <Ionicons name="trash-outline" size={17} color="#ef4444" />
              <ThemedText style={[padStyles.toolBtnText, { color: '#ef4444' }]}>Xóa hết</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleAutoSign} style={padStyles.autoSignBtn}>
              <Ionicons name="sparkles-outline" size={17} color="#7c3aed" />
              <ThemedText style={padStyles.autoSignBtnText}>Ký tự động</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Footer Save */}
          <View style={padStyles.footer}>
            <TouchableOpacity onPress={onClose} style={padStyles.cancelBtn}>
              <ThemedText style={padStyles.cancelBtnText}>Hủy bỏ</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm} style={padStyles.saveBtn}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <ThemedText style={padStyles.saveBtnText}>Lưu Chữ Ký</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const padStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 12 },
  modalBox: { backgroundColor: '#ffffff', borderRadius: 20, width: '96%', maxWidth: 480, padding: 16, elevation: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  closeBtn: { padding: 4, marginLeft: 8 },
  canvasContainer: {
    height: 300,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    borderStyle: 'dashed',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  watermark: { position: 'absolute', color: '#cbd5e1', fontSize: 26, fontWeight: '700', opacity: 0.6 },
  toolsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 8 },
  toolBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  toolBtnText: { color: '#374151', fontSize: 12, fontWeight: '600' },
  autoSignBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#f3e8ff' },
  autoSignBtnText: { color: '#7c3aed', fontSize: 12, fontWeight: '700' },
  footer: { flexDirection: 'row', marginTop: 16, gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#4b5563' },
  saveBtn: { flex: 1.6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: '#059669' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
});
// ─── Main Admin Pre-Orders Screen ───────────────────────────────────────────
export default function AdminPreOrders() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme ?? 'light'];

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Tạo đơn
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [creating, setCreating] = useState(false);

  // Date & Time Picker an toàn cho Android/iOS (không dùng mode datetime)
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);

  // Modal Chữ ký
  const [showSignModal, setShowSignModal] = useState(false);

  // Tra cứu tự động khách hàng theo SĐT
  const [customerLookupStatus, setCustomerLookupStatus] = useState<{ loading: boolean; found: boolean | null; data: any }>({
    loading: false, found: null, data: null
  });

  useEffect(() => {
    const sdt = form.sdt_kh.trim();
    if (sdt.length >= 9) {
      const timer = setTimeout(async () => {
        setCustomerLookupStatus({ loading: true, found: null, data: null });
        try {
          const res = await adminApi.lookupCustomerBySdt(sdt);
          if (res.found) {
            setForm(f => ({
              ...f,
              makh: res.customer.maKH,
              hoten_kh: f.hoten_kh ? f.hoten_kh : res.customer.hoTen
            }));
            setCustomerLookupStatus({ loading: false, found: true, data: res.customer });
          } else {
            setForm(f => ({ ...f, makh: '' }));
            setCustomerLookupStatus({ loading: false, found: false, data: null });
          }
        } catch {
          setCustomerLookupStatus({ loading: false, found: false, data: null });
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [form.sdt_kh]);

  // Danh sách sản phẩm dùng để chọn nhanh
  const [productList, setProductList] = useState<any[]>([]);
  const [showProductPickerIdx, setShowProductPickerIdx] = useState<number | null>(null);

  useEffect(() => {
    if (showCreate && productList.length === 0) {
      adminApi.getAdminProducts().then(res => {
        const items = Array.isArray(res) ? res : (res?.content || res?.data || []);
        setProductList(items);
      }).catch(() => {});
    }
  }, [showCreate, productList.length]);

  const [detail, setDetail]           = useState<any>(null);
  const [showDetail, setShowDetail]   = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPayMethod] = useState('Tiền mặt');
  const [paying, setPaying]           = useState(false);

  // ── Fetch Orders ──────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getPreOrders({ search: searchQuery, trangThai: filterStatus, size: 100 });
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.content) ? res.content : (Array.isArray(res) ? res : []));
      setOrders(list);
    } catch {
      Alert.alert('Lỗi', 'Không thể tải danh sách đơn đặt trước.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterStatus]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ── Client-side filtering & instant search ─────────────────────────────────
  const filteredOrders = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(item => {
      const ma = String(item.maDHT || item.maDonHang || '').toLowerCase();
      const ten = String(item.hoTenKH || item.hoTen || '').toLowerCase();
      const sdt = String(item.sdtKH || item.soDienThoai || '').toLowerCase();
      const dc = String(item.diaChiGiaoHang || '').toLowerCase();
      const gc = String(item.ghiChu || '').toLowerCase();
      return ma.includes(q) || ten.includes(q) || sdt.includes(q) || dc.includes(q) || gc.includes(q);
    });
  }, [orders, searchQuery]);

  // ── Tính tổng tiền ────────────────────────────────────────────────────────
  const calcTotal = () => {
    const spTotal = form.chi_tiet.reduce((sum, r) => {
      const sl = parseInt(r.so_luong) || 0;
      const dg = parseFloat(r.don_gia) || 0;
      return sum + sl * dg;
    }, 0);
    const ship = parseFloat(form.phi_giao_hang) || 0;
    return spTotal + ship;
  };

  // ── Cài đặt nhanh ngày hẹn lấy ────────────────────────────────────────────
  const setQuickPreset = (hoursFromNow: number, fixedHour?: number) => {
    const d = new Date();
    if (fixedHour !== undefined) {
      d.setDate(d.getDate() + hoursFromNow);
      d.setHours(fixedHour, 0, 0, 0);
      // Nếu giờ hôm nay đã trôi qua thì tự chuyển sang ngày mai
      if (d.getTime() <= Date.now()) {
        d.setDate(d.getDate() + 1);
      }
    } else {
      d.setTime(d.getTime() + hoursFromNow * 3600 * 1000);
    }
    setForm(f => ({ ...f, ngay_hen_lay: d }));
  };

  // ── Xử lý chọn ngày giờ (An toàn tuyệt đối cho Android) ────────────────────
  const handlePickerChange = (event: any, selectedDate?: Date) => {
    const currentMode = pickerMode;
    setPickerMode(null); // Đóng ngay lập tức tránh unmount crash

    if (event.type === 'dismissed' || !selectedDate) return;

    if (currentMode === 'date') {
      const updated = new Date(form.ngay_hen_lay);
      updated.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setForm(f => ({ ...f, ngay_hen_lay: updated }));
    } else if (currentMode === 'time') {
      const updated = new Date(form.ngay_hen_lay);
      updated.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0);
      setForm(f => ({ ...f, ngay_hen_lay: updated }));
    }
  };

  // ── Submit tạo đơn ────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.hoten_kh.trim() || !form.sdt_kh.trim()) {
      return Alert.alert('Thiếu thông tin', 'Vui lòng điền họ tên và số điện thoại khách hàng.');
    }
    if (form.chi_tiet.some(r => !r.ten_sp.trim() || !r.don_gia)) {
      return Alert.alert('Thiếu thông tin bánh', 'Vui lòng điền đầy đủ tên bánh và đơn giá.');
    }
    if (form.hinh_thuc_nhan === 'giao_tan_noi' && !form.dia_chi_giao.trim()) {
      return Alert.alert('Thiếu địa chỉ', 'Vui lòng điền địa chỉ giao hàng.');
    }

    // 1. Kiểm tra ngày giờ hẹn lấy (Không được ở quá khứ)
    const now = new Date();
    if (form.ngay_hen_lay.getTime() < now.getTime() - 2 * 60 * 1000) {
      return Alert.alert(
        'Thời gian không hợp lệ',
        `Thời gian hẹn lấy bánh (${form.ngay_hen_lay.toLocaleString('vi-VN')}) đã qua. Vui lòng chọn thời gian sau thời điểm hiện tại (${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}).`
      );
    }

    // 2. Kiểm tra tiền cọc (Không được âm và không vượt quá tổng đơn hàng)
    const total = calcTotal();
    const deposit = parseFloat(form.tien_coc) || 0;
    if (deposit < 0) {
      return Alert.alert('Tiền cọc không hợp lệ', 'Tiền cọc không được nhỏ hơn 0.');
    }
    if (deposit > total) {
      return Alert.alert(
        'Tiền cọc không hợp lệ',
        `Tiền cọc (${fmt(deposit)}) không được vượt quá tổng giá trị đơn hàng (${fmt(total)}).`
      );
    }

    setCreating(true);
    try {
      await adminApi.createPreOrder({
        hoten_kh:        form.hoten_kh.trim(),
        sdt_kh:          form.sdt_kh.trim(),
        makh:            form.makh || undefined,
        ngay_hen_lay:    formatLocalYMDHMS(form.ngay_hen_lay),
        hinh_thuc_nhan:  form.hinh_thuc_nhan,
        dia_chi_giao:    form.hinh_thuc_nhan === 'giao_tan_noi' ? form.dia_chi_giao.trim() : '',
        phi_giao_hang:   parseFloat(form.phi_giao_hang) || 0,
        ghi_chu:         form.ghi_chu.trim(),
        tien_coc:        parseFloat(form.tien_coc) || 0,
        phuong_thuc_coc: form.phuong_thuc_coc,
        chu_ky:          form.chu_ky || undefined,
        chi_tiet:        form.chi_tiet.map(r => ({
          ten_sp:      r.ten_sp.trim(),
          masp:        r.masp ? String(r.masp) : undefined,
          so_luong:    parseInt(r.so_luong) || 1,
          don_gia:     parseFloat(r.don_gia) || 0,
          ghi_chu_sp:  r.ghi_chu_sp.trim() || undefined,
        })),
      });
      Alert.alert('Thành công', 'Đơn đặt bánh trước đã được tạo thành công!');
      setShowCreate(false);
      setForm(emptyForm());
      fetchOrders();
    } catch (err: any) {
      const resData = err?.response?.data;
      let msg = resData?.message || resData?.error || 'Có lỗi xảy ra khi tạo đơn.';
      if (resData?.errors && typeof resData.errors === 'object') {
        const firstField = Object.keys(resData.errors)[0];
        if (firstField && resData.errors[firstField]?.[0]) {
          msg = `${msg}: ${resData.errors[firstField][0]}`;
        }
      }
      Alert.alert('Lỗi', msg);
    } finally { setCreating(false); }
  };

  // ── Mở chi tiết ───────────────────────────────────────────────────────────
  const openDetail = async (maDHT: string) => {
    setShowDetail(true);
    setDetailLoading(true);
    try {
      const res = await adminApi.getPreOrderById(maDHT);
      setDetail(res?.data || res);
    } catch { Alert.alert('Lỗi', 'Không thể tải chi tiết.'); setShowDetail(false); }
    finally { setDetailLoading(false); }
  };

  // ── Cập nhật trạng thái ───────────────────────────────────────────────────
  const handleUpdateStatus = (maDHT: string, trangThai: string, label: string) => {
    Alert.alert('Xác nhận', `Cập nhật đơn ${maDHT} sang "${label}"?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xác nhận', onPress: async () => {
        try {
          await adminApi.updatePreOrderStatus(maDHT, trangThai);
          Alert.alert('Thành công', 'Cập nhật trạng thái thành công!');
          setShowDetail(false);
          fetchOrders();
        } catch { Alert.alert('Lỗi', 'Không thể cập nhật trạng thái.'); }
      }},
    ]);
  };

  // ── Thu tiền còn lại ──────────────────────────────────────────────────────
  const handleCompletePayment = async () => {
    if (!detail) return;
    setPaying(true);
    try {
      const res = await adminApi.completePreOrderPayment(detail.maDHT, paymentMethod);
      Alert.alert('Hoàn tất!', `Hóa đơn ${res.mahd} đã được tạo thành công.`);
      setShowPayment(false);
      setShowDetail(false);
      fetchOrders();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.error || 'Lỗi thanh toán.');
    } finally { setPaying(false); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────────────────────
  const cardBg  = isDark ? '#1e293b' : '#ffffff';
  const border  = isDark ? '#334155' : '#e5e7eb';
  const subText = isDark ? '#94a3b8' : '#6b7280';

  const renderOrder = ({ item }: { item: any }) => {
    const badge = BADGE_CFG[item.trangThai] || { bg: '#e5e7eb', text: '#374151', label: item.trangThai };
    const isLate = item.trangThai !== 'da_giao' && item.trangThai !== 'da_huy'
      && new Date(item.ngayHenLay) < new Date();

    return (
      <TouchableOpacity style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}
        onPress={() => openDetail(item.maDHT)} activeOpacity={0.8}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.maDHT}>{item.maDHT}</ThemedText>
            <ThemedText style={[styles.khachHang]}>{item.hoTenKH} • {item.sdtKH}</ThemedText>
          </View>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <ThemedText style={[styles.badgeText, { color: badge.text }]}>{badge.label}</ThemedText>
          </View>
        </View>

        <View style={styles.cardRow}>
          <Ionicons name="calendar-outline" size={15} color={subText} />
          <ThemedText style={[styles.subInfo, { color: subText }]}>
            {' '}Hẹn lấy: {item.ngayHenLay ? new Date(item.ngayHenLay).toLocaleString('vi-VN') : '—'}
            {isLate && ' ⚠️ Quá hạn'}
          </ThemedText>
        </View>

        <View style={[styles.cardRow, { marginTop: 4, justifyContent: 'space-between' }]}>
          <ThemedText style={styles.subInfo}>
            <ThemedText style={{ color: subText }}>Tổng: </ThemedText>
            <ThemedText style={[styles.money]}>{fmt(item.tongTien)}</ThemedText>
          </ThemedText>

          <ThemedText style={[styles.subInfo, { color: '#059669', fontWeight: '700' }]}>
            Đã cọc: {fmt(item.tienCoc)}
          </ThemedText>
        </View>
      </TouchableOpacity>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: border }]}>
        <ThemedText style={styles.headerTitle}>📋 Đặt Hàng Trước</ThemedText>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.tint }]}
          onPress={() => { setForm(emptyForm()); setShowCreate(true); }}>
          <Ionicons name="add" size={20} color="#fff" />
          <ThemedText style={styles.addBtnText}>Tạo đơn</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: cardBg, borderColor: border }]}>
        <Ionicons name="search-outline" size={18} color={subText} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Tìm mã DHT, tên KH, SĐT..."
          placeholderTextColor={subText}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}>
        {TRANG_THAI_FILTERS.map(f => (
          <TouchableOpacity key={f.value}
            style={[styles.pill, filterStatus === f.value && { backgroundColor: colors.tint }]}
            onPress={() => setFilter(f.value)}>
            <ThemedText style={[styles.pillText, filterStatus === f.value && { color: '#fff' }]}>
              {f.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.tint} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={i => i.maDHT || String(i.id)}
          renderItem={renderOrder}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Ionicons name="document-outline" size={56} color={subText} />
              <ThemedText style={[styles.emptyText, { color: subText }]}>
                Không có đơn đặt trước nào
              </ThemedText>
            </View>
          }
        />
      )}

      {/* ══════ MODAL TẠO ĐƠN ══════ */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={() => setShowCreate(false)}>
        <ThemedView style={[styles.modalFull, { paddingTop: insets.top }]}>
          <View style={[styles.modalHeader, { borderBottomColor: border }]}>
            <ThemedText style={styles.modalTitle}>Tạo đơn đặt bánh trước</ThemedText>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <Ionicons name="close" size={26} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.formPad}>
            {/* THÔNG TIN KHÁCH HÀNG */}
            <SectionLabel>👤 Thông tin khách hàng</SectionLabel>

            <FieldLabel>Số điện thoại *</FieldLabel>
            <TextInput style={[styles.input, { backgroundColor: cardBg, borderColor: border, color: colors.text }]}
              placeholder="09xxxxxxxx" placeholderTextColor={subText} keyboardType="phone-pad"
              value={form.sdt_kh} onChangeText={v => setForm(f => ({ ...f, sdt_kh: v }))} />

            <FieldLabel>Tên khách hàng *</FieldLabel>
            <TextInput style={[styles.input, { backgroundColor: cardBg, borderColor: border, color: colors.text }]}
              placeholder="Nguyễn Văn A" placeholderTextColor={subText}
              value={form.hoten_kh} onChangeText={v => setForm(f => ({ ...f, hoten_kh: v }))} />

            {customerLookupStatus.loading && (
              <View style={{ backgroundColor: isDark ? '#1e293b' : '#f9fafb', padding: 8, borderRadius: 6, marginVertical: 4 }}>
                <ThemedText style={{ fontSize: 13, color: subText }}>🔍 Đang tra cứu thành viên...</ThemedText>
              </View>
            )}

            {customerLookupStatus.found && (
              <View style={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', borderWidth: 1, padding: 8, borderRadius: 6, marginVertical: 4 }}>
                <ThemedText style={{ fontSize: 13, color: '#065f46', fontWeight: '600' }}>
                  ✓ Đã nhận diện thành viên: {customerLookupStatus.data.hoTen} ({customerLookupStatus.data.maKH})
                </ThemedText>
              </View>
            )}

            {/* THỜI GIAN HẸN LẤY BÁNH */}
            <SectionLabel>📅 Thời gian hẹn lấy bánh</SectionLabel>

            <View style={{ flexDirection: 'row', gap: 8, marginVertical: 6, flexWrap: 'wrap' }}>
              <TouchableOpacity onPress={() => setQuickPreset(2)} style={styles.presetChip}>
                <ThemedText style={styles.presetChipText}>+2 Giờ nữa</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setQuickPreset(0, 18)} style={styles.presetChip}>
                <ThemedText style={styles.presetChipText}>Hôm nay 18:00</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setQuickPreset(1, 9)} style={styles.presetChip}>
                <ThemedText style={styles.presetChipText}>Ngày mai 09:00</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setQuickPreset(1, 16)} style={styles.presetChip}>
                <ThemedText style={styles.presetChipText}>Ngày mai 16:00</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <TouchableOpacity
                style={[styles.input, styles.dateBtn, { flex: 1.2, backgroundColor: cardBg, borderColor: border }]}
                onPress={() => setPickerMode('date')}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.tint} />
                <ThemedText style={{ fontSize: 14, marginLeft: 6, fontWeight: '600' }}>
                  📅 {form.ngay_hen_lay.toLocaleDateString('vi-VN')}
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.input, styles.dateBtn, { flex: 1, backgroundColor: cardBg, borderColor: border }]}
                onPress={() => setPickerMode('time')}
              >
                <Ionicons name="time-outline" size={18} color={colors.tint} />
                <ThemedText style={{ fontSize: 14, marginLeft: 6, fontWeight: '600' }}>
                  ⏰ {form.ngay_hen_lay.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </ThemedText>
              </TouchableOpacity>
            </View>

            {form.ngay_hen_lay.getTime() < Date.now() - 60000 && (
              <ThemedText style={{ color: '#ef4444', fontSize: 12, marginTop: 2, marginBottom: 4, fontWeight: '600' }}>
                ⚠️ Giờ hẹn đã qua thời điểm hiện tại! Vui lòng chọn lại giờ hẹn lấy bánh.
              </ThemedText>
            )}

            {pickerMode !== null && (
              <DateTimePicker
                value={form.ngay_hen_lay}
                mode={pickerMode} minimumDate={new Date()}
                is24Hour={true}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handlePickerChange}
              />
            )}

            {/* DANH SÁCH BÁNH ĐẶT */}
            <SectionLabel>🎂 Chi tiết bánh đặt</SectionLabel>

            {form.chi_tiet.map((row, idx) => (
              <View key={idx} style={[styles.spRow, { borderColor: border, backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <ThemedText style={{ fontSize: 14, fontWeight: '700' }}>Bánh #{idx + 1}</ThemedText>
                  {form.chi_tiet.length > 1 && (
                    <TouchableOpacity onPress={() => setForm(f => ({ ...f, chi_tiet: f.chi_tiet.filter((_, i) => i !== idx) }))}>
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <TextInput
                    style={[styles.input, { flex: 1, backgroundColor: isDark ? '#0f172a' : '#f9fafb', borderColor: border, color: colors.text, marginBottom: 0 }]}
                    placeholder="🔍 Nhập từ khóa tên bánh..."
                    placeholderTextColor={subText}
                    value={row.ten_sp}
                    onFocus={() => setShowProductPickerIdx(idx)}
                    onChangeText={v => {
                      setForm(f => {
                        const c = [...f.chi_tiet];
                        c[idx] = { ...c[idx], ten_sp: v, masp: '' };
                        return { ...f, chi_tiet: c };
                      });
                      setShowProductPickerIdx(idx);
                    }}
                  />
                  <TouchableOpacity
                    style={{ paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.tint + '20', borderRadius: 10, marginLeft: 6 }}
                    onPress={() => setShowProductPickerIdx(showProductPickerIdx === idx ? null : idx)}>
                    <Ionicons name={showProductPickerIdx === idx ? "chevron-up-outline" : "search-outline"} size={18} color={colors.tint} />
                  </TouchableOpacity>
                </View>

                {/* Gợi ý sản phẩm thời gian thực (Đã fix hoàn toàn lỗi toLowerCase) */}
                {showProductPickerIdx === idx && (
                  <View style={{ maxHeight: 220, backgroundColor: isDark ? '#0f172a' : '#f1f5f9', borderRadius: 8, padding: 8, marginVertical: 6, borderWidth: 1, borderColor: border }}>
                    {(() => {
                      const query = String(row.ten_sp || '').trim().toLowerCase();
                      const filtered = query
                        ? productList.filter((p: any) => {
                            const ten = String(p.tenSanPham || p.TENSP || '').toLowerCase();
                            const ma = String(p.MASP || p.maSanPham || p.id || '').toLowerCase();
                            return ten.includes(query) || ma.includes(query);
                          })
                        : productList.slice(0, 10);

                      return (
                        <>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <ThemedText style={{ fontSize: 13, fontWeight: '700', color: colors.tint }}>
                              💡 {query ? `Gợi ý theo "${row.ten_sp}"` : 'Sản phẩm gợi ý'} ({filtered.length})
                            </ThemedText>
                            <TouchableOpacity onPress={() => setShowProductPickerIdx(null)}>
                              <ThemedText style={{ fontSize: 12, color: subText }}>Đóng ✕</ThemedText>
                            </TouchableOpacity>
                          </View>
                          <ScrollView nestedScrollEnabled style={{ maxHeight: 160 }}>
                            {filtered.length === 0 ? (
                              <ThemedText style={{ fontSize: 13, color: subText, paddingVertical: 6 }}>
                                Không có sản phẩm khớp với từ khóa
                              </ThemedText>
                            ) : filtered.map((p: any, pIdx: number) => {
                              const ten = p.tenSanPham || p.TENSP || 'Bánh';
                              const ma = String(p.MASP || p.maSanPham || p.id || '');
                              const gia = p.giaBan ?? p.GIABAN ?? p.donGia ?? 0;
                              const ton = Math.max(0, p.soLuongTon ?? p.TONKHO_THUCTE ?? p.SOLUONG ?? 0);

                              return (
                                <TouchableOpacity key={ma || pIdx}
                                  style={{ paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                                  onPress={() => {
                                    setForm(f => {
                                      const c = [...f.chi_tiet];
                                      c[idx] = {
                                        ...c[idx],
                                        ten_sp: ten,
                                        masp: ma,
                                        don_gia: String(gia || ''),
                                      };
                                      return { ...f, chi_tiet: c };
                                    });
                                    setShowProductPickerIdx(null);
                                  }}>
                                  <View style={{ flex: 1, paddingRight: 8 }}>
                                    <ThemedText style={{ fontSize: 14, fontWeight: '600' }}>{ten}</ThemedText>
                                    <ThemedText style={{ fontSize: 12, color: subText }}>Mã: #{ma}</ThemedText>
                                  </View>
                                  <View style={{ alignItems: 'flex-end' }}>
                                    <ThemedText style={{ fontSize: 14, fontWeight: '700', color: colors.tint }}>{fmt(gia)}</ThemedText>
                                    <ThemedText style={{ fontSize: 11, color: ton > 0 ? '#059669' : '#d97706' }}>Tồn: {ton}</ThemedText>
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        </>
                      );
                    })()}
                  </View>
                )}

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <View style={{ flex: 1 }}>
                    <FieldLabel>Số lượng</FieldLabel>
                    <TextInput style={[styles.input, { backgroundColor: cardBg, borderColor: border, color: colors.text }]}
                      keyboardType="number-pad" value={row.so_luong}
                      onChangeText={v => setForm(f => { const c = [...f.chi_tiet]; c[idx] = { ...c[idx], so_luong: v }; return { ...f, chi_tiet: c }; })} />
                  </View>
                  <View style={{ flex: 1.5 }}>
                    <FieldLabel>Đơn giá (₫) *</FieldLabel>
                    <TextInput style={[styles.input, { backgroundColor: cardBg, borderColor: border, color: colors.text }]}
                      keyboardType="numeric" placeholder="150000" placeholderTextColor={subText}
                      value={row.don_gia}
                      onChangeText={v => setForm(f => { const c = [...f.chi_tiet]; c[idx] = { ...c[idx], don_gia: v }; return { ...f, chi_tiet: c }; })} />
                  </View>
                </View>

                <FieldLabel>Yêu cầu trang trí / Ghi chữ trên bánh</FieldLabel>
                <TextInput style={[styles.input, { backgroundColor: cardBg, borderColor: border, color: colors.text }]}
                  placeholder="VD: Ghi chữ 'Chúc mừng sinh nhật Mai 20t'" placeholderTextColor={subText}
                  value={row.ghi_chu_sp}
                  onChangeText={v => setForm(f => { const c = [...f.chi_tiet]; c[idx] = { ...c[idx], ghi_chu_sp: v }; return { ...f, chi_tiet: c }; })} />
              </View>
            ))}

            <TouchableOpacity style={[styles.outlineBtn, { borderColor: colors.tint }]}
              onPress={() => setForm(f => ({ ...f, chi_tiet: [...f.chi_tiet, emptyRow()] }))}>
              <Ionicons name="add" size={18} color={colors.tint} />
              <ThemedText style={{ color: colors.tint, fontWeight: '700', marginLeft: 4 }}>Thêm bánh khác</ThemedText>
            </TouchableOpacity>

            {/* HÌNH THỨC NHẬN */}
            <SectionLabel>🚚 Hình thức nhận hàng</SectionLabel>
            <View style={styles.radioRow}>
              {[
                { value: 'tai_cua_hang', label: '🏪 Nhận tại quầy' },
                { value: 'giao_tan_noi',  label: '🛵 Giao tận nơi' },
              ].map(opt => (
                <TouchableOpacity key={opt.value}
                  style={[styles.radioOpt, form.hinh_thuc_nhan === opt.value && { borderColor: colors.tint, backgroundColor: colors.tint + '22' }]}
                  onPress={() => setForm(f => ({ ...f, hinh_thuc_nhan: opt.value }))}>
                  <ThemedText style={{ fontSize: 14, fontWeight: form.hinh_thuc_nhan === opt.value ? '700' : '400' }}>
                    {opt.label}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            {form.hinh_thuc_nhan === 'giao_tan_noi' && (
              <>
                <FieldLabel>Địa chỉ giao bánh *</FieldLabel>
                <TextInput style={[styles.input, { backgroundColor: cardBg, borderColor: border, color: colors.text }]}
                  placeholder="Số nhà, tên đường, phường/quận..." placeholderTextColor={subText}
                  value={form.dia_chi_giao} onChangeText={v => setForm(f => ({ ...f, dia_chi_giao: v }))} />

                <FieldLabel>Phí vận chuyển (₫)</FieldLabel>
                <TextInput style={[styles.input, { backgroundColor: cardBg, borderColor: border, color: colors.text }]}
                  keyboardType="numeric" placeholder="30000" placeholderTextColor={subText}
                  value={form.phi_giao_hang} onChangeText={v => setForm(f => ({ ...f, phi_giao_hang: v }))} />
              </>
            )}

            {/* THANH TOÁN TIỀN CỌC */}
            <SectionLabel>💰 Thanh toán & Đặt cọc</SectionLabel>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <FieldLabel>Số tiền cọc trước (₫)</FieldLabel>
              {calcTotal() > 0 && (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    onPress={() => setForm(f => ({ ...f, tien_coc: String(Math.round(calcTotal() / 2)) }))}
                    style={{ paddingHorizontal: 8, paddingVertical: 2, backgroundColor: colors.tint + '15', borderRadius: 6 }}
                  >
                    <ThemedText style={{ fontSize: 11, color: colors.tint, fontWeight: '600' }}>Cọc 50%</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setForm(f => ({ ...f, tien_coc: String(calcTotal()) }))}
                    style={{ paddingHorizontal: 8, paddingVertical: 2, backgroundColor: colors.tint + '15', borderRadius: 6 }}
                  >
                    <ThemedText style={{ fontSize: 11, color: colors.tint, fontWeight: '600' }}>Cọc 100%</ThemedText>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: cardBg,
                  borderColor: (parseFloat(form.tien_coc) || 0) > calcTotal() && calcTotal() > 0 ? '#ef4444' : border,
                  color: colors.text,
                }
              ]}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={subText}
              value={form.tien_coc}
              onChangeText={v => setForm(f => ({ ...f, tien_coc: v }))}
            />
            {(parseFloat(form.tien_coc) || 0) > calcTotal() && calcTotal() > 0 && (
              <ThemedText style={{ color: '#ef4444', fontSize: 12, marginTop: -2, marginBottom: 6, fontWeight: '600' }}>
                ⚠️ Tiền cọc không được vượt quá tổng giá trị đơn ({fmt(calcTotal())})
              </ThemedText>
            )}

            <FieldLabel>Phương thức thanh toán cọc</FieldLabel>
            <View style={styles.radioRow}>
              {['Tiền mặt', 'Chuyển khoản'].map(pt => (
                <TouchableOpacity key={pt}
                  style={[styles.radioOpt, form.phuong_thuc_coc === pt && { borderColor: colors.tint, backgroundColor: colors.tint + '22' }]}
                  onPress={() => setForm(f => ({ ...f, phuong_thuc_coc: pt }))}>
                  <ThemedText style={{ fontSize: 14, fontWeight: form.phuong_thuc_coc === pt ? '700' : '400' }}>
                    {pt === 'Tiền mặt' ? '💵 ' : '📲 '}{pt}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            {/* CHỮ KÝ XÁC NHẬN CỦA KHÁCH HÀNG */}
            <SectionLabel>✍️ Chữ ký xác nhận đơn</SectionLabel>
            {form.chu_ky ? (
              <View style={{ backgroundColor: '#f0fdf4', borderColor: '#86efac', borderWidth: 1, borderRadius: 12, padding: 12, marginVertical: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <ThemedText style={{ color: '#166534', fontWeight: '700', fontSize: 13 }}>
                    ✓ Đã ghi nhận chữ ký của khách hàng
                  </ThemedText>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity onPress={() => setShowSignModal(true)} style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#dcfce7', borderRadius: 6 }}>
                      <ThemedText style={{ color: '#15803d', fontWeight: '600', fontSize: 12 }}>✏️ Ký lại</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setForm(f => ({ ...f, chu_ky: '' }))} style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#fee2e2', borderRadius: 6 }}>
                      <ThemedText style={{ color: '#dc2626', fontWeight: '600', fontSize: 12 }}>🗑️ Xóa</ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={{ width: '100%', height: 90, backgroundColor: '#ffffff', borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                  <RenderSignature uri={form.chu_ky} width="100%" height={90} />
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setShowSignModal(true)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.tint, backgroundColor: colors.tint + '10', marginVertical: 6 }}
              >
                <Ionicons name="create-outline" size={22} color={colors.tint} />
                <ThemedText style={{ color: colors.tint, fontWeight: '700', fontSize: 15 }}>
                  Chạm vào đây để ký tên xác nhận
                </ThemedText>
              </TouchableOpacity>
            )}

            {/* BẢNG TÍNH TỔNG */}
            <View style={[styles.totalBox, { backgroundColor: colors.tint + '15' }]}>
              <ThemedText style={{ fontSize: 16, fontWeight: '700' }}>Tổng giá trị đơn:</ThemedText>
              <ThemedText style={[styles.totalAmt, { color: colors.tint }]}>{fmt(calcTotal())}</ThemedText>
            </View>

            {parseFloat(form.tien_coc) > 0 && (
              <ThemedText style={[styles.note, { color: '#059669', fontWeight: '600' }]}>
                Còn phải thu khi nhận bánh: {fmt(calcTotal() - (parseFloat(form.tien_coc) || 0))}
              </ThemedText>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.modalFooter, { borderTopColor: border }]}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: border }]}
              onPress={() => setShowCreate(false)}>
              <ThemedText style={{ fontWeight: '600' }}>Hủy</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.tint }]}
              onPress={handleCreate} disabled={creating}>
              {creating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.submitText}>Hoàn tất tạo đơn</ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </ThemedView>
      </Modal>

      {/* ══════ MODAL CHI TIẾT ĐƠN ══════ */}
      <Modal visible={showDetail} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={() => setShowDetail(false)}>
        <ThemedView style={[styles.modalFull, { paddingTop: insets.top }]}>
          <View style={[styles.modalHeader, { borderBottomColor: border }]}>
            <ThemedText style={styles.modalTitle}>Chi tiết đơn đặt trước</ThemedText>
            <TouchableOpacity onPress={() => setShowDetail(false)}>
              <Ionicons name="close" size={26} color={colors.text} />
            </TouchableOpacity>
          </View>

          {detailLoading || !detail ? (
            <ActivityIndicator size="large" color={colors.tint} style={{ marginTop: 40 }} />
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.formPad}>
              <View style={[styles.receiptHeader, { backgroundColor: cardBg }]}>
                <ThemedText style={styles.receiptCode}>{detail.maDHT}</ThemedText>
                <View style={[styles.badge, { backgroundColor: BADGE_CFG[detail.trangThai]?.bg || '#e5e7eb' }]}>
                  <ThemedText style={[styles.badgeText, { color: BADGE_CFG[detail.trangThai]?.text || '#374151' }]}>
                    {BADGE_CFG[detail.trangThai]?.label || detail.trangThai}
                  </ThemedText>
                </View>
              </View>

              <InfoRow label="Khách hàng" value={`${detail.hoTenKH} (${detail.sdtKH})`} />
              <InfoRow label="Ngày đặt" value={detail.ngayDat ? new Date(detail.ngayDat).toLocaleString('vi-VN') : '—'} />

              <View style={[styles.henLay, { borderColor: colors.tint, backgroundColor: colors.tint + '12' }]}>
                <Ionicons name="alarm-outline" size={22} color={colors.tint} />
                <ThemedText style={[styles.henLayText, { color: colors.tint }]}>
                  Hẹn lấy: {detail.ngayHenLay ? new Date(detail.ngayHenLay).toLocaleString('vi-VN') : '—'}
                </ThemedText>
              </View>

              <InfoRow label="Hình thức nhận" value={detail.hinhThucNhan === 'giao_tan_noi' ? '🛵 Giao tận nơi' : '🏪 Nhận tại quầy'} />
              {detail.diaChiGiao ? <InfoRow label="Địa chỉ giao" value={detail.diaChiGiao} /> : null}
              {detail.ghiChu ? <InfoRow label="Ghi chú" value={detail.ghiChu} /> : null}

              <ThemedText style={styles.sectionLabel}>🎂 Bánh đã đặt</ThemedText>
              {detail.chiTiets?.map((sp: any, i: number) => (
                <View key={i} style={[styles.spItem, { borderColor: border, backgroundColor: cardBg }]}>
                  <ThemedText style={{ fontSize: 15, fontWeight: '700' }}>{sp.tenSP}</ThemedText>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <ThemedText style={{ color: subText }}>{fmt(sp.donGia)} × {sp.soLuong}</ThemedText>
                    <ThemedText style={{ fontWeight: '700', color: colors.tint }}>{fmt(sp.thanhTien)}</ThemedText>
                  </View>
                </View>
              ))}

              <View style={[styles.summaryBox, { borderColor: border, backgroundColor: cardBg }]}>
                <SummaryRow label="Tổng tiền:" value={fmt(detail.tongTien)} />
                <SummaryRow label="Đã cọc:" value={fmt(detail.tienCoc)} color="#059669" />
                <SummaryRow label="Còn lại:" value={fmt(detail.tienConLai)} bold color={detail.tienConLai > 0 ? '#dc2626' : '#059669'} size={18} />
              </View>

              {/* Chữ ký số điện tử của khách hàng */}
              {detail.chuKy ? (
                <View style={{ marginTop: 16, padding: 12, backgroundColor: cardBg, borderRadius: 10, borderWidth: 1, borderColor: border, alignItems: 'center' }}>
                  <ThemedText style={{ fontSize: 13, color: subText, marginBottom: 8, fontWeight: '600' }}>Chữ ký xác nhận của khách hàng:</ThemedText>
                  <View style={{ width: '100%', height: 140, backgroundColor: '#ffffff', borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                    <RenderSignature uri={detail.chuKy} width="100%" height={140} />
                  </View>
                </View>
              ) : null}

              {/* Nút hành động trạng thái */}
              <View style={{ gap: 10, marginTop: 20 }}>
                {detail.trangThai === 'cho_xac_nhan' && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#d97706' }]}
                    onPress={() => handleUpdateStatus(detail.maDHT, 'da_coc', 'Đã cọc')}>
                    <Ionicons name="cash-outline" size={20} color="#fff" />
                    <ThemedText style={styles.actionBtnText}>Xác nhận đã thu cọc</ThemedText>
                  </TouchableOpacity>
                )}

                {(detail.trangThai === 'cho_xac_nhan' || detail.trangThai === 'da_coc') && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#2563eb' }]}
                    onPress={() => handleUpdateStatus(detail.maDHT, 'san_sang', 'Sẵn sàng')}>
                    <Ionicons name="checkmark-done-circle-outline" size={20} color="#fff" />
                    <ThemedText style={styles.actionBtnText}>Bánh đã làm xong (Sẵn sàng lấy)</ThemedText>
                  </TouchableOpacity>
                )}

                {detail.trangThai === 'san_sang' && detail.tienConLai > 0 && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#059669' }]}
                    onPress={() => setShowPayment(true)}>
                    <Ionicons name="wallet-outline" size={20} color="#fff" />
                    <ThemedText style={styles.actionBtnText}>Thu tiền còn lại ({fmt(detail.tienConLai)})</ThemedText>
                  </TouchableOpacity>
                )}

                {detail.trangThai !== 'da_giao' && detail.trangThai !== 'da_huy' && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#dc2626' }]}
                    onPress={() => handleUpdateStatus(detail.maDHT, 'da_huy', 'Đã hủy')}>
                    <Ionicons name="close-circle-outline" size={20} color="#fff" />
                    <ThemedText style={styles.actionBtnText}>Hủy đơn đặt trước</ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          )}
        </ThemedView>
      </Modal>

      {/* ══════ MODAL THANH TOÁN TIỀN CÒN LẠI ══════ */}
      <Modal visible={showPayment} transparent animationType="fade" onRequestClose={() => setShowPayment(false)}>
        <View style={styles.paymentOverlay}>
          <View style={[styles.paymentBox, { backgroundColor: cardBg, borderColor: border }]}>
            <ThemedText style={{ fontSize: 18, fontWeight: '700', marginBottom: 12 }}>
              Thu tiền còn lại khi giao bánh
            </ThemedText>

            <View style={[styles.payRemaining, { backgroundColor: colors.tint + '15' }]}>
              <ThemedText style={{ fontSize: 14, color: subText }}>Số tiền cần thu:</ThemedText>
              <ThemedText style={{ fontSize: 24, fontWeight: '800', color: colors.tint }}>
                {fmt(detail?.tienConLai)}
              </ThemedText>
            </View>

            <FieldLabel>Phương thức thanh toán:</FieldLabel>
            <View style={styles.radioRow}>
              {['Tiền mặt', 'Chuyển khoản'].map(pt => (
                <TouchableOpacity key={pt}
                  style={[styles.radioOpt, paymentMethod === pt && { borderColor: colors.tint, backgroundColor: colors.tint + '22' }]}
                  onPress={() => setPayMethod(pt)}>
                  <ThemedText style={{ fontWeight: paymentMethod === pt ? '700' : '400' }}>
                    {pt === 'Tiền mặt' ? '💵 ' : '📲 '}{pt}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPayment(false)}>
                <ThemedText>Đóng</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#059669' }]}
                onPress={handleCompletePayment} disabled={paying}>
                {paying ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.submitText}>Hoàn tất & Giao bánh</ThemedText>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════ MODAL KÝ TÊN CHUYÊN DỤNG ══════ */}
      <DedicatedSignatureModal
        visible={showSignModal}
        customerName={form.hoten_kh}
        initialSignature={form.chu_ky}
        onSave={(sigData) => setForm(f => ({ ...f, chu_ky: sigData }))}
        onClose={() => setShowSignModal(false)}
      />
    </ThemedView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <ThemedText style={styles.sectionLabel}>{children}</ThemedText>
);
const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <ThemedText style={styles.fieldLabel}>{children}</ThemedText>
);
const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <ThemedText style={[styles.infoLabel]}>{label}:</ThemedText>
    <ThemedText style={[styles.infoValue]}>{value}</ThemedText>
  </View>
);
const SummaryRow = ({ label, value, color, size, bold }: { label: string; value: string; color?: string; size?: number; bold?: boolean }) => (
  <View style={styles.infoRow}>
    <ThemedText style={[styles.infoLabel, bold && { fontWeight: '700' }]}>{label}</ThemedText>
    <ThemedText style={[styles.infoValue, { fontSize: size || 15 }, bold && { fontWeight: '700' }, color ? { color } : {}]}>{value}</ThemedText>
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:     { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  headerTitle:   { fontSize: 20, fontWeight: '700' },
  addBtn:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 4 },
  addBtnText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
  searchBar:     { flexDirection: 'row', alignItems: 'center', margin: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, gap: 8 },
  searchInput:   { flex: 1, fontSize: 15 },
  filterRow:     { maxHeight: 48, marginBottom: 8, flexGrow: 0 },
  pill:          { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e5e7eb', height: 36, justifyContent: 'center', alignItems: 'center' },
  pillText:      { fontSize: 14, fontWeight: '600', color: '#374151' },
  card:          { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
  cardTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  maDHT:         { fontSize: 16, fontWeight: '700' },
  khachHang:     { fontSize: 15, marginTop: 2 },
  cardRow:       { flexDirection: 'row', alignItems: 'center' },
  badge:         { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText:     { fontSize: 13, fontWeight: '700' },
  money:         { fontSize: 15, fontWeight: '700' },
  subInfo:       { fontSize: 14 },
  emptyText:     { fontSize: 16, marginTop: 12 },

  // Modal
  modalFull:     { flex: 1 },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  modalTitle:    { fontSize: 18, fontWeight: '700' },
  formPad:       { padding: 16, paddingBottom: 40 },
  modalFooter:   { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1 },

  // Form
  sectionLabel:  { fontSize: 16, fontWeight: '700', marginTop: 18, marginBottom: 8 },
  fieldLabel:    { fontSize: 14, fontWeight: '600', marginBottom: 4, marginTop: 6 },
  input:         { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, marginBottom: 4 },
  dateBtn:       { flexDirection: 'row', alignItems: 'center' },
  presetChip:    { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  presetChipText:{ fontSize: 12, fontWeight: '600', color: '#374151' },
  radioRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  radioOpt:      { borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  spRow:         { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 },
  outlineBtn:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10, justifyContent: 'center' },
  totalBox:      { borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 },
  totalAmt:      { fontSize: 20, fontWeight: '700', marginLeft: 4 },
  note:          { fontSize: 14, marginBottom: 8 },
  cancelBtn:     { borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flex: 1 },
  submitBtn:     { borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flex: 1.5 },
  submitText:    { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Detail / Receipt
  receiptHeader: { borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 14 },
  receiptCode:   { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  infoRow:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' },
  infoLabel:     { fontSize: 15, color: '#6b7280' },
  infoValue:     { fontSize: 15, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  henLay:        { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 10, padding: 12, marginVertical: 10 },
  henLayText:    { fontSize: 16, fontWeight: '700' },
  spItem:        { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  summaryBox:    { borderWidth: 1, borderRadius: 10, padding: 14, marginTop: 12 },
  actionBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, paddingVertical: 13 },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Payment modal
  paymentOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  paymentBox:     { borderRadius: 16, borderWidth: 1, padding: 20, width: '100%', maxWidth: 400 },
  payRemaining:   { borderRadius: 10, padding: 14, marginVertical: 12 },
});