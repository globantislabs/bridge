import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const plans = await db.plan.findMany({
    where: { isActive: true },
    orderBy: { priceMonthly: 'asc' },
  })
  return NextResponse.json({ plans })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { userId, planId, interval } = body as {
    userId: string
    planId: string
    interval?: 'monthly' | 'yearly'
  }
  if (!userId || !planId) {
    return NextResponse.json({ error: 'userId, planId required' }, { status: 400 })
  }
  // Cancel existing subs
  await db.subscription.updateMany({
    where: { userId, status: 'active' },
    data: { status: 'canceled' },
  })
  const now = new Date()
  const end = new Date(now)
  if ((interval ?? 'monthly') === 'monthly') end.setMonth(end.getMonth() + 1)
  else end.setFullYear(end.getFullYear() + 1)
  const sub = await db.subscription.create({
    data: {
      userId,
      planId,
      status: 'active',
      interval: interval ?? 'monthly',
      currentPeriodStart: now,
      currentPeriodEnd: end,
    },
  })
  // Create invoice
  const plan = await db.plan.findUnique({ where: { id: planId } })
  if (plan) {
    await db.invoice.create({
      data: {
        userId,
        planId,
        amount: (interval ?? 'monthly') === 'monthly' ? plan.priceMonthly : plan.priceYearly,
        currency: plan.currency,
        status: 'paid',
        number: `INV-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        issuedAt: now,
        periodStart: now,
        periodEnd: end,
      },
    })
  }
  return NextResponse.json({ subscription: sub })
}
