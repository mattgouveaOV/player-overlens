import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component — cookies só podem ser setados em Server Actions ou Route Handlers
          }
        },
      },
    }
  )
}

/**
 * Cria um client autenticado via Bearer JWT (para route handlers chamados de iframe cross-domain
 * onde cookies de sessão não chegam). Passa o JWT no Authorization header global para que
 * o RLS reconheça o usuário autenticado em todas as queries.
 */
export function createClientWithJwt(jwt: string) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${jwt}` },
      },
      cookies: { getAll: () => [], setAll: () => {} },
    }
  )
}

/** Cliente com service_role — apenas para route handlers do lado servidor */
export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
      auth: { persistSession: false },
    }
  )
}
