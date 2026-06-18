import { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { SERVER_BASE_URL } from '../services/api';
import { calcUnitPrice, calcLineTotal } from '../utils/pricing';

const AuthContext = createContext();
const CartContext = createContext();

export const useAuth = () => useContext(AuthContext);
export const useCart = () => useContext(CartContext);

export function CartProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [token, setToken] = useState(null);

  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
  try {
    setAuthLoading(true);
    const savedToken = await AsyncStorage.getItem('userToken');
    
    if (savedToken) {
      setToken(savedToken);
      
      const res = await api.get('/auth/me', { 
        headers: { Authorization: `Bearer ${savedToken}` } 
      });
      
      // Make sure profilePicture is included
      console.log("Loaded User:", res.data.data); // ← Add this for debugging
      setUser(res.data.data);
      
      await fetchCart(savedToken);
    }
  } catch (error) {
    console.error('Error loading user:', error);
    await AsyncStorage.removeItem('userToken');
    setToken(null);
    setUser(null);
  } finally {
    setAuthLoading(false);
  }
};

  const login = async (userData, authToken) => {
    try {
      setUser(userData);
      setToken(authToken);
      await AsyncStorage.setItem('userToken', authToken);
      await fetchCart(authToken);
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  };

  const logout = async () => {
    try {
      setAuthLoading(true);
      setUser(null);
      setToken(null);
      setCartItems([]);
      await AsyncStorage.removeItem('userToken');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchCart = async (currentToken = token) => {
    if (!currentToken) return;
    try {
      const res = await api.get('/cart', { headers: { Authorization: `Bearer ${currentToken}` } });
      const items = res.data.data.items
        .filter(i => i.productId)
        .map(i => {
          const rawImg = i.productId.imageUrl || i.productId.image || '';
          const resolvedImg = rawImg
            ? (rawImg.startsWith('http') ? rawImg : `${SERVER_BASE_URL}${rawImg}`)
            : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';
          const selectedExtras = i.selectedExtras || [];
          const unitPrice = calcUnitPrice(i.productId.price, selectedExtras);
          return {
            cartItemId: i._id,
            _id: i.productId._id,
            name: i.productId.name,
            price: i.productId.price,
            unitPrice,
            selectedExtras,
            image: resolvedImg,
            qty: i.quantity,
            lineTotal: calcLineTotal(i.productId.price, i.quantity, selectedExtras),
          };
        });
      setCartItems(items);
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  };

  const addToCart = async (item, quantity = 1, selectedExtras = []) => {
    try {
      await api.post('/cart', {
        productId: item._id || item.id,
        quantity,
        selectedExtras,
      });
      await fetchCart();
      return true;
    } catch (error) {
      console.error('Add to cart error:', error);
      const msg = error.response?.data?.message || 'Failed to add item to cart';
      Alert.alert('Cart Error', msg);
      return false;
    }
  };

  const updateQty = async (cartItemId, delta) => {
    const item = cartItems.find(i => i.cartItemId === cartItemId);
    if (!item) return;
    const newQty = item.qty + delta;
    try {
      if (newQty > 0) {
        await api.put(`/cart/${cartItemId}`, { quantity: newQty });
      } else {
        await api.delete(`/cart/${cartItemId}`);
      }
      await fetchCart();
    } catch (error) {
      console.error('Update cart error:', error);
      const msg = error.response?.data?.message || 'Failed to update quantity';
      Alert.alert('Cart Error', msg);
    }
  };

  const removeItem = async (cartItemId) => {
    try {
      await api.delete(`/cart/${cartItemId}`);
      await fetchCart();
    } catch (error) {
      console.error('Remove item error:', error);
    }
  };

  const updateCartCustomization = async (cartItemId, quantity, selectedExtras) => {
    try {
      await api.patch(`/cart/${cartItemId}/customize`, { quantity, selectedExtras });
      await fetchCart();
      return true;
    } catch (error) {
      console.error('Customize cart error:', error);
      const msg = error.response?.data?.message || 'Failed to update item';
      Alert.alert('Cart Error', msg);
      return false;
    }
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const subtotal = cartItems.reduce((sum, i) => sum + (i.lineTotal ?? i.price * i.qty), 0);
  const totalItems = cartItems.reduce((sum, i) => sum + i.qty, 0);

  return (
    <AuthContext.Provider value={{ user, setUser, token, login, logout, authLoading, loadUser, isAdmin: user?.role === 'admin' }}>
      <CartContext.Provider value={{
        cartItems, addToCart, updateQty, removeItem, clearCart,
        subtotal, totalItems, fetchCart, updateCartCustomization,
      }}>
        {children}
      </CartContext.Provider>
    </AuthContext.Provider>
  );
}