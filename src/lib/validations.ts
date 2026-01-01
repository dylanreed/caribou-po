import { z } from 'zod'

// Utility for safe number parsing
export const numericString = z.string().transform((val, ctx) => {
  const parsed = parseFloat(val)
  if (isNaN(parsed)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Invalid number',
    })
    return z.NEVER
  }
  return parsed
})

// Product schemas
export const productCreateSchema = z.object({
  sku: z.string().min(1, 'SKU is required').max(50),
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  unitPrice: z.union([z.number(), z.string()]).transform((val) => {
    const num = typeof val === 'string' ? parseFloat(val) : val
    return isNaN(num) ? 0 : Math.max(0, num)
  }),
  unit: z.string().max(50).default('each'),
  category: z.string().max(100).nullable().optional(),
  material: z.string().max(100).nullable().optional(),
  isActive: z.boolean().default(true),
})

export const productUpdateSchema = productCreateSchema.partial()

// Supplier schemas
export const supplierCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  displayName: z.string().max(200).nullable().optional(),
  email: z.string().email().max(254).nullable().optional().or(z.literal('')),
  phone: z.string().max(50).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  zip: z.string().max(20).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  paymentTerms: z.string().max(500).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

export const supplierUpdateSchema = supplierCreateSchema.partial()

// Purchase Order schemas
export const lineItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  colorId: z.string().nullable().optional(),
  ringColor: z.string().max(100).nullable().optional(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(1000000),
  engravings: z.array(z.object({
    engravingArtId: z.string().min(1),
  })).optional(),
})

export const purchaseOrderCreateSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  notes: z.string().max(2000).nullable().optional(),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
})

export const purchaseOrderUpdateSchema = z.object({
  supplierId: z.string().min(1).optional(),
  status: z.enum(['PROTOTYPE', 'DRAFT', 'ORDERED', 'IN_PRODUCTION', 'SHIPPED', 'RECEIVED', 'CANCELLED']).optional(),
  notes: z.string().max(2000).nullable().optional(),
  orderDate: z.string().datetime().nullable().optional(),
  expectedDate: z.string().datetime().nullable().optional(),
  actualDate: z.string().datetime().nullable().optional(),
})

// Quote schemas
export const quoteLineItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().min(1).max(1000000),
  unitCost: z.number().min(0).max(1000000),
  totalCost: z.number().min(0).max(1000000000),
  notes: z.string().max(1000).optional(),
})

export const quoteCreateSchema = z.object({
  quoteNumber: z.string().min(1, 'Quote number is required').max(100),
  quoteDate: z.string().min(1, 'Quote date is required'),
  quoteType: z.enum(['production', 'prototype']).default('production'),
  supplierId: z.string().nullable().optional(),
  purchaseOrderId: z.string().nullable().optional(),
  pdfUrl: z.string().url().nullable().optional(),
  totalCost: z.union([z.number(), z.string()]).transform((val) => {
    const num = typeof val === 'string' ? parseFloat(val) : val
    return isNaN(num) ? null : num
  }).nullable().optional(),
  shippingCost: z.union([z.number(), z.string()]).transform((val) => {
    const num = typeof val === 'string' ? parseFloat(val) : val
    return isNaN(num) ? null : num
  }).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  lineItems: z.array(quoteLineItemSchema).optional(),
})

// Color schemas
export const colorCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  hexCode: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional().nullable(),
  imageUrl: z.string().url().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  isActive: z.boolean().default(true),
})

export const colorUpdateSchema = colorCreateSchema.partial()

// Upload schemas
export const uploadFromUrlSchema = z.object({
  url: z.string().url('Invalid URL'),
  folder: z.enum(['colors', 'products', 'engraving', 'quotes']).default('colors'),
})

// ID parameter schema
export const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required'),
})

// Search params schema
export const searchParamsSchema = z.object({
  search: z.string().max(200).optional(),
  status: z.string().max(50).optional(),
  supplierId: z.string().optional(),
  activeOnly: z.enum(['true', 'false']).optional(),
})
