import { authApi, LoginPayload } from '@/services/api/authApi';
import { setAuthToken } from '@/services/apiClient';
import React, { createContext, useContext, useMemo, useState } from 'react';

// Bảng vaitro trong database
const CUSTOMER_ROLE_ID = 6;
const ROLE_NAMES: Record<number, string> = {
  1: 'Quản trị viên',
  2: 'Quản lý chi nhánh',
  3: 'Nhân viên bán hàng',
  4: 'Nhân viên kho',
  5: 'Nhân viên chăm sóc khách hàng',
  6: 'Khách hàng',
  7: 'Nhân viên kế toán',
  8: 'Giám đốc',
};

interface User {
  id?: string | number;
  USERNAME?: string;
  username?: string;
  HOTEN?: string;
  EMAIL?: string;
  SDT?: string;
  MAROLE?: number;
  QUYEN?: number; // Dữ liệu giả lập cũ (đăng nhập vân tay / social)
  role?: number;
  role_id?: number;
  vaiTroId?: number;
  vaitro?: any;
  name?: string;
  email?: string;
  nguoidung?: any;
  khachhang?: any;
  nhanvien?: any;
  chuKySo?: string | null;
}

/** Thông tin đã chuẩn hóa để các màn hình dùng trực tiếp */
export interface UserProfile {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  birthDate: string; // dd/mm/yyyy (để hiển thị)
  storeName: string;
  storeId?: number | null;
  roleId: number | null;
  roleLabel: string;
  signature?: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  token: string | null;
  isLoggedIn: boolean;
  role: number | null; // mã vai trò cũ (MAROLE) để các màn hình admin hiện có không bị ảnh hưởng
  roleId: number | null; // vaiTroId thật theo bảng vaitro (1..8)
  canAccessAdmin: boolean;
  isCustomer: boolean;
  isLoading: boolean;
  login: (
    payload: LoginPayload
  ) => Promise<{ success: boolean; role?: number; isStaff?: boolean; error?: string }>;
  loginWithToken: (
    token: string
  ) => Promise<{ success: boolean; role?: number; isStaff?: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  token: null,
  isLoggedIn: false,
  role: null,
  roleId: null,
  canAccessAdmin: false,
  isCustomer: false,
  isLoading: false,
  login: async () => ({ success: false }),
  loginWithToken: async () => ({ success: false }),
  logout: async () => {},
  refreshProfile: async () => {},
  setUser: () => {},
});

/** Lấy vaiTroId thật từ backend (1..8 theo bảng vaitro) */
const getRoleId = (u: User | null): number | null => {
  if (!u) return null;
  const id = u.vaiTroId ?? u.vaitro?.id;
  if (id !== undefined && id !== null && !isNaN(Number(id))) return Number(id);
  // Dữ liệu giả lập cũ (vân tay / social) không có vaiTroId: coi là khách hàng
  return CUSTOMER_ROLE_ID;
};

const formatDate = (raw?: string | null): string => {
  if (!raw) return '';
  const m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(raw);
};

/** Backend trả TaiKhoan { username, email, vaiTroId, vaitro, nguoidung: { hoTen, soDienThoai, ngaySinh, cuahang } } */
const buildProfile = (u: User | null): UserProfile | null => {
  if (!u) return null;
  const nd = u.nguoidung ?? u.khachhang ?? u.nhanvien ?? null;
  const roleId = getRoleId(u);
  const isCustomer = roleId === CUSTOMER_ROLE_ID;
  const roleLabel = isCustomer
    ? 'Thành viên Givral Bakery'
    : u.vaitro?.tenVaiTro ?? (roleId !== null ? ROLE_NAMES[roleId] : undefined) ?? 'Nhân viên';

  return {
    fullName: nd?.hoTen ?? u.HOTEN ?? u.name ?? '',
    username: u.username ?? u.USERNAME ?? '',
    email: u.email ?? u.EMAIL ?? '',
    phone: nd?.soDienThoai ?? u.SDT ?? '',
    birthDate: formatDate(nd?.ngaySinh),
    storeName: nd?.cuahang?.tenCuaHang ?? (roleId === 2 ? 'Chi nhánh 1 - Trụ sở chính' : ''),
    storeId: nd?.cuaHangId ?? nd?.MACUAHANG ?? nd?.cuahang?.id ?? nd?.cuahang?.MACUAHANG ?? (roleId === 2 ? 1 : null),
    roleId,
    roleLabel,
    signature: nd?.chuKySo || nd?.chuKy || (u as any)?.chuKySo || (u as any)?.chuKy || null,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const login = async (payload: LoginPayload) => {
    setIsLoading(true);
    try {
      const data = await authApi.login(payload);
      if (data && data.access_token) {
        setTokenState(data.access_token);
        setAuthToken(data.access_token);
        const userData: User = data.user || data.khachhang || { HOTEN: data.name || 'Người dùng', MAROLE: data.role ?? 3 };
        setUser(userData);
        setIsLoading(false);
        const userRole = getRoleId(userData) ?? CUSTOMER_ROLE_ID;
        return { success: true, role: userRole, isStaff: userRole !== CUSTOMER_ROLE_ID };
      }
      setIsLoading(false);
      return { success: false, error: data.error || data.message || 'Đăng nhập không thành công' };
    } catch (error: any) {
      setIsLoading(false);
      if (!error.response || error.message === 'Network Error') {
        return { success: false, error: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau ít phút!' };
      }
      if (error.response?.status === 429) {
        return { success: false, error: 'Hệ thống phát hiện thao tác liên tục. Vui lòng đợi 30 giây và thử lại!' };
      }
      const errRes = error.response?.data;
      const message = errRes?.error || errRes?.message || (typeof errRes === 'string' ? errRes : 'Tài khoản hoặc mật khẩu không chính xác');
      return { success: false, error: message };
    }
  };

  const loginWithToken = async (jwtToken: string) => {
    setIsLoading(true);
    try {
      setTokenState(jwtToken);
      setAuthToken(jwtToken);
      const me = await authApi.getMe();
      if (me) {
        setUser(me);
        setIsLoading(false);
        const userRole = getRoleId(me) ?? CUSTOMER_ROLE_ID;
        return { success: true, role: userRole, isStaff: userRole !== CUSTOMER_ROLE_ID };
      }
      setIsLoading(false);
      return { success: false, error: 'Không thể lấy thông tin người dùng' };
    } catch (error: any) {
      setIsLoading(false);
      return { success: false, error: error?.message || 'Đăng nhập bằng Token thất bại' };
    }
  };

  const logout = async () => {
    setIsLoading(true);
    await authApi.logout();
    setTokenState(null);
    setUser(null);
    setIsLoading(false);
  };

  /** Tải lại thông tin mới nhất từ /me (gồm vai trò, hồ sơ, chi nhánh) */
  const refreshProfile = async () => {
    if (!token) return;
    try {
      const me = await authApi.getMe();
      if (me) setUser(me);
    } catch (e) {
      // Giữ nguyên dữ liệu hiện tại nếu không tải được
    }
  };

  const profile = useMemo(() => buildProfile(user), [user]);
  const roleId = getRoleId(user);
  const isCustomer = roleId === CUSTOMER_ROLE_ID;
  const canAccessAdmin = !!token && roleId !== null && !isCustomer;
  // Backend trả MAROLE (mã cũ: khách = 3, bán hàng/kho = 2, giám đốc = 5...). Giữ cho `role`.
  const legacyRole = user ? (user.MAROLE ?? user.QUYEN ?? user.role ?? null) : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        token,
        isLoggedIn: !!token,
        role: legacyRole !== null ? Number(legacyRole) : null,
        roleId,
        canAccessAdmin,
        isCustomer,
        isLoading,
        login,
        loginWithToken,
        logout,
        refreshProfile,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);