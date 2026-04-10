import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/brand/header'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`${process.env.NEXT_PUBLIC_AREA_SECRETA_URL}/login`)

  const { data: member } = await supabase
    .from('members')
    .select('role, status')
    .eq('email', user.email!)
    .single()

  if (!member || member.status !== 'ativo' || member.role !== 'admin') {
    redirect('/')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header title="Admin" />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {children}
      </main>
    </div>
  )
}
