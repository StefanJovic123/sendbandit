/**
 * Generate a random hex string
 */
export function randomHex(length: number = 32): string {
  const array = new Uint8Array(length / 2)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Hash a string using SHA-256
 */
export async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Hash a string using SHA-1 (for webhook signatures)
 */
export async function sha1(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-1', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate HMAC-SHA256 signature
 */
export async function hmacSha256(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(key)
  const dataBuffer = encoder.encode(data)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer)
  const hashArray = Array.from(new Uint8Array(signature))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Verify HMAC-SHA256 signature
 */
export async function verifyHmacSha256(
  key: string,
  data: string,
  signature: string
): Promise<boolean> {
  const computed = await hmacSha256(key, data)
  return timingSafeEqual(computed, signature)
}

/**
 * Verify a Svix webhook signature (the scheme Clerk uses to sign its webhooks).
 * The signature is base64(HMAC-SHA256(key, `${id}.${timestamp}.${body}`)), where the key is the base64 part of the
 * `whsec_` secret. The svix-signature header holds space-separated `v1,<signature>` entries (several during secret
 * rotation). Timestamps further than `toleranceSeconds` from now are rejected so old deliveries can't be replayed.
 */
export async function verifySvixSignature(
  secret: string,
  headers: { id?: string; timestamp?: string; signature?: string },
  body: string,
  toleranceSeconds: number = 5 * 60
): Promise<boolean> {
  const { id, timestamp, signature } = headers
  if (!id || !timestamp || !signature) {
    return false
  }

  const sentAt = Number(timestamp)
  if (!Number.isInteger(sentAt) || Math.abs(Date.now() / 1000 - sentAt) > toleranceSeconds) {
    return false
  }

  const keyData = decodeBase64(secret.replace(/^whsec_/, ''))
  if (!keyData) {
    return false
  }

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signed = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(`${id}.${timestamp}.${body}`)
  )
  const expected = btoa(String.fromCharCode(...new Uint8Array(signed)))

  return signature.split(' ').some((entry) => {
    const [version, value] = entry.split(',')
    return version === 'v1' && value !== undefined && timingSafeEqual(value, expected)
  })
}

function decodeBase64(value: string): Uint8Array | null {
  try {
    return Uint8Array.from(atob(value), (c) => c.charCodeAt(0))
  } catch {
    return null
  }
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

/**
 * Encrypt data using AES-GCM
 */
export async function encrypt(
  data: string,
  keyString: string
): Promise<{ encrypted: string; iv: string }> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(keyString.padEnd(32, '0').slice(0, 32))
  const dataBuffer = encoder.encode(data)

  const key = await crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['encrypt'])

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, dataBuffer)

  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
  }
}

/**
 * Decrypt data using AES-GCM
 */
export async function decrypt(encrypted: string, iv: string, keyString: string): Promise<string> {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const keyData = encoder.encode(keyString.padEnd(32, '0').slice(0, 32))

  const key = await crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['decrypt'])

  const encryptedBuffer = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0))
  const ivBuffer = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0))

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer },
    key,
    encryptedBuffer
  )

  return decoder.decode(decrypted)
}
