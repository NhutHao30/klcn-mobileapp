import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { soundService } from '@/services/soundService';
import LoginRequiredModal from '@/components/LoginRequiredModal';
import { useAuth } from '@/context/AuthContext';
import { cartApi } from '@/services/api/cartApi';
import { wishlistApi } from '@/services/api/wishlistApi';
import { formatImageUrl } from '@/config/apiConfig';
import { storageService } from '@/services/storageService';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  salePrice?: number | null;
  image: string;
  quantity: number;
}

export interface WishlistItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number | null;
  image: string;
  category?: string;
}

interface CartContextType {
  cartItems: CartItem[];
  wishlistItems: WishlistItem[];
  addToCart: (product: any, qty?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
  toggleWishlist: (product: any) => boolean;
  isFavorite: (productId: string) => boolean;
  cartCount: number;
  cartSubtotal: number;
  notificationMsg: string | null;
  clearNotification: () => void;
}

const CartContext = createContext<CartContextType>({
  cartItems: [],
  wishlistItems: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  toggleWishlist: () => false,
  isFavorite: () => false,
  cartCount: 0,
  cartSubtotal: 0,
  notificationMsg: null,
  clearNotification: () => {},
});

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const { isLoggedIn, user } = useAuth();

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [loginActionText, setLoginActionText] = useState('thực hiện thao tác này');

  const userKey = user?.USERNAME || user?.USERNAME || user?.email || user?.EMAIL || 'guest';

  // 1. Fetch remote cart from Laravel API + load persisted Wishlist per user
  useEffect(() => {
    if (isLoggedIn && userKey !== 'guest') {
      // Sync Cart from Backend Laravel API
      cartApi.getCart().then(data => {
        if (data && data.items) {
          const remoteItems: CartItem[] = data.items.map((i: any) => ({
            id: String(i.id || i.MASP),
            name: i.name || 'Bánh Givral',
            price: Number(i.price || 0),
            quantity: Number(i.quantity || 1),
            image: formatImageUrl(i.image),
          }));
          setCartItems(remoteItems);
        }
      });

      // Load Wishlist from Backend API (Synced with Website)
      wishlistApi.getWishlist().then(remoteWishlist => {
        if (remoteWishlist && remoteWishlist.length > 0) {
          const items: WishlistItem[] = remoteWishlist.map((it: any) => ({
            id: String(it.id || it.masp || it.MASP),
            name: it.name || it.tenSP || 'Sản phẩm',
            price: Number(it.price || 0),
            originalPrice: it.salePrice ? Number(it.price) : null,
            image: formatImageUrl(it.image),
          }));
          setWishlistItems(items);
          saveWishlist(items);
        } else {
          // Fallback to local storage if offline
          const wishlistStorageKey = `@dola_wishlist_${userKey}`;
          storageService.getItem(wishlistStorageKey).then(saved => {
            if (saved) {
              try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                  setWishlistItems(parsed.map(item => ({
                    ...item,
                    image: formatImageUrl(item.image),
                  })));
                }
              } catch (e) {}
            }
          });
        }
      }).catch(() => {});
    } else {
      setCartItems([]);
      setWishlistItems([]);
    }
  }, [isLoggedIn, userKey]);

  // Helper to persist wishlist changes for current user
  const saveWishlist = async (items: WishlistItem[]) => {
    if (isLoggedIn && userKey !== 'guest') {
      const wishlistStorageKey = `@dola_wishlist_${userKey}`;
      await storageService.setItem(wishlistStorageKey, JSON.stringify(items));
    }
  };

  const promptLoginRequired = (actionText: string) => {
    setLoginActionText(actionText);
    setLoginModalVisible(true);
  };

  const showNotification = async (msg: string) => {
    try {
      const savedSettings = await storageService.getItem('CUSTOMER_NOTIFICATION_SETTINGS');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed && parsed.pushEnabled === false) {
          // Notifications disabled by user -> Suppress popup
          return;
        }
      }
    } catch (e) {}
    setNotificationMsg(msg);
  };


  const clearNotification = () => {
    setNotificationMsg(null);
  };

  const addToCart = (product: any, qty: number = 1) => {
    if (!isLoggedIn) {
      promptLoginRequired('thêm bánh vào giỏ hàng');
      return;
    }

    soundService.playSuccessSound();

    const productId = String(product.id || product.MASP || '1');
    const productName = product.name || product.TENSP || 'Bánh Givral';
    const productPrice = product.salePrice || product.price || product.GIABAN || 0;
    const rawImage = product.image || product.HINHANH || 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=300';
    const productImage = formatImageUrl(rawImage);

    setCartItems(prev => {
      const existing = prev.find(item => item.id === productId);
      if (existing) {
        return prev.map(item =>
          item.id === productId ? { ...item, quantity: item.quantity + qty } : item
        );
      }
      return [
        ...prev,
        {
          id: productId,
          name: productName,
          price: Number(productPrice),
          image: productImage,
          quantity: qty,
        },
      ];
    });

    // Sync to Backend Laravel Cart API
    cartApi.addToCart(productId, qty);
    showNotification(`🛒 Đã thêm "${productName}" vào giỏ hàng!`);
  };

  const removeFromCart = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== productId));
    if (isLoggedIn) {
      cartApi.removeFromCart(productId);
    }
  };

  const updateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems(prev =>
      prev.map(item => (item.id === productId ? { ...item, quantity: qty } : item))
    );
    if (isLoggedIn) {
      cartApi.updateQuantity(productId, qty);
    }
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const toggleWishlist = (product: any): boolean => {
    if (!isLoggedIn) {
      promptLoginRequired('lưu bánh vào danh sách yêu thích');
      return false;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}

    const productId = typeof product === 'string' ? product : String(product.id || product.MASP);
    const existing = wishlistItems.some(i => i.id === productId);

    let updatedWishlist: WishlistItem[] = [];

    if (existing) {
      updatedWishlist = wishlistItems.filter(i => i.id !== productId);
      setWishlistItems(updatedWishlist);
      saveWishlist(updatedWishlist);
      wishlistApi.removeFromWishlist(productId).catch(() => {});
      showNotification('💔 Đã xóa khỏi danh sách yêu thích');
      return false;
    } else {
      const rawImg = typeof product === 'object' ? (product.image || product.HINHANH) : 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=300';
      const newItem: WishlistItem = {
        id: productId,
        name: typeof product === 'object' ? (product.name || product.TENSP) : 'Bánh Givral',
        price: typeof product === 'object' ? (product.salePrice || product.price || product.GIABAN || 100000) : 100000,
        originalPrice: typeof product === 'object' ? product.price : null,
        image: formatImageUrl(rawImg),
      };
      updatedWishlist = [...wishlistItems, newItem];
      setWishlistItems(updatedWishlist);
      saveWishlist(updatedWishlist);
      wishlistApi.addToWishlist(productId).catch(() => {});
      showNotification('❤️ Đã thêm vào danh sách yêu thích!');
      return true;
    }
  };

  const isFavorite = (productId: string) => wishlistItems.some(i => i.id === String(productId));

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        wishlistItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        toggleWishlist,
        isFavorite,
        cartCount,
        cartSubtotal,
        notificationMsg,
        clearNotification,
      }}
    >
      {children}
      <LoginRequiredModal 
        visible={loginModalVisible} 
        actionText={loginActionText}
        onClose={() => setLoginModalVisible(false)} 
      />
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
