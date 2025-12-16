'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SuccessMessage } from '@/components/SuccessMessage'

interface PurchaseOrder {
  id: string
  poNumber: string
  status: string
  createdAt: string
  supplier: { name: string; displayName: string | null }
}

interface Supplier {
  id: string
  name: string
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

export default function PurchaseOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const clearSuccessMessage = useCallback(() => setSuccessMessage(null), [])

  useEffect(() => {
    fetchOrders()
    fetchSuppliers()
  }, [search, statusFilter])

  async function fetchSuppliers() {
    const res = await fetch('/api/suppliers')
    const data = await res.json()
    setSuppliers(data)
  }

  async function fetchOrders() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    const res = await fetch(`/api/purchase-orders?${params}`)
    const data = await res.json()
    setOrders(data)
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this purchase order?')) return
    await fetch(`/api/purchase-orders/${id}`, { method: 'DELETE' })
    fetchOrders()
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  async function handleImport() {
    if (!importFile || !selectedSupplierId) {
      alert('Please select a file and supplier')
      return
    }

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', importFile)
      formData.append('supplierId', selectedSupplierId)

      const res = await fetch('/api/import-po', {
        method: 'POST',
        body: formData,
      })

      const result = await res.json()

      if (result.success) {
        setSuccessMessage(result.message)
        setShowImportModal(false)
        setImportFile(null)
        setSelectedSupplierId('')
        fetchOrders()
        // Navigate to the new PO
        if (result.poId) {
          router.push(`/purchase-orders/${result.poId}`)
        }
      } else {
        alert(`Import failed: ${result.error}`)
      }
    } catch (error) {
      alert(`Import error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    setImporting(false)
  }

  return (
    <div>
      <SuccessMessage message={successMessage} onClear={clearSuccessMessage} />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Purchase Orders</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
          >
            Import CSV
          </button>
          <Link
            href="/purchase-orders/new"
            className="bg-maroon-800 hover:bg-maroon-900 text-white px-4 py-2 rounded-md font-medium transition-colors"
          >
            Create PO
          </Link>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Import Purchase Order from CSV</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier *
                </label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-caramel-600"
                >
                  <option value="">Select supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CSV File *
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-caramel-600 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-maroon-800 file:text-white file:cursor-pointer"
                />
                <p className="text-xs text-gray-500 mt-1">
                  CSV should have columns for Product, Color, and QTY. Products and colors will be auto-created if they don&apos;t exist.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowImportModal(false)
                  setImportFile(null)
                  setSelectedSupplierId('')
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={importing || !importFile || !selectedSupplierId}
                className="px-4 py-2 bg-maroon-800 hover:bg-maroon-900 text-white rounded-md font-medium transition-colors disabled:opacity-50"
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="Search by PO# or supplier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] max-w-md px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-caramel-600"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-caramel-600"
        >
          <option value="">All Statuses</option>
          <option value="PROTOTYPE">Prototype</option>
          <option value="APPROVED">Approved</option>
          <option value="ORDERED">Ordered</option>
          <option value="IN_PRODUCTION">In Production</option>
          <option value="SHIPPED">Shipped</option>
          <option value="RECEIVED">Received</option>
          <option value="PACKAGED">Packaged</option>
          <option value="RELEASED">Released (Archived)</option>
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 mb-4">No purchase orders found</p>
          <Link
            href="/purchase-orders/new"
            className="text-maroon-800 hover:text-maroon-900 font-medium"
          >
            Create your first purchase order
          </Link>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PO Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/purchase-orders/${order.id}`}
                      className="font-medium text-maroon-800 hover:text-maroon-950"
                    >
                      {order.poNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    {order.supplier.displayName || order.supplier.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        statusColors[order.status] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {statusLabels[order.status] || order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/purchase-orders/${order.id}`}
                      className="text-maroon-800 hover:text-maroon-950 mr-4"
                    >
                      View
                    </Link>
                    {order.status === 'DRAFT' && (
                      <>
                        <Link
                          href={`/purchase-orders/${order.id}/edit`}
                          className="text-maroon-800 hover:text-maroon-950 mr-4"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(order.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </>
                    )}
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
