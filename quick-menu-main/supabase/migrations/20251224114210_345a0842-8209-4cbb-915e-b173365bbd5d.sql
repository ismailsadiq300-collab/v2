-- Create waiter_calls table to track when tables call for assistance
CREATE TABLE public.waiter_calls (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    table_number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.waiter_calls ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert a waiter call (customers don't need to be authenticated)
CREATE POLICY "Anyone can create waiter calls" 
ON public.waiter_calls 
FOR INSERT 
WITH CHECK (true);

-- Allow anyone to read waiter calls (for the admin/staff view)
CREATE POLICY "Anyone can view waiter calls" 
ON public.waiter_calls 
FOR SELECT 
USING (true);

-- Allow anyone to update waiter calls (for staff to acknowledge/complete)
CREATE POLICY "Anyone can update waiter calls" 
ON public.waiter_calls 
FOR UPDATE 
USING (true);

-- Enable realtime for waiter_calls
ALTER PUBLICATION supabase_realtime ADD TABLE public.waiter_calls;