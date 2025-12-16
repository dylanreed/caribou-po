'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { SuccessMessage } from '@/components/SuccessMessage'

interface Product {
  id: string
  name: string
  sku: string
}

interface QuoteLineItem {
  id: string
  productId: string
  quantity: number
  unitCost: number
  totalCost: number
  notes: string | null
  product: Product
}

interface PurchaseOrder {
  id: string
  poNumber: string
}

interface Quote {
  id: string
  quoteNumber: string | null
  quoteDate: string
  quoteType: string
  pdfUrl: string | null
  totalCost: number | null
  shippingCost: number | null
  notes: string | null
  supplierId: string | null
  purchaseOrderId: string | null
  supplier: { id: string; name: string; displayName: string | null } | null
  purchaseOrder: PurchaseOrder | null
  lineItems: QuoteLineItem[]
}

export default function QuoteEditPage() {
  const params = useParams()
  const router = useRouter()
  const quoteId = params.id as string

  const [quote, setQuote] = useState<Quote | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<{ id: string; name: string; displayName: string | null }[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    quoteNumber: '',
    quoteDate: '',
    quoteType: 'production',
    supplierId: '',
    purchaseOrderId: '',
    pdfUrl: '',
    shippingCost: '',
    notes: '',
  })

  const [lineItems, setLineItems] = useState<{
    id?: string
    productId: string
    quantity: string
    unitCost: string
    totalCost: string
    notes: string
  }[]>([])

  const clearSuccessMessage = useCallback(() => setSuccessMessage(null), [])

  useEffect(() => {
    fetchQuote()
    fetchProducts()
    fetchSuppliers()
    fetchPurchaseOrders()
  }, [quoteId])

  async function fetchQuote() {
    setLoading(true)
    try {
      const res = await fetch(`/api/quotes/${quoteId}`)
      if (!res.ok) {
        router.push('/quotes')
        return
      }
      const data: Quote = await res.json()
      setQuote(data)
      setFormData({
        quoteNumber: data.quoteNumber || '',
        quoteDate: data.quoteDate.split('T')[0],
        quoteType: data.quoteType,
        supplierId: data.supplierId || '',
        purchaseOrderId: data.purchaseOrderId || '',
        pdfUrl: data.pdfUrl || '',
        shippingCost: data.shippingCost?.toString() || '',
        notes: data.notes || '',
      })
      setLineItems(
        data.lineItems.map((item) => ({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity.toString(),
          unitCost: item.unitCost.toString(),
          totalCost: item.totalCost.toString(),
          notes: item.notes || '',
        }))
      )
    } catch (error) {
      console.error('Error fetching quote:', error)
      router.push('/quotes')
    }
    setLoading(false)
  }

  async function fetchProducts() {
    const res = await fetch('/api/products')
    const data = await res.json()
    setProducts(data)
  }

  async function fetchSuppliers() {
    const res = await fetch('/api/suppliers')
    const data = await res.json()
    setSuppliers(data)
  }

  async function fetchPurchaseOrders() {
    const res = await fetch('/api/purchase-orders')
    const data = await res.json()
    setPurchaseOrders(data.map((po: { id: string; poNumber: string }) => ({ id: po.id, poNumber: po.poNumber })))
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const uploadData = new FormData()
      uploadData.append('file', file)
      uploadData.append('folder', 'quotes')

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: uploadData,
      })

      const result = await res.json()
      if (result.success) {
        setFormData({ ...formData, pdfUrl: result.url })
        setSuccessMessage('PDF uploaded successfully!')
      } else {
        alert(`Upload failed: ${result.error}`)
      }
    } catch {
      alert('Upload failed')
    }
    setUploading(false)
  }

  function handleLineItemChange(index: number, field: string, value: string) {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }

    // Auto-calculate unit cost when quantity and total are set
    if ((field === 'quantity' || field === 'totalCost') && updated[index].quantity && updated[index].totalCost) {
      const qty = parseFloat(updated[index].quantity)
      const total = parseFloat(updated[index].totalCost)
      if (qty > 0 && total > 0) {
        updated[index].unitCost = (total / qty).toFixed(2)
      }
    }

    setLineItems(updated)
  }

  function addLineItem() {
    setLineItems([...lineItems, { productId: '', quantity: '', unitCost: '', totalCost: '', notes: '' }])
  }

  function removeLineItem(index: number) {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const validLineItems = lineItems.filter(item => item.productId && item.quantity && item.totalCost)
    if (validLineItems.length === 0) {
      alert('Please add at least one product with quantity and cost')
      return
    }

    setSaving(true)

    try {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          lineItems: validLineItems.map(item => ({
            id: item.id,
            productId: item.productId,
            quantity: parseInt(item.quantity),
            unitCost: parseFloat(item.unitCost),
            totalCost: parseFloat(item.totalCost),
            notes: item.notes || null,
          })),
        }),
      })

      if (res.ok) {
        setSuccessMessage('Quote updated successfully!')
        fetchQuote() // Refresh data
      } else {
        const data = await res.json()
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      alert(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    setSaving(false)
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-500">Quote not found</p>
        <Link href="/quotes" className="text-maroon-800 hover:text-maroon-900">
          Back to quotes
        </Link>
      </div>
    )
  }

  const calculatedTotal = lineItems.reduce((sum, item) => {
    const total = parseFloat(item.totalCost) || 0
    return sum + total
  }, 0)

  const grandTotal = calculatedTotal + (parseFloat(formData.shippingCost) || 0)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <SuccessMessage message={successMessage} onClear={clearSuccessMessage} />

      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/quotes" className="text-sm text-gray-500 hover:text-gray-700 mb-1 inline-block">
            &larr; Back to Quotes
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Edit Quote {quote.quoteNumber ? `#${quote.quoteNumber}` : ''}
          </h1>
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-4 py-2 bg-maroon-800 hover:bg-maroon-900 text-white rounded-md font-medium transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quote Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quote Number
              </label>
              <input
                type="text"
                value={formData.quoteNumber}
                onChange={(e) => setFormData({ ...formData, quoteNumber: e.target.value })}
                placeholder="Optional"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-caramel-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quote Date *
              </label>
              <input
                type="date"
                required
                value={formData.quoteDate}
                onChange={(e) => setFormData({ ...formData, quoteDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-caramel-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quote Type *
              </label>
              <select
                value={formData.quoteType}
                onChange={(e) => setFormData({ ...formData, quoteType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-caramel-600"
              >
                <option value="production">Production</option>
                <option value="prototype">Prototype</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier
              </label>
              <select
                value={formData.supplierId}
                onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-caramel-600"
              >
                <option value="">Select supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.displayName || s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Linked Purchase Order
              </label>
              <select
                value={formData.purchaseOrderId}
                onChange={(e) => setFormData({ ...formData, purchaseOrderId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-caramel-600"
              >
                <option value="">None</option>
                {purchaseOrders.map((po) => (
                  <option key={po.id} value={po.id}>{po.poNumber}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shipping Cost
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.shippingCost}
                  onChange={(e) => setFormData({ ...formData, shippingCost: e.target.value })}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-caramel-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PDF Quote
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileUpload}
                disabled={uploading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-caramel-600 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-maroon-800 file:text-white file:cursor-pointer disabled:opacity-50"
              />
              {uploading && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
              {formData.pdfUrl && (
                <a
                  href={formData.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 mt-1 inline-block"
                >
                  View PDF
                </a>
              )}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-caramel-600"
            />
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Products</h2>
            <button
              type="button"
              onClick={addLineItem}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              + Add Product
            </button>
          </div>

          <div className="space-y-3">
            {lineItems.map((item, index) => (
              <div key={item.id || index} className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 rounded-lg">
                <div className="col-span-4">
                  <label className="block text-xs text-gray-500 mb-1">Product *</label>
                  <select
                    value={item.productId}
                    onChange={(e) => handleLineItemChange(index, 'productId', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-caramel-600"
                  >
                    <option value="">Select product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Qty *</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                    placeholder="Qty"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-caramel-600"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Total Cost *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.totalCost}
                    onChange={(e) => handleLineItemChange(index, 'totalCost', e.target.value)}
                    placeholder="$0.00"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-caramel-600"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Unit Cost</label>
                  <input
                    type="text"
                    value={item.unitCost ? `$${parseFloat(item.unitCost).toFixed(2)}` : ''}
                    readOnly
                    placeholder="Auto"
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md bg-gray-100 text-gray-600"
                  />
                </div>
                <div className="col-span-2 flex items-center justify-end gap-2">
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-end">
              <div className="text-right">
                <div className="text-sm text-gray-500">
                  Subtotal: {formatCurrency(calculatedTotal)}
                </div>
                {formData.shippingCost && (
                  <div className="text-sm text-gray-500">
                    Shipping: {formatCurrency(parseFloat(formData.shippingCost))}
                  </div>
                )}
                <div className="text-lg font-medium text-gray-900">
                  Total: {formatCurrency(grandTotal)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/quotes"
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-maroon-800 hover:bg-maroon-900 text-white rounded-md font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
