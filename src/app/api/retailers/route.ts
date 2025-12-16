import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const retailers = await prisma.retailer.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  })
  return NextResponse.json(retailers)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const retailer = await prisma.retailer.create({
    data: {
      name: body.name,
      baseUrl: body.baseUrl,
      logoUrl: body.logoUrl || null,
      sortOrder: body.sortOrder || 0,
    },
  })

  return NextResponse.json(retailer)
}
