'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
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

interface Quote {
  id: string
  quoteNumber: string | null
  quoteDate: string
  quoteType: string
  pdfUrl: string | null
  totalCost: number | null
  shippingCost: number | null
  notes: string | null
  supplier: { name: string; displayName: string | null } | null
  purchaseOrder: { id: string; poNumber: string } | null
  lineItems: QuoteLineItem[]
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<{ id: string; name: string; displayName: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    quoteNumber: '',
    quoteDate: new Date().toISOString().split('T')[0],
    quoteType: 'production',
    supplierId: '',
    pdfUrl: '',
    totalCost: '',
    shippingCost: '',
    notes: '',
  })

  const [lineItems, setLineItems] = useState<{
    productId: string
    quantity: string
    unitCost: string
    totalCost: string
    notes: string
  }[]>([{ productId: '', quantity: '', unitCost: '', totalCost: '', notes: '' }])

  const clearSuccessMessage = useCallback(() => setSuccessMessage(null), [])

  useEffect(() => {
    fetchQuotes()
    fetchProducts()
    fetchSuppliers()
  }, [])

  async function fetchQuotes() {
    setLoading(true)
    const res = await fetch('/api/quotes')
    const data = await res.json()
    setQuotes(data)
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
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          lineItems: validLineItems.map(item => ({
            productId: item.productId,
            quantity: parseInt(item.quantity),
            unitCost: parseFloat(item.unitCost),
            totalCost: parseFloat(item.totalCost),
            notes: item.notes || null,
          })),
        }),
      })

      if (res.ok) {
        setSuccessMessage('Quote saved successfully!')
        setFormData({
          quoteNumber: '',
          quoteDate: new Date().toISOString().split('T')[0],
          quoteType: 'production',
          supplierId: '',
          pdfUrl: '',
          totalCost: '',
          shippingCost: '',
          notes: '',
        })
        setLineItems([{ productId: '', quantity: '', unitCost: '', totalCost: '', notes: '' }])
        setShowForm(false)
        fetchQuotes()
      } else {
        const data = await res.json()
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      alert(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this quote?')) return
    await fetch(`/api/quotes/${id}`, { method: 'DELETE' })
    setSuccessMessage('Quote deleted successfully!')
    fetchQuotes()
  }

  function formatCurrency(amount: number | null) {
    if (amount === null) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div>
      <SuccessMessage message={successMessage} onClear={clearSuccessMessage} />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Factory Quotes</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-maroon-800 hover:bg-maroon-900 text-white px-4 py-2 rounded-md font-medium transition-colors"
        >
          {showForm ? 'Cancel' : 'Add Quote'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">New Quote</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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

          <div className="mb-4">
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

          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-900">Products</h3>
              <button
                type="button"
                onClick={addLineItem}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                + Add Product
              </button>
            </div>

            {lineItems.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 mb-2 items-end">
                <div className="col-span-4">
                  {index === 0 && <label className="block text-xs text-gray-500 mb-1">Product *</label>}
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
                  {index === 0 && <label className="block text-xs text-gray-500 mb-1">Qty *</label>}
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
                  {index === 0 && <label className="block text-xs text-gray-500 mb-1">Total Cost *</label>}
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
                  {index === 0 && <label className="block text-xs text-gray-500 mb-1">Unit Cost</label>}
                  <input
                    type="text"
                    value={item.unitCost ? `$${item.unitCost}` : ''}
                    readOnly
                    placeholder="Auto"
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md bg-gray-50 text-gray-600"
                  />
                </div>
                <div className="col-span-2 flex items-center gap-1">
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

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Quote'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : quotes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 mb-4">No quotes found</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-maroon-800 hover:text-maroon-900 font-medium"
          >
            Add your first quote
          </button>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Products
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PDF
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Linked PO
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {quotes.map((quote) => (
                <tr key={quote.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link
                      href={`/quotes/${quote.id}`}
                      className="text-gray-900 hover:text-maroon-800 font-medium"
                    >
                      {formatDate(quote.quoteDate)}
                      {quote.quoteNumber && (
                        <span className="text-xs text-gray-500 ml-2">#{quote.quoteNumber}</span>
                      )}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        quote.quoteType === 'prototype'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {quote.quoteType}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {quote.lineItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <span className="font-medium">{item.product.name}</span>
                          <span className="text-gray-500">×{item.quantity}</span>
                          <span className="text-gray-400">@{formatCurrency(item.unitCost)}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div>
                      {formatCurrency(quote.lineItems.reduce((sum, item) => sum + item.totalCost, 0))}
                      {quote.shippingCost && (
                        <span className="text-xs text-gray-500 ml-1">
                          (+{formatCurrency(quote.shippingCost)} ship)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {quote.pdfUrl ? (
                      <a
                        href={quote.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View PDF
                      </a>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {quote.purchaseOrder ? (
                      <Link
                        href={`/purchase-orders/${quote.purchaseOrder.id}`}
                        className="text-maroon-800 hover:text-maroon-900 text-sm font-medium"
                      >
                        {quote.purchaseOrder.poNumber}
                      </Link>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-3">
                      <Link
                        href={`/quotes/${quote.id}`}
                        className="text-maroon-800 hover:text-maroon-900"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(quote.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
