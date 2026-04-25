-- Orders table for customer menu submissions and kitchen status updates
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_number INTEGER NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_price NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'preparing', 'ready', 'served')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create orders"
ON public.orders
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view orders"
ON public.orders
FOR SELECT
USING (true);

CREATE POLICY "Anyone can update orders"
ON public.orders
FOR UPDATE
USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
