'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'

function formatImageUrl(url: string | null): string | null {
  if (!url) return null
  if (url.includes('?')) return url.includes('ssl=') ? url : `${url}&ssl=1`
  return `${url}?ssl=1`
}

interface PantoneChip {
  pantone: {
    id: string
    code: string
    name: string
    hexColor: string
  }
}

interface ColorTag {
  id: string
  name: string
}

interface YoyoColor {
  id: string
  name: string
  imageUrl: string | null
  description: string | null
  isActive: boolean
  pantoneLocked: boolean
  pantoneChips: PantoneChip[]
  tags: ColorTag[]
}

export default function ColorsPage() {
  const [colors, setColors] = useState<YoyoColor[]>([])
  const [tags, setTags] = useState<ColorTag[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [seedingTags, setSeedingTags] = useState(false)
  const [migrating, setMigrating] = useState(false)

  useEffect(() => {
    fetchColors()
    fetchTags()
  }, [search])

  async function fetchTags() {
    const res = await fetch('/api/tags')
    const data = await res.json()
    setTags(data)
  }

  async function handleSeedTags() {
    setSeedingTags(true)
    const res = await fetch('/api/tags/seed', { method: 'POST' })
    const data = await res.json()
    alert(data.message)
    fetchTags()
    setSeedingTags(false)
  }

  async function fetchColors() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    const res = await fetch(`/api/colors?${params}`)
    const data = await res.json()
    setColors(data)
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this color?')) return
    await fetch(`/api/colors/${id}`, { method: 'DELETE' })
    fetchColors()
  }

  async function handleMigrateImages() {
    if (!confirm('Download all external images and store them locally? This may take a few minutes.')) return
    setMigrating(true)
    try {
      const res = await fetch('/api/colors/migrate-images', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        alert(data.message)
        fetchColors()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      alert(`Failed to migrate images: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    setMigrating(false)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Yo-Yo Colors</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleMigrateImages}
            disabled={migrating}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
          >
            {migrating ? 'Migrating...' : 'Download Images'}
          </button>
          <Link
            href="/colors/new"
            className="bg-maroon-800 hover:bg-maroon-900 text-white px-4 py-2 rounded-md font-medium transition-colors"
          >
            Add Color
          </Link>
        </div>
      </div>

      <div className="mb-6 space-y-3">
        <input
          type="text"
          placeholder="Search colors or type a tag name (e.g., Fade, Splash, Untagged)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-caramel-600"
        />
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-gray-500">Filter by tag:</span>
          <button
            onClick={() => setSearch('')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              search === ''
                ? 'bg-maroon-800 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => setSearch(tag.name)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                search.toLowerCase() === tag.name.toLowerCase()
                  ? 'bg-maroon-800 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tag.name}
            </button>
          ))}
          <button
            onClick={() => setSearch('Untagged')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              search.toLowerCase() === 'untagged'
                ? 'bg-maroon-800 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Untagged
          </button>
          {tags.length === 0 && (
            <button
              onClick={handleSeedTags}
              disabled={seedingTags}
              className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors disabled:opacity-50"
            >
              {seedingTags ? 'Seeding...' : 'Seed Tags'}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : colors.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 mb-4">No colors found</p>
          <Link
            href="/colors/new"
            className="text-maroon-800 hover:text-maroon-900 font-medium"
          >
            Add your first color
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {colors.map((color) => (
            <div
              key={color.id}
              className="bg-white rounded-lg shadow overflow-hidden group"
            >
              <div className="aspect-square relative bg-gray-100">
                {color.imageUrl ? (
                  <Image
                    src={formatImageUrl(color.imageUrl)!}
                    alt={color.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    No image
                  </div>
                )}
              </div>
              <div className="p-3">
                <Link href={`/colors/${color.id}/edit`}>
                  <h3 className="font-medium text-gray-900 text-sm truncate hover:text-maroon-800 cursor-pointer">
                    {color.name}
                  </h3>
                </Link>
                {color.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {color.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                      Untagged
                    </span>
                  </div>
                )}
                {color.pantoneChips.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {color.pantoneChips.slice(0, 4).map((chip) => (
                      <div
                        key={chip.pantone.id}
                        className="w-4 h-4 rounded-sm border border-gray-300"
                        style={{ backgroundColor: chip.pantone.hexColor }}
                        title={`${chip.pantone.code} - ${chip.pantone.name}`}
                      />
                    ))}
                    {color.pantoneChips.length > 4 && (
                      <span className="text-xs text-gray-500">
                        +{color.pantoneChips.length - 4}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        color.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {color.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {color.pantoneLocked && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800"
                        title="Pantone selection locked - excluded from Auto-Match"
                      >
                        🔒
                      </span>
                    )}
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      href={`/colors/${color.id}/edit`}
                      className="text-maroon-800 hover:text-maroon-900 text-xs mr-2"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(color.id)}
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
