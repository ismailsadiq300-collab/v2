import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import Menu from "./pages/Menu";
import { ChatWidget } from "./components/ChatWidget";
import { LanguageSelector } from "./components/LanguageSelector";
import { I18nProvider, useI18n } from "./lib/i18n";

const Admin = lazy(() => import("./pages/Admin"));
const TableQRCodes = lazy(() => import("./pages/TableQRCodes"));
const Reservation = lazy(() => import("./pages/Reservation"));
const Inventory = lazy(() => import("./pages/Inventory"));
const StockUpdate = lazy(() => import("./pages/StockUpdate"));
const Waste = lazy(() => import("./pages/Waste"));
const WasteReport = lazy(() => import("./pages/WasteReport"));
const Reservations = lazy(() => import("./pages/Reservations"));
const FAQs = lazy(() => import("./pages/FAQs"));
const Reviews = lazy(() => import("./pages/Reviews"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { t } = useI18n();

  return (
    <BrowserRouter>
      <Suspense fallback={<div className="container py-8 text-sm text-muted-foreground">{t('loading')}</div>}>
        <Routes>
          <Route path="/" element={<Menu />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/qr-codes" element={<TableQRCodes />} />
          <Route path="/reservation" element={<Reservation />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/stock-update" element={<StockUpdate />} />
          <Route path="/waste" element={<Waste />} />
          <Route path="/waste-report" element={<WasteReport />} />
          <Route path="/reservations" element={<Reservations />} />
          <Route path="/faqs" element={<FAQs />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <ChatWidget />
      <LanguageSelector />
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <I18nProvider>
        <Toaster />
        <Sonner />
        <AppRoutes />
      </I18nProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
