'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  role: string
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setIsLoading(true)
    
    // Get all user roles with emails using the database function
    const { data, error } = await supabase
      .rpc('get_user_emails_with_roles')

    if (error) {
      console.error('Error loading users:', error)
      toast.error('Kunne ikke indlæse brugere')
      setIsLoading(false)
      return
    }

    const usersData = data?.map((u: any) => ({
      id: u.user_id,
      email: u.email,
      role: u.role
    })) || []

    setUsers(usersData)
    setIsLoading(false)
  }

  async function toggleAdmin(userId: string, currentRole: string) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', userId)

    if (error) {
      console.error('Error updating user role:', error)
      toast.error('Kunne ikke opdatere brugerrolle')
    } else {
      toast.success(`Bruger opdateret til ${newRole === 'admin' ? 'administrator' : 'bruger'}`)
      loadUsers()
      router.refresh()
    }
  }

  if (isLoading) {
    return <div className="text-center py-4">Indlæser brugere...</div>
  }

  if (users.length === 0) {
    return <div className="text-center py-4 text-muted-foreground">Ingen brugere fundet</div>
  }

  return (
    <div className="space-y-3">
      {users.map((user) => (
        <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.email}</p>
            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="mt-1">
              {user.role === 'admin' ? 'Administrator' : 'Bruger'}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleAdmin(user.id, user.role)}
          >
            {user.role === 'admin' ? 'Fjern Admin' : 'Gør til Admin'}
          </Button>
        </div>
      ))}
    </div>
  )
}
