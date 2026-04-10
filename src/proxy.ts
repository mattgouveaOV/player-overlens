import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { pathname } = request.nextUrl

  // Rotas estáticas — pula tudo (sem auth, sem redirect)
  const isStaticRoute =
    pathname.startsWith('/_next') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)

  if (isStaticRoute) return supabaseResponse

  // Refresh do token Supabase para TODAS as rotas (incluindo /api/)
  // Isso garante que tokens expirados sejam renovados antes dos route handlers
  const { data: { user } } = await supabase.auth.getUser()

  // Rotas que não redirecionam para login mesmo sem auth
  const isApiRoute = pathname.startsWith('/api/')
  const isPublicPage = pathname.startsWith('/encerrado')

  if (!user && !isApiRoute && !isPublicPage) {
    // Redireciona para login da área secreta com return_url
    const areaSecretaUrl = process.env.NEXT_PUBLIC_AREA_SECRETA_URL ?? 'https://app.overlens.com.br'
    return NextResponse.redirect(`${areaSecretaUrl}/login`)
  }

  // Bloqueia rota admin se não for admin
  if (user && pathname.startsWith('/admin')) {
    const { data: member } = await supabase
      .from('members')
      .select('role, status')
      .eq('email', user.email!)
      .single()

    if (!member || member.status !== 'ativo' || member.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
