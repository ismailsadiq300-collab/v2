import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { StaffNav } from '@/components/StaffNav'
import { Trash2, CheckCircle2 } from 'lucide-react'

export default function Waste() {
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    item_name: '',
    quantity: '',
    unit: 'kg',
    cost_per_unit: '',
    reason: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.item_name || !form.quantity) {
      toast({ title: 'Please fill required fields', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.from('waste_logs').insert({
        item_name: form.item_name,
        quantity: parseFloat(form.quantity),
        unit: form.unit,
        cost_per_unit: parseFloat(form.cost_per_unit) || 0,
        reason: form.reason || null,
      })

      if (error) throw error

      setSuccess(true)
      toast({ title: 'Waste logged ✅' })
      setForm({ item_name: '', quantity: '', unit: 'kg', cost_per_unit: '', reason: '' })
      setTimeout(() => setSuccess(false), 2000)
    } catch {
      toast({ title: 'Error logging waste', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen pb-8">
      <StaffNav />
      <main className="container max-w-md mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-6">
          <Trash2 className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Log Waste</h1>
            <p className="text-sm text-muted-foreground">Record wasted food items</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Item Name *</Label>
            <Input value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} placeholder="e.g. Rice, Chicken" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input type="number" min="0.1" step="0.1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="kg, pcs" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Cost per Unit (QAR)</Label>
            <Input type="number" min="0" step="0.5" value={form.cost_per_unit} onChange={e => setForm(f => ({ ...f, cost_per_unit: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="e.g. Expired, overcooked, dropped" rows={3} />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {success ? <><CheckCircle2 className="w-4 h-4 mr-1" /> Logged!</> : submitting ? 'Logging...' : 'Log Waste'}
          </Button>
        </form>
      </main>
    </div>
  )
}
