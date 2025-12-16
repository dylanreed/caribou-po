'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'

interface Product {
  id: string
  sku: string
  name: string
  description: string | null
  imageUrl: string | null
  unitPrice: number
  unit: string
  category: string | null
  material: string | null
  isActive: boolean
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProducts()
  }, [search])

  async function fetchProducts() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    const res = await fetch(`/api/products?${params}`)
    const data = await res.json()
    setProducts(data)
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this product?')) return
    await fetch(`/api/products/${id}`, { method: 'DELETE' })
    fetchProducts()
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Products</h1>
        <Link
          href="/products/new"
          className="bg-maroon-800 hover:bg-maroon-900 text-white px-4 py-2 rounded-md font-medium transition-colors"
        >
          Add Product
        </Link>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search products by name, SKU, or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-caramel-600"
        />
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : products.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 mb-4">No products found</p>
          <Link
            href="/products/new"
            className="text-maroon-800 hover:text-maroon-900 font-medium"
          >
            Add your first product
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-lg shadow overflow-hidden group"
            >
              <Link href={`/products/${product.id}/edit`} className="aspect-square relative bg-gray-100 block cursor-pointer">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    No image
                  </div>
                )}
              </Link>
              <div className="p-3">
                <Link href={`/products/${product.id}/edit`}>
                  <h3 className="font-medium text-gray-900 text-sm truncate hover:text-maroon-800 cursor-pointer">
                    {product.name}
                  </h3>
                </Link>
                <p className="text-xs text-gray-500 font-mono">{product.sku}</p>
                {product.category && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 mt-1 inline-block">
                    {product.category}
                  </span>
                )}
                {product.material && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 mt-1 ml-1 inline-block">
                    {product.material}
                  </span>
                )}
                <div className="mt-2">
                  <span className="text-sm font-medium text-maroon-800">
                    {formatCurrency(product.unitPrice)}
                  </span>
                  <span className="text-xs text-gray-500">/{product.unit}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      product.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {product.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      href={`/products/${product.id}/edit`}
                      className="text-maroon-800 hover:text-maroon-900 text-xs mr-2"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-red-600 hover:text-red-900 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
