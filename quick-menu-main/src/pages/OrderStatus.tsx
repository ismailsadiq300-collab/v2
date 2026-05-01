import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Bike, ChefHat, Clock, MapPin, PackageCheck, ReceiptText, Utensils } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import type { Order } from '@/types/menu';
import { getExpectedDeliveryTime, getNoteValue, getOrderNumber, isDeliveryOrder } from '@/lib/orderDetails';
import { useToast } from '@/hooks/use-toast';

const isOrderStatus = (status: unknown): status is Order['status'] =>
  status === 'new' || status === 'preparing' || status === 'ready' || status === 'served';

const statusLabels: Record<Order['status'], { label: string; description: string; icon: typeof Clock }> = {
  new: {
    label: 'Received',
    description: 'Your order was received.',
    icon: Clock,
  },
  preparing: {
    label: 'Preparing',
    description: 'Your order is being prepared.',
    icon: ChefHat,
  },
  ready: {
    label: 'Ready',
    description: 'Your order is ready for delivery.',
    icon: PackageCheck,
  },
  served: {
    label: 'Completed',
    description: 'Your order has been completed.',
    icon: Utensils,
  },
};

export default function OrderStatus() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [status, setStatus] = useState<Order['status'] | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setIsLoading(false);
      return;
    }

    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('status, notes, created_at')
        .eq('id', orderId)
        .single();

      if (!error && data) {
        setStatus(isOrderStatus(data.status) ? data.status : 'new');
        setNotes(data.notes);
        setCreatedAt(data.created_at);
      }
      setIsLoading(false);
    };

    fetchOrder();

    const channel = supabase
      .channel(`order-status-page-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          if (isOrderStatus(payload.new.status)) {
            setStatus(payload.new.status);
          }
          setNotes(typeof payload.new.notes === 'string' ? payload.new.notes : null);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const orderNumber = getOrderNumber(orderId);
  const expectedTime = getExpectedDeliveryTime(notes);
  const mapsUrl = getNoteValue(notes, 'Google Maps');
  const address = getNoteValue(notes, 'Delivery address');
  const phone = getNoteValue(notes, 'Contact number');
  const statusInfo = status ? statusLabels[status] : null;
  const StatusIcon = statusInfo?.icon || Clock;
  const deliveryOrder = isDeliveryOrder({ notes });
  const isDriverView = searchParams.get('driver') === '1';
  const steps: Order['status'][] = ['new', 'preparing', 'ready', 'served'];
  const currentStepIndex = status ? steps.indexOf(status) : 0;
  const heroTitle = isDriverView ? 'Driver Order Page' : deliveryOrder ? 'Delivery Tracking' : 'Order Tracking';
  const readyCopy = deliveryOrder ? 'Your order is ready for the driver.' : 'Your order is ready.';
  const driverStatuses: Order['status'][] = ['preparing', 'ready', 'served'];

  const updateStatus = async (nextStatus: Order['status']) => {
    if (!orderId) return;

    setIsUpdating(true);
    const { error } = await supabase
      .from('orders')
      .update({ status: nextStatus })
      .eq('id', orderId);

    setIsUpdating(false);
    if (error) {
      toast({
        title: 'Could not update status',
        description: 'Please try again from the admin page.',
        variant: 'destructive',
      });
      return;
    }

    setStatus(nextStatus);
    toast({
      title: 'Status updated',
      description: `Order #${orderNumber} is now ${statusLabels[nextStatus].label}.`,
    });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.12),_transparent_34rem),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.55))] px-4 py-8">
      <Card className="mx-auto max-w-lg overflow-hidden border-primary/15 shadow-lg">
        {isLoading ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">Loading order status...</p>
          </div>
        ) : !statusInfo ? (
          <div className="p-8 text-center">
            <h1 className="mb-2 text-2xl font-bold">Order not found</h1>
            <p className="mb-5 text-sm text-muted-foreground">Please check the status link and try again.</p>
            <Link className="text-sm font-semibold text-primary underline" to="/">
              Back to menu
            </Link>
          </div>
        ) : (
          <>
            <div className="bg-primary px-6 py-5 text-primary-foreground">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold opacity-90">{heroTitle}</p>
                  <h1 className="mt-1 text-2xl font-bold">Order #{orderNumber}</h1>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-white/15">
                  {deliveryOrder ? <Bike className="h-8 w-8" /> : <ReceiptText className="h-8 w-8" />}
                </div>
              </div>
            </div>

            <div className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-lg bg-primary/10">
                <StatusIcon className="h-11 w-11 text-primary" />
              </div>
              <Badge className="mb-3 bg-primary text-primary-foreground">
                {statusInfo.label}
              </Badge>
              <h2 className="mb-2 text-3xl font-bold">
                {status === 'ready' ? readyCopy : statusInfo.description}
              </h2>
              <p className="mb-5 text-sm text-muted-foreground">
                This page only shows your live order status and expected time.
              </p>

              {expectedTime && (
                <div className="mb-5 rounded-lg border border-primary/20 bg-primary/5 p-4 text-left">
                  <p className="text-xs font-semibold uppercase text-primary">
                    {deliveryOrder ? 'Expected delivery time' : 'Expected time'}
                  </p>
                  <p className="mt-1 text-2xl font-bold">{expectedTime}</p>
                </div>
              )}

              {isDriverView && deliveryOrder && (
                <div className="mb-5 space-y-3 rounded-lg border border-primary/20 bg-card p-4 text-left">
                  <div>
                    <p className="text-xs font-semibold uppercase text-primary">Delivery details</p>
                    {address && <p className="mt-1 text-sm font-medium">{address}</p>}
                    {phone && <p className="mt-1 text-sm text-muted-foreground">Phone: {phone}</p>}
                  </div>
                  {mapsUrl && (
                    <Button asChild className="w-full gap-2">
                      <a href={mapsUrl} target="_blank" rel="noreferrer">
                        <MapPin className="h-4 w-4" />
                        Open customer location
                      </a>
                    </Button>
                  )}
                </div>
              )}

              <div className="mb-5 grid grid-cols-4 gap-2">
                {steps.map((step, index) => {
                  const isActive = index <= currentStepIndex;
                  const StepIcon = statusLabels[step].icon;
                  return (
                    <div key={step} className="text-center">
                      <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg border ${
                        isActive ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted text-muted-foreground'
                      }`}>
                        <StepIcon className="h-5 w-5" />
                      </div>
                      <p className={`text-[11px] font-semibold ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {statusLabels[step].label}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mb-5 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
                />
              </div>

              <Badge variant="outline" className="mb-4">
                Live status updates
              </Badge>
              {isDriverView && deliveryOrder && (
                <div className="mb-5 grid gap-2 sm:grid-cols-3">
                  {driverStatuses.map((nextStatus) => (
                    <Button
                      key={nextStatus}
                      type="button"
                      variant={status === nextStatus ? 'default' : 'outline'}
                      disabled={isUpdating}
                      onClick={() => updateStatus(nextStatus)}
                      className="h-11"
                    >
                      {statusLabels[nextStatus].label}
                    </Button>
                  ))}
                </div>
              )}
              {createdAt && (
                <p className="text-xs text-muted-foreground">
                  Ordered at {new Date(createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
