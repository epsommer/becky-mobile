'use client'

import { useParams } from 'next/navigation'
import CRMLayout from '@/components/CRMLayout'
import ClientServicesBilling from '@/components/ClientServicesBilling'

export default function ClientServicesBillingPage() {
  const params = useParams()
  const clientId = params.clientId as string

  return (
    <CRMLayout>
      <ClientServicesBilling clientId={clientId} />
    </CRMLayout>
  )
}