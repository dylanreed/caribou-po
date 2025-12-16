'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Image from 'next/image'

function formatImageUrl(url: string | null): string | null {
  if (!url) return null
  if (url.includes('?')) return url.includes('ssl=') ? url : `${url}&ssl=1`
  return `${url}?ssl=1`
}

interface Supplier {
  id: string
  name: string
  displayName: string | null
}

interface EngravingArt {
  id: string
  name: string
  imageUrl: string
  position: string
  isActive: boolean
}

interface Product {
  id: string
  sku: string
  name: string
  unitPrice: number
  unit: string
  material?: string | null
  imageUrl?: string | null
  engravingArt?: EngravingArt[]
}

interface YoyoColor {
  id: string
  name: string
  imageUrl: string | null
}

interface LineItemEngraving {
  engravingArtId: string
}

interface LineItem {
  productId: string
  colorId: string | null
  ringColor: string
  quantity: number
  product?: Product
  color?: YoyoColor | null
  engravings: LineItemEngraving[]
}

function hasSteel(material: string | null | undefined): boolean {
  return material?.includes('Steel') || false
}

interface PurchaseOrderFormProps {
  initialData?: {
    id: string
    poNumber: string
    createdAt: string
    supplierId: string
    notes: string
    lineItems: LineItem[]
  }
}

export function PurchaseOrderForm({ initialData }: PurchaseOrderFormProps) {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [colors, setColors] = useState<YoyoColor[]>([])
  const [saving, setSaving] = useState(false)

  const [poNumber, setPoNumber] = useState(initialData?.poNumber || '')
  const [createdAt, setCreatedAt] = useState(initialData?.createdAt ? initialData.createdAt.split('T')[0] : new Date().toISOString().split('T')[0])
  const [supplierId, setSupplierId] = useState(initialData?.supplierId || '')
  const [notes, setNotes] = useState(initialData?.notes || '')
  const [lineItems, setLineItems] = useState<LineItem[]>(
    initialData?.lineItems.map(item => ({
      ...item,
      engravings: item.engravings || [],
    })) || []
  )

  const isEditing = !!initialData?.id

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [suppliersRes, productsRes, colorsRes] = await Promise.all([
      fetch('/api/suppliers'),
      fetch('/api/products?activeOnly=true'),
      fetch('/api/colors?activeOnly=true'),
    ])
    setSuppliers(await suppliersRes.json())
    setProducts(await productsRes.json())
    setColors(await colorsRes.json())
  }

  function addLineItem() {
    if (products.length === 0) return
    const product = products[0]
    setLineItems([
      ...lineItems,
      {
        productId: product.id,
        colorId: null,
        ringColor: '',
        quantity: 1,
        product,
        color: null,
        engravings: [],
      },
    ])
  }

  function updateLineItem(index: number, field: string, value: string | number | null) {
    const updated = [...lineItems]
    if (field === 'productId') {
      const product = products.find((p) => p.id === value)
      if (product) {
        updated[index] = {
          ...updated[index],
          productId: value as string,
          product,
          ringColor: '', // Reset ring color when product changes
          engravings: [], // Reset engravings when product changes
        }
      }
    } else if (field === 'colorId') {
      const color = value ? colors.find((c) => c.id === value) : null
      updated[index] = {
        ...updated[index],
        colorId: value as string | null,
        color,
      }
    } else if (field === 'ringColor') {
      updated[index] = {
        ...updated[index],
        ringColor: value as string,
      }
    } else if (field === 'quantity') {
      updated[index] = { ...updated[index], quantity: parseInt(value as string) || 1 }
    }
    setLineItems(updated)
  }

  function toggleEngraving(lineItemIndex: number, engravingArtId: string) {
    const updated = [...lineItems]
    const item = updated[lineItemIndex]
    const existingIndex = item.engravings.findIndex(e => e.engravingArtId === engravingArtId)

    if (existingIndex >= 0) {
      // Remove engraving if already selected
      item.engravings = item.engravings.filter(e => e.engravingArtId !== engravingArtId)
    } else {
      // Add new engraving
      item.engravings.push({ engravingArtId })
    }

    setLineItems(updated)
  }

  function removeLineItem(index: number) {
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supplierId) {
      alert('Please select a supplier')
      return
    }
    if (lineItems.length === 0) {
      alert('Please add at least one line item')
      return
    }

    setSaving(true)

    const data = {
      poNumber: isEditing ? poNumber : undefined, // Only send poNumber when editing
      createdAt: createdAt ? new Date(createdAt).toISOString() : undefined,
      supplierId,
      notes,
      lineItems: lineItems.map((item) => ({
        productId: item.productId,
        colorId: item.colorId,
        ringColor: item.ringColor || null,
        quantity: item.quantity,
        engravings: item.engravings,
      })),
    }

    const url = isEditing
      ? `/api/purchase-orders/${initialData.id}`
      : '/api/purchase-orders'
    const method = isEditing ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to save purchase order')
      }

      const po = await res.json()
      router.push(`/purchase-orders/${po.id}`)
      router.refresh()
    } catch (error) {
      setSaving(false)
      alert(error instanceof Error ? error.message : 'Failed to save purchase order')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Order Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PO Number
              </label>
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-caramel-600"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order Date
            </label>
            <input
              type="date"
              value={createdAt}
              onChange={(e) => setCreatedAt(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-caramel-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier *
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-caramel-600"
            >
              <option value="">Select a supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.displayName || supplier.name}
                </option>
              ))}
            </select>
          </div>
          <div className={isEditing ? "" : "md:col-span-2"}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes for this order"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-caramel-600"
            />
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">Line Items</h2>
          <button
            type="button"
            onClick={addLineItem}
            disabled={products.length === 0}
            className="bg-maroon-800 hover:bg-maroon-900 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          >
            Add Item
          </button>
        </div>

        {lineItems.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No items added yet. Click &quot;Add Item&quot; to begin.
          </p>
        ) : (
          <div className="space-y-4">
            {lineItems.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  {/* Product Selection */}
                  <div className="md:col-span-4">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Product
                    </label>
                    <select
                      value={item.productId}
                      onChange={(e) =>
                        updateLineItem(index, 'productId', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-caramel-600 text-sm"
                    >
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.sku} - {product.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Color Selection */}
                  <div className={hasSteel(item.product?.material) ? "md:col-span-2" : "md:col-span-3"}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Color
                    </label>
                    <div className="flex gap-2 items-center">
                      {item.color?.imageUrl && (
                        <div className="relative w-10 h-10 rounded-md overflow-hidden flex-shrink-0 border border-gray-200">
                          <Image
                            src={formatImageUrl(item.color.imageUrl)!}
                            alt={item.color.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      )}
                      <select
                        value={item.colorId || ''}
                        onChange={(e) =>
                          updateLineItem(index, 'colorId', e.target.value || null)
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-caramel-600 text-sm"
                      >
                        <option value="">No color</option>
                        {colors.map((color) => (
                          <option key={color.id} value={color.id}>
                            {color.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Ring Color - Only show for steel products */}
                  {hasSteel(item.product?.material) && (
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Ring Color
                      </label>
                      <input
                        type="text"
                        value={item.ringColor}
                        onChange={(e) =>
                          updateLineItem(index, 'ringColor', e.target.value)
                        }
                        placeholder="e.g. Raw, Black, Silver"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-caramel-600 text-sm"
                      />
                    </div>
                  )}

                  {/* Quantity */}
                  <div className={hasSteel(item.product?.material) ? "md:col-span-2" : "md:col-span-3"}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Qty
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(index, 'quantity', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-caramel-600 text-sm"
                    />
                  </div>

                  {/* Remove */}
                  <div className="md:col-span-2 flex items-end justify-end">
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      className="text-red-600 hover:text-red-900 text-sm mb-2"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* Engraving Art Section */}
                {item.product?.engravingArt && item.product.engravingArt.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Engraving Art
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {item.product.engravingArt.map((art) => {
                        const isSelected = item.engravings.some(e => e.engravingArtId === art.id)
                        return (
                          <button
                            key={art.id}
                            type="button"
                            onClick={() => toggleEngraving(index, art.id)}
                            className={`relative border rounded-lg p-2 transition-colors ${isSelected ? 'border-maroon-600 bg-maroon-50' : 'border-gray-200 hover:border-gray-300'}`}
                          >
                            {isSelected && (
                              <div className="absolute top-1 right-1 w-5 h-5 bg-maroon-600 rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                            <div className="relative w-full aspect-square mb-2 rounded overflow-hidden bg-gray-100">
                              <Image
                                src={formatImageUrl(art.imageUrl)!}
                                alt={art.name}
                                fill
                                className="object-contain"
                                unoptimized
                              />
                            </div>
                            <div className="text-xs text-center">
                              <div className="font-medium text-gray-900 truncate" title={art.name}>
                                {art.name}
                              </div>
                              <div className="text-gray-500">{art.position}</div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    {item.engravings.length > 0 && (
                      <div className="mt-2 text-xs text-gray-600">
                        {item.engravings.length} engraving{item.engravings.length !== 1 ? 's' : ''} selected
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-maroon-800 hover:bg-maroon-900 text-white rounded-md font-medium transition-colors disabled:opacity-50"
        >
          {saving
            ? 'Saving...'
            : isEditing
            ? 'Update Purchase Order'
            : 'Create Purchase Order'}
        </button>
      </div>
    </form>
  )
}
