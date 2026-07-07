'use client'

import * as React from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Video,
  Mail,
  Globe,
  KeyRound,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Calendar,
  Users,
  Activity,
} from 'lucide-react'
import { useNavStore, useAuthStore } from '@/lib/auth-store'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'

interface MeetingItem {
  id: string
  title: string
  startAt: string
  status: string
  joinCode: string
  _count?: { participants: number }
}

interface EmailItem {
  id: string
  fromAddr: string
  subject: string
  snippet: string
  isRead: boolean
  isStarred: boolean
  receivedAt: string
  labelsCsv: string
}

export function DashboardView() {
  const { user } = useAuthStore()
  const { setView } = useNavStore()
  const [meetings, setMeetings] = React.useState<MeetingItem[]>([])
  const [emails, setEmails] = React.useState<EmailItem[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!user) return
    Promise.all([
      fetch('/api/meetings').then((r) => r.json()),
      fetch('/api/emails?folder=inbox').then((r) => r.json()),
    ])
      .then(([m, e]) => {
        setMeetings(m.meetings ?? [])
        setEmails((e.emails ?? []).slice(0, 5))
      })
      .finally(() => setLoading(false))
  }, [user])

  const upcoming = meetings
    .filter((m) => m.status !== 'ended')
    .sort(
      (a, b) =>
        new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    )
    .slice(0, 4)

  const usageData = [
    { day: 'Mon', minutes: 32, translations: 142 },
    { day: 'Tue', minutes: 58, translations: 198 },
    { day: 'Wed', minutes: 41, translations: 165 },
    { day: 'Thu', minutes: 73, translations: 224 },
    { day: 'Fri', minutes: 89, translations: 268 },
    { day: 'Sat', minutes: 22, translations: 78 },
    { day: 'Sun', minutes: 14, translations: 52 },
  ]

  const stats = [
    {
      label: 'Meeting minutes',
      value: user?.meetingMinutesUsed ?? 0,
      total: user?.meetingMinutesQuota ?? 60,
      icon: Video,
      trend: '+12%',
      up: true,
      tint: 'emerald',
    },
    {
      label: 'API tokens active',
      value: user?.apiTokensUsed ?? 0,
      total: user?.apiTokensQuota ?? 3,
      icon: KeyRound,
      trend: '+1',
      up: true,
      tint: 'amber',
    },
    {
      label: 'Languages translated',
      value: 7,
      total: 30,
      icon: Globe,
      trend: 'Live',
      up: true,
      tint: 'sky',
    },
    {
      label: 'Unread emails',
      value: emails.filter((e) => !e.isRead).length,
      total: emails.length,
      icon: Mail,
      trend: '-3',
      up: false,
      tint: 'rose',
    },
  ] as const

  const tintMap: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Greeting */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {greeting()}, {user?.name?.split(' ')[0] ?? 'there'}.
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Here's what's happening across your meetings and inbox today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Translation engine online
          </Badge>
          <Button variant="outline" size="sm" onClick={() => setView('meetings')}>
            <Calendar className="size-3.5 mr-1.5" />
            View calendar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon
          const pct = Math.min(100, (s.value / Math.max(1, s.total)) * 100)
          return (
            <Card key={s.label} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div
                    className={`size-9 rounded-lg grid place-items-center ${tintMap[s.tint]}`}
                  >
                    <Icon className="size-4.5" />
                  </div>
                  <div
                    className={`flex items-center gap-0.5 text-[11px] font-medium ${
                      s.up ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {s.up ? (
                      <ArrowUpRight className="size-3" />
                    ) : (
                      <ArrowDownRight className="size-3" />
                    )}
                    {s.trend}
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-semibold tabular">
                    {s.value.toLocaleString()}
                    <span className="text-sm text-muted-foreground font-normal">
                      {' '}
                      / {s.total.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {s.label}
                  </div>
                </div>
                <Progress value={pct} className="h-1 mt-3" />
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Two-column layout */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Upcoming meetings */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Upcoming meetings</CardTitle>
              <CardDescription className="text-xs">
                {upcoming.length} scheduled · 1 live now
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setView('meetings')}
            >
              View all
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 rounded-md bg-muted/40 animate-pulse"
                  />
                ))}
              </div>
            ) : upcoming.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">
                <Calendar className="size-6 mx-auto mb-2 opacity-40" />
                No meetings scheduled
              </div>
            ) : (
              <div className="space-y-1.5">
                {upcoming.map((m) => {
                  const start = new Date(m.startAt)
                  const isLive = m.status === 'live'
                  const isToday = start.toDateString() === new Date().toDateString()
                  return (
                    <div
                      key={m.id}
                      onClick={() => setView('meetings', m.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setView('meetings', m.id)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-md hover:bg-muted/50 transition-colors text-left cursor-pointer"
                    >
                      <div
                        className={`size-10 rounded-md grid place-items-center text-[10px] font-medium leading-tight flex-shrink-0 ${
                          isLive
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isLive ? (
                          <span className="flex items-center gap-1 text-[10px]">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            LIVE
                          </span>
                        ) : (
                          <>
                            <div>{start.toLocaleString('en-US', { month: 'short' }).toUpperCase()}</div>
                            <div className="text-sm font-bold">
                              {start.getDate()}
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {m.title}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                          <Clock className="size-3" />
                          {isToday
                            ? `Today · ${start.toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}`
                            : start.toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                          <span className="opacity-40">·</span>
                          <Users className="size-3" />
                          {m._count?.participants ?? 1}
                          <span className="opacity-40">·</span>
                          <code className="text-[10px]">{m.joinCode}</code>
                        </div>
                      </div>
                      {isLive && (
                        <Button size="sm" className="h-7" onClick={(e) => { e.stopPropagation(); setView('meetings', m.id) }}>
                          Join
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="size-4 text-emerald-500" />
              Weekly activity
            </CardTitle>
            <CardDescription className="text-xs">
              Minutes & translations over the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart
                data={usageData}
                margin={{ top: 5, right: 5, bottom: 0, left: -25 }}
              >
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="oklch(0.62 0.13 155)"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="100%"
                      stopColor="oklch(0.62 0.13 155)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.5 0 0 / 0.1)"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: 'oklch(0.5 0 0 / 0.7)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'oklch(0.5 0 0 / 0.7)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <RTooltip
                  contentStyle={{
                    fontSize: 11,
                    background: 'oklch(0.2 0.005 240 / 0.95)',
                    border: '1px solid oklch(0.5 0 0 / 0.2)',
                    borderRadius: 8,
                    color: 'white',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="minutes"
                  stroke="oklch(0.62 0.13 155)"
                  strokeWidth={2}
                  fill="url(#g1)"
                  name="Minutes"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent emails + Translation feature */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Recent mail</CardTitle>
              <CardDescription className="text-xs">
                Latest messages in your inbox
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setView('mail')}
            >
              Open inbox
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-14 rounded-md bg-muted/40 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {emails.slice(0, 5).map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setView('mail', e.id)}
                    className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-muted/30 -mx-2 px-2 rounded-md transition-colors"
                  >
                    <div
                      className={`size-2 rounded-full ${
                        e.isRead ? 'bg-transparent' : 'bg-emerald-500'
                      }`}
                    />
                    <div className="w-32 shrink-0">
                      <div
                        className={`text-xs truncate ${
                          e.isRead ? 'text-muted-foreground' : 'font-medium'
                        }`}
                      >
                        {e.fromAddr.split('@')[0]}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-xs truncate ${
                          e.isRead ? 'text-muted-foreground' : 'font-medium'
                        }`}
                      >
                        {e.subject}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {e.snippet}
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground shrink-0">
                      {timeAgo(e.receivedAt)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Translation spotlight */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 grid place-items-center">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Live translation</CardTitle>
                  <CardDescription className="text-xs">
                    Powered by OpenAI Realtime API
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="space-y-2">
                {[
                  { lang: 'English', flag: 'EN', text: 'Welcome to the meeting everyone.' },
                  { lang: 'Español', flag: 'ES', text: 'Bienvenido a la reunión todos.' },
                  { lang: '日本語', flag: 'JA', text: '皆さん、会議へようこそ。' },
                  { lang: 'हिन्दी', flag: 'HI', text: 'सभी को बैठक में आपका स्वागत है।' },
                ].map((row, i) => (
                  <div
                    key={row.lang}
                    className="flex items-start gap-2.5 text-xs animate-in fade-in slide-in-from-left-2"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <Badge
                      variant="outline"
                      className="text-[9px] h-4 px-1 font-mono mt-0.5"
                    >
                      {row.flag}
                    </Badge>
                    <div className="flex-1">
                      <div className="font-medium text-foreground">
                        {row.lang}
                      </div>
                      <div className="text-muted-foreground">{row.text}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => setView('meetings')}
              >
                <Video className="size-3.5 mr-1.5" />
                Try live translation
              </Button>
            </CardContent>
          </div>
        </Card>
      </div>
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function timeAgo(iso: string) {
  const d = new Date(iso).getTime()
  const diff = Date.now() - d
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const days = Math.floor(h / 24)
  return `${days}d`
}
