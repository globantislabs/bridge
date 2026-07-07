'use client'

import * as React from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Check,
  Sparkles,
  CreditCard,
  Download,
  Receipt,
  TrendingUp,
  Calendar,
  Zap,
  Shield,
} from 'lucide-react'
import { useToast } from '@/lib/toast-store'
import { useAuthStore } from '@/lib/auth-store'

interface Plan {
  id: string
  name: string
  tier: string
  priceMonthly: number
  priceYearly: number
  currency: string
  meetingMinutes: number
  maxParticipants: number
  translationLangs: number
  apiTokens: number
  storageGb: number
  featuresCsv: string
}

interface Invoice {
  id: string
  amount: number
  currency: string
  status: string
  number: string
  issuedAt: string
  periodStart: string
  periodEnd: string
  plan: { name: string; tier: string }
}

interface Subscription {
  id: string
  status: string
  interval: string
  currentPeriodStart: string
  currentPeriodEnd: string
  plan: Plan
}

export function BillingView() {
  const { user, refresh } = useAuthStore()
  const toast = useToast()
  const [plans, setPlans] = React.useState<Plan[]>([])
  const [invoices, setInvoices] = React.useState<Invoice[]>([])
  const [subscriptions, setSubscriptions] = React.useState<Subscription[]>([])
  const [loading, setLoading] = React.useState(true)
  const [subscribing, setSubscribing] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/billing/me')
    const data = await r.json()
    setPlans(data.plans ?? [])
    setInvoices(data.invoices ?? [])
    setSubscriptions(data.subscriptions ?? [])
    setLoading(false)
  }, [])

  React.useEffect(() => {
    if (user) load()
  }, [user, load])

  const currentSub = subscriptions[0]
  const currentTier = user?.planTier ?? 'free'

  async function subscribe(planId: string, interval: 'monthly' | 'yearly') {
    if (!user) return
    setSubscribing(planId)
    try {
      const r = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          planId,
          interval,
        }),
      })
      if (!r.ok) {
        const d = await r.json()
        toast.error('Failed', d.error)
        return
      }
      toast.success('Subscription updated', 'Your plan is now active')
      await refresh()
      await load()
    } finally {
      setSubscribing(null)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Current plan banner */}
      <Card className="overflow-hidden border-emerald-500/20">
        <div className="bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent">
          <CardContent className="p-5 flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-lg bg-emerald-500/15 text-emerald-600 grid place-items-center">
                <Sparkles className="size-6" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Current plan</div>
                <div className="text-2xl font-semibold capitalize tracking-tight">
                  {currentSub?.plan.name ?? 'Free'}
                  {currentSub && (
                    <span className="text-sm text-muted-foreground font-normal ml-2">
                      · {currentSub.interval}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {currentSub
                    ? `Renews ${new Date(currentSub.currentPeriodEnd).toLocaleDateString('en-US', { dateStyle: 'medium' })}`
                    : 'No active subscription'}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xl font-semibold tabular">
                  {user?.meetingMinutesUsed ?? 0}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  of {(currentSub?.plan.meetingMinutes ?? 60).toLocaleString()} min
                </div>
              </div>
              <div>
                <div className="text-xl font-semibold tabular">
                  {user?.apiTokensUsed ?? 0}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  of {currentSub?.plan.apiTokens ?? 3} tokens
                </div>
              </div>
              <div>
                <div className="text-xl font-semibold tabular">
                  {currentSub?.plan.translationLangs ?? 3}
                </div>
                <div className="text-[10px] text-muted-foreground">languages</div>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Plans */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold">Available plans</h3>
            <p className="text-xs text-muted-foreground">
              Upgrade or downgrade anytime. Prorated billing applied.
            </p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {plans.map((p) => {
            const isCurrent = p.tier === currentTier
            const isPro = p.tier === 'pro'
            return (
              <Card
                key={p.id}
                className={`relative overflow-hidden ${
                  isPro ? 'border-emerald-500/40 shadow-lg' : ''
                }`}
              >
                {isPro && (
                  <div className="absolute top-0 left-0 right-0 bg-emerald-500 text-white text-[10px] text-center py-0.5 font-medium uppercase tracking-wide">
                    Most popular
                  </div>
                )}
                <CardHeader className={isPro ? 'pt-8' : ''}>
                  <CardTitle className="text-base flex items-center justify-between">
                    {p.name}
                    {isCurrent && (
                      <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                        Current
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {p.tier === 'free' && 'For trying out the platform'}
                    {p.tier === 'pro' && 'For growing teams'}
                    {p.tier === 'enterprise' && 'For organizations at scale'}
                  </CardDescription>
                  <div className="mt-2">
                    <span className="text-3xl font-bold tabular">
                      ${(p.priceMonthly / 100).toFixed(0)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      /month
                    </span>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      or ${(p.priceYearly / 100).toFixed(0)}/year (save 17%)
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {p.featuresCsv.split(',').map((f) => (
                    <div key={f} className="flex items-start gap-2 text-xs">
                      <Check className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                </CardContent>
                <CardFooter className="flex-col gap-2">
                  <Button
                    className="w-full"
                    variant={isCurrent ? 'outline' : isPro ? 'default' : 'outline'}
                    disabled={isCurrent || subscribing === p.id}
                    onClick={() => subscribe(p.id, 'monthly')}
                  >
                    {subscribing === p.id
                      ? 'Processing…'
                      : isCurrent
                      ? 'Current plan'
                      : `Upgrade to ${p.name}`}
                  </Button>
                  {!isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => subscribe(p.id, 'yearly')}
                      disabled={subscribing === p.id}
                    >
                      Pay yearly · ${(p.priceYearly / 100).toFixed(0)}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Two-column: Invoices + Payment */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="size-4" />
                Invoices
              </CardTitle>
              <CardDescription className="text-xs">
                Download receipts for accounting
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-xs">
              <Download className="size-3.5 mr-1" />
              Export all
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-md bg-muted/40 animate-pulse" />
                ))}
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No invoices yet
              </div>
            ) : (
              <div className="space-y-1">
                {invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center gap-3 p-2.5 rounded-md hover:bg-muted/40 transition-colors"
                  >
                    <div className="size-8 rounded-md bg-muted grid place-items-center shrink-0">
                      <Receipt className="size-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium">{inv.number}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {inv.plan.name} ·{' '}
                        {new Date(inv.issuedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        inv.status === 'paid'
                          ? 'text-emerald-600 border-emerald-500/30'
                          : ''
                      }`}
                    >
                      {inv.status.toUpperCase()}
                    </Badge>
                    <div className="text-sm font-semibold tabular w-16 text-right">
                      ${(inv.amount / 100).toFixed(2)}
                    </div>
                    <Button variant="ghost" size="icon" className="size-7">
                      <Download className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="size-4" />
              Payment method
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 border border-border rounded-md bg-gradient-to-br from-foreground/5 to-transparent">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium">Visa •••• 4242</div>
                <Badge variant="outline" className="text-[10px]">Default</Badge>
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                Expires 09/2028
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full text-xs">
              <CreditCard className="size-3.5 mr-1.5" />
              Add payment method
            </Button>
            <Separator />
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Shield className="size-3.5" />
                  PCI compliant
                </span>
                <Check className="size-3.5 text-emerald-500" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Zap className="size-3.5" />
                  Stripe-powered
                </span>
                <Check className="size-3.5 text-emerald-500" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="size-3.5" />
                  Auto-renewal
                </span>
                <Check className="size-3.5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
