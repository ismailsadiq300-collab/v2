import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ManagerNav } from '@/components/ManagerNav'
import { Trash2, TrendingDown, DollarSign, Package } from 'lucide-react'

interface WasteLog {
  id: string
  item_name: string
  quantity: number
  unit: string
  cost_per_unit: number
  reason: string | null
  created_at: string
}

export default function WasteReport() {
  const [logs, setLogs] = useState<WasteLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    supabase
      .from('waste_logs')
      .select('*')
      .gte('created_at', weekAgo)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setLogs(data as unknown as WasteLog[])
        setLoading(false)
      })
  }, [])

  const stats = useMemo(() => {
    const totalCost = logs.reduce((sum, l) => sum + l.quantity * l.cost_per_unit, 0)

    const itemCounts: Record<string, { qty: number; cost: number }> = {}
    logs.forEach(l => {
      if (!itemCounts[l.item_name]) itemCounts[l.item_name] = { qty: 0, cost: 0 }
      itemCounts[l.item_name].qty += l.quantity
      itemCounts[l.item_name].cost += l.quantity * l.cost_per_unit
    })

    const sorted = Object.entries(itemCounts).sort((a, b) => b[1].cost - a[1].cost)
    const mostWasted = sorted[0]?.[0] || 'N/A'
    const top5 = sorted.slice(0, 5)

    const reasonCounts: Record<string, number> = {}
    logs.forEach(l => {
      const r = l.reason || 'Unknown'
      reasonCounts[r] = (reasonCounts[r] || 0) + 1
    })
    const topReasons = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]).slice(0, 3)

    return { totalCost, mostWasted, top5, topReasons, totalItems: logs.length }
  }, [logs])

  return (
    <div className="min-h-screen pb-8">
      <ManagerNav />
      <main className="container py-6">
        <div className="flex items-center gap-3 mb-6">
          <Trash2 className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Waste Report</h1>
            <p className="text-sm text-muted-foreground">Last 7 days</p>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : logs.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">No waste logged this week 🎉</Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="p-5">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-8 h-8 text-destructive" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Loss</p>
                    <p className="text-2xl font-bold text-foreground">{stats.totalCost.toFixed(0)} QAR</p>
                  </div>
                </div>
              </Card>
              <Card className="p-5">
                <div className="flex items-center gap-3">
                  <Package className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Items Wasted</p>
                    <p className="text-2xl font-bold text-foreground">{stats.totalItems}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-5">
                <div className="flex items-center gap-3">
                  <TrendingDown className="w-8 h-8 text-accent" />
                  <div>
                    <p className="text-sm text-muted-foreground">Most Wasted</p>
                    <p className="text-2xl font-bold text-foreground">{stats.mostWasted}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Top wasted items chart (simple bars) */}
            <Card className="p-5 mb-6">
              <h3 className="font-semibold text-foreground mb-4">Most Wasted Items (by cost)</h3>
              <div className="space-y-3">
                {stats.top5.map(([name, data]) => {
                  const pct = stats.totalCost > 0 ? (data.cost / stats.totalCost) * 100 : 0
                  return (
                    <div key={name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-foreground font-medium">{name}</span>
                        <span className="text-muted-foreground">{data.cost.toFixed(0)} QAR</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Top reasons */}
            <Card className="p-5 mb-6">
              <h3 className="font-semibold text-foreground mb-3">Top Reasons</h3>
              <div className="flex flex-wrap gap-2">
                {stats.topReasons.map(([reason, count]) => (
                  <Badge key={reason} variant="outline">{reason} ({count})</Badge>
                ))}
              </div>
            </Card>

            {/* Recommendations */}
            {stats.totalCost > 500 && (
              <Card className="p-5 border-destructive/30 bg-destructive/5">
                <h3 className="font-semibold text-destructive mb-2">⚠️ High Waste Alert</h3>
                <p className="text-sm text-muted-foreground">
                  Weekly waste exceeds 500 QAR. Consider reviewing portion sizes for <strong>{stats.mostWasted}</strong>, improving storage conditions, and implementing FIFO (First In, First Out) for perishables.
                </p>
              </Card>
            )}

            {/* Recent logs */}
            <Card className="p-5 mt-6">
              <h3 className="font-semibold text-foreground mb-3">Recent Waste Logs</h3>
              <div className="space-y-2">
                {logs.slice(0, 10).map(log => (
                  <div key={log.id} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{log.item_name}</p>
                      <p className="text-xs text-muted-foreground">{log.quantity} {log.unit} • {log.reason || 'No reason'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">{(log.quantity * log.cost_per_unit).toFixed(0)} QAR</p>
                      <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
