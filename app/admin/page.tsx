'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CreateCenterForm } from '@/components/create-center-form'
import { CentersList } from '@/components/centers-list'
import { UserManagement } from '@/components/user-management'
import { PublicFormStats } from '@/components/public-form-stats'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAccess()
  }, [])

  async function checkAccess() {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/auth/login')
      return
    }

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (userRole?.role !== 'admin') {
      router.push('/')
      return
    }

    setIsAdmin(true)
    setIsLoading(false)
  }

  async function handleDeleteAllReports() {
    // Get count first
    const { count } = await supabase
      .from('issue_reports')
      .select('*', { count: 'exact', head: true })

    if (!count || count === 0) {
      toast.error('Ingen rapporter at slette')
      return
    }

    if (!confirm(`Er du sikker på at du vil slette ALLE ${count} rapporter? Dette kan ikke fortrydes!`)) {
      return
    }

    if (!confirm('Dette vil slette alle rapporter permanent. Er du helt sikker?')) {
      return
    }

    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('issue_reports')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

      if (error) throw error

      toast.success('Alle rapporter slettet!')
    } catch (error) {
      console.error('Error deleting all reports:', error)
      toast.error('Kunne ikke slette rapporter')
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center">Indlæser...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-black">
      <header className="bg-zinc-900 shadow-sm border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Image src="/FitnessX.png" alt="FitnessX Logo" width={120} height={72} className="object-contain" />
            <h1 className="text-2xl font-bold text-white">Administration</h1>
          </div>
          <Link href="/">
            <Button variant="outline" className="border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black">Tilbage til Hjem</Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Opret Nyt Center</CardTitle>
                <CardDescription>Tilføj et nyt fitnesscenter og dets cykler</CardDescription>
              </CardHeader>
              <CardContent>
                <CreateCenterForm />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Brugeradministration</CardTitle>
                <CardDescription>Opret brugere og administrer deres roller</CardDescription>
              </CardHeader>
              <CardContent>
                <UserManagement />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Centre og Cykler</CardTitle>
                <CardDescription>Oversigt over alle centre</CardDescription>
              </CardHeader>
              <CardContent>
                <CentersList />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Farlig Zone</CardTitle>
                <CardDescription>Handlinger der ikke kan fortrydes</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAllReports}
                  disabled={isDeleting}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? 'Sletter...' : 'Slet Alle Rapporter'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-8">
          <PublicFormStats />
        </div>
      </main>
    </div>
  )
}
