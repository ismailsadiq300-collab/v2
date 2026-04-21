import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { sendTelegramAlert } from '@/lib/sendTelegramAlert'
import { ArrowLeft, CalendarDays, Check } from 'lucide-react'
import restaurantLogo from '@/assets/restaurant-logo.png'

export default function Reservation() {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    name: '',
    guests: '',
    date: '',
    time: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.guests || !form.date || !form.time) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' })
      return
    }

    setIsSubmitting(true)
    try {
      // Save to database
      const { error } = await supabase.from('reservations').insert({
        name: form.name,
        guests: parseInt(form.guests),
        date: form.date,
        time: form.time,
        notes: form.notes || null,
      })

      if (error) throw error

      // Send Telegram alert
      const message = `📅 New Reservation!\n👤 Name: ${form.name}\n👥 Guests: ${form.guests}\n📆 Date: ${form.date}\n🕐 Time: ${form.time}${form.notes ? `\n📝 Notes: ${form.notes}` : ''}`
      try {
        await sendTelegramAlert(message)
      } catch (e) {
        console.error('Telegram alert failed:', e)
      }

      setSubmitted(true)
      toast({ title: 'Reservation submitted! ✅', description: 'We will confirm shortly.' })
    } catch (error) {
      console.error(error)
      toast({ title: 'Error sending reservation', description: 'Please try again.', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Reservation Sent!</h2>
          <p className="text-muted-foreground">We've received your reservation for <strong>{form.guests} guests</strong> on <strong>{form.date}</strong> at <strong>{form.time}</strong>.</p>
          <Button onClick={() => { setSubmitted(false); setForm({ name: '', guests: '', date: '', time: '', notes: '' }) }}>
            Make Another Reservation
          </Button>
          <div>
            <Link to="/" className="text-sm text-primary underline">Back to Menu</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-8">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 shadow-sm">
        <div className="container py-4 flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <img src={restaurantLogo} alt="Al Fanar" className="w-10 h-10 rounded-full" />
          <h1 className="font-bold text-lg text-foreground">Table Reservation</h1>
        </div>
      </header>

      <main className="container max-w-md mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-6">
          <CalendarDays className="w-8 h-8 text-primary" />
          <div>
            <h2 className="text-xl font-bold text-foreground">Reserve a Table</h2>
            <p className="text-sm text-muted-foreground">Fill in the details below</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Your Name *</Label>
            <Input id="name" placeholder="Enter your name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guests">Number of Guests *</Label>
            <Input id="guests" type="number" min="1" max="20" placeholder="e.g. 4" value={form.guests} onChange={e => setForm(f => ({ ...f, guests: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <Input id="date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">Time *</Label>
            <Input id="time" type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any special requests?" rows={2} />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Submit Reservation'}
          </Button>
        </form>
      </main>
    </div>
  )
}
