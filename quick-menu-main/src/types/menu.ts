export interface AddOn {
  id: string;
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  addOns?: AddOn[];
}

export interface CartItem extends MenuItem {
  quantity: number;
  selectedAddOns?: AddOn[];
}

export interface Order {
  id?: string;
  tableNumber: number;
  items: {
    name: string;
    quantity: number;
    price: number;
    addOns?: string[];
  }[];
  totalPrice: number;
  notes?: string | null;
  status: 'new' | 'preparing' | 'ready' | 'served';
  timestamp: Date;
}
