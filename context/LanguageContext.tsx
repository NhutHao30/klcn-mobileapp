import React, { createContext, useContext, useState } from 'react';

type Language = 'vi' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  vi: {
    // Nav & Common
    'home': 'Trang chủ',
    'products': 'Sản phẩm',
    'wishlist': 'Yêu thích',
    'cart': 'Giỏ hàng',
    'profile': 'Tài khoản',
    'settings': 'Cài đặt',
    'login': 'Đăng nhập',
    'logout': 'Đăng xuất',
    'search': 'Tìm kiếm...',
    'apply': 'Áp dụng',
    'save': 'Lưu thay đổi',
    'back': 'Quay lại',
    
    // Customer Storefront
    'fresh_daily': 'Bánh Tươi Mỗi Ngày',
    'discount_banner': 'GIẢM TỚI 30% ĐƠN ĐẦU TIÊN',
    'explore_now': 'Khám phá ngay',
    'categories': 'Danh mục bánh',
    'flash_sale': 'Đang giảm giá',
    'best_sellers': 'Bánh bán chạy nhất',
    'see_all': 'Xem tất cả',
    'add_to_cart': 'Thêm vào giỏ',
    'buy_now': 'MUA NGAY',
    'checkout': 'XÁC NHẬN ĐẶT HÀNG',
    'my_orders': 'Đơn hàng của tôi',
    'about_us': 'Giới thiệu',
    'contact_us': 'Liên hệ',
    'faq': 'Hỏi đáp (FAQ)',
    'news': 'Tin tức & Cẩm nang',
    'store_locations': 'Hệ thống cửa hàng',
    'language_setting': 'Ngôn ngữ',

    // Settings
    'personal_info': 'Thông tin cá nhân',
    'security_password': 'Bảo mật & Mật khẩu',
    'audit_logs': 'Nhật ký hoạt động',
    'employee_roles': 'Phân quyền nhân viên',
    'branch_management': 'Quản lý chi nhánh',
    'notifications': 'Thông báo',
    'appearance': 'Giao diện (Sáng/Tối)',
  },
  en: {
    // Nav & Common
    'home': 'Home',
    'products': 'Products',
    'wishlist': 'Wishlist',
    'cart': 'Cart',
    'profile': 'Account',
    'settings': 'Settings',
    'login': 'Log In',
    'logout': 'Log Out',
    'search': 'Search...',
    'apply': 'Apply',
    'save': 'Save Changes',
    'back': 'Back',

    // Customer Storefront
    'fresh_daily': 'Fresh Daily Bakery',
    'discount_banner': 'UP TO 30% OFF FIRST ORDER',
    'explore_now': 'Explore Now',
    'categories': 'Categories',
    'flash_sale': 'Flash Sale',
    'best_sellers': 'Best Sellers',
    'see_all': 'See All',
    'add_to_cart': 'Add to Cart',
    'buy_now': 'BUY NOW',
    'checkout': 'PLACE ORDER',
    'my_orders': 'My Orders',
    'about_us': 'About Us',
    'contact_us': 'Contact Us',
    'faq': 'FAQ',
    'news': 'News & Blog',
    'store_locations': 'Store Locations',
    'language_setting': 'Language',

    // Settings
    'personal_info': 'Personal Info',
    'security_password': 'Security & Password',
    'audit_logs': 'Audit Logs',
    'employee_roles': 'Employee Roles',
    'branch_management': 'Store Branches',
    'notifications': 'Notifications',
    'appearance': 'Theme (Light/Dark)',
  }
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'vi',
  setLanguage: () => {},
  t: (key: string) => key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('vi');

  const t = (key: string): string => {
    return translations[language][key] || translations['vi'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
