import { Link, useLocation } from 'react-router-dom'
import { Minus, Trash2, ArrowLeft } from 'lucide-react'

const links = [
  { to: '/stock-update', label: 'Stock Update', icon: Minus },
  { to: '/waste', label: 'Log Waste', icon: Trash2 },
]

export function StaffNav() {
  const { pathname } = useLocation()

  return (
    <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 shadow-sm">
      <div className="container py-3">
        <div className="flex items-center gap-2">
          <Link to="/" className="text-muted-foreground hover:text-foreground mr-2">
            <ArrowLeft className="w-5 h-5" />
          </Link>
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
