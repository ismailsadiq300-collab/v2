import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ManagerNav } from '@/components/ManagerNav'
import { CalendarDays, Check, X, Clock } from 'lucide-react'

interface Reservation {
  id: string
  name: string
  guests: number
  date: string
  time: string
  status: string
  notes: string | null
  created_at: string
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default function Reservations() {
  const { toast } = useToast()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState('')

  const fetchReservations = useCallback(async () => {
    let q = supabase.from('reservations').select('*').order('date', { ascending: true }).order('time', { ascending: true })
    if (dateFilter) q = q.eq('date', dateFilter)
    const { data } = await q
    if (data) setReservations(data as unknown as Reservation[])
    setLoading(false)
  }, [dateFilter])

  useEffect(() => { fetchReservations() }, [fetchReservations])

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('reservations').update({ status }).eq('id', id)
    if (error) { toast({ title: 'Error updating', variant: 'destructive' }); return }
    toast({ title: `Reservation ${status} ✅` })
    fetchReservations()
  }

  return (
    <div className="min-h-screen pb-8">
      <ManagerNav />
      <main className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CalendarDays className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Reservations</h1>
            <Badge variant="outline">{reservations.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-44" />
            {dateFilter && <Button variant="ghost" size="sm" onClick={() => setDateFilter('')}>Clear</Button>}
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : reservations.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">No reservations found</Card>
        ) : (
          <div className="space-y-3">
            {reservations.map(r => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{r.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[r.status] || 'bg-muted text-muted-foreground'}`}>
                        {r.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>👥 {r.guests} guests</span>
                      <span>📆 {r.date}</span>
                      <span>🕐 {r.time}</span>
                    </div>
                    {r.notes && <p className="text-xs text-muted-foreground mt-1">📝 {r.notes}</p>}
                  </div>
                  <div className="flex gap-2">
                    {r.status === 'pending' && (
                      <>
                        <Button size="sm" onClick={() => updateStatus(r.id, 'confirmed')}>
                          <Check className="w-4 h-4 mr-1" /> Confirm
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'cancelled')}>
                          <X className="w-4 h-4 mr-1" /> Cancel
                        </Button>
                      </>
                    )}
                    {r.status === 'confirmed' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'cancelled')}>
                        <X className="w-4 h-4 mr-1" /> Cancel
                      </Button>
                    )}
                    {r.status === 'cancelled' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'pending')}>
                        <Clock className="w-4 h-4 mr-1" /> Reopen
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
