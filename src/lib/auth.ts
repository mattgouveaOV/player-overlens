import { createClient } from '@/lib/supabase/server'

export type Member = {
  user_id: string
  name: string
  email: string
  role: string
}

/**
 * Retorna o usuário autenticado + membro ativo.
 * Lança erro 401/403 se não autenticado ou sem acesso.
 */
export async function requireMember(): Promise<{ userId: string; member: Member }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new AuthError(401, 'Não autenticado')
  }

  const { data: member } = await supabase
    .from('members')
    .select('id, name, email, role, status')
    .eq('email', user.email!)
    .single()

  if (!member || member.status !== 'ativo') {
    throw new AuthError(403, 'Acesso negado')
  }

  return { userId: user.id, member: { ...member, user_id: user.id } }
}

/**
 * Retorna o membro e valida que é admin.
 * Lança erro 403 se não for admin.
 */
export async function requireAdmin(): Promise<{ userId: string; member: Member }> {
  const result = await requireMember()

  if (result.member.role !== 'admin') {
    throw new AuthError(403, 'Acesso restrito a administradores')
  }

  return result
}

export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'AuthError'
  }
}
