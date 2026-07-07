import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const filters = await db.emailFilter.findMany({
    where: { ownerId: user.id },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json({ filters })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const {
    name, fromContains, subjectContains, bodyContains,
    hasAttachment, actionFolder, actionLabel, actionStar, actionImportant,
    priority, isActive,
  } = body
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
  const filter = await db.emailFilter.create({
    data: {
      ownerId: user.id,
      name,
      fromContains: fromContains || null,
      subjectContains: subjectContains || null,
      bodyContains: bodyContains || null,
      hasAttachment: hasAttachment ?? false,
      actionFolder: actionFolder || 'inbox',
      actionLabel: actionLabel || null,
      actionStar: actionStar ?? false,
      actionImportant: actionImportant ?? false,
      priority: priority ?? 0,
      isActive: isActive ?? true,
    },
  })
  return NextResponse.json({ filter })
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const filter = await db.emailFilter.update({ where: { id, ownerId: user.id }, data: updates })
  return NextResponse.json({ filter })
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await db.emailFilter.delete({ where: { id, ownerId: user.id } })
  return NextResponse.json({ ok: true })
}
