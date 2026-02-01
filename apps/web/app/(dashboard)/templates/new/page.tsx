'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { TemplateForm } from '../template-form'

export default function NewTemplatePage() {
  const router = useRouter()
  const { orgId } = useAuth()

  useEffect(() => {
    if (orgId === null) {
      router.push('/dashboard')
    }
  }, [orgId, router])

  if (!orgId) {
    return null
  }

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Template</h1>
        <p className="text-muted-foreground">
          Create a new message template for your campaigns
        </p>
      </div>

      <TemplateForm />
    </div>
  )
}
