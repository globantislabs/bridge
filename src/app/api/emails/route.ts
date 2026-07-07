import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { sendEmail } from '@/lib/mailer'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const folder = searchParams.get('folder') || 'inbox'
  const q = searchParams.get('q')
  const label = searchParams.get('label')
  const starred = searchParams.get('starred') === '1'
  const important = searchParams.get('important') === '1'

  let where: any = { ownerId: user.id, folder }
  if (q) {
    where.OR = [
      { subject: { contains: q } },
      { bodyPlain: { contains: q } },
      { fromAddr: { contains: q } },
      { toAddr: { contains: q } },
    ]
  }
  if (label) {
    where.labelsCsv = { contains: label }
  }
  if (starred) where.isStarred = true
  if (important) where.isImportant = true

  const emails = await db.email.findMany({
    where,
    orderBy: { receivedAt: 'desc' },
    take: 200,
  })
  // Group by threadId, pick latest
  const byThread = new Map<string, typeof emails[number]>()
  for (const e of emails) {
    const existing = byThread.get(e.threadId)
    if (!existing || (e.receivedAt?.getTime() ?? 0) > (existing.receivedAt?.getTime() ?? 0)) {
      byThread.set(e.threadId, e)
    }
  }
  return NextResponse.json({ emails: Array.from(byThread.values()) })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const {
    to, subject, body: emailBody, cc, bcc, label,
    threadId, signatureId, scheduledAt, isDraft,
  } = body as {
    to: string
    subject: string
    body: string
    cc?: string
    bcc?: string
    label?: string
    threadId?: string
    signatureId?: string
    scheduledAt?: string
    isDraft?: boolean
  }

  if (isDraft) {
    // Save as draft
    const draft = await db.email.create({
      data: {
        ownerId: user.id,
        threadId: threadId || `draft-${Date.now()}`,
        fromAddr: user.email,
        toAddr: to || '',
        ccAddr: cc || null,
        bccAddr: bcc || null,
        subject: subject || '(no subject)',
        bodyPlain: emailBody || '',
        snippet: (emailBody || '').slice(0, 120).replace(/\n/g, ' '),
        isRead: true,
        isDraft: true,
        isSent: false,
        folder: 'drafts',
        labelsCsv: label || '',
        receivedAt: new Date(),
      },
    })
    return NextResponse.json({ email: draft })
  }

  if (scheduledAt) {
    // Schedule send
    const scheduled = await db.scheduledEmail.create({
      data: {
        ownerId: user.id,
        toAddr: to,
        ccAddr: cc || null,
        bccAddr: bcc || null,
        subject,
        body: emailBody,
        signatureId: signatureId || null,
        sendAt: new Date(scheduledAt),
        status: 'scheduled',
      },
    })
    return NextResponse.json({ scheduled })
  }

  if (!to || !subject || !emailBody) {
    return NextResponse.json({ error: 'to, subject, body required' }, { status: 400 })
  }

  // Apply signature
  let finalBody = emailBody
  if (signatureId) {
    const sig = await db.emailSignature.findUnique({ where: { id: signatureId, ownerId: user.id } })
    if (sig) finalBody = `${emailBody}\n\n---\n${sig.body}`
  } else {
    // Default signature
    const defSig = await db.emailSignature.findFirst({ where: { ownerId: user.id, isDefault: true } })
    if (defSig) finalBody = `${emailBody}\n\n---\n${defSig.body}`
  }

  const tid = threadId || `thread-${Math.random().toString(36).slice(2, 12)}`
  const email = await db.email.create({
    data: {
      ownerId: user.id,
      threadId: tid,
      fromAddr: user.email,
      toAddr: to,
      ccAddr: cc || null,
      bccAddr: bcc || null,
      subject,
      bodyPlain: finalBody,
      snippet: finalBody.slice(0, 120).replace(/\n/g, ' '),
      isRead: true,
      isSent: true,
      folder: 'sent',
      labelsCsv: label || '',
      sentAt: new Date(),
      receivedAt: new Date(),
    },
  })

  // Actually send via SMTP (if admin has configured SMTP in system settings).
  // We do this AFTER the DB save so a slow SMTP doesn't block the UI.
  // If SMTP fails we mark the email with a label so the user can retry.
  try {
    const result = await sendEmail({
      to,
      cc,
      bcc,
      subject,
      text: finalBody,
      from: user.email,
    })
    if (!result.ok) {
      // Tag the email so the user knows SMTP failed
      await db.email.update({
        where: { id: email.id },
        data: {
          labelsCsv: [label || '', 'smtp-failed'].filter(Boolean).join(','),
        },
      })
      // Don't fail the whole request — email is saved in sent folder.
      return NextResponse.json({
        email,
        warning: `Email saved, but SMTP delivery failed: ${result.error}`,
      })
    }
    if (result.skipped) {
      // SMTP not configured — email is saved locally only.
      return NextResponse.json({
        email,
        warning: 'SMTP not configured. Email saved locally but not delivered. Ask your admin to configure SMTP in Admin Panel → System settings.',
      })
    }
  } catch (e: any) {
    // Network error during SMTP — email is still saved in DB
    return NextResponse.json({
      email,
      warning: `Email saved, but SMTP delivery errored: ${String(e?.message || e)}`,
    })
  }

  // Auto-create contact if not exists
  for (const addr of [to, ...(cc?.split(',') ?? [])].filter(Boolean)) {
    const clean = addr.trim().toLowerCase()
    if (clean) {
      try {
        await db.contact.upsert({
          where: { ownerId_email: { ownerId: user.id, email: clean } },
          create: { ownerId: user.id, email: clean, name: clean.split('@')[0] },
          update: {},
        })
      } catch {}
    }
  }

  return NextResponse.json({ email })
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { id, action, label } = body as {
    id: string
    action: 'read' | 'unread' | 'star' | 'unstar' | 'archive' | 'trash' | 'important' | 'unimportant' | 'addLabel' | 'removeLabel' | 'delete'
    label?: string
  }
  if (!id || !action) {
    return NextResponse.json({ error: 'id and action required' }, { status: 400 })
  }
  const data: any = {}
  if (action === 'read') data.isRead = true
  if (action === 'unread') data.isRead = false
  if (action === 'star') data.isStarred = true
  if (action === 'unstar') data.isStarred = false
  if (action === 'important') data.isImportant = true
  if (action === 'unimportant') data.isImportant = false
  if (action === 'archive') data.folder = 'archive'
  if (action === 'trash') data.folder = 'trash'
  if (action === 'delete') {
    await db.email.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  }
  if (action === 'addLabel' || action === 'removeLabel') {
    const e = await db.email.findUnique({ where: { id } })
    if (!e) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const labels = e.labelsCsv ? e.labelsCsv.split(',').filter(Boolean) : []
    if (action === 'addLabel' && label && !labels.includes(label)) labels.push(label)
    if (action === 'removeLabel' && label) {
      const idx = labels.indexOf(label)
      if (idx >= 0) labels.splice(idx, 1)
    }
    data.labelsCsv = labels.join(',')
  }
  const email = await db.email.update({ where: { id }, data })
  return NextResponse.json({ email })
}
