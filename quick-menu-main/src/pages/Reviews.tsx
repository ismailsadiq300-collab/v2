import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ManagerNav } from '@/components/ManagerNav'
import { Star, ThumbsUp, ThumbsDown, Lightbulb, Loader2 } from 'lucide-react'

interface Analysis {
  overall_sentiment: 'positive' | 'negative' | 'neutral'
  top_praised: string[]
  top_complaints: string[]
  weekly_summary: string
  recommendation: string
}

const sentimentConfig = {
  positive: { label: 'Positive', emoji: '😊', color: 'bg-emerald-100 text-emerald-800' },
  negative: { label: 'Negative', emoji: '😞', color: 'bg-red-100 text-red-800' },
  neutral: { label: 'Neutral', emoji: '😐', color: 'bg-amber-100 text-amber-800' },
}

export default function Reviews() {
  const { toast } = useToast()
  const [reviews, setReviews] = useState('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(false)

  const handleAnalyze = async () => {
    if (!reviews.trim()) {
      toast({ title: 'Paste some reviews first', variant: 'destructive' })
      return
    }

    setLoading(true)
    setAnalysis(null)
    try {
      const { data, error } = await supabase.functions.invoke('analyze-reviews', {
        body: { reviews },
      })

      if (error) throw error
      setAnalysis(data as Analysis)
      toast({ title: 'Analysis complete ✅' })
    } catch (error) {
      console.error(error)
      const message = error instanceof Error ? error.message : 'Analysis failed'
      toast({ title: message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const sentiment = analysis ? sentimentConfig[analysis.overall_sentiment] : null

  return (
    <div className="min-h-screen pb-8">
      <ManagerNav />
      <main className="container py-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Star className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">AI Reviews Analyzer</h1>
        </div>

        <div className="space-y-4 mb-6">
          <Textarea
            value={reviews}
            onChange={e => setReviews(e.target.value)}
            placeholder="Paste Google reviews here... (one per line or paragraph)"
            rows={8}
            className="text-sm"
          />
          <Button onClick={handleAnalyze} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : '🤖 Analyze Reviews'}
          </Button>
        </div>

        {analysis && (
          <div className="space-y-4">
            {/* Sentiment */}
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{sentiment?.emoji}</span>
                <div>
                  <p className="text-sm text-muted-foreground">Overall Sentiment</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${sentiment?.color}`}>
                    {sentiment?.label}
                  </span>
                </div>
              </div>
            </Card>

            {/* Summary */}
            <Card className="p-5">
              <p className="text-sm text-foreground">{analysis.weekly_summary}</p>
            </Card>

            {/* Praised */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <ThumbsUp className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Top Praised</h3>
              </div>
              <div className="space-y-2">
                {analysis.top_praised.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-primary">✓</span>
                    <span className="text-sm text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Complaints */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <ThumbsDown className="w-5 h-5 text-destructive" />
                <h3 className="font-semibold text-foreground">Top Complaints</h3>
              </div>
              <div className="space-y-2">
                {analysis.top_complaints.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-destructive">✗</span>
                    <span className="text-sm text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recommendation */}
            <Card className="p-5 border-primary/30 bg-primary/5">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Recommendation</h3>
              </div>
              <p className="text-sm text-foreground">{analysis.recommendation}</p>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
