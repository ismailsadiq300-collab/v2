import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { sendTelegramAlert } from '@/lib/sendTelegramAlert'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { StaffNav } from '@/components/StaffNav'
import { Minus, CheckCircle2 } from 'lucide-react'

interface InventoryItem {
  id: string
  name: string
  unit: string
  minimum_threshold: number
  current_stock: number
}

export default function StockUpdate() {
  const { toast } = useToast()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [selectedItem, setSelectedItem] = useState('')
  const [quantity, setQuantity] = useState('')
  const [loggedBy, setLoggedBy] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    supabase.from('inventory_items').select('*').order('name').then(({ data }) => {
      if (data) setItems(data as unknown as InventoryItem[])
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem || !quantity) {
      toast({ title: 'Select an item and enter quantity', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const item = items.find(i => i.id === selectedItem)
      if (!item) throw new Error('Item not found')

      const qty = parseFloat(quantity)
      const newStock = Math.max(0, item.current_stock - qty)

      // Log the usage
      await supabase.from('stock_logs').insert({
        item_id: selectedItem,
        quantity_used: qty,
        logged_by: loggedBy || 'staff',
      })

      // Update stock
      await supabase.from('inventory_items').update({ current_stock: newStock }).eq('id', selectedItem)

      // Check if below threshold and send Telegram alert
      if (newStock <= item.minimum_threshold) {
        try {
          await sendTelegramAlert(
            `⚠️ Low Stock Alert!\n📦 Item: ${item.name}\n📊 Current: ${newStock} ${item.unit}\n🚨 Minimum: ${item.minimum_threshold} ${item.unit}`
          )
        } catch (e) {
          console.error('Telegram alert failed:', e)
        }
      }

      setSuccess(true)
      toast({ title: `Used ${qty} ${item.unit} of ${item.name} ✅` })
      setSelectedItem('')
      setQuantity('')

      // Refresh items
      const { data } = await supabase.from('inventory_items').select('*').order('name')
      if (data) setItems(data as unknown as InventoryItem[])

      setTimeout(() => setSuccess(false), 2000)
    } catch (error) {
      toast({ title: 'Error updating stock', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const selected = items.find(i => i.id === selectedItem)

  return (
    <div className="min-h-screen pb-8">
      <StaffNav />
      <main className="container max-w-md mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-6">
          <Minus className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Stock Update</h1>
            <p className="text-sm text-muted-foreground">Log item usage</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Select Item</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedItem}
              onChange={e => setSelectedItem(e.target.value)}
            >
              <option value="">Choose an item...</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} — {item.current_stock} {item.unit} left
                </option>
              ))}
            </select>
          </div>

          {selected && (
            <Card className="p-3 bg-muted/50">
              <p className="text-sm text-muted-foreground">
                Current stock: <strong className="text-foreground">{selected.current_stock} {selected.unit}</strong>
              </p>
              <p className="text-xs text-muted-foreground">
                Min threshold: {selected.minimum_threshold} {selected.unit}
              </p>
            </Card>
          )}

          <div className="space-y-2">
            <Label>Quantity Used</Label>
            <Input type="number" min="0.1" step="0.1" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="Enter quantity" />
          </div>

          <div className="space-y-2">
            <Label>Logged By (optional)</Label>
            <Input value={loggedBy} onChange={e => setLoggedBy(e.target.value)} placeholder="Your name" />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {success ? <><CheckCircle2 className="w-4 h-4 mr-1" /> Done!</> : submitting ? 'Submitting...' : 'Submit Usage'}
          </Button>
        </form>
      </main>
    </div>
  )
}
