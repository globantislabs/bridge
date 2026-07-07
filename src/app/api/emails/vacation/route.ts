import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const vac = await db.vacationResponder.findUnique({ where: { ownerId: user.id } })
  return NextResponse.json({ vacation: vac })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { enabled, subject, body: vacBody, startDate, endDate } = body
  const data = {
    enabled: enabled ?? false,
    subject: subject || 'Out of office',
    body: vacBody || '',
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
  }
  const vac = await db.vacationResponder.upsert({
    where: { ownerId: user.id },
    create: { ownerId: user.id, ...data },
    update: data,
  })
  return NextResponse.json({ vacation: vac })
}
