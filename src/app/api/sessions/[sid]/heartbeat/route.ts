import { NextRequest, NextResponse } from 'next/server'
import { createClient, createClientWithJwt } from '@/lib/supabase/server'
import { heartbeat } from '@/lib/presence'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sid: string }> }
) {
  const { sid: sessionId } = await params

  // Auth — aceita cookie OU Bearer (iframe cross-domain)
  const bearerJwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? null
  const supabase = bearerJwt ? createClientWithJwt(bearerJwt) : await createClient()
  const { data: { user } } = await supabase.auth.getUser(bearerJwt ?? undefined)
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  await heartbeat({ userId: user.id, sessionId })
  return NextResponse.json({ ok: true })
}
