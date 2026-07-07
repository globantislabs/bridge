import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const items = await db.scheduledEmail.findMany({
    where: { ownerId: user.id },
    orderBy: { sendAt: 'asc' },
  })
  return NextResponse.json({ scheduled: items })
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await db.scheduledEmail.updateMany({
    where: { id, ownerId: user.id, status: 'scheduled' },
    data: { status: 'cancelled' },
  })
  return NextResponse.json({ ok: true })
}
