import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  LIVEKIT_URL: z.string().url(),
  LIVEKIT_API_KEY: z.string().min(1),
  LIVEKIT_API_SECRET: z.string().min(1),
  NEXT_PUBLIC_PLAYER_URL: z.string().url(),
  NEXT_PUBLIC_AREA_SECRETA_URL: z.string().url(),
})

function validateEnv() {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    console.error('[Player] Variáveis de ambiente inválidas:', result.error.flatten().fieldErrors)
    throw new Error('[Player] Variáveis de ambiente ausentes ou inválidas. Verifique .env.local')
  }
  return result.data
}

export const env = validateEnv()
