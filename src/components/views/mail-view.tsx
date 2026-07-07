'use client'

import * as React from 'react'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Inbox,
  Send,
  Star,
  Trash2,
  Archive,
  PenSquare,
  Search,
  Reply,
  ReplyAll,
  Forward,
  Star as StarIcon,
  Paperclip,
  Image as ImageIcon,
  Smile,
  MoreHorizontal,
  Tag,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  Sparkles,
  Settings as SettingsIcon,
  CalendarClock,
  Briefcase,
  Plus,
  Check,
  Trash,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/lib/toast-store'
import { useAuthStore } from '@/lib/auth-store'

interface EmailItem {
  id: string
  threadId: string
  fromAddr: string
  toAddr: string
  subject: string
  bodyPlain: string
  snippet: string
  isRead: boolean
  isStarred: boolean
  folder: string
  labelsCsv: string
  sentAt: string | null
  receivedAt: string | null
}

const FOLDERS = [
  { key: 'inbox', label: 'Inbox', icon: Inbox },
  { key: 'sent', label: 'Sent', icon: Send },
  { key: 'starred', label: 'Starred', icon: Star },
  { key: 'drafts', label: 'Drafts', icon: PenSquare },
  { key: 'trash', label: 'Trash', icon: Trash2 },
]

const LABELS = [
  { key: 'work', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  { key: 'important', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
  { key: 'billing', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  { key: 'personal', color: 'bg-sky-500/10 text-sky-600 border-sky-500/20' },
]

export function MailView() {
  const { user } = useAuthStore()
  const toast = useToast()
  const [folder, setFolder] = React.useState('inbox')
  const [label, setLabel] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState('')
  const [emails, setEmails] = React.useState<EmailItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selected, setSelected] = React.useState<EmailItem | null>(null)
  const [composeOpen, setComposeOpen] = React.useState(false)
  const [translateTarget, setTranslateTarget] = React.useState('en')
  const [translatedBody, setTranslatedBody] = React.useState<string | null>(null)
  const [translating, setTranslating] = React.useState(false)

  const loadEmails = React.useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ folder })
    if (label) params.set('label', label)
    if (search) params.set('q', search)
    const r = await fetch(`/api/emails?${params}`)
    const data = await r.json()
    setEmails(data.emails ?? [])
    setLoading(false)
  }, [folder, label, search])

  React.useEffect(() => {
    if (user) loadEmails()
  }, [user, loadEmails])

  React.useEffect(() => {
    // Reset translation when email changes
    setTranslatedBody(null)
  }, [selected?.id])

  async function patchEmail(id: string, action: any) {
    await fetch('/api/emails', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    })
    loadEmails()
  }

  async function translateBody() {
    if (!selected) return
    setTranslating(true)
    try {
      const r = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: selected.bodyPlain,
          sourceLang: 'en',
          targetLang: translateTarget,
        }),
      })
      const data = await r.json()
      setTranslatedBody(data.translated)
      toast.success(
        'Translated',
        `Latency ${data.latencyMs}ms · ${Math.round(data.confidence * 100)}% confidence`
      )
    } finally {
      setTranslating(false)
    }
  }

  const unreadCount = emails.filter((e) => !e.isRead).length

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Mail sidebar */}
      <div className="w-56 shrink-0 border-r border-border bg-muted/20 hidden md:flex flex-col">
        <div className="p-3">
          <Button
            className="w-full justify-start"
            onClick={() => setComposeOpen(true)}
          >
            <PenSquare className="size-4 mr-2" />
            Compose
          </Button>
        </div>
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-0.5 pb-2">
            {FOLDERS.map((f) => {
              const Icon = f.icon
              const active = folder === f.key && !label
              return (
                <button
                  key={f.key}
                  onClick={() => {
                    setFolder(f.key)
                    setLabel(null)
                    setSelected(null)
                  }}
                  className={`w-full flex items-center gap-2.5 rounded-md px-2.5 h-8 text-sm transition-colors ${
                    active
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  }`}
                >
                  <Icon className="size-3.5" />
                  <span className="flex-1 text-left">{f.label}</span>
                  {f.key === 'inbox' && unreadCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="h-4 px-1 text-[10px] bg-emerald-500/15 text-emerald-600"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </button>
              )
            })}
          </div>

          <div className="pt-3 pb-2">
            <div className="px-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Labels
            </div>
            {LABELS.map((l) => (
              <button
                key={l.key}
                onClick={() => {
                  setLabel(l.key)
                  setSelected(null)
                }}
                className={`w-full flex items-center gap-2.5 rounded-md px-2.5 h-8 text-sm transition-colors ${
                  label === l.key
                    ? 'bg-muted text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                }`}
              >
                <span className={`size-2 rounded-full ${l.color.split(' ')[0]}`} />
                <span className="flex-1 text-left capitalize">{l.key}</span>
              </button>
            ))}
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-border text-[10px] text-muted-foreground">
          {user?.email}
        </div>
      </div>

      {/* Email list */}
      <div className="w-[380px] shrink-0 border-r border-border flex flex-col">
        <div className="p-2.5 border-b border-border space-y-2">
          <div className="relative">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search mail…"
              className="h-8 pl-8 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadEmails()}
            />
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={loadEmails}
            >
              <RefreshCw className="size-3 mr-1" />
              Refresh
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              <Filter className="size-3 mr-1" />
              Filter
            </Button>
            <div className="ml-auto flex items-center gap-0.5">
              <Button variant="ghost" size="icon" className="size-7">
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="size-7">
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="space-y-1 p-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 rounded-md bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-16 text-sm text-muted-foreground">
              <Inbox className="size-8 mx-auto mb-2 opacity-40" />
              No messages here
            </div>
          ) : (
            <div className="divide-y divide-border">
              {emails.map((e) => {
                const initials = e.fromAddr
                  .split('@')[0]
                  .slice(0, 2)
                  .toUpperCase()
                const isActive = selected?.id === e.id
                return (
                  <button
                    key={e.id}
                    onClick={() => {
                      setSelected(e)
                      if (!e.isRead) patchEmail(e.id, 'read')
                    }}
                    className={`w-full text-left p-3 hover:bg-muted/40 transition-colors ${
                      isActive ? 'bg-emerald-500/5' : ''
                    } ${!e.isRead ? 'border-l-2 border-l-emerald-500' : 'border-l-2 border-l-transparent'}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar className="size-7">
                        <AvatarFallback className="text-[10px] bg-muted">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-xs truncate ${
                            e.isRead ? 'text-muted-foreground' : 'font-semibold'
                          }`}
                        >
                          {e.fromAddr.split('<')[0].trim()}
                        </div>
                      </div>
                      <div className="text-[10px] text-muted-foreground shrink-0">
                        {timeShort(e.receivedAt)}
                      </div>
                    </div>
                    <div
                      className={`text-xs truncate mb-0.5 ${
                        e.isRead ? 'text-muted-foreground' : 'font-medium'
                      }`}
                    >
                      {e.subject}
                    </div>
                    <div className="text-[11px] text-muted-foreground line-clamp-1">
                      {e.snippet}
                    </div>
                    <div className="flex items-center gap-1 mt-1.5">
                      {e.isStarred && (
                        <StarIcon className="size-3 text-amber-500 fill-amber-500" />
                      )}
                      {e.labelsCsv
                        .split(',')
                        .filter(Boolean)
                        .map((l) => {
                          const lbl = LABELS.find((x) => x.key === l)
                          return (
                            <Badge
                              key={l}
                              variant="outline"
                              className={`text-[9px] h-3.5 px-1 ${lbl?.color ?? ''}`}
                            >
                              {l}
                            </Badge>
                          )
                        })}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Email detail */}
      <div className="flex-1 min-w-0 flex flex-col">
        {!selected ? (
          <div className="flex-1 grid place-items-center text-center p-8">
            <div>
              <div className="size-14 rounded-full bg-muted/50 grid place-items-center mx-auto mb-3">
                <Inbox className="size-6 text-muted-foreground" />
              </div>
              <div className="text-sm font-medium">Select an email to read</div>
              <div className="text-xs text-muted-foreground mt-1 max-w-sm">
                Your inbox is sorted by recency. Use the sidebar to filter by label or folder.
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="h-11 border-b border-border flex items-center gap-1 px-3">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => patchEmail(selected.id, 'archive')}
                title="Archive"
              >
                <Archive className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => patchEmail(selected.id, 'trash')}
                title="Delete"
              >
                <Trash2 className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() =>
                  patchEmail(
                    selected.id,
                    selected.isStarred ? 'unstar' : 'star'
                  )
                }
                title="Star"
              >
                <StarIcon
                  className={`size-4 ${
                    selected.isStarred
                      ? 'text-amber-500 fill-amber-500'
                      : ''
                  }`}
                />
              </Button>
              <div className="w-px h-5 bg-border mx-1" />
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                <Reply className="size-3.5 mr-1" />
                Reply
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                <ReplyAll className="size-3.5 mr-1" />
                Reply all
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                <Forward className="size-3.5 mr-1" />
                Forward
              </Button>
              <div className="ml-auto flex items-center gap-2">
                <Globe className="size-3.5 text-muted-foreground" />
                <Select value={translateTarget} onValueChange={setTranslateTarget}>
                  <SelectTrigger className="h-7 w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      ['en', 'English'],
                      ['es', 'Spanish'],
                      ['fr', 'French'],
                      ['de', 'German'],
                      ['ja', 'Japanese'],
                      ['zh', 'Chinese'],
                      ['hi', 'Hindi'],
                      ['pt', 'Portuguese'],
                      ['ar', 'Arabic'],
                      ['ru', 'Russian'],
                    ].map(([c, n]) => (
                      <SelectItem key={c} value={c}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={translateBody}
                  disabled={translating}
                >
                  {translating ? (
                    <RefreshCw className="size-3 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="size-3 mr-1" />
                  )}
                  Translate
                </Button>
              </div>
            </div>

            {/* Email body */}
            <ScrollArea className="flex-1">
              <div className="max-w-3xl mx-auto p-6 md:p-8">
                <h1 className="text-xl font-semibold tracking-tight mb-4">
                  {selected.subject}
                </h1>
                <div className="flex items-start gap-3 pb-4 border-b border-border">
                  <Avatar className="size-10">
                    <AvatarFallback>
                      {selected.fromAddr.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {selected.fromAddr.split('<')[0].trim()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        &lt;{selected.fromAddr.match(/<([^>]+)>/)?.[1] ?? selected.fromAddr}&gt;
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      to {selected.toAddr}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground text-right shrink-0">
                    {selected.sentAt &&
                      new Date(selected.sentAt).toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                  </div>
                </div>

                {/* Body */}
                <div className="py-6 text-sm leading-relaxed whitespace-pre-wrap">
                  {translatedBody ?? selected.bodyPlain}
                </div>

                {translatedBody && (
                  <div className="text-xs text-muted-foreground border-t border-border pt-3 mt-3 flex items-center gap-2">
                    <Sparkles className="size-3 text-emerald-500" />
                    Translated from English to {translateTarget.toUpperCase()} ·
                    <button
                      className="text-emerald-600 hover:underline"
                      onClick={() => setTranslatedBody(null)}
                    >
                      View original
                    </button>
                  </div>
                )}

                {/* Quick reply */}
                <div className="mt-8 border border-border rounded-lg overflow-hidden">
                  <div className="bg-muted/30 px-3 py-2 text-xs text-muted-foreground border-b border-border">
                    Quick reply to {selected.fromAddr.split('@')[0]}
                  </div>
                  <Textarea
                    placeholder="Type a reply…"
                    className="border-0 resize-none focus-visible:ring-0 min-h-[80px] text-sm"
                  />
                  <div className="flex items-center gap-2 px-3 py-2 border-t border-border">
                    <Button size="sm">
                      <Send className="size-3.5 mr-1" />
                      Send
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs">
                      <Paperclip className="size-3.5 mr-1" />
                      Attach
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs">
                      <ImageIcon className="size-3.5 mr-1" />
                      Insert image
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs ml-auto">
                      <Smile className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </>
        )}
      </div>

      {/* Compose sheet */}
      <Sheet open={composeOpen} onOpenChange={setComposeOpen}>
        <SheetContent className="w-[560px] sm:max-w-[560px] p-0 flex flex-col">
          <SheetHeader className="px-4 py-3 border-b border-border">
            <SheetTitle className="text-sm">New message</SheetTitle>
          </SheetHeader>
          <ComposeForm
            fromEmail={user?.email ?? ''}
            onSent={() => {
              setComposeOpen(false)
              loadEmails()
              toast.success('Sent', 'Your message has been sent.')
            }}
          />
        </SheetContent>
      </Sheet>

      {/* Mail settings dialog */}
      <MailSettingsDialog />
    </div>
  )
}

/* Mail Settings — filters, signatures, vacation responder, scheduled */
function MailSettingsDialog() {
  const toast = useToast()
  const [open, setOpen] = React.useState(false)
  const [tab, setTab] = React.useState('filters')

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2.5 rounded-md px-2.5 h-8 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors mt-2"
      >
        <SettingsIcon className="size-3.5" />
        <span className="flex-1 text-left">Mail settings</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mail settings</DialogTitle>
          </DialogHeader>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="filters"><Filter className="size-3.5 mr-1.5" /> Filters</TabsTrigger>
              <TabsTrigger value="signatures"><PenSquare className="size-3.5 mr-1.5" /> Signatures</TabsTrigger>
              <TabsTrigger value="vacation"><Briefcase className="size-3.5 mr-1.5" /> Vacation</TabsTrigger>
              <TabsTrigger value="scheduled"><CalendarClock className="size-3.5 mr-1.5" /> Scheduled</TabsTrigger>
            </TabsList>
            <TabsContent value="filters"><FiltersPanel /></TabsContent>
            <TabsContent value="signatures"><SignaturesPanel /></TabsContent>
            <TabsContent value="vacation"><VacationPanel /></TabsContent>
            <TabsContent value="scheduled"><ScheduledPanel /></TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
}

function FiltersPanel() {
  const toast = useToast()
  const [filters, setFilters] = React.useState<any[]>([])
  const [name, setName] = React.useState('')
  const [fromContains, setFrom] = React.useState('')
  const [subjectContains, setSubject] = React.useState('')
  const [bodyContains, setBody] = React.useState('')
  const [actionFolder, setActionFolder] = React.useState('inbox')
  const [actionLabel, setActionLabel] = React.useState('')
  const [actionStar, setActionStar] = React.useState(false)
  const [actionImportant, setActionImportant] = React.useState(false)

  const load = async () => {
    const r = await fetch('/api/emails/filters')
    const d = await r.json()
    setFilters(d.filters ?? [])
  }
  React.useEffect(() => { load() }, [])

  const submit = async () => {
    if (!name) { toast.error('Name required'); return }
    await fetch('/api/emails/filters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, fromContains, subjectContains, bodyContains,
        actionFolder, actionLabel, actionStar, actionImportant,
        priority: filters.length,
      }),
    })
    setName(''); setFrom(''); setSubject(''); setBody(''); setActionLabel('')
    load()
    toast.success('Filter created')
  }

  return (
    <div className="space-y-4 pt-2">
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="text-sm font-medium">New filter</div>
          <Input placeholder="Filter name" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="From contains" value={fromContains} onChange={(e) => setFrom(e.target.value)} />
            <Input placeholder="Subject contains" value={subjectContains} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <Input placeholder="Body contains" value={bodyContains} onChange={(e) => setBody(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Select value={actionFolder} onValueChange={setActionFolder}>
              <SelectTrigger><SelectValue placeholder="Move to folder" /></SelectTrigger>
              <SelectContent>
                {['inbox', 'archive', 'trash'].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Apply label (optional)" value={actionLabel} onChange={(e) => setActionLabel(e.target.value)} />
          </div>
          <div className="flex gap-3 text-xs">
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={actionStar} onChange={(e) => setActionStar(e.target.checked)} /> Star</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={actionImportant} onChange={(e) => setActionImportant(e.target.checked)} /> Important</label>
          </div>
          <Button onClick={submit} size="sm"><Plus className="size-3.5 mr-1" /> Create filter</Button>
        </CardContent>
      </Card>
      <div className="space-y-2">
        {filters.length === 0 && <div className="text-center text-xs text-muted-foreground py-4">No filters yet.</div>}
        {filters.map((f) => (
          <div key={f.id} className="flex items-center gap-2 p-2.5 rounded-md border border-border">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{f.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {[
                  f.fromContains && `from:${f.fromContains}`,
                  f.subjectContains && `subject:${f.subjectContains}`,
                  f.bodyContains && `body:${f.bodyContains}`,
                ].filter(Boolean).join(' · ') || 'No conditions'}
                {' → '}
                {f.actionFolder}
                {f.actionLabel && ` + label:${f.actionLabel}`}
              </div>
            </div>
            <Switch checked={f.isActive} onCheckedChange={async (v) => {
              await fetch('/api/emails/filters', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: f.id, isActive: v }),
              })
              load()
            }} />
            <Button variant="ghost" size="icon" className="size-7" onClick={async () => {
              await fetch(`/api/emails/filters?id=${f.id}`, { method: 'DELETE' })
              load()
            }}>
              <Trash className="size-3.5 text-muted-foreground" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

function SignaturesPanel() {
  const toast = useToast()
  const [sigs, setSigs] = React.useState<any[]>([])
  const [name, setName] = React.useState('')
  const [body, setBody] = React.useState('')
  const [isDefault, setIsDefault] = React.useState(false)

  const load = async () => {
    const r = await fetch('/api/emails/signatures')
    const d = await r.json()
    setSigs(d.signatures ?? [])
  }
  React.useEffect(() => { load() }, [])

  const submit = async () => {
    if (!name || !body) { toast.error('Name and body required'); return }
    await fetch('/api/emails/signatures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, body, isDefault }),
    })
    setName(''); setBody(''); setIsDefault(false)
    load()
    toast.success('Signature saved')
  }

  return (
    <div className="space-y-4 pt-2">
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="text-sm font-medium">New signature</div>
          <Input placeholder="Signature name" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea rows={5} placeholder={'Best regards,\nAlex Demo\nBridge'} value={body} onChange={(e) => setBody(e.target.value)} />
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
            Set as default signature
          </label>
          <Button onClick={submit} size="sm"><Plus className="size-3.5 mr-1" /> Save signature</Button>
        </CardContent>
      </Card>
      <div className="space-y-2">
        {sigs.length === 0 && <div className="text-center text-xs text-muted-foreground py-4">No signatures yet.</div>}
        {sigs.map((s) => (
          <div key={s.id} className="p-2.5 rounded-md border border-border">
            <div className="flex items-center gap-2 mb-1">
              <div className="text-sm font-medium flex-1">{s.name}</div>
              {s.isDefault && <Badge variant="secondary" className="text-[10px]">Default</Badge>}
              <Button variant="ghost" size="icon" className="size-7" onClick={async () => {
                await fetch(`/api/emails/signatures?id=${s.id}`, { method: 'DELETE' })
                load()
              }}>
                <Trash className="size-3.5 text-muted-foreground" />
              </Button>
            </div>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans">{s.body}</pre>
          </div>
        ))}
      </div>
    </div>
  )
}

function VacationPanel() {
  const toast = useToast()
  const [enabled, setEnabled] = React.useState(false)
  const [subject, setSubject] = React.useState('Out of office')
  const [body, setBody] = React.useState('')
  const [startDate, setStartDate] = React.useState('')
  const [endDate, setEndDate] = React.useState('')

  const load = async () => {
    const r = await fetch('/api/emails/vacation')
    const d = await r.json()
    if (d.vacation) {
      setEnabled(d.vacation.enabled)
      setSubject(d.vacation.subject)
      setBody(d.vacation.body)
      setStartDate(d.vacation.startDate ? d.vacation.startDate.slice(0, 10) : '')
      setEndDate(d.vacation.endDate ? d.vacation.endDate.slice(0, 10) : '')
    }
  }
  React.useEffect(() => { load() }, [])

  const save = async () => {
    await fetch('/api/emails/vacation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled, subject, body, startDate, endDate }),
    })
    toast.success('Vacation responder saved')
  }

  return (
    <div className="space-y-3 pt-2">
      <label className="flex items-center justify-between p-2.5 rounded-md border border-border">
        <span className="text-sm font-medium">Enable vacation responder</span>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </label>
      <div className="space-y-2">
        <Label>Subject</Label>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Body</Label>
        <Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Hi, thanks for reaching out. I'm currently out of office and will respond when I return." />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label>Start date</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>End date (optional)</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>
      <Button onClick={save}>Save vacation responder</Button>
    </div>
  )
}

function ScheduledPanel() {
  const toast = useToast()
  const [items, setItems] = React.useState<any[]>([])

  const load = async () => {
    const r = await fetch('/api/emails/scheduled')
    const d = await r.json()
    setItems(d.scheduled ?? [])
  }
  React.useEffect(() => { load() }, [])

  return (
    <div className="space-y-2 pt-2">
      {items.length === 0 && <div className="text-center text-xs text-muted-foreground py-8">No scheduled emails. Use the schedule option in compose.</div>}
      {items.map((s) => (
        <div key={s.id} className="p-2.5 rounded-md border border-border flex items-center gap-2">
          <CalendarClock className="size-4 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{s.subject}</div>
            <div className="text-xs text-muted-foreground">
              To: {s.toAddr} · {new Date(s.sendAt).toLocaleString()}
            </div>
          </div>
          <Badge variant={s.status === 'scheduled' ? 'outline' : 'secondary'}>{s.status}</Badge>
          {s.status === 'scheduled' && (
            <Button variant="ghost" size="icon" className="size-7" onClick={async () => {
              await fetch(`/api/emails/scheduled?id=${s.id}`, { method: 'DELETE' })
              load()
              toast.info('Scheduled email cancelled')
            }}>
              <Trash className="size-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}

function ComposeForm({
  fromEmail,
  onSent,
}: {
  fromEmail: string
  onSent: () => void
}) {
  const [to, setTo] = React.useState('')
  const [subject, setSubject] = React.useState('')
  const [body, setBody] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const toast = useToast()

  async function send() {
    if (!to || !subject || !body) {
      toast.error('Missing fields', 'Recipient, subject, and body are required.')
      return
    }
    setBusy(true)
    try {
      const r = await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body }),
      })
      if (!r.ok) {
        const d = await r.json()
        toast.error('Failed to send', d.error)
        return
      }
      onSent()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 p-4 space-y-3">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <Label className="text-xs text-muted-foreground w-12 shrink-0">To</Label>
          <Input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com"
            className="border-0 px-0 h-7 focus-visible:ring-0 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <Label className="text-xs text-muted-foreground w-12 shrink-0">Subject</Label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Message subject"
            className="border-0 px-0 h-7 focus-visible:ring-0 text-sm"
          />
        </div>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your message…"
          className="border-0 resize-none focus-visible:ring-0 min-h-[280px] text-sm leading-relaxed"
        />
      </div>
      <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
        <Button size="sm" onClick={send} disabled={busy}>
          <Send className="size-3.5 mr-1" />
          {busy ? 'Sending…' : 'Send'}
        </Button>
        <Button variant="ghost" size="sm" className="text-xs">
          <Paperclip className="size-3.5 mr-1" />
          Attach
        </Button>
        <Button variant="ghost" size="sm" className="text-xs ml-auto">
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

function timeShort(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
