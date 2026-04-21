import { Minus, Plus, ShoppingBag, Apple, Banknote } from 'lucide-react';
import { CartItem, AddOn } from '@/types/menu';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/lib/i18n';

interface CartProps {
  items: CartItem[];
  totalPrice: number;
  orderNotes: string;
  onAdd: (item: CartItem) => void;
  onRemove: (itemId: string, addOnKey?: string) => void;
  onOrderNotesChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const getAddOnKey = (addOns?: AddOn[]) => 
  addOns?.map(a => a.id).sort().join(',') || '';

export function Cart({
  items,
  totalPrice,
  orderNotes,
  onAdd,
  onRemove,
  onOrderNotesChange,
  onSubmit,
  isSubmitting,
}: CartProps) {
  const { t } = useI18n();

  if (items.length === 0) {
    return (
      <Card className="glass-card p-6 text-center">
        <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
        <p className="text-lg font-semibold text-foreground mb-1">{t('cartEmpty')}</p>
        <p className="text-sm text-muted-foreground">{t('addItems')}</p>
      </Card>
    );
  }

  return (
    <Card className="glass-card p-5 space-y-4">
      <h2 className="font-bold text-xl flex items-center gap-2">
        <ShoppingBag className="h-6 w-6 text-primary" />
        {t('yourOrder')}
      </h2>
      
      <div className="space-y-3">
        {items.map(item => {
          const addOnKey = getAddOnKey(item.selectedAddOns);
          return (
            <div key={`${item.id}-${addOnKey}`} className="flex items-center gap-3 rounded-lg bg-secondary/60 p-3">
              <img 
                src={item.image} 
                alt={item.name}
                className="w-14 h-14 rounded-lg object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{item.name}</p>
                {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                  <p className="text-xs text-muted-foreground truncate">
                    + {item.selectedAddOns.map(a => a.name).join(', ')}
                  </p>
                )}
                <p className="text-sm font-bold text-primary mt-0.5">{item.price} QAR</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => onRemove(item.id, addOnKey)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-6 text-center font-bold">{item.quantity}</span>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => onAdd(item)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-4 border-t border-border/50">
        <div className="mb-5 space-y-2">
          <label htmlFor="order-notes" className="text-sm font-semibold text-foreground">
            {t('orderNotes')}
          </label>
          <Textarea
            id="order-notes"
            value={orderNotes}
            onChange={(event) => onOrderNotesChange(event.target.value)}
            placeholder={t('orderNotesPlaceholder')}
            rows={3}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            {t('optionalOrderNotes')}
          </p>
        </div>

        <div className="flex justify-between items-center mb-5">
          <span className="text-lg font-semibold text-foreground">{t('total')}</span>
          <span className="text-2xl font-bold text-primary">{totalPrice} QAR</span>
        </div>

        <div className="space-y-3">
          <Button 
            className="w-full h-12 text-base gap-2" 
            size="lg"
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            <Banknote className="h-5 w-5" />
            {isSubmitting ? t('placingOrder') : t('payCash')}
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full h-11 gap-2 opacity-50 cursor-not-allowed" 
            size="lg"
            disabled
          >
            <Apple className="h-5 w-5" />
            {t('applePaySoon')}
          </Button>
        </div>
      </div>
    </Card>
  );
}
