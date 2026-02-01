import { createClient } from '@sendbandit/api-client'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'

// Client-side API client
export function createBrowserClient(getToken: () => Promise<string | null>) {
  return createClient({
    baseUrl: API_URL,
    getToken: async () => {
      const token = await getToken()
      return token || ''
    },
  })
}
