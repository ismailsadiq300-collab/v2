import { CheckCircle2, ChefHat, Clock, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Order } from '@/types/menu';
import { useI18n } from '@/lib/i18n';

interface OrderSuccessProps {
  tableNumber: number;
  status: Order['status'];
  onNewOrder: () => void;
}

export function OrderSuccess({ tableNumber, status, onNewOrder }: OrderSuccessProps) {
  const { t } = useI18n();
  const steps: {
    status: Order['status'];
    label: string;
    description: string;
    icon: typeof Clock;
  }[] = [
    {
      status: 'new',
      label: t('received'),
      description: t('receivedDescription'),
      icon: Clock,
    },
    {
      status: 'preparing',
      label: t('preparing'),
      description: t('preparingDescription'),
      icon: ChefHat,
    },
    {
      status: 'ready',
      label: t('ready'),
      description: t('readyDescription'),
      icon: CheckCircle2,
    },
    {
      status: 'served',
      label: t('served'),
      description: t('servedDescription'),
      icon: Utensils,
    },
  ];
  const currentStepIndex = Math.max(steps.findIndex((step) => step.status === status), 0);
  const currentStep = steps[currentStepIndex];

  return (
    <Card className="p-6 md:p-8 text-center animate-slide-up max-w-2xl mx-auto">
      <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-success/10 flex items-center justify-center">
        <CheckCircle2 className="h-10 w-10 text-success" />
      </div>
      <h2 className="text-2xl font-bold mb-2">{t('orderPlaced')}</h2>
      <p className="text-muted-foreground mb-1">{t('sentToKitchen')}</p>
      <p className="text-muted-foreground mb-5">
        {t('bringToTable')} <span className="font-semibold text-foreground">{t('table')} {tableNumber}</span>
      </p>

      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 mb-5 text-left">
        <p className="text-xs font-semibold uppercase text-primary mb-1">{t('currentStatus')}</p>
        <p className="text-xl font-bold text-foreground">{currentStep.label}</p>
        <p className="text-sm text-muted-foreground">{currentStep.description}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isComplete = index <= currentStepIndex;
          const isActive = index === currentStepIndex;

          return (
            <div
              key={step.status}
              className={`rounded-lg border p-3 text-left transition-colors ${
                isComplete
                  ? 'border-primary/30 bg-primary/10 text-foreground'
                  : 'border-border bg-card text-muted-foreground'
              }`}
            >
              <StepIcon className={`h-5 w-5 mb-2 ${isComplete ? 'text-primary' : 'text-muted-foreground'}`} />
              <p className="text-sm font-semibold">{step.label}</p>
              {isActive && <p className="text-xs text-primary mt-1">{t('now')}</p>}
            </div>
          );
        })}
      </div>

      <p className="text-sm text-muted-foreground mb-4">{t('cashOnDelivery')}</p>
      <Button onClick={onNewOrder} variant="outline">
        {t('anotherOrder')}
      </Button>
    </Card>
  );
}
