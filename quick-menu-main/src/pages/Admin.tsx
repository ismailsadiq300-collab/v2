import { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { addDoc, collection, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesUpdate } from '@/integrations/supabase/types';
import { Order } from '@/types/menu';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useI18n } from '@/lib/i18n';
import {
  getOrderNumber,
  getDriverOrderStatusUrl,
  getOrderWhatsappUrl,
  getExpectedDeliveryTime,
  isDeliveryOrder,
  withExpectedDeliveryTime,
} from '@/lib/orderDetails';
import {
  ArrowLeft,
  Banknote,
  Bell,
  Calculator,
  CheckCircle2,
  ChefHat,
  Clock,
  ClipboardList,
  HandHelping,
  Lock,
  LockKeyhole,
  LogOut,
  MessageCircle,
  Package,
  Plus,
  QrCode,
  ReceiptText,
  Trash2,
  TrendingUp,
  Utensils,
} from 'lucide-react';

const ADMIN_PASSWORD = 'admin123';
const SUPER_ADMIN_PASSWORD = 'super123';

type RequirementStatus = 'ready' | 'prep' | 'low' | 'out';

interface LocalizedText {
  en: string;
  ar: string;
}

interface RequirementItem {
  id: string;
  group: string;
  name: LocalizedText;
  hint: LocalizedText;
  icon: string;
  unit: string;
  par: number;
}

interface RequirementState {
  status: RequirementStatus;
  quantity: number;
}

interface WaiterCall {
  id: string;
  table_number: number;
  status: string;
  created_at: string;
  acknowledged_at: string | null;
  completed_at: string | null;
}

interface Expense {
  id?: string;
  title: string;
  category: string;
  amount: number;
  notes?: string | null;
  createdAt: Date;
}

interface WasteLog {
  id: string;
  item_name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  reason: string | null;
  created_at: string;
}

interface CustomerFeedback {
  id: string;
  tableNumber: number;
  message: string;
  status: string;
  timestamp: Date;
}

type OrderRow = Tables<'orders'>;

interface ManualOrderItem {
  id: string;
  name: string;
  quantity: string;
  price: string;
  addOns: string;
}

const statusConfig = {
  new: { label: 'New', color: 'bg-primary text-primary-foreground', icon: Clock },
  preparing: { label: 'Preparing', color: 'bg-amber-500 text-white', icon: ChefHat },
  ready: { label: 'Ready', color: 'bg-success text-success-foreground', icon: CheckCircle2 },
  served: { label: 'Served', color: 'bg-muted text-muted-foreground', icon: Utensils },
};

const requirementGroups: { id: string; label: LocalizedText }[] = [
  { id: 'rice-grains', label: { en: 'Rice & Grains', ar: 'الأرز والحبوب' } },
  { id: 'proteins', label: { en: 'Meat, Chicken & Fish', ar: 'اللحم والدجاج والسمك' } },
  { id: 'stews-breads', label: { en: 'Stews, Bread & Bases', ar: 'اليخنات والخبز والقواعد' } },
  { id: 'vegetables', label: { en: 'Vegetables & Herbs', ar: 'الخضار والأعشاب' } },
  { id: 'spices-sauces', label: { en: 'Spices & Sauces', ar: 'البهارات والصلصات' } },
  { id: 'drinks-desserts', label: { en: 'Drinks, Desserts & Service', ar: 'المشروبات والحلويات والخدمة' } },
];

const cookingRequirements: RequirementItem[] = [
  {
    id: 'basmati-rice',
    group: 'rice-grains',
    name: { en: 'Basmati rice', ar: 'أرز بسمتي' },
    hint: { en: 'Washed and soaked for mandi, kabsa, zurbian', ar: 'مغسول ومنقوع للمندي والكبسة والزربيان' },
    icon: '🍚',
    unit: 'kg',
    par: 12,
  },
  {
    id: 'mandi-rice-pot',
    group: 'rice-grains',
    name: { en: 'Mandi rice pot', ar: 'قدر رز المندي' },
    hint: { en: 'Yellow rice with stock, loomi, cardamom, cinnamon', ar: 'رز أصفر مع مرق ولومي وهيل وقرفة' },
    icon: '🥘',
    unit: 'pots',
    par: 3,
  },
  {
    id: 'stock-broth',
    group: 'rice-grains',
    name: { en: 'Meat or chicken broth', ar: 'مرق لحم أو دجاج' },
    hint: { en: 'For rice, saltah, fahsa, and thareed', ar: 'للرز والسلتة والفحسة والثريد' },
    icon: '🍲',
    unit: 'L',
    par: 8,
  },
  {
    id: 'lamb-portions',
    group: 'proteins',
    name: { en: 'Lamb portions', ar: 'حصص لحم غنم' },
    hint: { en: 'Haneeth, mandi, fahsa, saltah meat', ar: 'حنيذ ومندي وفحسة ولحم السلتة' },
    icon: '🥩',
    unit: 'pcs',
    par: 24,
  },
  {
    id: 'chicken-portions',
    group: 'proteins',
    name: { en: 'Chicken portions', ar: 'حصص دجاج' },
    hint: { en: 'Mandi, shawiyah, kebab, and grill orders', ar: 'مندي وشوية وكباب ومشاوي' },
    icon: '🍗',
    unit: 'pcs',
    par: 32,
  },
  {
    id: 'beef-liver',
    group: 'proteins',
    name: { en: 'Beef or lamb liver', ar: 'كبدة بقري أو غنم' },
    hint: { en: 'Breakfast liver pan and moqalqal prep', ar: 'كبدة الفطور وتجهيز المقلقل' },
    icon: '🍳',
    unit: 'kg',
    par: 5,
  },
  {
    id: 'fish',
    group: 'proteins',
    name: { en: 'Fish for mofa', ar: 'سمك الموفا' },
    hint: { en: 'Cleaned and seasoned for Yemeni grilled fish', ar: 'منظف ومتبل للسمك المشوي اليمني' },
    icon: '🐟',
    unit: 'pcs',
    par: 12,
  },
  {
    id: 'eggs',
    group: 'proteins',
    name: { en: 'Eggs', ar: 'بيض' },
    hint: { en: 'Lahsa, shakshouka, mutabbaq, saltah add-on', ar: 'لحسة وشكشوكة ومطبق وإضافة للسلتة' },
    icon: '🥚',
    unit: 'pcs',
    par: 60,
  },
  {
    id: 'fahsa-base',
    group: 'stews-breads',
    name: { en: 'Fahsa base', ar: 'قاعدة الفحسة' },
    hint: { en: 'Shredded lamb, broth, spices, stone-pot ready', ar: 'لحم مفتت ومرق وبهارات جاهزة للمدرة' },
    icon: '🍖',
    unit: 'pans',
    par: 4,
  },
  {
    id: 'saltah-base',
    group: 'stews-breads',
    name: { en: 'Saltah base', ar: 'قاعدة السلتة' },
    hint: { en: 'Maraq, vegetables, fenugreek froth, sahawiq', ar: 'مرق وخضار وحلبة وسحاوق' },
    icon: '🥣',
    unit: 'pots',
    par: 3,
  },
  {
    id: 'mulawah-bread',
    group: 'stews-breads',
    name: { en: 'Mulawah bread', ar: 'خبز ملوح' },
    hint: { en: 'Large flatbread for saltah, fahsa, and breakfast', ar: 'خبز كبير للسلتة والفحسة والفطور' },
    icon: '🫓',
    unit: 'pcs',
    par: 80,
  },
  {
    id: 'lahoh-bread',
    group: 'stews-breads',
    name: { en: 'Lahoh bread', ar: 'لحوح' },
    hint: { en: 'For shafut and cold yogurt dishes', ar: 'للشفوت وأطباق اللبن الباردة' },
    icon: '🥞',
    unit: 'pcs',
    par: 40,
  },
  {
    id: 'mutabbaq-dough',
    group: 'stews-breads',
    name: { en: 'Mutabbaq dough', ar: 'عجينة المطبق' },
    hint: { en: 'Sheets ready for egg or meat mutabbaq', ar: 'رقائق جاهزة لمطبق البيض أو اللحم' },
    icon: '🥟',
    unit: 'sheets',
    par: 50,
  },
  {
    id: 'tomatoes',
    group: 'vegetables',
    name: { en: 'Tomatoes', ar: 'طماطم' },
    hint: { en: 'Sahawiq, salad, saltah, shakshouka', ar: 'سحاوق وسلطة وسلتة وشكشوكة' },
    icon: '🍅',
    unit: 'kg',
    par: 10,
  },
  {
    id: 'onions',
    group: 'vegetables',
    name: { en: 'Onions', ar: 'بصل' },
    hint: { en: 'Rice base, stews, liver, grill garnish', ar: 'قاعدة الرز واليخنات والكبدة وتزيين المشاوي' },
    icon: '🧅',
    unit: 'kg',
    par: 8,
  },
  {
    id: 'cucumbers',
    group: 'vegetables',
    name: { en: 'Cucumbers', ar: 'خيار' },
    hint: { en: 'Fresh salad and side plates', ar: 'سلطة طازجة وصحون جانبية' },
    icon: '🥒',
    unit: 'kg',
    par: 6,
  },
  {
    id: 'potatoes',
    group: 'vegetables',
    name: { en: 'Potatoes', ar: 'بطاطس' },
    hint: { en: 'Saltah, stew additions, sides', ar: 'للسلتة واليخنات والطلبات الجانبية' },
    icon: '🥔',
    unit: 'kg',
    par: 8,
  },
  {
    id: 'carrots',
    group: 'vegetables',
    name: { en: 'Carrots', ar: 'جزر' },
    hint: { en: 'Saltah vegetables, stock, salad garnish', ar: 'خضار السلتة والمرق وتزيين السلطة' },
    icon: '🥕',
    unit: 'kg',
    par: 4,
  },
  {
    id: 'green-chili',
    group: 'vegetables',
    name: { en: 'Green chili', ar: 'فلفل أخضر حار' },
    hint: { en: 'Sahawiq, fahsa sides, spicy requests', ar: 'للسحاوق وجوانب الفحسة وطلبات الحار' },
    icon: '🌶️',
    unit: 'kg',
    par: 3,
  },
  {
    id: 'garlic',
    group: 'vegetables',
    name: { en: 'Garlic', ar: 'ثوم' },
    hint: { en: 'Sahawiq, marinades, sauces, stews', ar: 'للسحاوق والتتبيلات والصلصات واليخنات' },
    icon: '🧄',
    unit: 'kg',
    par: 3,
  },
  {
    id: 'ginger',
    group: 'vegetables',
    name: { en: 'Fresh ginger', ar: 'زنجبيل طازج' },
    hint: { en: 'Mandi marinade, meat and chicken prep', ar: 'تتبيلة المندي وتجهيز اللحم والدجاج' },
    icon: '🫚',
    unit: 'kg',
    par: 2,
  },
  {
    id: 'cilantro',
    group: 'vegetables',
    name: { en: 'Cilantro', ar: 'كزبرة خضراء' },
    hint: { en: 'Sahawiq, garnish, fahsa green mix', ar: 'سحاوق وتزيين وخلطة الفحسة الخضراء' },
    icon: '🌿',
    unit: 'bunches',
    par: 25,
  },
  {
    id: 'mint',
    group: 'vegetables',
    name: { en: 'Mint', ar: 'نعناع' },
    hint: { en: 'Tea, salad, chutneys, garnish', ar: 'شاي وسلطة وصلصات وتزيين' },
    icon: '🌱',
    unit: 'bunches',
    par: 12,
  },
  {
    id: 'lemons',
    group: 'vegetables',
    name: { en: 'Lemon or lime', ar: 'ليمون' },
    hint: { en: 'Sahawiq, fish, salads, drinks', ar: 'سحاوق وسمك وسلطات ومشروبات' },
    icon: '🍋',
    unit: 'pcs',
    par: 60,
  },
  {
    id: 'hawaij',
    group: 'spices-sauces',
    name: { en: 'Hawaij spice mix', ar: 'خلطة حوايج' },
    hint: { en: 'Yemeni spice base for meats, soups, and rice', ar: 'خلطة يمنية للحم والشوربة والرز' },
    icon: '🧂',
    unit: 'kg',
    par: 2,
  },
  {
    id: 'whole-spices',
    group: 'spices-sauces',
    name: { en: 'Whole rice spices', ar: 'بهارات الرز الصحيحة' },
    hint: { en: 'Cardamom, cinnamon, cloves, loomi, bay leaves', ar: 'هيل وقرفة وقرنفل ولومي وورق غار' },
    icon: '🌰',
    unit: 'sets',
    par: 6,
  },
  {
    id: 'sahawiq',
    group: 'spices-sauces',
    name: { en: 'Sahawiq / zhug', ar: 'سحاوق' },
    hint: { en: 'Tomato, chili, garlic, herbs, lemon', ar: 'طماطم وفلفل وثوم وأعشاب وليمون' },
    icon: '🌶️',
    unit: 'bowls',
    par: 8,
  },
  {
    id: 'hilbah',
    group: 'spices-sauces',
    name: { en: 'Hilbah fenugreek', ar: 'حلبة' },
    hint: { en: 'Fenugreek froth for saltah and fahsa', ar: 'رغوة الحلبة للسلتة والفحسة' },
    icon: '🥣',
    unit: 'bowls',
    par: 6,
  },
  {
    id: 'yogurt-buttermilk',
    group: 'spices-sauces',
    name: { en: 'Yogurt / buttermilk', ar: 'زبادي أو حقين' },
    hint: { en: 'Shafut, sauces, and cooling sides', ar: 'للشفوت والصلصات والجوانب الباردة' },
    icon: '🥛',
    unit: 'L',
    par: 8,
  },
  {
    id: 'tea-coffee',
    group: 'drinks-desserts',
    name: { en: 'Tea and coffee', ar: 'شاي وقهوة' },
    hint: { en: 'Yemeni tea, Arabic coffee, cardamom service', ar: 'شاي يمني وقهوة عربية وخدمة الهيل' },
    icon: '☕',
    unit: 'sets',
    par: 5,
  },
  {
    id: 'juice-fruit',
    group: 'drinks-desserts',
    name: { en: 'Juice fruit', ar: 'فواكه العصير' },
    hint: { en: 'Mango, mixed fruit, banana, lemon', ar: 'مانجو وفواكه مشكلة وموز وليمون' },
    icon: '🧃',
    unit: 'kg',
    par: 12,
  },
  {
    id: 'masoub-items',
    group: 'drinks-desserts',
    name: { en: 'Masoub items', ar: 'مكونات المعصوب' },
    hint: { en: 'Banana, cream, honey, bread, nuts', ar: 'موز وقشطة وعسل وخبز ومكسرات' },
    icon: '🍌',
    unit: 'sets',
    par: 10,
  },
  {
    id: 'bint-sahn',
    group: 'drinks-desserts',
    name: { en: 'Bint al-sahn', ar: 'بنت الصحن' },
    hint: { en: 'Honey bread dessert portions', ar: 'حصص حلوى العسل اليمنية' },
    icon: '🍯',
    unit: 'trays',
    par: 4,
  },
  {
    id: 'charcoal',
    group: 'drinks-desserts',
    name: { en: 'Charcoal / smoking', ar: 'فحم وتدخين' },
    hint: { en: 'Mandi smoke, grill, and aroma finish', ar: 'تدخين المندي والمشوي ونكهة الدخان' },
    icon: '🔥',
    unit: 'bags',
    par: 3,
  },
  {
    id: 'service-packaging',
    group: 'drinks-desserts',
    name: { en: 'Service packaging', ar: 'مستلزمات التقديم' },
    hint: { en: 'Takeaway boxes, foil, gloves, napkins', ar: 'علب سفري وقصدير وقفازات ومناديل' },
    icon: '📦',
    unit: 'sets',
    par: 20,
  },
];

const requirementStatusConfig: Record<RequirementStatus, { label: string; className: string }> = {
  ready: { label: 'Ready', className: 'bg-success text-success-foreground' },
  prep: { label: 'Prep Now', className: 'bg-amber-500 text-white' },
  low: { label: 'Low', className: 'bg-destructive text-destructive-foreground' },
  out: { label: 'Out', className: 'bg-slate-950 text-white' },
};

const expenseCategories = ['Ingredients', 'Staff', 'Rent', 'Utilities', 'Maintenance', 'Delivery', 'Other'];

const formatMoney = (value: number) => `${value.toFixed(2)} QAR`;

const getStatusLabelKey = (status: Order['status']): 'received' | 'preparing' | 'ready' | 'served' => {
  if (status === 'new') return 'received';
  if (status === 'preparing') return 'preparing';
  if (status === 'ready') return 'ready';
  return 'served';
};

const isOrderStatus = (status: unknown): status is Order['status'] =>
  status === 'new' || status === 'preparing' || status === 'ready' || status === 'served';

const parseOrderItems = (items: unknown): Order['items'] => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      if (!item || typeof item !== 'object') return null;

      const value = item as Record<string, unknown>;
      const name = typeof value.name === 'string' ? value.name : '';
      const quantity = Number(value.quantity);
      const price = Number(value.price);
      const addOns = Array.isArray(value.addOns)
        ? value.addOns.filter((addOn): addOn is string => typeof addOn === 'string')
        : [];

      if (!name || !Number.isFinite(quantity) || !Number.isFinite(price)) return null;

      return { name, quantity, price, addOns };
    })
    .filter((item): item is Order['items'][number] => Boolean(item));
};

const mapOrderRow = (row: OrderRow): Order => ({
  id: row.id,
  tableNumber: row.table_number,
  items: parseOrderItems(row.items),
  totalPrice: Number(row.total_price),
  notes: row.notes,
  status: isOrderStatus(row.status) ? row.status : 'new',
  timestamp: new Date(row.created_at),
});

const playNotificationSound = () => {
  try {
    type WindowWithLegacyAudio = Window & typeof globalThis & {
      webkitAudioContext?: typeof AudioContext;
    };
    const AudioContextConstructor =
      window.AudioContext || (window as WindowWithLegacyAudio).webkitAudioContext;

    if (!AudioContextConstructor) return;

    const audioContext = new AudioContextConstructor();

    const oscillator1 = audioContext.createOscillator();
    const gainNode1 = audioContext.createGain();
    oscillator1.connect(gainNode1);
    gainNode1.connect(audioContext.destination);
    oscillator1.frequency.value = 880;
    oscillator1.type = 'sine';
    gainNode1.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    oscillator1.start(audioContext.currentTime);
    oscillator1.stop(audioContext.currentTime + 0.3);

    const oscillator2 = audioContext.createOscillator();
    const gainNode2 = audioContext.createGain();
    oscillator2.connect(gainNode2);
    gainNode2.connect(audioContext.destination);
    oscillator2.frequency.value = 1100;
    oscillator2.type = 'sine';
    gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime + 0.15);
    gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.45);
    oscillator2.start(audioContext.currentTime + 0.15);
    oscillator2.stop(audioContext.currentTime + 0.45);
  } catch (error) {
    console.log('Audio notification not supported');
  }
};

export default function Admin() {
  const { t, language } = useI18n();
  const [orders, setOrders] = useState<Order[]>([]);
  const [waiterCalls, setWaiterCalls] = useState<WaiterCall[]>([]);
  const [wasteLogs, setWasteLogs] = useState<WasteLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [feedbackItems, setFeedbackItems] = useState<CustomerFeedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('adminAuth') === 'true';
  });
  const [isSuperAdmin, setIsSuperAdmin] = useState(() => {
    return sessionStorage.getItem('superAdminAuth') === 'true';
  });
  const [password, setPassword] = useState('');
  const [superPassword, setSuperPassword] = useState('');
  const [error, setError] = useState('');
  const [superError, setSuperError] = useState('');
  const [deliveryEtaInputs, setDeliveryEtaInputs] = useState<Record<string, string>>({});
  const [manualOrderTable, setManualOrderTable] = useState('1');
  const [manualOrderType, setManualOrderType] = useState<'dine-in' | 'delivery' | 'pickup'>('dine-in');
  const [manualOrderNotes, setManualOrderNotes] = useState('');
  const [manualOrderItems, setManualOrderItems] = useState<ManualOrderItem[]>([
    { id: crypto.randomUUID(), name: '', quantity: '1', price: '', addOns: '' },
  ]);
  const [manualOrderError, setManualOrderError] = useState('');
  const [isSavingManualOrder, setIsSavingManualOrder] = useState(false);
  const [requirementStates, setRequirementStates] = useState<Record<string, RequirementState>>(() => {
    try {
      const saved = localStorage.getItem('kitchenRequirementStatuses');
      if (!saved) return {};

      const parsed = JSON.parse(saved) as Record<string, RequirementStatus | Partial<RequirementState>>;
      return Object.fromEntries(
        Object.entries(parsed).map(([id, value]) => {
          if (typeof value === 'string') {
            return [id, { status: value, quantity: 0 }];
          }

          return [
            id,
            {
              status: value.status || 'ready',
              quantity: typeof value.quantity === 'number' ? value.quantity : 0,
            },
          ];
        }),
      );
    } catch {
      return {};
    }
  });
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    category: 'Ingredients',
    amount: '',
    notes: '',
  });
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  const knownOrderIds = useRef<Set<string>>(new Set());
  const knownWaiterCallIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);
  const isFirstWaiterCallLoad = useRef(true);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading orders:', error);
        setLoading(false);
        return;
      }

      const ordersData = (data || []).map(mapOrderRow);

      if (!isFirstLoad.current) {
        const newOrders = ordersData.filter(
          order => order.id && !knownOrderIds.current.has(order.id),
        );
        if (newOrders.length > 0) {
          playNotificationSound();
        }
      }

      ordersData.forEach(order => {
        if (order.id) knownOrderIds.current.add(order.id);
      });
      isFirstLoad.current = false;

      setOrders(ordersData);
      setLoading(false);
    };

    setLoading(true);
    fetchOrders();

    const channel = supabase
      .channel('orders-admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          fetchOrders();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchWaiterCalls = async () => {
      const { data } = await supabase
        .from('waiter_calls')
        .select('*')
        .in('status', ['pending', 'acknowledged'])
        .order('created_at', { ascending: false });

      if (data) {
        if (!isFirstWaiterCallLoad.current) {
          const newCalls = data.filter(call => !knownWaiterCallIds.current.has(call.id));
          if (newCalls.length > 0) {
            playNotificationSound();
          }
        }

        data.forEach(call => knownWaiterCallIds.current.add(call.id));
        isFirstWaiterCallLoad.current = false;

        setWaiterCalls(data);
      }
    };

    fetchWaiterCalls();

    const channel = supabase
      .channel('waiter-calls-admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'waiter_calls',
        },
        (payload) => {
          console.log('Waiter call change:', payload);

          if (payload.eventType === 'INSERT' && (payload.new as WaiterCall).status === 'pending') {
            playNotificationSound();
          }

          fetchWaiterCalls();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.setItem('kitchenRequirementStatuses', JSON.stringify(requirementStates));
  }, [requirementStates]);

  useEffect(() => {
    if (!isSuperAdmin) return;

    const expensesQuery = query(collection(db, 'expenses'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(expensesQuery, (snapshot) => {
      const nextExpenses = snapshot.docs.map((expenseDoc) => ({
        id: expenseDoc.id,
        ...expenseDoc.data(),
        createdAt: expenseDoc.data().createdAt?.toDate() || new Date(),
      })) as Expense[];
      setExpenses(nextExpenses);
    });

    return () => unsubscribe();
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const feedbackQuery = query(collection(db, 'feedback'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(feedbackQuery, (snapshot) => {
      const nextFeedback = snapshot.docs.map((feedbackDoc) => {
        const data = feedbackDoc.data();

        return {
          id: feedbackDoc.id,
          tableNumber: typeof data.tableNumber === 'number' ? data.tableNumber : 1,
          message: typeof data.message === 'string' ? data.message : '',
          status: typeof data.status === 'string' ? data.status : 'new',
          timestamp: data.timestamp?.toDate() || new Date(),
        };
      });

      setFeedbackItems(nextFeedback);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isSuperAdmin) return;

    const fetchWasteLogs = async () => {
      const { data } = await supabase
        .from('waste_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        setWasteLogs(data as WasteLog[]);
      }
    };

    fetchWasteLogs();

    const channel = supabase
      .channel('waste-logs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waste_logs' }, () => {
        fetchWasteLogs();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isSuperAdmin]);

  const activeOrders = orders.filter(order => order.status !== 'served');
  const preparingOrders = orders.filter(order => order.status === 'preparing');
  const readyOrders = orders.filter(order => order.status === 'ready');
  const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);

  const kitchenNeeds = useMemo(() => {
    const totals = new Map<string, number>();

    activeOrders.forEach(order => {
      order.items.forEach(item => {
        totals.set(item.name, (totals.get(item.name) || 0) + item.quantity);
      });
    });

    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [activeOrders]);

  const accounting = useMemo(() => {
    const servedRevenue = orders
      .filter(order => order.status === 'served')
      .reduce((sum, order) => sum + order.totalPrice, 0);
    const pendingRevenue = totalRevenue - servedRevenue;
    const manualExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const wasteCost = wasteLogs.reduce((sum, log) => sum + (log.quantity * log.cost_per_unit), 0);
    const totalSpending = manualExpenses + wasteCost;
    const net = totalRevenue - totalSpending;
    const averageOrder = orders.length ? totalRevenue / orders.length : 0;

    const categoryTotals = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);
    if (wasteCost > 0) {
      categoryTotals.Waste = (categoryTotals.Waste || 0) + wasteCost;
    }

    const biggestCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
    const itemTotals = orders.flatMap(order => order.items).reduce((acc, item) => {
      acc[item.name] = (acc[item.name] || 0) + item.quantity;
      return acc;
    }, {} as Record<string, number>);
    const topItem = Object.entries(itemTotals).sort((a, b) => b[1] - a[1])[0];

    const netMargin = totalRevenue > 0 ? (net / totalRevenue) * 100 : 0;

    return {
      servedRevenue,
      pendingRevenue,
      manualExpenses,
      wasteCost,
      totalSpending,
      net,
      averageOrder,
      categoryTotals,
      biggestCategory,
      topItem,
      netMargin,
    };
  }, [orders, totalRevenue, expenses, wasteLogs]);

  const updateWaiterCallStatus = async (callId: string, newStatus: string) => {
    const updateData: TablesUpdate<'waiter_calls'> = { status: newStatus };

    if (newStatus === 'acknowledged') {
      updateData.acknowledged_at = new Date().toISOString();
    } else if (newStatus === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('waiter_calls')
      .update(updateData)
      .eq('id', callId);

    if (error) {
      console.error('Error updating waiter call:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status'], notes?: string | null) => {
    const updateData: TablesUpdate<'orders'> = { status: newStatus };
    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (error) {
      console.error('Error updating order status:', error);
    }
  };

  const advanceOrderStatus = (order: Order, newStatus: Order['status'], expectedTimeInput?: string) => {
    if (!order.id) return;

    if (isDeliveryOrder(order) && order.status === 'new' && newStatus === 'preparing') {
      const expectedTime = (expectedTimeInput || '').trim();
      if (!expectedTime) return;

      const nextNotes = withExpectedDeliveryTime(order.notes, expectedTime);
      const acceptedOrder: Order = {
        ...order,
        notes: nextNotes,
        status: newStatus,
      };

      window.open(getOrderWhatsappUrl(acceptedOrder, getDriverOrderStatusUrl(order.id)), '_blank', 'noopener,noreferrer');
      updateOrderStatus(order.id, newStatus, nextNotes);
      setDeliveryEtaInputs(prev => {
        const next = { ...prev };
        delete next[order.id as string];
        return next;
      });
      return;
    }

    updateOrderStatus(order.id, newStatus);
  };

  const updateManualOrderItem = (itemId: string, field: keyof Omit<ManualOrderItem, 'id'>, value: string) => {
    setManualOrderItems(prev => prev.map(item => (
      item.id === itemId ? { ...item, [field]: value } : item
    )));
  };

  const addManualOrderItem = () => {
    setManualOrderItems(prev => [
      ...prev,
      { id: crypto.randomUUID(), name: '', quantity: '1', price: '', addOns: '' },
    ]);
  };

  const removeManualOrderItem = (itemId: string) => {
    setManualOrderItems(prev => (
      prev.length === 1
        ? [{ id: crypto.randomUUID(), name: '', quantity: '1', price: '', addOns: '' }]
        : prev.filter(item => item.id !== itemId)
    ));
  };

  const manualOrderPayloadItems: Order['items'] = manualOrderItems
    .map(item => {
      const name = item.name.trim();
      const quantity = Number.parseInt(item.quantity, 10);
      const price = Number.parseFloat(item.price);

      if (!name || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price < 0) {
        return null;
      }

      return {
        name,
        quantity,
        price,
        addOns: item.addOns
          .split(',')
          .map(addOn => addOn.trim())
          .filter(Boolean),
      };
    })
    .filter((item): item is Order['items'][number] => Boolean(item));

  const manualOrderTotal = manualOrderPayloadItems.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0,
  );

  const handleCreateManualOrder = async (event: React.FormEvent) => {
    event.preventDefault();

    const tableNumber = Number.parseInt(manualOrderTable, 10);
    if (!Number.isFinite(tableNumber) || tableNumber <= 0) {
      setManualOrderError('Enter a valid table/order number');
      return;
    }

    if (manualOrderPayloadItems.length === 0) {
      setManualOrderError('Add at least one meal with quantity and price');
      return;
    }

    const orderTypeNote = manualOrderType === 'delivery'
      ? 'Order type: Delivery'
      : manualOrderType === 'pickup'
        ? 'Order type: Pickup from restaurant'
        : 'Order type: Manual dine-in';
    const notes = [orderTypeNote, manualOrderNotes.trim()].filter(Boolean).join('\n');

    setIsSavingManualOrder(true);
    setManualOrderError('');
    const { error } = await supabase
      .from('orders')
      .insert({
        table_number: tableNumber,
        items: manualOrderPayloadItems,
        total_price: manualOrderTotal,
        notes,
        status: 'new',
      });

    setIsSavingManualOrder(false);
    if (error) {
      console.error('Error creating manual order:', error);
      setManualOrderError('Could not create manual order');
      return;
    }

    setManualOrderTable('1');
    setManualOrderType('dine-in');
    setManualOrderNotes('');
    setManualOrderItems([{ id: crypto.randomUUID(), name: '', quantity: '1', price: '', addOns: '' }]);
  };

  const getNextStatus = (currentStatus: Order['status']): Order['status'] | null => {
    const flow: Order['status'][] = ['new', 'preparing', 'ready', 'served'];
    const currentIndex = flow.indexOf(currentStatus);
    return currentIndex < flow.length - 1 ? flow[currentIndex + 1] : null;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatWaiterCallTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem('adminAuth', 'true');
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password');
    }
  };

  const handleSuperLogin = (event: React.FormEvent) => {
    event.preventDefault();
    if (superPassword === SUPER_ADMIN_PASSWORD) {
      sessionStorage.setItem('superAdminAuth', 'true');
      setIsSuperAdmin(true);
      setSuperError('');
      setSuperPassword('');
    } else {
      setSuperError('Incorrect super admin password');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminAuth');
    sessionStorage.removeItem('superAdminAuth');
    setIsAuthenticated(false);
    setIsSuperAdmin(false);
    setPassword('');
  };

  const getRequirementState = (item: RequirementItem): RequirementState => {
    return requirementStates[item.id] || { status: 'ready', quantity: item.par };
  };

  const updateRequirementStatus = (item: RequirementItem, status: RequirementStatus) => {
    setRequirementStates(prev => ({
      ...prev,
      [item.id]: { status, quantity: prev[item.id]?.quantity ?? item.par },
    }));
  };

  const updateRequirementQuantity = (item: RequirementItem, nextQuantity: number) => {
    setRequirementStates(prev => ({
      ...prev,
      [item.id]: {
        status: prev[item.id]?.status || 'ready',
        quantity: Math.max(0, nextQuantity),
      },
    }));
  };

  const bumpRequirementQuantity = (item: RequirementItem, delta: number) => {
    const current = getRequirementState(item).quantity;
    updateRequirementQuantity(item, current + delta);
  };

  const handleAddExpense = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number.parseFloat(expenseForm.amount);

    if (!expenseForm.title.trim() || !Number.isFinite(amount) || amount <= 0) {
      setSuperError('Add a title and valid amount');
      return;
    }

    setIsSavingExpense(true);
    setSuperError('');
    try {
      await addDoc(collection(db, 'expenses'), {
        title: expenseForm.title.trim(),
        category: expenseForm.category,
        amount,
        notes: expenseForm.notes.trim() || null,
        createdAt: Timestamp.now(),
      });

      setExpenseForm({ title: '', category: 'Ingredients', amount: '', notes: '' });
      setSuperError('');
    } catch {
      setSuperError('Could not save expense');
    } finally {
      setIsSavingExpense(false);
    }
  };

  const accountingPeriod = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-sm p-6">
          <div className="text-center mb-6">
            <Lock className="h-12 w-12 mx-auto text-primary mb-3" />
            <h1 className="text-xl font-bold">{t('kitchenOrders')}</h1>
            <p className="text-sm text-muted-foreground">{t('enterPassword')}</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="password"
              placeholder={t('enterPassword')}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={error ? 'border-destructive' : ''}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">
              {t('login')}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('backToMenu')}
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8 bg-[linear-gradient(180deg,#effaf6_0%,#f7fbff_100%)]">
      <header className="sticky top-0 z-10 border-b border-emerald-900/20 bg-emerald-800 text-white shadow-sm">
        <div className="container py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('menu')}
                </Button>
              </Link>
              <div>
                <h1 className="font-bold text-xl">{t('adminDashboard')}</h1>
                <p className="text-sm text-white/75">
                  {activeOrders.length} {t('activeOrders')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/qr-codes">
                <Button variant="outline" size="sm">
                  <QrCode className="h-4 w-4 mr-2" />
                  {t('qrCodes')}
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">{t('active')}</p>
            <p className="text-2xl font-bold text-foreground">{activeOrders.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">{t('preparing')}</p>
            <p className="text-2xl font-bold text-amber-600">{preparingOrders.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">{t('ready')}</p>
            <p className="text-2xl font-bold text-success">{readyOrders.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">{t('income')}</p>
            <p className="text-2xl font-bold text-primary">{formatMoney(totalRevenue)}</p>
          </Card>
        </div>

        {waiterCalls.length > 0 && (
          <Card className="p-4 mb-6 border-2 border-amber-400 bg-amber-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-600" />
                <h2 className="font-bold text-lg">{t('waiterCalls')}</h2>
              </div>
              <Badge className="bg-amber-500 text-white">{waiterCalls.length}</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {waiterCalls.map(call => (
                <div key={call.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-200">
                  <div className="flex items-center gap-3">
                    <HandHelping className="h-5 w-5 text-amber-600" />
                    <div>
                      <span className="font-bold">{t('table')} {call.table_number}</span>
                      <p className="text-sm text-muted-foreground">{formatWaiterCallTime(call.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={call.status === 'pending' ? 'bg-primary' : 'bg-amber-500'}>
                      {call.status}
                    </Badge>
                    {call.status === 'pending' && (
                      <Button
                        size="sm"
                        className="bg-amber-500 hover:bg-amber-600 text-white"
                        onClick={() => updateWaiterCallStatus(call.id, 'acknowledged')}
                      >
                        {t('onMyWay')}
                      </Button>
                    )}
                    {call.status === 'acknowledged' && (
                      <Button
                        size="sm"
                        className="bg-green-500 hover:bg-green-600"
                        onClick={() => updateWaiterCallStatus(call.id, 'completed')}
                      >
                        {t('done')}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Tabs defaultValue="orders" className="space-y-5">
          <TabsList className="grid h-auto w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="orders" className="py-3">
              {t('orders')}
            </TabsTrigger>
            <TabsTrigger value="feedback" className="py-3">
              Feedback
            </TabsTrigger>
            <TabsTrigger value="prep" className="py-3">
              {t('kitchenPrep')}
            </TabsTrigger>
            <TabsTrigger value="accounting" className="py-3">
              {t('accounting')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            <Card className="p-5">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold">Add Manual Order</h2>
                  <p className="text-sm text-muted-foreground">Create an order taken by staff. It will appear below as a new received order.</p>
                </div>
                <Badge variant="outline" className="w-fit bg-primary/10 text-primary">
                  Total {formatMoney(manualOrderTotal)}
                </Badge>
              </div>

              <form onSubmit={handleCreateManualOrder} className="space-y-4">
                <div className="grid gap-3 md:grid-cols-[1fr_1fr_2fr]">
                  <div className="space-y-2">
                    <label htmlFor="manual-table" className="text-sm font-semibold">Table / order number</label>
                    <Input
                      id="manual-table"
                      type="number"
                      min="1"
                      value={manualOrderTable}
                      onChange={(event) => setManualOrderTable(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="manual-type" className="text-sm font-semibold">Order type</label>
                    <select
                      id="manual-type"
                      value={manualOrderType}
                      onChange={(event) => setManualOrderType(event.target.value as 'dine-in' | 'delivery' | 'pickup')}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="dine-in">Dine-in</option>
                      <option value="delivery">Delivery</option>
                      <option value="pickup">Pickup</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="manual-notes" className="text-sm font-semibold">Notes</label>
                    <Input
                      id="manual-notes"
                      value={manualOrderNotes}
                      onChange={(event) => setManualOrderNotes(event.target.value)}
                      placeholder="Optional kitchen/customer notes"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {manualOrderItems.map((item, index) => (
                    <div key={item.id} className="grid gap-2 rounded-lg border border-border p-3 md:grid-cols-[2fr_0.75fr_1fr_1.5fr_auto]">
                      <div className="space-y-2">
                        <label htmlFor={`manual-name-${item.id}`} className="text-xs font-semibold uppercase text-muted-foreground">
                          Meal {index + 1}
                        </label>
                        <Input
                          id={`manual-name-${item.id}`}
                          value={item.name}
                          onChange={(event) => updateManualOrderItem(item.id, 'name', event.target.value)}
                          placeholder="Meal name"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor={`manual-qty-${item.id}`} className="text-xs font-semibold uppercase text-muted-foreground">Qty</label>
                        <Input
                          id={`manual-qty-${item.id}`}
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(event) => updateManualOrderItem(item.id, 'quantity', event.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor={`manual-price-${item.id}`} className="text-xs font-semibold uppercase text-muted-foreground">Price</label>
                        <Input
                          id={`manual-price-${item.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.price}
                          onChange={(event) => updateManualOrderItem(item.id, 'price', event.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor={`manual-addons-${item.id}`} className="text-xs font-semibold uppercase text-muted-foreground">Add-ons</label>
                        <Input
                          id={`manual-addons-${item.id}`}
                          value={item.addOns}
                          onChange={(event) => updateManualOrderItem(item.id, 'addOns', event.target.value)}
                          placeholder="Comma separated"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10"
                          onClick={() => removeManualOrderItem(item.id)}
                          aria-label="Remove meal"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {manualOrderError && <p className="text-sm text-destructive">{manualOrderError}</p>}

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                  <Button type="button" variant="outline" className="gap-2" onClick={addManualOrderItem}>
                    <Plus className="h-4 w-4" />
                    Add Meal
                  </Button>
                  <Button type="submit" disabled={isSavingManualOrder || manualOrderPayloadItems.length === 0}>
                    {isSavingManualOrder ? 'Creating...' : 'Create Order'}
                  </Button>
                </div>
              </form>
            </Card>

            {loading ? (
              <div className="text-center py-12">
                <ChefHat className="h-12 w-12 mx-auto text-primary animate-pulse" />
                <p className="mt-4 text-muted-foreground">{t('loading')}</p>
              </div>
            ) : orders.length === 0 && waiterCalls.length === 0 ? (
              <Card className="p-12 text-center">
                <ChefHat className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                <h2 className="text-xl font-semibold mb-2">{t('noOrdersYet')}</h2>
                <p className="text-muted-foreground">{t('ordersAppear')}</p>
              </Card>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {orders.map(order => {
                  const status = statusConfig[order.status];
                  const StatusIcon = status.icon;
                  const nextStatus = getNextStatus(order.status);
                  const orderNumber = getOrderNumber(order.id);
                  const deliveryOrder = isDeliveryOrder(order);
                  const savedExpectedTime = getExpectedDeliveryTime(order.notes);
                  const deliveryEta = order.id
                    ? deliveryEtaInputs[order.id] ?? savedExpectedTime
                    : savedExpectedTime;
                  const shouldSendToDelivery = deliveryOrder && order.status === 'new' && nextStatus === 'preparing';

                  return (
                    <Card key={order.id} className="p-5 animate-slide-up">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-bold text-2xl">
                              {deliveryOrder ? 'Delivery Order' : `${t('table')} ${order.tableNumber}`}
                            </span>
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                              Order #{orderNumber}
                            </Badge>
                            {deliveryOrder && (
                              <Badge className="bg-emerald-600 text-white">
                                Delivery
                              </Badge>
                            )}
                            <Badge className={status.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {t(getStatusLabelKey(order.status))}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{formatTime(order.timestamp)}</p>
                          {order.id && (
                            <p className="mt-1 text-xs text-muted-foreground break-all">Full ID: {order.id}</p>
                          )}
                        </div>
                        <span className="text-2xl font-bold text-primary">{formatMoney(order.totalPrice)}</span>
                      </div>

                      <div className="rounded-lg bg-muted/50 p-3 mb-3 space-y-2">
                        {order.items.map((item, idx) => (
                          <div key={`${item.name}-${idx}`} className="flex items-start justify-between gap-3 text-sm">
                            <div>
                              <p className="font-semibold text-foreground">
                                {item.quantity}x {item.name}
                              </p>
                              {item.addOns && item.addOns.length > 0 && (
                                <p className="text-xs text-muted-foreground">+ {item.addOns.join(', ')}</p>
                              )}
                            </div>
                            <span className="text-muted-foreground whitespace-nowrap">{formatMoney(item.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>

                      {order.notes && (
                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 mb-3">
                          <p className="text-xs font-semibold uppercase text-primary">{t('orderNotes')}</p>
                          <p className="whitespace-pre-line text-sm text-foreground mt-1">{order.notes}</p>
                        </div>
                      )}

                      {shouldSendToDelivery && order.id && (
                        <div className="mb-3 space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                          <label htmlFor={`delivery-eta-${order.id}`} className="text-xs font-semibold uppercase text-emerald-700">
                            Expected delivery time
                          </label>
                          <Input
                            id={`delivery-eta-${order.id}`}
                            value={deliveryEta}
                            onChange={(event) => setDeliveryEtaInputs(prev => ({
                              ...prev,
                              [order.id as string]: event.target.value,
                            }))}
                            placeholder="Example: 30 minutes or 1:30 PM"
                            className="bg-white"
                          />
                          <p className="text-xs text-emerald-700">
                            This time, the order status link, and the Google Maps location will be sent to the driver.
                          </p>
                        </div>
                      )}

                      {nextStatus ? (
                        <Button
                          className="w-full h-12 text-base"
                          variant={order.status === 'new' ? 'default' : 'outline'}
                          onClick={() => advanceOrderStatus(order, nextStatus, deliveryEta)}
                          disabled={shouldSendToDelivery && !deliveryEta.trim()}
                        >
                          {shouldSendToDelivery
                            ? 'Accept & Send to Delivery'
                            : `${t('markAs')} ${t(getStatusLabelKey(nextStatus))}`}
                        </Button>
                      ) : (
                        <div className="rounded-lg bg-success/10 p-3 text-center text-sm font-semibold text-success">
                          {t('served')}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="feedback" className="space-y-4">
            {feedbackItems.length === 0 ? (
              <Card className="p-12 text-center">
                <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                <h2 className="text-xl font-semibold mb-2">No feedback yet</h2>
                <p className="text-muted-foreground">Customer comments will appear here in real time.</p>
              </Card>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {feedbackItems.map(item => (
                  <Card key={item.id} className="p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-xl">{t('table')} {item.tableNumber}</span>
                          <Badge className="bg-primary text-primary-foreground">
                            {item.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{formatTime(item.timestamp)}</p>
                      </div>
                      <MessageCircle className="h-6 w-6 text-primary shrink-0" />
                    </div>
                    <p className="rounded-lg bg-muted/50 p-3 text-sm leading-6 text-foreground whitespace-pre-wrap">
                      {item.message}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="prep" className="space-y-5">
            <Card className="border-emerald-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 mb-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-7 w-7 text-emerald-700" />
                  <div>
                    <h2 className="text-xl font-bold">{t('cookingRequirements')}</h2>
                    <p className="text-sm text-muted-foreground">{t('kitchenChecks')}</p>
                  </div>
                </div>
                <Badge className="bg-emerald-700 text-white">{cookingRequirements.length} {t('item')}</Badge>
              </div>

              <div className="space-y-6">
                {requirementGroups.map(group => {
                  const groupItems = cookingRequirements.filter(item => item.group === group.id);

                  return (
                    <section key={group.id}>
                      <h3 className="mb-3 text-lg font-bold text-emerald-950">
                        {group.label[language]}
                      </h3>
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {groupItems.map(item => {
                          const state = getRequirementState(item);
                          const statusStyle = requirementStatusConfig[state.status];

                          return (
                            <Card key={item.id} className="border-emerald-100 p-4 shadow-sm">
                              <div className="flex items-start justify-between gap-3 mb-4">
                                <div className="flex items-center gap-3">
                                  <span className="text-5xl leading-none" aria-hidden="true">{item.icon}</span>
                                  <div>
                                    <h4 className="text-lg font-bold">{item.name[language]}</h4>
                                    <p className="text-sm text-muted-foreground">{item.hint[language]}</p>
                                  </div>
                                </div>
                                <Badge className={statusStyle.className}>
                                  {state.status === 'ready'
                                    ? t('ready')
                                    : state.status === 'prep'
                                      ? t('needPrep')
                                      : state.status === 'low'
                                        ? t('low')
                                        : t('out')}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-[1fr_auto] gap-3 mb-4">
                                <div className="rounded-lg bg-emerald-50 p-3">
                                  <p className="text-xs font-semibold uppercase text-emerald-700">{t('qty')}</p>
                                  <div className="mt-1 flex items-end gap-2">
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.5"
                                      value={state.quantity}
                                      onChange={(event) => updateRequirementQuantity(item, Number.parseFloat(event.target.value) || 0)}
                                      className="h-11 text-lg font-bold"
                                    />
                                    <span className="pb-2 text-sm font-semibold text-muted-foreground">{item.unit}</span>
                                  </div>
                                  <p className="mt-1 text-xs text-muted-foreground">{t('par')}: {item.par} {item.unit}</p>
                                </div>
                                <div className="grid gap-2">
                                  <Button className="h-11 px-4" variant="outline" onClick={() => bumpRequirementQuantity(item, 1)}>
                                    +1
                                  </Button>
                                  <Button className="h-11 px-4" variant="outline" onClick={() => bumpRequirementQuantity(item, -1)}>
                                    -1
                                  </Button>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  className="h-12"
                                  variant={state.status === 'ready' ? 'default' : 'outline'}
                                  onClick={() => updateRequirementStatus(item, 'ready')}
                                >
                                  {t('ready')}
                                </Button>
                                <Button
                                  className="h-12"
                                  variant={state.status === 'prep' ? 'default' : 'outline'}
                                  onClick={() => updateRequirementStatus(item, 'prep')}
                                >
                                  {t('needPrep')}
                                </Button>
                                <Button
                                  className="h-12"
                                  variant={state.status === 'low' ? 'destructive' : 'outline'}
                                  onClick={() => updateRequirementStatus(item, 'low')}
                                >
                                  {t('low')}
                                </Button>
                                <Button
                                  className="h-12"
                                  variant={state.status === 'out' ? 'destructive' : 'outline'}
                                  onClick={() => updateRequirementStatus(item, 'out')}
                                >
                                  {t('out')}
                                </Button>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </Card>

            <Card className="border-emerald-200 bg-white p-5">
              <div className="flex items-center gap-3 mb-4">
                <Package className="h-6 w-6 text-emerald-700" />
                <div>
                  <h2 className="text-xl font-bold">{t('neededFromOrders')}</h2>
                  <p className="text-sm text-muted-foreground">Simple quantity view from orders that are not served yet.</p>
                </div>
              </div>
              {kitchenNeeds.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('noActiveRequirements')}</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {kitchenNeeds.map(([name, quantity]) => (
                    <div key={name} className="rounded-lg border border-border bg-card p-4">
                      <p className="text-sm text-muted-foreground">{t('item')}</p>
                      <p className="text-lg font-bold text-foreground">{name}</p>
                      <p className="text-3xl font-bold text-emerald-700 mt-2">{quantity}x</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="accounting" className="space-y-5">
            {!isSuperAdmin ? (
              <Card className="max-w-md p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <LockKeyhole className="h-8 w-8 text-primary" />
                  <div>
                    <h2 className="text-xl font-bold">{t('superAdminOnly')}</h2>
                    <p className="text-sm text-muted-foreground">{t('unlockAccounting')}</p>
                  </div>
                </div>
                <form onSubmit={handleSuperLogin} className="space-y-3">
                  <Input
                    type="password"
                    placeholder={t('superAdminPassword')}
                    value={superPassword}
                    onChange={(event) => setSuperPassword(event.target.value)}
                    className={superError ? 'border-destructive' : ''}
                  />
                  {superError && <p className="text-sm text-destructive">{superError}</p>}
                  <Button type="submit" className="w-full">
                    {t('unlockAccounting')}
                  </Button>
                </form>
              </Card>
            ) : (
              <>
                {/* Statement header */}
                <div className="rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5 text-white">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">ACCOUNTING</p>
                  <h1 className="text-2xl font-bold">Accounting Statement</h1>
                  <p className="text-sm text-slate-300 mt-1">Review income and outcome, calculate net result for Al Fanar Restaurant</p>
                </div>

                {/* Metadata row */}
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full bg-muted px-3 py-1 font-medium">Al Fanar Restaurant</span>
                  <span className="rounded-full bg-muted px-3 py-1 font-medium">{accountingPeriod}</span>
                  <span className="rounded-full bg-muted px-3 py-1 font-medium">Currency: QAR</span>
                  <span className={`rounded-full px-3 py-1 font-medium ${accounting.netMargin >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    Net Margin: {accounting.netMargin.toFixed(1)}%
                  </span>
                </div>

                {/* 4 KPI cards */}
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Card className="p-4 border-l-4 border-l-emerald-500 bg-white shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Total Income</p>
                    <p className="text-2xl font-bold text-emerald-700">{formatMoney(totalRevenue)}</p>
                    <p className="text-xs text-muted-foreground mt-1">All orders revenue</p>
                  </Card>
                  <Card className="p-4 border-l-4 border-l-red-500 bg-white shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Total Outcome</p>
                    <p className="text-2xl font-bold text-red-600">{formatMoney(accounting.totalSpending)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Expenses + waste</p>
                  </Card>
                  <Card className={`p-4 border-l-4 bg-white shadow-sm ${accounting.net >= 0 ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Net Result</p>
                    <p className={`text-2xl font-bold ${accounting.net >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{formatMoney(accounting.net)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{accounting.net >= 0 ? 'Profit' : 'Loss'}</p>
                  </Card>
                  <Card className="p-4 border-l-4 border-l-slate-400 bg-white shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Net Margin</p>
                    <p className="text-2xl font-bold">{accounting.netMargin.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground mt-1">Income efficiency</p>
                  </Card>
                </div>

                {/* Income and Outcome card */}
                <Card className="p-5 bg-white shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-lg font-bold">Income And Outcome</h2>
                      <p className="text-sm text-muted-foreground">Compare money coming in with money going out</p>
                    </div>
                    <span className={`rounded-full px-4 py-1.5 text-sm font-bold ${accounting.net >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {formatMoney(accounting.net)}
                    </span>
                  </div>

                  {/* Income bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm font-medium mb-1.5">
                      <span className="text-emerald-700">Income</span>
                      <span className="text-emerald-700 font-bold">{formatMoney(totalRevenue)}</span>
                    </div>
                    <div className="h-4 w-full rounded-full bg-emerald-500" />
                  </div>

                  {/* Outcome bar */}
                  <div className="mb-6">
                    <div className="flex justify-between text-sm font-medium mb-1.5">
                      <span className="text-red-600">Outcome</span>
                      <span className="text-red-600 font-bold">{formatMoney(accounting.totalSpending)}</span>
                    </div>
                    <div className="h-4 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-red-500 transition-all"
                        style={{ width: totalRevenue > 0 ? `${Math.min((accounting.totalSpending / totalRevenue) * 100, 100)}%` : '0%' }}
                      />
                    </div>
                  </div>

                  {/* Category breakdown */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Category Breakdown</p>
                    {Object.entries(accounting.categoryTotals).length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t('noSpendingYet')}</p>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(accounting.categoryTotals)
                          .sort((a, b) => b[1] - a[1])
                          .map(([cat, amt]) => (
                            <div key={cat} className="grid grid-cols-[120px_1fr_100px] items-center gap-3">
                              <span className="text-sm font-medium truncate">{cat}</span>
                              <div className="flex gap-2">
                                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                  <div className="h-full rounded-full bg-emerald-400" style={{ width: '2%' }} />
                                </div>
                                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-red-400 transition-all"
                                    style={{ width: accounting.totalSpending > 0 ? `${(amt / accounting.totalSpending) * 100}%` : '0%' }}
                                  />
                                </div>
                              </div>
                              <span className="text-sm text-muted-foreground text-right font-semibold">{formatMoney(amt)}</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </Card>

                {/* Stats row */}
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-500 mb-1">Avg Order</p>
                    <p className="text-xl font-bold text-blue-800">{formatMoney(accounting.averageOrder)}</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 border border-amber-100 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-500 mb-1">Pending Collection</p>
                    <p className="text-xl font-bold text-amber-800">{formatMoney(accounting.pendingRevenue)}</p>
                  </div>
                  <div className="rounded-lg bg-purple-50 border border-purple-100 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-purple-500 mb-1">Top Item</p>
                    <p className="text-lg font-bold text-purple-800 truncate">
                      {accounting.topItem ? `${accounting.topItem[0]} (${accounting.topItem[1]}x)` : '—'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Cash Collected</p>
                    <p className="text-xl font-bold text-slate-800">{formatMoney(accounting.servedRevenue)}</p>
                  </div>
                </div>

                {/* Add Expense + Recent Expenses */}
                <div className="grid gap-5 xl:grid-cols-[1fr_1.5fr]">
                  <Card className="p-5 bg-white shadow-sm">
                    <h2 className="text-xl font-bold mb-4">{t('addSpending')}</h2>
                    <form onSubmit={handleAddExpense} className="space-y-3">
                      <Input
                        placeholder={t('expenseTitle')}
                        value={expenseForm.title}
                        onChange={(event) => setExpenseForm(prev => ({ ...prev, title: event.target.value }))}
                      />
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={expenseForm.category}
                        onChange={(event) => setExpenseForm(prev => ({ ...prev, category: event.target.value }))}
                      >
                        {expenseCategories.map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={t('amountQar')}
                        value={expenseForm.amount}
                        onChange={(event) => setExpenseForm(prev => ({ ...prev, amount: event.target.value }))}
                      />
                      <Textarea
                        placeholder={t('notes')}
                        rows={3}
                        value={expenseForm.notes}
                        onChange={(event) => setExpenseForm(prev => ({ ...prev, notes: event.target.value }))}
                      />
                      {superError && <p className="text-sm text-destructive">{superError}</p>}
                      <Button type="submit" className="w-full h-12" disabled={isSavingExpense}>
                        {isSavingExpense ? t('saving') : t('saveSpending')}
                      </Button>
                    </form>
                  </Card>

                  <Card className="p-5 bg-white shadow-sm">
                    <h2 className="text-xl font-bold mb-4">{t('recentManualSpending')}</h2>
                    <div className="space-y-2">
                      {expenses.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('noManualExpenses')}</p>
                      ) : (
                        expenses.slice(0, 8).map(expense => (
                          <div key={expense.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate">{expense.title}</p>
                              <p className="text-xs text-muted-foreground">{expense.category} · {formatTime(expense.createdAt)}</p>
                            </div>
                            <span className="font-bold text-red-500 shrink-0 ml-3">-{formatMoney(expense.amount)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
