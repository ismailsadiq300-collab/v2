
-- Inventory items table
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pcs',
  minimum_threshold NUMERIC NOT NULL DEFAULT 0,
  current_stock NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view inventory" ON public.inventory_items FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert inventory" ON public.inventory_items FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update inventory" ON public.inventory_items FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete inventory" ON public.inventory_items FOR DELETE TO public USING (true);

-- Stock logs table
CREATE TABLE public.stock_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity_used NUMERIC NOT NULL,
  logged_by TEXT NOT NULL DEFAULT 'staff',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view stock logs" ON public.stock_logs FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert stock logs" ON public.stock_logs FOR INSERT TO public WITH CHECK (true);

-- Waste logs table
CREATE TABLE public.waste_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pcs',
  cost_per_unit NUMERIC NOT NULL DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.waste_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view waste logs" ON public.waste_logs FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert waste logs" ON public.waste_logs FOR INSERT TO public WITH CHECK (true);

-- Reservations table
CREATE TABLE public.reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  guests INTEGER NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view reservations" ON public.reservations FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert reservations" ON public.reservations FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update reservations" ON public.reservations FOR UPDATE TO public USING (true);

-- FAQs table
CREATE TABLE public.faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view faqs" ON public.faqs FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert faqs" ON public.faqs FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update faqs" ON public.faqs FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete faqs" ON public.faqs FOR DELETE TO public USING (true);
