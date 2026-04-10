import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

interface ReportBody {
  roomId: string
  targetIdentity: string
  reason?: string
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sid: string }> }
) {
  const { sid: sessionId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body: ReportBody = await req.json().catch(() => ({}))
  if (!body.roomId || !body.targetIdentity) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service
    .schema('mentorados')
    .from('study_reports')
    .insert({
      session_id: sessionId,
      room_id: body.roomId,
      reporter_id: user.id,
      target_identity: body.targetIdentity,
      reason: body.reason ?? null,
    })

  if (error) {
    console.error('[report] insert error:', { sessionId, error: error.message })
    return NextResponse.json({ error: 'Erro ao registrar report' }, { status: 500 })
  }

  console.log('[player.report.created]', {
    session_id: sessionId,
    room_id: body.roomId,
    reporter_id: user.id,
    target: body.targetIdentity,
  })

  return NextResponse.json({ ok: true })
}
