import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sigs = await db.emailSignature.findMany({
    where: { ownerId: user.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json({ signatures: sigs })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { name, body: sigBody, isDefault } = body
  if (!name || !sigBody) {
    return NextResponse.json({ error: 'name and body required' }, { status: 400 })
  }
  if (isDefault) {
    // unset other defaults
    await db.emailSignature.updateMany({
      where: { ownerId: user.id, isDefault: true },
      data: { isDefault: false },
    })
  }
  const sig = await db.emailSignature.create({
    data: { ownerId: user.id, name, body: sigBody, isDefault: isDefault ?? false },
  })
  return NextResponse.json({ signature: sig })
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { id, name, body: sigBody, isDefault } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  if (isDefault) {
    await db.emailSignature.updateMany({
      where: { ownerId: user.id, isDefault: true },
      data: { isDefault: false },
    })
  }
  const sig = await db.emailSignature.update({
    where: { id, ownerId: user.id },
    data: { name, body: sigBody, isDefault },
  })
  return NextResponse.json({ signature: sig })
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await db.emailSignature.delete({ where: { id, ownerId: user.id } })
  return NextResponse.json({ ok: true })
}
