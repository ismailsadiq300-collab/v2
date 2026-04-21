import { useState, useCallback } from 'react';
import { MenuItem, CartItem, AddOn } from '@/types/menu';

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);

  const getAddOnKey = (addOns?: AddOn[]) => 
    addOns?.map(a => a.id).sort().join(',') || '';

  const addToCart = useCallback((item: CartItem) => {
    setCart(prev => {
      const addOnKey = getAddOnKey(item.selectedAddOns);
      const existing = prev.find(i => 
        i.id === item.id && getAddOnKey(i.selectedAddOns) === addOnKey
      );
      if (existing) {
        return prev.map(i => 
          (i.id === item.id && getAddOnKey(i.selectedAddOns) === addOnKey)
            ? { ...i, quantity: i.quantity + 1 } 
            : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((itemId: string, addOnKey?: string) => {
    setCart(prev => {
      const existing = prev.find(i => 
        i.id === itemId && getAddOnKey(i.selectedAddOns) === (addOnKey || '')
      );
      if (existing && existing.quantity > 1) {
        return prev.map(i => 
          (i.id === itemId && getAddOnKey(i.selectedAddOns) === (addOnKey || ''))
            ? { ...i, quantity: i.quantity - 1 } 
            : i
        );
      }
      return prev.filter(i => 
        !(i.id === itemId && getAddOnKey(i.selectedAddOns) === (addOnKey || ''))
      );
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return { cart, addToCart, removeFromCart, clearCart, totalPrice, totalItems };
}
