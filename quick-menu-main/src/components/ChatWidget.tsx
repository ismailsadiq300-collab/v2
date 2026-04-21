import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MessageCircle, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useI18n } from '@/lib/i18n'

export function ChatWidget() {
  const [searchParams] = useSearchParams()
  const rawTableNumber = Number.parseInt(searchParams.get('table') || '1', 10)
  const tableNumber = Number.isFinite(rawTableNumber) && rawTableNumber > 0 ? rawTableNumber : 1
  const isDemo = searchParams.get('demo') === 'true'
  const { toast } = useToast()
  const { t } = useI18n()

  const [open, setOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    const message = feedback.trim()
    if (!message) {
      toast({ title: t('writeComment'), variant: 'destructive' })
      return
    }

    setIsSubmitting(true)
    try {
      if (!isDemo) {
        const [{ collection, addDoc, Timestamp }, { db }] = await Promise.all([
          import('firebase/firestore'),
          import('@/lib/firebase'),
        ])

        await addDoc(collection(db, 'feedback'), {
          tableNumber,
          message,
          status: 'new',
          timestamp: Timestamp.now(),
        })
      }

      setFeedback('')
      setSubmitted(true)
      toast({
        title: t('feedbackSent'),
      })
    } catch (error) {
      console.error('Error sending feedback:', error)
      toast({
        title: 'Could not send feedback',
        description: 'Please try again or tell a waiter.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-lg bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
        aria-label={open ? 'Close feedback form' : 'Open feedback form'}
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[calc(100vw-3rem)] max-w-80 bg-card rounded-lg shadow-xl border border-border overflow-hidden">
          <div className="bg-primary text-primary-foreground px-4 py-3 font-semibold">
            {t('commentsFeedback')}
          </div>
          <div className="p-4 space-y-4">
            <div>
              <p className="text-sm font-medium text-foreground">{t('feedbackIntro')}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('feedbackHint')}
              </p>
            </div>

            {submitted && (
              <div className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
                {t('feedbackSent')}
              </div>
            )}

            <Textarea
              value={feedback}
              onChange={(event) => {
                setFeedback(event.target.value)
                setSubmitted(false)
              }}
              placeholder={t('writeComment')}
              rows={4}
              className="resize-none"
            />

            <Button className="w-full gap-2" onClick={handleSubmit} disabled={isSubmitting}>
              <Send className="w-4 h-4" />
              {isSubmitting ? t('sending') : t('sendFeedback')}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
