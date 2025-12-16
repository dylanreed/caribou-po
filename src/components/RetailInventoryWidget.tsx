'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'

interface RetailInventoryItem {
  id: string
  productId: string
  productName: string
  productSku: string
  productLastReleasedAt: string | null
  retailerId: string
  retailerName: string
  totalInventory: number | null
  variantData: string | null
  fetchedAt: string | null
}

interface RetailInventoryWidgetProps {
  retailInventory: RetailInventoryItem[]
}

interface VariantData {
  id: number
  title: string
  quantity: number
  available: boolean
}

type SortOption = 'newest' | 'oldest' | 'most' | 'lowest'
type ViewMode = 'product' | 'retailer'

export function RetailInventoryWidget({ retailInventory }: RetailInventoryWidgetProps) {
  const [refreshing, setRefreshing] = useState(false)
  const [inventory, setInventory] = useState(retailInventory)
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [viewMode, setViewMode] = useState<ViewMode>('product')

  // Group inventory by product
  const productGroups = inventory.reduce((acc, item) => {
    if (!acc[item.productId]) {
      acc[item.productId] = {
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        productLastReleasedAt: item.productLastReleasedAt,
        retailers: [],
      }
    }
    acc[item.productId].retailers.push(item)
    return acc
  }, {} as Record<string, { productId: string; productName: string; productSku: string; productLastReleasedAt: string | null; retailers: RetailInventoryItem[] }>)

  // Group inventory by retailer
  const retailerGroups = useMemo(() => {
    return inventory.reduce((acc, item) => {
      if (!acc[item.retailerId]) {
        acc[item.retailerId] = {
          retailerId: item.retailerId,
          retailerName: item.retailerName,
          products: [],
        }
      }
      acc[item.retailerId].products.push(item)
      return acc
    }, {} as Record<string, { retailerId: string; retailerName: string; products: RetailInventoryItem[] }>)
  }, [inventory])

  // Helper function to get total inventory for a product
  function getTotalForProduct(retailers: RetailInventoryItem[]): number {
    return retailers.reduce((sum, r) => sum + (r.totalInventory ?? 0), 0)
  }

  // Sort products based on selected sort option
  const products = useMemo(() => {
    const productList = Object.values(productGroups)

    switch (sortBy) {
      case 'newest':
        return productList.sort((a, b) => {
          if (!a.productLastReleasedAt && !b.productLastReleasedAt) return 0
          if (!a.productLastReleasedAt) return 1
          if (!b.productLastReleasedAt) return -1
          return new Date(b.productLastReleasedAt).getTime() - new Date(a.productLastReleasedAt).getTime()
        })
      case 'oldest':
        return productList.sort((a, b) => {
          if (!a.productLastReleasedAt && !b.productLastReleasedAt) return 0
          if (!a.productLastReleasedAt) return 1
          if (!b.productLastReleasedAt) return -1
          return new Date(a.productLastReleasedAt).getTime() - new Date(b.productLastReleasedAt).getTime()
        })
      case 'most':
        return productList.sort((a, b) => {
          return getTotalForProduct(b.retailers) - getTotalForProduct(a.retailers)
        })
      case 'lowest':
        return productList.sort((a, b) => {
          return getTotalForProduct(a.retailers) - getTotalForProduct(b.retailers)
        })
      default:
        return productList
    }
  }, [productGroups, sortBy])

  // Get retailers list sorted by name
  const retailers = useMemo(() => {
    return Object.values(retailerGroups).sort((a, b) => a.retailerName.localeCompare(b.retailerName))
  }, [retailerGroups])

  async function handleRefreshAll() {
    setRefreshing(true)
    try {
      const res = await fetch('/api/retail-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retailProductIds: inventory.map(i => i.id) }),
      })

      const result = await res.json()
      if (result.results) {
        const updatedInventory = inventory.map(item => {
          const inventoryResult = result.results.find((r: { retailProductId: string }) => r.retailProductId === item.id)
          if (inventoryResult?.success) {
            return {
              ...item,
              totalInventory: inventoryResult.totalInventory,
              variantData: JSON.stringify(inventoryResult.variants),
              fetchedAt: new Date().toISOString(),
            }
          }
          return item
        })
        setInventory(updatedInventory)
      }
    } catch (error) {
      console.error('Failed to refresh inventory:', error)
    }
    setRefreshing(false)
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div className="bg-white rounded-lg shadow mb-8">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Retail Inventory</h2>
            <p className="text-sm text-gray-500">Track inventory levels at retail partners</p>
          </div>
          <button
            onClick={handleRefreshAll}
            disabled={refreshing}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md font-medium transition-colors disabled:opacity-50"
          >
            {refreshing ? 'Refreshing...' : 'Refresh All'}
          </button>
        </div>
        {/* Sort and View Controls */}
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">View by:</span>
            <div className="flex rounded-md border border-gray-300 overflow-hidden">
              <button
                onClick={() => setViewMode('product')}
                className={`px-3 py-1 text-sm ${
                  viewMode === 'product'
                    ? 'bg-maroon-800 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Product
              </button>
              <button
                onClick={() => setViewMode('retailer')}
                className={`px-3 py-1 text-sm border-l border-gray-300 ${
                  viewMode === 'retailer'
                    ? 'bg-maroon-800 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Retailer
              </button>
            </div>
          </div>
          {viewMode === 'product' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-caramel-600"
              >
                <option value="newest">Newest Release</option>
                <option value="oldest">Oldest Release</option>
                <option value="most">Most Inventory</option>
                <option value="lowest">Lowest Inventory</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Product View */}
      {viewMode === 'product' && (
        <div className="divide-y divide-gray-100">
          {products.map((product) => {
            const totalUnits = getTotalForProduct(product.retailers)
            const isExpanded = expandedProduct === product.productId

            return (
              <div key={product.productId} className="px-6 py-4">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedProduct(isExpanded ? null : product.productId)}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <Link
                        href={`/products/${product.productId}/edit`}
                        className="font-medium text-gray-900 hover:text-maroon-800"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {product.productName}
                      </Link>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-500">{product.productSku}</p>
                        {product.productLastReleasedAt && (
                          <span className="text-xs text-green-600">
                            Released {formatDate(product.productLastReleasedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`text-lg font-semibold ${totalUnits > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {totalUnits} units
                      </div>
                      <p className="text-xs text-gray-500">
                        across {product.retailers.length} retailer{product.retailers.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pl-4 border-l-2 border-gray-100 space-y-3">
                    {product.retailers.map((retailer) => {
                      const variants: VariantData[] = retailer.variantData ? JSON.parse(retailer.variantData) : []
                      const inStockVariants = variants.filter(v => v.quantity > 0).length
                      const totalVariants = variants.length

                      return (
                        <div key={retailer.id} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-medium text-gray-900">{retailer.retailerName}</span>
                              <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${
                                (retailer.totalInventory ?? 0) > 0
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {retailer.totalInventory ?? 0} units
                              </span>
                              {totalVariants > 0 && (
                                <span className="ml-2 text-xs text-gray-500">
                                  ({inStockVariants}/{totalVariants} variants in stock)
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-400">
                              Updated: {formatDate(retailer.fetchedAt)}
                            </span>
                          </div>

                          {variants.length > 0 && (
                            <div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
                              {variants.map((v) => (
                                <div
                                  key={v.id}
                                  className={`text-xs px-2 py-1 rounded ${
                                    v.quantity > 0
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-200 text-gray-500'
                                  }`}
                                >
                                  <span className="truncate">{v.title}</span>
                                  <span className="ml-1 font-medium">({v.quantity})</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Retailer View */}
      {viewMode === 'retailer' && (
        <div className="divide-y divide-gray-100">
          {retailers.map((retailer) => {
            const totalUnits = retailer.products.reduce((sum, p) => sum + (p.totalInventory ?? 0), 0)
            const isExpanded = expandedProduct === retailer.retailerId

            return (
              <div key={retailer.retailerId} className="px-6 py-4">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedProduct(isExpanded ? null : retailer.retailerId)}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="font-medium text-gray-900">{retailer.retailerName}</span>
                      <p className="text-xs text-gray-500">
                        {retailer.products.length} product{retailer.products.length !== 1 ? 's' : ''} tracked
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`text-lg font-semibold ${totalUnits > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {totalUnits} units
                      </div>
                      <p className="text-xs text-gray-500">total inventory</p>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pl-4 border-l-2 border-gray-100 space-y-3">
                    {retailer.products.map((product) => {
                      const variants: VariantData[] = product.variantData ? JSON.parse(product.variantData) : []
                      const inStockVariants = variants.filter(v => v.quantity > 0).length
                      const totalVariants = variants.length

                      return (
                        <div key={product.id} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <Link
                                href={`/products/${product.productId}/edit`}
                                className="font-medium text-gray-900 hover:text-maroon-800"
                              >
                                {product.productName}
                              </Link>
                              <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${
                                (product.totalInventory ?? 0) > 0
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {product.totalInventory ?? 0} units
                              </span>
                              <p className="text-xs text-gray-500">{product.productSku}</p>
                              {totalVariants > 0 && (
                                <span className="text-xs text-gray-500">
                                  ({inStockVariants}/{totalVariants} variants in stock)
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-400">
                              Updated: {formatDate(product.fetchedAt)}
                            </span>
                          </div>

                          {variants.length > 0 && (
                            <div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
                              {variants.map((v) => (
                                <div
                                  key={v.id}
                                  className={`text-xs px-2 py-1 rounded ${
                                    v.quantity > 0
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-200 text-gray-500'
                                  }`}
                                >
                                  <span className="truncate">{v.title}</span>
                                  <span className="ml-1 font-medium">({v.quantity})</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {viewMode === 'product' && products.length === 0 && (
        <div className="px-6 py-8 text-center text-gray-500">
          <p>No retail links configured yet.</p>
          <p className="text-sm mt-1">
            Add retail links to products to track inventory at your retail partners.
          </p>
        </div>
      )}
    </div>
  )
}
