import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  let where: any = { ownerId: user.id }
  if (q) {
    where.OR = [
      { email: { contains: q } },
      { name: { contains: q } },
    ]
  }
  const contacts = await db.contact.findMany({
    where,
    orderBy: { name: 'asc' },
    take: 500,
  })
  return NextResponse.json({ contacts })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { email, name, notes, starred } = body
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })
  const contact = await db.contact.upsert({
    where: { ownerId_email: { ownerId: user.id, email: email.toLowerCase() } },
    create: {
      ownerId: user.id,
      email: email.toLowerCase(),
      name: name || email.split('@')[0],
      notes: notes || null,
      starred: starred ?? false,
    },
    update: { name: name ?? undefined, notes: notes ?? undefined, starred: starred ?? undefined },
  })
  return NextResponse.json({ contact })
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await db.contact.delete({ where: { id, ownerId: user.id } })
  return NextResponse.json({ ok: true })
}
