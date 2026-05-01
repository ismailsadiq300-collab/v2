import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { MenuItem, AddOn, CartItem, Order } from '@/types/menu';
import { useCart } from '@/hooks/useCart';
import { MenuCard } from '@/components/MenuCard';
import { Cart } from '@/components/Cart';
import { OrderSuccess } from '@/components/OrderSuccess';
import { Settings, Eye, Bell, Store, Truck, LocateFixed, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import type { TranslationKey } from '@/lib/i18n';
import restaurantLogo from '@/assets/restaurant-logo.png';
import lahsaEggsImg from '@/assets/lahsa-eggs.png';
import muttonLiverImg from '@/assets/mutton-liver.png';
import malawahImg from '@/assets/yemeni-bread-malawah.png';
import masoubImg from '@/assets/masoub.png';
import bintAlSahnImg from '@/assets/bint-al-sahn.png';
import kunafaImg from '@/assets/kunafa.png';
import meatMoqalqalImg from '@/assets/meat-moqalqal.png';

import { Badge } from '@/components/ui/badge';

type OrderItemPayload = Order['items'][number];
type FulfillmentMode = 'delivery' | 'pickup';

const savedFulfillmentKey = 'alfanar-fulfillment-mode';
const savedDeliveryAddressKey = 'alfanar-delivery-address';
const savedDeliveryMapUrlKey = 'alfanar-delivery-map-url';
const savedDeliveryPhoneKey = 'alfanar-delivery-phone';
const savedDeliveryCommentKey = 'alfanar-delivery-comment';

const getSavedText = (key: string) => window.localStorage.getItem(key) || '';

const isOrderStatus = (status: unknown): status is Order['status'] =>
  status === 'new' || status === 'preparing' || status === 'ready' || status === 'served';

// Yemeni food categories
const categories: {
  id: string;
  name: string;
  labelKey: TranslationKey;
  emoji: string;
}[] = [
  { id: 'picks', name: 'Picks for you', labelKey: 'picksForYou', emoji: '🔥' },
  { id: 'barbeque', name: 'Barbeque', labelKey: 'barbeque', emoji: '🍖' },
  { id: 'soup', name: 'Soup', labelKey: 'soup', emoji: '🍲' },
  { id: 'main', name: 'Main Courses', labelKey: 'mainCourses', emoji: '🍛' },
  { id: 'masoub', name: 'Masoub', labelKey: 'masoub', emoji: '🍌' },
  
  { id: 'mix-saj', name: 'Mix Saj', labelKey: 'mixSaj', emoji: '🥙' },
  { id: 'mutabbaq', name: 'Mutabbaq', labelKey: 'mutabbaq', emoji: '🥟' },
  { id: 'desserts', name: 'Desserts', labelKey: 'desserts', emoji: '🍮' },
  { id: 'beverages', name: 'Beverages', labelKey: 'beverages', emoji: '🥤' },
  { id: 'fresh-juices', name: 'Fresh Juices', labelKey: 'freshJuices', emoji: '🧃' },
];

// Sample Yemeni menu data
const sampleMenuItems: MenuItem[] = [
  // Picks for you
  { 
    id: 'picks-lahsa-eggs', 
    name: 'Lahsa Eggs With Bread', 
    description: 'Egg pan mixed with cheese in the special way of the alfanar',
    price: 25, 
    category: 'picks', 
    image: lahsaEggsImg,
  },
  { 
    id: 'picks-mutton-liver', 
    name: 'Mutton Liver With Bread', 
    description: 'Fresh liver sliced frying pan with fanar spices',
    price: 25, 
    category: 'picks', 
    image: muttonLiverImg,
  },
  { 
    id: 'picks-malawah', 
    name: 'Yemeni Bread Malawah', 
    description: 'Malawah, a type of Yemeni bread, often served warm and flaky',
    price: 5, 
    category: 'picks', 
    image: malawahImg,
  },
  { 
    id: 'picks-masoub-cream-honey', 
    name: 'Masoub With Cream And Honey', 
    description: 'Masoub, a traditional dish, served with cream and honey',
    price: 20, 
    category: 'picks', 
    image: masoubImg,
  },
  { 
    id: 'picks-chicken-mandi', 
    name: 'Chicken Mandi', 
    description: 'Made with tender and juicy chicken, marinated in aromatic spices and cooked to perfection, served atop fragrant fluffy rice',
    price: 25, 
    category: 'picks', 
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=400&fit=crop',
    addOns: [
      { id: 'extra-rice', name: 'Extra Rice', price: 10 },
      { id: 'salad', name: 'Fresh Salad', price: 8 },
    ]
  },
  { 
    id: 'picks-meat-moqalqal', 
    name: 'Meat Moqalqal With Bread', 
    description: 'Small pieces of meat cooked in the alfanar way',
    price: 25, 
    category: 'picks', 
    image: meatMoqalqalImg,
  },
  // Barbeque
  { 
    id: 'barbeque-mixed-grill', 
    name: 'Mixed Grill Platter', 
    description: 'Assorted grilled meats with Yemeni spices and fresh bread',
    price: 85, 
    category: 'barbeque', 
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=400&fit=crop',
    addOns: [
      { id: 'hummus', name: 'Hummus', price: 8 },
      { id: 'tahini', name: 'Tahini Sauce', price: 5 },
    ]
  },
  { 
    id: 'barbeque-chicken-kebab', 
    name: 'Chicken Kebab', 
    description: 'Marinated chicken skewers grilled to perfection',
    price: 35, 
    category: 'barbeque', 
    image: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400&h=400&fit=crop',
  },
  // Soup
  { 
    id: 'soup-yemeni-saltah', 
    name: 'Yemeni Saltah', 
    description: 'Traditional Yemeni stew with meat, fenugreek foam and vegetables',
    price: 28, 
    category: 'soup', 
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=400&fit=crop',
  },
  { 
    id: 'soup-lamb-shorba', 
    name: 'Lamb Shorba', 
    description: 'Rich lamb soup with aromatic spices and fresh herbs',
    price: 22, 
    category: 'soup', 
    image: 'https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?w=400&h=400&fit=crop',
  },
  // Main Courses
  { 
    id: 'main-haneeth', 
    name: 'Haneeth', 
    description: 'Slow-roasted lamb on the bone with fragrant rice',
    price: 75, 
    category: 'main', 
    image: 'https://images.unsplash.com/photo-1642821373181-696a54913e93?w=400&h=400&fit=crop',
    addOns: [
      { id: 'extra-rice', name: 'Extra Rice', price: 10 },
    ]
  },
  { 
    id: 'main-fahsa', 
    name: 'Fahsa', 
    description: 'Shredded meat cooked in stone pot with Yemeni spices',
    price: 55, 
    category: 'main', 
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=400&fit=crop',
  },
  // Masoub
  { 
    id: 'masoub-classic', 
    name: 'Masoub Classic', 
    description: 'Sweet banana bread dessert with cream and honey',
    price: 25, 
    category: 'masoub', 
    image: masoubImg,
    addOns: [
      { id: 'extra-banana', name: 'Extra Banana', price: 5 },
      { id: 'nuts', name: 'Mixed Nuts', price: 8 },
    ]
  },
  { 
    id: 'masoub-dates', 
    name: 'Masoub with Dates', 
    description: 'Traditional masoub topped with sweet dates and cream',
    price: 30, 
    category: 'masoub', 
    image: masoubImg,
  },
  // Mix Saj
  { 
    id: 'mix-saj-chicken', 
    name: 'Chicken Saj', 
    description: 'Thin bread with grilled chicken, vegetables and garlic sauce',
    price: 32, 
    category: 'mix-saj', 
    image: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=400&h=400&fit=crop',
  },
  { 
    id: 'mix-saj-meat', 
    name: 'Meat Saj', 
    description: 'Thin bread with seasoned beef, onions and tomatoes',
    price: 35, 
    category: 'mix-saj', 
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=400&fit=crop',
  },
  // Mutabbaq
  { 
    id: 'mutabbaq-egg', 
    name: 'Mutabbaq Egg', 
    description: 'Crispy folded pastry with egg, onion and herbs',
    price: 18, 
    category: 'mutabbaq', 
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=400&fit=crop',
  },
  { 
    id: 'mutabbaq-meat', 
    name: 'Mutabbaq Meat', 
    description: 'Crispy folded pastry stuffed with spiced minced meat',
    price: 25, 
    category: 'mutabbaq', 
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=400&fit=crop',
  },
  // Desserts
  { 
    id: 'dessert-bint-al-sahn', 
    name: 'Bint Al Sahn', 
    description: 'Layered honey bread - traditional Yemeni dessert',
    price: 28, 
    category: 'desserts', 
    image: bintAlSahnImg,
  },
  { 
    id: 'dessert-kunafa', 
    name: 'Kunafa', 
    description: 'Sweet cheese pastry with rose water syrup',
    price: 22, 
    category: 'desserts', 
    image: kunafaImg,
  },
  // Beverages
  { 
    id: 'beverage-yemeni-tea', 
    name: 'Yemeni Tea', 
    description: 'Traditional spiced tea with cardamom and cloves',
    price: 8, 
    category: 'beverages', 
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=400&fit=crop',
  },
  { 
    id: 'beverage-arabic-coffee', 
    name: 'Arabic Coffee', 
    description: 'Strong cardamom-infused Yemeni coffee',
    price: 10, 
    category: 'beverages', 
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&h=400&fit=crop',
  },
  // Fresh Juices
  { 
    id: 'juice-mango', 
    name: 'Fresh Mango Juice', 
    description: 'Freshly blended mango with a touch of honey',
    price: 15, 
    category: 'fresh-juices', 
    image: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=400&h=400&fit=crop',
  },
  { 
    id: 'juice-mixed-fruit', 
    name: 'Mixed Fruit Cocktail', 
    description: 'Blend of seasonal fresh fruits',
    price: 18, 
    category: 'fresh-juices', 
    image: 'https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=400&h=400&fit=crop',
  },
];

export default function Menu() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const tableParam = searchParams.get('table');
  const rawTableNumber = Number.parseInt(tableParam || '', 10);
  const isTableVisit = tableParam !== null && Number.isFinite(rawTableNumber) && rawTableNumber > 0;
  const tableNumber = isTableVisit ? rawTableNumber : 1;
  const isDemo = searchParams.get('demo') === 'true';
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>(sampleMenuItems);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [currentOrderStatus, setCurrentOrderStatus] = useState<Order['status']>('new');
  const [isCallingWaiter, setIsCallingWaiter] = useState(false);
  const [pendingWaiterCallId, setPendingWaiterCallId] = useState<string | null>(null);
  const [fulfillmentMode, setFulfillmentMode] = useState<FulfillmentMode | null>(null);
  const [selectedFulfillmentMode, setSelectedFulfillmentMode] = useState<FulfillmentMode | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState(() => (
    isTableVisit ? '' : getSavedText(savedDeliveryAddressKey)
  ));
  const [deliveryMapUrl, setDeliveryMapUrl] = useState(() => (
    isTableVisit ? '' : getSavedText(savedDeliveryMapUrlKey)
  ));
  const [deliveryPhone, setDeliveryPhone] = useState(() => (
    isTableVisit ? '' : getSavedText(savedDeliveryPhoneKey)
  ));
  const [deliveryComment, setDeliveryComment] = useState(() => (
    isTableVisit ? '' : getSavedText(savedDeliveryCommentKey)
  ));
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  
  const { cart, addToCart, removeFromCart, clearCart, totalPrice } = useCart();
  const { toast } = useToast();

  const hasDeliveryLocation = deliveryAddress.trim().length > 0 || deliveryMapUrl.length > 0;
  const shouldAskFulfillment = !isTableVisit && !fulfillmentMode;

  const handleSaveFulfillment = (mode: FulfillmentMode) => {
    window.localStorage.setItem(savedFulfillmentKey, mode);
    setFulfillmentMode(mode);
    setSelectedFulfillmentMode(null);
  };

  const handleSaveDeliveryDetails = () => {
    window.localStorage.setItem(savedDeliveryAddressKey, deliveryAddress.trim());
    window.localStorage.setItem(savedDeliveryMapUrlKey, deliveryMapUrl);
    window.localStorage.setItem(savedDeliveryPhoneKey, deliveryPhone.trim());
    window.localStorage.setItem(savedDeliveryCommentKey, deliveryComment.trim());
    handleSaveFulfillment('delivery');
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location not available",
        description: "Your browser does not support location detection. Please type your address.",
        variant: "destructive",
      });
      return;
    }

    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        setDeliveryMapUrl(mapUrl);
        window.localStorage.setItem(savedDeliveryMapUrlKey, mapUrl);
        setIsDetectingLocation(false);
        toast({
          title: "Location added",
          description: "We saved a Google Maps link for this delivery.",
        });
      },
      () => {
        setIsDetectingLocation(false);
        toast({
          title: "Could not detect location",
          description: "Please allow location access or type the address manually.",
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };

  const handleChangeFulfillment = () => {
    setFulfillmentMode(null);
    setSelectedFulfillmentMode(null);
  };

  // Subscribe to waiter call status updates for this table
  useEffect(() => {
    if (!pendingWaiterCallId) return;

    const channel = supabase
      .channel(`waiter-call-${pendingWaiterCallId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'waiter_calls',
          filter: `id=eq.${pendingWaiterCallId}`
        },
        (payload) => {
          const updatedCall = payload.new as { status: string; id: string };
          if (updatedCall.status === 'acknowledged') {
            toast({
              title: "Waiter is on the way! 🏃",
              description: "A waiter is coming to your table now.",
            });
            setPendingWaiterCallId(null);
          } else if (updatedCall.status === 'completed') {
            setPendingWaiterCallId(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pendingWaiterCallId, toast]);

  useEffect(() => {
    if (!currentOrderId || isDemo) return;

    const channel = supabase
      .channel(`order-status-${currentOrderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${currentOrderId}`,
        },
        (payload) => {
          const nextStatus = payload.new.status;
          if (isOrderStatus(nextStatus)) {
            setCurrentOrderStatus(nextStatus);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrderId, isDemo]);

  // Call waiter function
  const handleCallWaiter = async () => {
    if (!isTableVisit || pendingWaiterCallId) return;

    setIsCallingWaiter(true);
    try {
      const { data, error } = await supabase
        .from('waiter_calls')
        .insert({ table_number: tableNumber })
        .select()
        .single();
      
      if (error) throw error;
      
      // Store the call ID to listen for status updates
      setPendingWaiterCallId(data.id);
      
      toast({
        title: "Waiter Called! 🔔",
        description: `A waiter will come to Table ${tableNumber} shortly.`,
      });
    } catch (error) {
      console.error('Error calling waiter:', error);
      toast({
        title: "Error",
        description: "Could not call waiter. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCallingWaiter(false);
    }
  };

  // Try to fetch from Firestore in background (skip in demo mode)
  useEffect(() => {
    if (isDemo) {
      // In demo mode, always use sample data
      setMenuItems(sampleMenuItems);
      return;
    }

    async function fetchMenu() {
      try {
        const [{ collection, getDocs }, { db }] = await Promise.all([
          import('firebase/firestore'),
          import('@/lib/firebase'),
        ]);
        const menuCollection = collection(db, 'menu');
        const menuSnapshot = await getDocs(menuCollection);
        
        if (!menuSnapshot.empty) {
          const items = menuSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          })) as MenuItem[];
          if (items.length > 0) {
            setMenuItems(items);
          }
        }
      } catch (error) {
        console.log('Using sample menu data');
      }
    }

    fetchMenu();
  }, [isDemo]);

  const handleAddToCart = (item: MenuItem, selectedAddOns?: AddOn[]) => {
    const extrasPrice = selectedAddOns?.reduce((sum, a) => sum + a.price, 0) || 0;
    const cartItem: CartItem = {
      ...item,
      quantity: 1,
      selectedAddOns,
      price: item.price + extrasPrice,
    };
    addToCart(cartItem);
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;

    setIsSubmitting(true);
    
    // Demo mode: simulate order without Firebase
      if (isDemo) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      const demoOrderData: Order = {
        id: `demo-${Date.now()}`,
        tableNumber,
        items: cart.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          addOns: item.selectedAddOns?.map(a => a.name) || [],
        })),
        totalPrice,
        notes: [
          fulfillmentMode === 'delivery' ? 'Order type: Delivery' : fulfillmentMode === 'pickup' ? 'Order type: Pickup from restaurant' : null,
          fulfillmentMode === 'delivery' && deliveryAddress.trim() ? `Delivery address: ${deliveryAddress.trim()}` : null,
          fulfillmentMode === 'delivery' && deliveryMapUrl ? `Google Maps: ${deliveryMapUrl}` : null,
          fulfillmentMode === 'delivery' && deliveryPhone.trim() ? `Contact number: ${deliveryPhone.trim()}` : null,
          fulfillmentMode === 'delivery' && deliveryComment.trim() ? `Delivery comment: ${deliveryComment.trim()}` : null,
          orderNotes.trim(),
        ].filter(Boolean).join('\n') || null,
        status: 'new',
        timestamp: new Date(),
      };
      clearCart();
      setOrderNotes('');
      setCurrentOrderId(demoOrderData.id || null);
      setCurrentOrderStatus('new');
      setOrderPlaced(true);
      setIsSubmitting(false);
      toast({
        title: "Demo Order Placed! 🎉",
        description: "This is a demo - no real order was sent.",
      });
      return;
    }
    
    try {
      const notes = orderNotes.trim();
      const fulfillmentLabel = fulfillmentMode === 'delivery' ? 'Delivery' : fulfillmentMode === 'pickup' ? 'Pickup from restaurant' : null;
      const deliveryDetails = fulfillmentMode === 'delivery'
        ? [
            deliveryAddress.trim() ? `Delivery address: ${deliveryAddress.trim()}` : null,
            deliveryMapUrl ? `Google Maps: ${deliveryMapUrl}` : null,
            deliveryPhone.trim() ? `Contact number: ${deliveryPhone.trim()}` : null,
            deliveryComment.trim() ? `Delivery comment: ${deliveryComment.trim()}` : null,
          ].filter(Boolean)
        : [];
      const notesWithFulfillment = fulfillmentLabel
        ? [`Order type: ${fulfillmentLabel}`, ...deliveryDetails, notes].filter(Boolean).join('\n')
        : notes;
      const orderItems: OrderItemPayload[] = cart.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          addOns: item.selectedAddOns?.map(a => a.name) || []
      }));
      const { data, error } = await supabase
        .from('orders')
        .insert({
          table_number: tableNumber,
          items: orderItems,
          total_price: totalPrice,
          notes: notesWithFulfillment || null,
          status: 'new',
        })
        .select('id')
        .single();

      if (error) throw error;

      const orderRef = data;

      const orderData: Order = {
        id: orderRef.id,
        tableNumber,
        items: orderItems,
        totalPrice,
        notes: notesWithFulfillment || null,
        status: 'new',
        timestamp: new Date(),
      };
      
      clearCart();
      setOrderNotes('');
      setCurrentOrderId(orderData.id || null);
      setCurrentOrderStatus('new');
      setOrderPlaced(true);
      
      toast({
        title: "Order placed! 🎉",
        description: fulfillmentMode === 'delivery'
          ? "Your order has been sent to admin for delivery."
          : "Your order has been sent to the kitchen.",
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Order placement failed:', { error, tableNumber, cart });
      toast({
        title: "Could not place order",
        description: import.meta.env.DEV
          ? `Debug: ${errMsg}`
          : "Please try again or ask a waiter for help.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewOrder = () => {
    setOrderPlaced(false);
    setCurrentOrderId(null);
    setCurrentOrderStatus('new');
  };

  const [activeCategory, setActiveCategory] = useState(categories[0].id);

  // Group items by category
  const groupedItems = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const scrollToCategory = (categoryId: string) => {
    setActiveCategory(categoryId);
    const element = document.getElementById(`category-${categoryId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen pb-8">
      <Dialog open={shouldAskFulfillment} onOpenChange={() => undefined}>
        <DialogContent className="max-w-md rounded-xl p-5 sm:p-6 [&>button]:hidden">
          <DialogHeader className="text-center">
            <DialogTitle className="text-xl">
              {selectedFulfillmentMode === 'delivery' ? 'Where should we deliver?' : 'How would you like your order?'}
            </DialogTitle>
            <DialogDescription>
              {selectedFulfillmentMode === 'delivery'
                ? 'Add your address or use your current location for an exact Google Maps link.'
                : 'Choose delivery or pickup from the restaurant before browsing the menu.'}
            </DialogDescription>
          </DialogHeader>
          {selectedFulfillmentMode === 'delivery' ? (
            <div className="space-y-4">
              <div className="space-y-2 text-left">
                <label htmlFor="delivery-address" className="text-sm font-semibold text-foreground">
                  Delivery address
                </label>
                <Textarea
                  id="delivery-address"
                  value={deliveryAddress}
                  onChange={(event) => setDeliveryAddress(event.target.value)}
                  placeholder="Building, street, area, floor, apartment..."
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2 text-left">
                <label htmlFor="delivery-phone" className="text-sm font-semibold text-foreground">
                  Contact number
                </label>
                <input
                  id="delivery-phone"
                  type="tel"
                  value={deliveryPhone}
                  onChange={(event) => setDeliveryPhone(event.target.value)}
                  placeholder="+974..."
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <div className="space-y-2 text-left">
                <label htmlFor="delivery-comment" className="text-sm font-semibold text-foreground">
                  Delivery comment
                </label>
                <Textarea
                  id="delivery-comment"
                  value={deliveryComment}
                  onChange={(event) => setDeliveryComment(event.target.value)}
                  placeholder="Any delivery instructions or comments..."
                  rows={2}
                  className="resize-none"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={handleDetectLocation}
                disabled={isDetectingLocation}
              >
                <LocateFixed className="h-4 w-4" />
                {isDetectingLocation ? 'Detecting location...' : 'Use my current location'}
              </Button>
              {deliveryMapUrl && (
                <a
                  href={deliveryMapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-sm font-medium text-primary"
                >
                  <MapPin className="h-4 w-4 shrink-0" />
                  Google Maps location added
                </a>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                <Button type="button" variant="outline" onClick={() => setSelectedFulfillmentMode(null)}>
                  Back
                </Button>
                <Button type="button" onClick={handleSaveDeliveryDetails} disabled={!hasDeliveryLocation}>
                  Continue
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-28 flex-col gap-3 border-primary/25 p-4 text-center hover:bg-primary/10"
                onClick={() => setSelectedFulfillmentMode('delivery')}
              >
                <Truck className="h-8 w-8 text-primary" />
                <span className="text-base font-bold">Delivery</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-28 flex-col gap-3 border-primary/25 p-4 text-center hover:bg-primary/10"
                onClick={() => handleSaveFulfillment('pickup')}
              >
                <Store className="h-8 w-8 text-primary" />
                <span className="text-base font-bold">Pickup</span>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Demo Mode Banner */}
      {isDemo && (
        <div className="bg-accent/10 text-accent py-2 px-4 text-center text-sm font-medium">
          <Eye className="inline-block w-4 h-4 mr-2" />
          Demo Mode - No Firebase required. Orders are simulated.
        </div>
      )}
      
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="container py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <img src={restaurantLogo} alt="Al Fanar Restaurant" className="w-11 h-11 rounded-lg object-cover shadow-sm" />
              <div className="min-w-0">
                <h1 className="font-bold text-lg md:text-xl text-foreground leading-tight">Al Fanar Restaurant</h1>
                <p className="text-sm text-muted-foreground">{t('yemeniFood')}</p>
              </div>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
              {isDemo && (
                <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
                  DEMO
                </Badge>
              )}
              {isTableVisit ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCallWaiter}
                    disabled={isCallingWaiter || Boolean(pendingWaiterCallId)}
                    className="flex-1 border-primary/30 bg-primary text-primary-foreground hover:bg-primary/90 sm:flex-none"
                  >
                    <Bell className="h-4 w-4 mr-1" />
                    {pendingWaiterCallId ? t('waiterRequested') : isCallingWaiter ? t('calling') : t('callWaiter')}
                  </Button>
                  <div className="rounded-lg bg-primary/10 px-3 py-2">
                    <span className="text-sm font-bold text-primary">{t('table')} {tableNumber}</span>
                  </div>
                </>
              ) : fulfillmentMode ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                  onClick={handleChangeFulfillment}
                >
                  {fulfillmentMode === 'delivery' ? <Truck className="h-4 w-4" /> : <Store className="h-4 w-4" />}
                  {fulfillmentMode === 'delivery' ? 'Delivery' : 'Pickup'}
                </Button>
              ) : null}
              <Link to="/admin">
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                  <Settings className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-5 md:py-6">
        {orderPlaced ? (
          <OrderSuccess
            tableNumber={tableNumber}
            orderId={currentOrderId}
            fulfillmentMode={fulfillmentMode}
            status={currentOrderStatus}
            onNewOrder={handleNewOrder}
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[12rem_minmax(0,1fr)_20rem]">
            {/* Category Sidebar */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-1">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-3">{t('categories')}</h3>
                {categories.map((cat) => (
                  groupedItems[cat.id] && (
                    <button
                      key={cat.id}
                      onClick={() => scrollToCategory(cat.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        activeCategory === cat.id 
                          ? 'bg-primary/10 text-primary font-medium' 
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {cat.emoji} {t(cat.labelKey)}
                    </button>
                  )
                ))}
              </div>
            </aside>

            {/* Mobile Category Pills */}
            <div className="lg:hidden -mx-4 overflow-x-auto px-4 pb-1 scrollbar-hide">
              <div className="flex gap-2">
                {categories.map((cat) => (
                  groupedItems[cat.id] && (
                    <button
                      key={cat.id}
                      onClick={() => scrollToCategory(cat.id)}
                      className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        activeCategory === cat.id 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-card text-muted-foreground border border-border'
                      }`}
                    >
                      {cat.emoji} {t(cat.labelKey)}
                    </button>
                  )
                ))}
              </div>
            </div>

            {cart.length > 0 && (
              <section className="lg:hidden">
                <Cart
                  items={cart}
                  totalPrice={totalPrice}
                  orderNotes={orderNotes}
                  onAdd={addToCart}
                  onRemove={removeFromCart}
                  onOrderNotesChange={setOrderNotes}
                  onSubmit={handleSubmitOrder}
                  isSubmitting={isSubmitting}
                />
              </section>
            )}

            {/* Menu Content */}
            <div className="min-w-0 space-y-8">
              {categories.map(cat => (
                groupedItems[cat.id] && (
                  <section key={cat.id} id={`category-${cat.id}`} className="scroll-mt-24">
                    <h2 className="text-xl font-bold mb-4 text-foreground flex items-center gap-2">
                      <span className="w-1 h-7 bg-primary rounded-sm"></span>
                      {cat.emoji} {t(cat.labelKey)}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {groupedItems[cat.id].map((item, index) => (
                        <div key={item.id} style={{ animationDelay: `${index * 0.05}s` }}>
                          <MenuCard item={item} onAdd={handleAddToCart} />
                        </div>
                      ))}
                    </div>
                  </section>
                )
              ))}
            </div>

            {/* Cart */}
            <section className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
              <Cart 
                items={cart} 
                totalPrice={totalPrice}
                orderNotes={orderNotes}
                onAdd={addToCart}
                onRemove={removeFromCart}
                onOrderNotesChange={setOrderNotes}
                onSubmit={handleSubmitOrder}
                isSubmitting={isSubmitting}
              />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
