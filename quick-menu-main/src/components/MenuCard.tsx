import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { MenuItem, AddOn } from '@/types/menu';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

interface MenuCardProps {
  item: MenuItem;
  onAdd: (item: MenuItem, selectedAddOns?: AddOn[]) => void;
}

export function MenuCard({ item, onAdd }: MenuCardProps) {
  const [selectedAddOns, setSelectedAddOns] = useState<AddOn[]>([]);
  const [showExtras, setShowExtras] = useState(false);

  const toggleAddOn = (addOn: AddOn) => {
    setSelectedAddOns(prev => 
      prev.find(a => a.id === addOn.id)
        ? prev.filter(a => a.id !== addOn.id)
        : [...prev, addOn]
    );
  };

  const handleAdd = () => {
    onAdd(item, selectedAddOns.length > 0 ? selectedAddOns : undefined);
    setSelectedAddOns([]);
    setShowExtras(false);
  };

  const extrasTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0);

  return (
    <Card className="glass-card animate-slide-up overflow-hidden transition-all duration-200 hover:border-primary/30 hover:shadow-md flex flex-col h-full group">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img 
          src={item.image} 
          alt={item.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute bottom-2 right-2 rounded-lg bg-card/95 px-2.5 py-1 text-sm font-bold text-primary shadow-sm">
          {item.price} QAR
        </div>
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-1">{item.name}</h3>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 flex-1">{item.description}</p>

        {/* Extras toggle */}
        {item.addOns && item.addOns.length > 0 && (
          <button 
            onClick={() => setShowExtras(!showExtras)}
            className="mt-2 flex items-center justify-between text-xs font-medium text-primary hover:text-accent transition-colors py-1.5 border-t border-border/50"
          >
            <span>🍟 Extras ({item.addOns.length})</span>
            {showExtras ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}

        {/* Extras list */}
        {showExtras && item.addOns && (
          <div className="mt-1 space-y-1.5 animate-slide-up">
            {item.addOns.map(addOn => (
              <label 
                key={addOn.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-secondary/60 cursor-pointer hover:bg-secondary transition-colors"
              >
                <Checkbox 
                  checked={selectedAddOns.some(a => a.id === addOn.id)}
                  onCheckedChange={() => toggleAddOn(addOn)}
                  className="h-4 w-4"
                />
                <span className="flex-1 text-xs font-medium text-foreground truncate">{addOn.name}</span>
                <span className="text-xs text-primary font-semibold">+{addOn.price}</span>
              </label>
            ))}
            {extrasTotal > 0 && (
              <p className="text-right text-xs text-muted-foreground">
                Extras: <span className="font-semibold text-primary">+{extrasTotal} QAR</span>
              </p>
            )}
          </div>
        )}

        {/* Add button */}
        <Button 
          onClick={handleAdd}
          size="sm"
          className="mt-3 w-full gap-1.5 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          Add to Cart
        </Button>
      </div>
    </Card>
  );
}
