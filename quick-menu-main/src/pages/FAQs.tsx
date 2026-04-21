import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ManagerNav } from '@/components/ManagerNav'
import { HelpCircle, Plus, Edit2, Trash2 } from 'lucide-react'

interface FAQ {
  id: string
  question: string
  answer: string
  created_at: string
}

export default function FAQs() {
  const { toast } = useToast()
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<FAQ | null>(null)
  const [form, setForm] = useState({ question: '', answer: '' })

  const fetchFaqs = async () => {
    const { data } = await supabase.from('faqs').select('*').order('created_at', { ascending: false })
    if (data) setFaqs(data as unknown as FAQ[])
    setLoading(false)
  }

  useEffect(() => { fetchFaqs() }, [])

  const handleSave = async () => {
    if (!form.question || !form.answer) {
      toast({ title: 'Fill both fields', variant: 'destructive' })
      return
    }

    if (editing) {
      await supabase.from('faqs').update({ question: form.question, answer: form.answer }).eq('id', editing.id)
      toast({ title: 'FAQ updated ✅' })
    } else {
      await supabase.from('faqs').insert({ question: form.question, answer: form.answer })
      toast({ title: 'FAQ added ✅' })
    }

    setDialogOpen(false)
    setEditing(null)
    setForm({ question: '', answer: '' })
    fetchFaqs()
  }

  const handleDelete = async (id: string) => {
    await supabase.from('faqs').delete().eq('id', id)
    toast({ title: 'FAQ deleted' })
    fetchFaqs()
  }

  return (
    <div className="min-h-screen pb-8">
      <ManagerNav />
      <main className="container py-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">FAQ Management</h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditing(null); setForm({ question: '', answer: '' }) }}>
                <Plus className="w-4 h-4 mr-1" /> Add FAQ
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? 'Edit FAQ' : 'Add FAQ'}</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Question</Label>
                  <Input value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} placeholder="e.g. What are your opening hours?" />
                </div>
                <div className="space-y-2">
                  <Label>Answer</Label>
                  <Textarea value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} placeholder="The answer..." rows={4} />
                </div>
                <Button onClick={handleSave} className="w-full">Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : faqs.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">No FAQs yet. Add your first Q&A pair!</Card>
        ) : (
          <div className="space-y-3">
            {faqs.map(faq => (
              <Card key={faq.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">Q: {faq.question}</h3>
                    <p className="text-sm text-muted-foreground">A: {faq.answer}</p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(faq); setForm({ question: faq.question, answer: faq.answer }); setDialogOpen(true) }}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(faq.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
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
