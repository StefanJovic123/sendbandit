'use client'

import { useAuth } from '@clerk/nextjs'
import { useMemo } from 'react'
import { createClient, SendBanditClient } from '@sendbandit/api-client'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'

export function useApiClient(): SendBanditClient {
  const { getToken } = useAuth()

  return useMemo(
    () =>
      createClient({
        baseUrl: API_URL,
        getToken: async () => {
          const token = await getToken()
          return token || ''
        },
      }),
    [getToken]
  )
}
