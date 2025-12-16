'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

function formatImageUrl(url: string | null): string | null {
  if (!url) return null
  if (url.includes('?')) return url.includes('ssl=') ? url : `${url}&ssl=1`
  return `${url}?ssl=1`
}

interface PantoneChip {
  pantone: {
    code: string
    name: string
    hexColor: string
  }
}

interface YoyoColor {
  name: string
  imageUrl: string | null
  pantoneChips: PantoneChip[]
}

interface EngravingArt {
  id: string
  name: string
  imageUrl: string
  position: string
}

interface LineItemEngraving {
  engravingArtId: string
  engravingArt: EngravingArt
}

interface LineItem {
  id: string
  quantity: number
  ringColor: string | null
  product: {
    sku: string
    name: string
    unit: string
    material?: string | null
    imageUrl?: string | null
  }
  color: YoyoColor | null
  engravings: LineItemEngraving[]
}

interface PurchaseOrder {
  id: string
  poNumber: string
  status: string
  notes: string | null
  createdAt: string
  sentAt: string | null
  receivedAt: string | null
  supplier: {
    name: string
    displayName: string | null
    email: string | null
    phone: string | null
    address: string | null
    city: string | null
    state: string | null
    zip: string | null
  }
  lineItems: LineItem[]
}

const statusColors: Record<string, string> = {
  PROTOTYPE: 'bg-purple-100 text-purple-800',
  APPROVED: 'bg-indigo-100 text-indigo-800',
  ORDERED: 'bg-blue-100 text-blue-800',
  IN_PRODUCTION: 'bg-yellow-100 text-yellow-800',
  SHIPPED: 'bg-orange-100 text-orange-800',
  RECEIVED: 'bg-teal-100 text-teal-800',
  PACKAGED: 'bg-green-100 text-green-800',
  RELEASED: 'bg-emerald-100 text-emerald-800',
}

const statusLabels: Record<string, string> = {
  PROTOTYPE: 'Prototype',
  APPROVED: 'Approved',
  ORDERED: 'Ordered',
  IN_PRODUCTION: 'In Production',
  SHIPPED: 'Shipped',
  RECEIVED: 'Received',
  PACKAGED: 'Packaged',
  RELEASED: 'Released',
}

const statusOptions = ['PROTOTYPE', 'APPROVED', 'ORDERED', 'IN_PRODUCTION', 'SHIPPED', 'RECEIVED', 'PACKAGED', 'RELEASED']

function hasSteel(material: string | null | undefined): boolean {
  return material?.includes('Steel') || false
}

export default function PurchaseOrderDetailPage({
  params,
}: {
  params: { id: string }
}) {
  useRouter() // Used for navigation context
  const [po, setPO] = useState<PurchaseOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchPO()
  }, [params.id])

  async function fetchPO() {
    const res = await fetch(`/api/purchase-orders/${params.id}`)
    if (res.ok) {
      setPO(await res.json())
    }
    setLoading(false)
  }

  async function updateStatus(newStatus: string) {
    setUpdating(true)
    await fetch(`/api/purchase-orders/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    fetchPO()
    setUpdating(false)
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (loading) {
    return <p className="text-gray-500">Loading...</p>
  }

  if (!po) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Purchase order not found</p>
        <Link href="/purchase-orders" className="text-maroon-800 hover:text-maroon-900">
          Back to Purchase Orders
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/purchase-orders"
            className="text-maroon-800 hover:text-maroon-900 text-sm"
          >
            &larr; Back to Purchase Orders
          </Link>
          <div className="flex items-center gap-4 mt-2">
            <h1 className="text-3xl font-bold text-gray-900">{po.poNumber}</h1>
            <span
              className={`px-3 py-1 text-sm font-medium rounded-full ${
                statusColors[po.status] || 'bg-gray-100 text-gray-800'
              }`}
            >
              {statusLabels[po.status] || po.status}
            </span>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Link
            href={`/purchase-orders/${po.id}/edit`}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Edit
          </Link>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Status:</label>
            <select
              value={po.status}
              onChange={(e) => updateStatus(e.target.value)}
              disabled={updating}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-caramel-600 disabled:opacity-50"
            >
              <option value="DRAFT">Draft</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          </div>
          <Link
            href={`/api/purchase-orders/${po.id}/pdf`}
            target="_blank"
            className="px-4 py-2 bg-maroon-800 hover:bg-maroon-900 text-white rounded-md font-medium transition-colors"
          >
            Download PDF
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Line Items</h2>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Color
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Engravings
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Qty
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {po.lineItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {item.product.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.product.sku}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {item.color ? (
                        <div className="flex items-start gap-2">
                          {item.color.imageUrl && (
                            <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0 border border-gray-200">
                              <Image
                                src={formatImageUrl(item.color.imageUrl)!}
                                alt={item.color.name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900 text-sm">
                              {item.color.name}
                            </div>
                            {hasSteel(item.product.material) && item.ringColor && (
                              <div className="text-xs text-gray-600 mt-0.5">
                                Rim: {item.ringColor}
                              </div>
                            )}
                            {item.color.pantoneChips.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {item.color.pantoneChips.map((cp, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-1"
                                    title={`${cp.pantone.code} - ${cp.pantone.name}`}
                                  >
                                    <div
                                      className="w-4 h-4 rounded border border-gray-300"
                                      style={{ backgroundColor: cp.pantone.hexColor }}
                                    />
                                    <span className="text-xs text-gray-500">
                                      {cp.pantone.code}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.engravings && item.engravings.length > 0 ? (
                        <div className="space-y-2">
                          {item.engravings.map((eng) => (
                            <div key={eng.engravingArtId} className="flex items-center gap-2">
                              <div className="relative w-8 h-8 rounded overflow-hidden flex-shrink-0 border border-gray-200 bg-gray-100">
                                <Image
                                  src={formatImageUrl(eng.engravingArt.imageUrl)!}
                                  alt={eng.engravingArt.name}
                                  fill
                                  className="object-contain"
                                  unoptimized
                                />
                              </div>
                              <div className="text-xs">
                                <div className="font-medium text-gray-900">{eng.engravingArt.name}</div>
                                <div className="text-gray-500">
                                  {eng.engravingArt.position}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900">
                      {item.quantity} {item.product.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {po.notes && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-2">Notes</h2>
              <p className="text-gray-600">{po.notes}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Supplier</h2>
            <div className="space-y-2">
              <p className="font-medium text-gray-900">{po.supplier.displayName || po.supplier.name}</p>
              {po.supplier.displayName && (
                <p className="text-sm text-gray-500">{po.supplier.name}</p>
              )}
              {po.supplier.email && (
                <p className="text-gray-600">{po.supplier.email}</p>
              )}
              {po.supplier.phone && (
                <p className="text-gray-600">{po.supplier.phone}</p>
              )}
              {po.supplier.address && (
                <p className="text-gray-600">
                  {po.supplier.address}
                  <br />
                  {po.supplier.city}, {po.supplier.state} {po.supplier.zip}
                </p>
              )}
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Timeline</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Created:</span>
                <span className="text-gray-900">{formatDate(po.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Ordered:</span>
                <span className="text-gray-900">{formatDate(po.sentAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Received:</span>
                <span className="text-gray-900">{formatDate(po.receivedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
