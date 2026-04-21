import { Link, useLocation } from 'react-router-dom'
import { Package, Trash2, CalendarDays, HelpCircle, Star, ChefHat } from 'lucide-react'

const links = [
  { to: '/admin', label: 'Orders', icon: ChefHat },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/waste-report', label: 'Waste', icon: Trash2 },
  { to: '/reservations', label: 'Reservations', icon: CalendarDays },
  { to: '/faqs', label: 'FAQs', icon: HelpCircle },
  { to: '/reviews', label: 'Reviews', icon: Star },
]

export function ManagerNav() {
  const { pathname } = useLocation()

  return (
    <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 shadow-sm">
      <div className="container py-3">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {links.map(link => {
            const active = pathname === link.to
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            )
          })}
        </div>
      </div>
    </header>
  )
}
