import { prisma } from '@/lib/prisma'
import { SupplierForm } from '@/components/SupplierForm'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface EditSupplierPageProps {
  params: { id: string }
}

export default async function EditSupplierPage({ params }: EditSupplierPageProps) {
  const supplier = await prisma.supplier.findUnique({
    where: { id: params.id },
  })

  if (!supplier) {
    notFound()
  }

  const formData = {
    id: supplier.id,
    name: supplier.name,
    displayName: supplier.displayName || '',
    email: supplier.email || '',
    phone: supplier.phone || '',
    address: supplier.address || '',
    city: supplier.city || '',
    state: supplier.state || '',
    zip: supplier.zip || '',
    country: supplier.country || '',
    paymentTerms: supplier.paymentTerms || '',
    notes: supplier.notes || '',
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/suppliers"
          className="text-maroon-800 hover:text-maroon-900 text-sm"
        >
          &larr; Back to Suppliers
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">Edit Supplier</h1>
      </div>
      <SupplierForm initialData={formData} />
    </div>
  )
}
