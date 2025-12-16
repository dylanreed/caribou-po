import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// Generate PO number for manually created POs (YEAR-MM-XXX format)
async function generatePONumber(): Promise<string> {
  const now = new Date()
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const prefix = `PO-${year}-${month}-`

  // Find the highest number for this month
  const existingPOs = await prisma.purchaseOrder.findMany({
    where: {
      poNumber: { startsWith: prefix },
    },
    select: { poNumber: true },
    orderBy: { poNumber: 'desc' },
    take: 1,
  })

  let counter = 1
  if (existingPOs.length > 0) {
    const lastNum = existingPOs[0].poNumber.replace(prefix, '')
    const parsed = parseInt(lastNum, 10)
    if (!isNaN(parsed)) {
      counter = parsed + 1
    }
  }

  return `${prefix}${counter.toString().padStart(3, '0')}`
}

interface ParsedPO {
  poNumber: string | null
  date: string | null
  notes: string | null
  items: {
    product: string
    color: string
    quantity: number
    notes: string
    rimColor?: string
  }[]
}

function parseCaribouCSV(csvText: string): ParsedPO {
  // Use multi-line aware CSV parser
  const rows = parseCSVLines(csvText)

  const result: ParsedPO = {
    poNumber: null,
    date: null,
    notes: null,
    items: [],
  }

  let headerRowIndex = -1
  let productIdx = -1
  let colorIdx = -1
  let qtyIdx = -1
  let notesIdx = -1
  let rimColorIdx = -1
  let currentProduct = ''

  // Helper to find column index by checking multiple possible names
  function findColumnIndex(lowerValues: string[], possibleNames: string[]): number {
    for (const name of possibleNames) {
      const idx = lowerValues.findIndex(v => v.includes(name))
      if (idx !== -1) return idx
    }
    return -1
  }

  // Helper to clean multi-line cell values - take first line for color name
  function cleanColorName(val: string): string {
    // Take first line, remove asterisks and extra notes
    const firstLine = val.split('\n')[0].trim()
    return firstLine.replace(/^\*+|\*+$/g, '').trim()
  }

  for (let i = 0; i < rows.length; i++) {
    const values = rows[i]

    // Look for PO number in early rows - check various formats
    if (i < 15) {
      for (let j = 0; j < values.length; j++) {
        const val = values[j]?.trim() || ''
        const lowerVal = val.toLowerCase()

        // Check for PO number patterns
        if ((lowerVal === 'po:' || lowerVal === 'po' || lowerVal === 'po #' || lowerVal === 'po#') && values[j + 1]) {
          result.poNumber = values[j + 1].trim()
        } else if (lowerVal.startsWith('po:') || lowerVal.startsWith('po #')) {
          const poMatch = val.match(/po[:#]?\s*(.+)/i)
          if (poMatch && poMatch[1]) {
            result.poNumber = poMatch[1].trim()
          }
        }

        // Check for date patterns
        if (lowerVal.startsWith('date:') || lowerVal === 'date') {
          if (lowerVal === 'date' && values[j + 1]) {
            result.date = values[j + 1].trim()
          } else {
            const dateMatch = val.match(/date:?\s*(.+)/i)
            if (dateMatch) {
              result.date = dateMatch[1].trim()
            }
          }
        }

        // Look for production notes
        if (lowerVal.includes('production notes') || lowerVal.includes('notes:')) {
          result.notes = val
        }
      }
    }

    // Find header row - look for columns that indicate product data
    const lowerValues = values.map(v => (v || '').toLowerCase().trim())
    if (headerRowIndex === -1) {
      // Look for color column (required)
      const hasColor = findColumnIndex(lowerValues, ['color', 'colour', 'colorway']) !== -1
      // Look for quantity column (required)
      const hasQty = findColumnIndex(lowerValues, ['qty', 'quantity', 'amount', 'count', 'units']) !== -1

      if (hasColor && hasQty) {
        headerRowIndex = i

        // Find product column - try multiple possible names, default to first column
        productIdx = findColumnIndex(lowerValues, ['product', 'item', 'model', 'sku', 'name', 'yoyo', 'yo-yo'])
        if (productIdx === -1) productIdx = 0  // Default to first column

        colorIdx = findColumnIndex(lowerValues, ['color', 'colour', 'colorway'])
        qtyIdx = findColumnIndex(lowerValues, ['qty', 'quantity', 'amount', 'count', 'units'])
        notesIdx = findColumnIndex(lowerValues, ['notes', 'note', 'comments', 'comment'])
        rimColorIdx = findColumnIndex(lowerValues, ['rim color', 'rim', 'ring color', 'ring', 'steel color'])
        continue
      }
    }

    // Skip if we haven't found header yet
    if (headerRowIndex === -1) continue

    // Skip header row
    if (i === headerRowIndex) continue

    // Parse data rows
    const productVal = (values[productIdx] || '').trim()
    const rawColorVal = (values[colorIdx] || '').trim()
    const colorVal = cleanColorName(rawColorVal)
    const qtyVal = (values[qtyIdx] || '').trim()
    const notesVal = notesIdx >= 0 ? (values[notesIdx] || '').trim() : ''
    const rimColorVal = rimColorIdx >= 0 ? (values[rimColorIdx] || '').trim() : ''

    // Skip total/summary rows but DON'T stop processing - there may be more items after
    const lowerProduct = productVal.toLowerCase()
    const lowerColor = colorVal.toLowerCase()
    if (lowerProduct.includes('total') || lowerColor.includes('total') ||
        lowerProduct.includes('subtotal') || lowerColor.includes('subtotal') ||
        lowerProduct.includes('grand total') || lowerColor.includes('grand total') ||
        lowerProduct === 'engraving:' || lowerProduct === 'engraving') {
      continue
    }

    // Skip if no quantity or quantity is 0
    if (qtyVal === '') continue

    // Parse quantity - handle various formats like "50", "50 pcs", etc.
    const qtyMatch = qtyVal.match(/(\d+)/)
    if (!qtyMatch) continue
    const quantity = parseInt(qtyMatch[1], 10)
    if (isNaN(quantity) || quantity <= 0) {
      continue
    }

    // Track current product (product name may only appear on first row of a group)
    if (productVal) {
      currentProduct = productVal
    }

    // Skip if we don't have a product yet
    if (!currentProduct) {
      continue
    }

    // Skip if no color (but has quantity - probably a formatting row)
    if (!colorVal) {
      continue
    }

    result.items.push({
      product: currentProduct,
      color: colorVal,
      quantity,
      notes: notesVal,
      rimColor: rimColorVal,
    })
  }

  return result
}

// Parse CSV text handling multi-line quoted fields
function parseCSVLines(csvText: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentCell = ''
  let inQuotes = false

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i]
    const nextChar = csvText[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentCell += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell)
      currentCell = ''
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
      // End of row (not inside quotes)
      currentRow.push(currentCell)
      rows.push(currentRow)
      currentRow = []
      currentCell = ''
      if (char === '\r') i++ // Skip \n in \r\n
    } else if (char === '\r' && !inQuotes) {
      // Standalone \r as line ending
      currentRow.push(currentCell)
      rows.push(currentRow)
      currentRow = []
      currentCell = ''
    } else {
      currentCell += char
    }
  }

  // Don't forget the last cell/row
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell)
    rows.push(currentRow)
  }

  return rows
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const supplierId = formData.get('supplierId') as string

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!supplierId) {
      return NextResponse.json(
        { success: false, error: 'No supplier selected' },
        { status: 400 }
      )
    }

    // Verify supplier exists
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    })

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 400 }
      )
    }

    // Parse CSV
    const csvText = await file.text()
    const parsed = parseCaribouCSV(csvText)

    if (parsed.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid line items found in CSV' },
        { status: 400 }
      )
    }

    // Process each item
    const lineItemsData: {
      productId: string
      colorId: string | null
      ringColor: string | null
      quantity: number
    }[] = []

    const errors: string[] = []
    const createdColors: string[] = []
    const createdProducts: string[] = []

    for (const item of parsed.items) {
      // Find product by name or SKU
      let product = await prisma.product.findFirst({
        where: {
          OR: [
            { name: { equals: item.product } },
            { sku: { equals: item.product } },
          ],
        },
      })

      if (!product) {
        // Auto-create the product
        const sku = `CL-${item.product.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)}`
        product = await prisma.product.create({
          data: {
            name: item.product,
            sku,
            unitPrice: 0,
            isActive: true,
          },
        })
        createdProducts.push(item.product)
      }

      // Find or create color
      let colorId: string | null = null
      if (item.color) {
        let color = await prisma.yoyoColor.findFirst({
          where: { name: item.color },
        })

        if (!color) {
          // Create the color
          color = await prisma.yoyoColor.create({
            data: {
              name: item.color,
              isActive: true,
            },
          })
          createdColors.push(item.color)
        }
        colorId = color.id
      }

      lineItemsData.push({
        productId: product.id,
        colorId,
        ringColor: item.rimColor || null,
        quantity: item.quantity,
      })
    }

    if (lineItemsData.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No valid line items could be processed',
          details: errors,
        },
        { status: 400 }
      )
    }

    // Create PO - use PO number from CSV if available, otherwise generate one
    let poNumber: string
    if (parsed.poNumber) {
      // Add PO- prefix if not present
      poNumber = parsed.poNumber.startsWith('PO-') ? parsed.poNumber : `PO-${parsed.poNumber}`

      // Check if this PO number already exists
      const existing = await prisma.purchaseOrder.findUnique({
        where: { poNumber },
      })
      if (existing) {
        return NextResponse.json(
          { success: false, error: `PO number ${poNumber} already exists` },
          { status: 400 }
        )
      }
    } else {
      poNumber = await generatePONumber()
    }

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId,
        status: 'DRAFT',
        notes: parsed.notes || undefined,
        lineItems: {
          create: lineItemsData,
        },
      },
      include: {
        lineItems: true,
      },
    })

    let message = `Created ${po.poNumber} with ${po.lineItems.length} items`
    if (createdProducts.length > 0) {
      message += `. Created ${createdProducts.length} new product(s): ${createdProducts.join(', ')}`
    }
    if (createdColors.length > 0) {
      message += `. Created ${createdColors.length} new color(s): ${createdColors.join(', ')}`
    }
    if (errors.length > 0) {
      message += `. ${errors.length} item(s) skipped.`
    }

    return NextResponse.json({
      success: true,
      message,
      poId: po.id,
      poNumber: po.poNumber,
      lineItemCount: po.lineItems.length,
      createdProducts: createdProducts.length > 0 ? createdProducts : undefined,
      createdColors: createdColors.length > 0 ? createdColors : undefined,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Import error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
