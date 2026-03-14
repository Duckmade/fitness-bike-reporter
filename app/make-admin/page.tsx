'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { toast } from 'sonner'

export default function MakeAdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdminStatus()
  }, [])

  async function checkAdminStatus() {
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

    setIsAdmin(userRole?.role === 'admin')
    setIsLoading(false)
  }

  async function makeAdmin() {
    setIsUpdating(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: 'admin' })
        .eq('user_id', user.id)

      if (error) {
        toast.error('Kunne ikke opdatere rolle')
      } else {
        toast.success('Du er nu administrator!')
        setIsAdmin(true)
      }
    }
    setIsUpdating(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center">Indlæser...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Administrator Status</CardTitle>
          <CardDescription>Håndter administrator rettigheder</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">Din nuværende rolle:</p>
            <p className="text-lg font-bold">{isAdmin ? 'Administrator' : 'Bruger'}</p>
          </div>

          {!isAdmin && (
            <Button onClick={makeAdmin} className="w-full" disabled={isUpdating}>
              {isUpdating ? 'Opdaterer...' : 'Gør mig til Administrator'}
            </Button>
          )}

          {isAdmin && (
            <Link href="/admin" className="block">
              <Button className="w-full">
                Gå til Administration
              </Button>
            </Link>
          )}

          <Link href="/" className="block">
            <Button variant="outline" className="w-full">
              Tilbage til Hjem
            </Button>
          </Link>

          <p className="text-xs text-muted-foreground text-center">
            Denne side er kun til udvikling. I produktion skal administrator rettigheder tildeles via databasen.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
