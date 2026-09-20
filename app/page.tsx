'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LogoutButton } from '@/components/logout-button'
import { ReportIssueForm } from '@/components/report-issue-form'
import { IssuesList } from '@/components/issues-list'
import { ExportDataForm } from '@/components/export-data-form'

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      setUser(user)
      
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      setIsAdmin(userRole?.role === 'admin')
    }
    
    setIsLoading(false)
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

  if (!user) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Image src="/FitnessX.png" alt="FitnessX Logo" width={200} height={120} className="object-contain" />
          </div>
          <CardTitle className="text-3xl font-bold">Bike Reporter</CardTitle>
          <CardDescription>Report og håndter cykel problemer i dit fitnesscenter</CardDescription>
        </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/auth/login" className="block">
              <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold" size="lg">Log ind</Button>
            </Link>
            <Link href="/auth/sign-up" className="block">
              <Button variant="outline" className="w-full border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black" size="lg">Opret konto</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <header className="bg-zinc-900 shadow-sm border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Image src="/FitnessX.png" alt="FitnessX Logo" width={120} height={72} className="object-contain" />
            <h1 className="text-2xl font-bold text-white">Bike Reporter</h1>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <Link href="/admin">
                <Button variant="outline" className="border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black">Administration</Button>
              </Link>
            )}
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Rapportér Problem</CardTitle>
                <CardDescription>Vælg en cykel og beskriv problemet</CardDescription>
              </CardHeader>
              <CardContent>
                <ReportIssueForm 
                  userId={user.id} 
                  onReportCreated={() => setRefreshTrigger(prev => prev + 1)}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Seneste Rapporter</CardTitle>
                <CardDescription>Oversigt over indberettede problemer</CardDescription>
              </CardHeader>
              <CardContent>
                <IssuesList isAdmin={isAdmin} refreshTrigger={refreshTrigger} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Eksportér Data</CardTitle>
                <CardDescription>Download rapporter for en given periode</CardDescription>
              </CardHeader>
              <CardContent>
                <ExportDataForm />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
