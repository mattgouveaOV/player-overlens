import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { heartbeat } from '@/lib/presence'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sid: string }> }
) {
  const { sid: sessionId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  await heartbeat({ userId: user.id, sessionId })
  return NextResponse.json({ ok: true })
}
