import { NextRequest, NextResponse } from 'next/server'
import { createClient, createClientWithJwt } from '@/lib/supabase/server'
import { leaveRoom } from '@/lib/presence'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sid: string }> }
) {
  const { sid: sessionId } = await params

  // Auth — aceita cookie OU Bearer (iframe cross-domain)
  // Também aceita ?at=... como fallback para sendBeacon (que não envia headers custom)
  const url = new URL(req.url)
  const queryToken = url.searchParams.get('at')
  const headerToken = req.headers.get('Authorization')?.replace('Bearer ', '') ?? null
  const bearerJwt = headerToken ?? queryToken

  const supabase = bearerJwt ? createClientWithJwt(bearerJwt) : await createClient()
  const { data: { user } } = await supabase.auth.getUser(bearerJwt ?? undefined)
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  await leaveRoom({ userId: user.id, sessionId })
  return NextResponse.json({ ok: true })
}
