import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const invoices = await db.invoice.findMany({
    where: { userId: user.id },
    include: { plan: true },
    orderBy: { issuedAt: 'desc' },
    take: 50,
  })
  const subs = await db.subscription.findMany({
    where: { userId: user.id },
    include: { plan: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })
  const plans = await db.plan.findMany({ where: { isActive: true }, orderBy: { priceMonthly: 'asc' } })
  return NextResponse.json({ invoices, subscriptions: subs, plans })
}
