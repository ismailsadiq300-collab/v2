import { Languages } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export function LanguageSelector() {
  const { language, setLanguage, t } = useI18n();

  return (
    <div className="fixed bottom-6 left-6 z-50 rounded-lg border border-border bg-card/95 p-2 shadow-lg backdrop-blur-sm">
      <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Languages className="h-4 w-4 text-primary" />
        <span>{t('language')}</span>
      </label>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value === 'ar' ? 'ar' : 'en')}
        className="mt-1 h-9 rounded-md border border-input bg-background px-2 text-sm font-medium text-foreground"
      >
        <option value="en">{t('english')}</option>
        <option value="ar">{t('arabic')}</option>
      </select>
    </div>
  );
}
