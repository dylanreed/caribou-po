import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// Extract Shopify product handle from URL
function extractProductHandle(url: string): string | null {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/')
    const productsIndex = pathParts.indexOf('products')
    if (productsIndex !== -1 && pathParts[productsIndex + 1]) {
      return pathParts[productsIndex + 1]
    }
    return null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('productId')

  const where: { productId?: string; isActive: boolean } = { isActive: true }
  if (productId) {
    where.productId = productId
  }

  const retailProducts = await prisma.retailProduct.findMany({
    where,
    include: {
      retailer: true,
      snapshots: {
        orderBy: { fetchedAt: 'desc' },
        take: 1,
      },
    },
    orderBy: {
      retailer: { sortOrder: 'asc' },
    },
  })

  return NextResponse.json(retailProducts)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const productHandle = extractProductHandle(body.productUrl)

  const retailProduct = await prisma.retailProduct.create({
    data: {
      productId: body.productId,
      retailerId: body.retailerId,
      productUrl: body.productUrl,
      productHandle,
    },
    include: {
      retailer: true,
    },
  })

  return NextResponse.json(retailProduct)
}
