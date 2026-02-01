import 'server-only'

import { createClient } from '@sendbandit/api-client'
import { auth } from '@clerk/nextjs/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'

// Server-side API client
export async function getApiClient() {
  const { getToken } = await auth()

  return createClient({
    baseUrl: API_URL,
    getToken: async () => {
      const token = await getToken()
      return token || ''
    },
  })
}
