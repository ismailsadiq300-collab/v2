import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { sendTelegramAlert } from '@/lib/sendTelegramAlert'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ManagerNav } from '@/components/ManagerNav'
import { Package, Plus, Edit2, AlertTriangle } from 'lucide-react'

interface InventoryItem {
  id: string
  name: string
  unit: string
  minimum_threshold: number
  current_stock: number
  created_at: string
}

function getStatus(item: InventoryItem) {
  if (item.current_stock <= 0) return { label: 'Critical', color: 'destructive' as const, emoji: '🔴' }
  if (item.current_stock <= item.minimum_threshold) return { label: 'Low', color: 'secondary' as const, emoji: '🟡' }
  return { label: 'Good', color: 'default' as const, emoji: '🟢' }
}

export default function Inventory() {
  const { toast } = useToast()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [form, setForm] = useState({ name: '', unit: 'kg', minimum_threshold: '', current_stock: '' })

  const fetchItems = async () => {
    const { data, error } = await supabase.from('inventory_items').select('*').order('name')
    if (!error && data) setItems(data as unknown as InventoryItem[])
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  const handleSave = async () => {
    const payload = {
      name: form.name,
      unit: form.unit,
      minimum_threshold: parseFloat(form.minimum_threshold) || 0,
      current_stock: parseFloat(form.current_stock) || 0,
    }

    if (editingItem) {
      const { error } = await supabase.from('inventory_items').update(payload).eq('id', editingItem.id)
      if (error) { toast({ title: 'Error updating item', variant: 'destructive' }); return }
      toast({ title: 'Item updated ✅' })
    } else {
      const { error } = await supabase.from('inventory_items').insert(payload)
      if (error) { toast({ title: 'Error adding item', variant: 'destructive' }); return }
      toast({ title: 'Item added ✅' })
    }

    setDialogOpen(false)
    setEditingItem(null)
    setForm({ name: '', unit: 'kg', minimum_threshold: '', current_stock: '' })
    fetchItems()
  }

  const openEdit = (item: InventoryItem) => {
    setEditingItem(item)
    setForm({
      name: item.name,
      unit: item.unit,
      minimum_threshold: String(item.minimum_threshold),
      current_stock: String(item.current_stock),
    })
    setDialogOpen(true)
  }

  const openAdd = () => {
    setEditingItem(null)
    setForm({ name: '', unit: 'kg', minimum_threshold: '', current_stock: '' })
    setDialogOpen(true)
  }

  return (
    <div className="min-h-screen pb-8">
      <ManagerNav />
      <main className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
            <Badge variant="outline">{items.length} items</Badge>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add Item</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit Item' : 'Add Item'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Rice" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="kg, pcs, liters" />
                  </div>
                  <div className="space-y-2">
                    <Label>Min Threshold</Label>
                    <Input type="number" value={form.minimum_threshold} onChange={e => setForm(f => ({ ...f, minimum_threshold: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Current Stock</Label>
                  <Input type="number" value={form.current_stock} onChange={e => setForm(f => ({ ...f, current_stock: e.target.value }))} />
                </div>
                <Button onClick={handleSave} className="w-full">Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : items.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">No inventory items yet. Add your first item!</Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(item => {
              const status = getStatus(item)
              return (
                <Card key={item.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{status.emoji}</span>
                        <h3 className="font-semibold text-foreground">{item.name}</h3>
                      </div>
                      <p className="text-2xl font-bold text-foreground">{item.current_stock} <span className="text-sm text-muted-foreground">{item.unit}</span></p>
                      <p className="text-xs text-muted-foreground mt-1">Min: {item.minimum_threshold} {item.unit}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={status.color}>{status.label}</Badge>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {item.current_stock <= item.minimum_threshold && (
                    <div className="mt-3 flex items-center gap-1 text-xs text-destructive">
                      <AlertTriangle className="w-3 h-3" /> Below minimum threshold
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
