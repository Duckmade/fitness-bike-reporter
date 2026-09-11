'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Trash2, UserPlus } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface User {
  id: string
  email: string
  role: 'admin' | 'user'
  createdAt: string
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'user'>('user')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setIsLoading(true)

    try {
      const response = await adminRequest('/api/admin/users')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Kunne ikke indlæse brugere')
      }

      setUsers(data.users ?? [])
      setCurrentUserId(data.currentUserId ?? null)
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error(error instanceof Error ? error.message : 'Kunne ikke indlæse brugere')
    } finally {
      setIsLoading(false)
    }
  }

  async function adminRequest(url: string, options: RequestInit = {}) {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      throw new Error('Din session er udløbet. Log ind igen.')
    }

    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        ...options.headers,
      },
    })
  }

  async function createUser(event: React.FormEvent) {
    event.preventDefault()

    if (password !== repeatPassword) {
      toast.error('Adgangskoderne er ikke ens')
      return
    }

    setIsCreating(true)

    try {
      const response = await adminRequest('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ email, password, role }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Kunne ikke oprette brugeren')
      }

      toast.success(`Brugeren ${data.user.email} er oprettet`)
      setEmail('')
      setPassword('')
      setRepeatPassword('')
      setRole('user')
      await loadUsers()
    } catch (error) {
      console.error('Error creating user:', error)
      toast.error(error instanceof Error ? error.message : 'Kunne ikke oprette brugeren')
    } finally {
      setIsCreating(false)
    }
  }

  async function toggleAdmin(userId: string, currentRole: User['role']) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'

    setUpdatingUserId(userId)

    try {
      const response = await adminRequest('/api/admin/users', {
        method: 'PATCH',
        body: JSON.stringify({ userId, role: newRole }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Kunne ikke opdatere brugerrollen')
      }

      setUsers((currentUsers) => currentUsers.map((user) => (
        user.id === userId ? { ...user, role: newRole } : user
      )))
      toast.success(`Bruger opdateret til ${newRole === 'admin' ? 'administrator' : 'bruger'}`)
      router.refresh()
    } catch (error) {
      console.error('Error updating user role:', error)
      toast.error(error instanceof Error ? error.message : 'Kunne ikke opdatere brugerrollen')
    } finally {
      setUpdatingUserId(null)
    }
  }

  async function deleteUser() {
    if (!userToDelete) return

    setDeletingUserId(userToDelete.id)

    try {
      const response = await adminRequest('/api/admin/users', {
        method: 'DELETE',
        body: JSON.stringify({ userId: userToDelete.id }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Kunne ikke slette brugeren')
      }

      setUsers((currentUsers) => currentUsers.filter((user) => user.id !== userToDelete.id))
      toast.success(`Brugeren ${userToDelete.email} er slettet`)
      setUserToDelete(null)
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error(error instanceof Error ? error.message : 'Kunne ikke slette brugeren')
    } finally {
      setDeletingUserId(null)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={createUser} className="space-y-4 rounded-lg border p-4">
        <div>
          <h3 className="font-semibold">Opret ny bruger</h3>
          <p className="text-sm text-muted-foreground">
            Brugeren kan logge ind med det samme.
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="new-user-email">E-mail</Label>
          <Input
            id="new-user-email"
            type="email"
            autoComplete="off"
            placeholder="navn@fitnessx.dk"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="new-user-password">Adgangskode</Label>
          <Input
            id="new-user-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">Mindst 8 tegn</p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="repeat-new-user-password">Gentag adgangskode</Label>
          <Input
            id="repeat-new-user-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={repeatPassword}
            onChange={(event) => setRepeatPassword(event.target.value)}
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="new-user-role">Rolle</Label>
          <Select value={role} onValueChange={(value: User['role']) => setRole(value)}>
            <SelectTrigger id="new-user-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">Bruger</SelectItem>
              <SelectItem value="admin">Administrator</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" className="w-full" disabled={isCreating}>
          <UserPlus className="mr-2 h-4 w-4" />
          {isCreating ? 'Opretter...' : 'Opret bruger'}
        </Button>
      </form>

      <div className="space-y-3">
        <h3 className="font-semibold">Eksisterende brugere</h3>

        {isLoading && <div className="text-center py-4">Indlæser brugere...</div>}

        {!isLoading && users.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">Ingen brugere fundet</div>
        )}

        {!isLoading && users.map((user) => (
          <div key={user.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.email}</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                  {user.role === 'admin' ? 'Administrator' : 'Bruger'}
                </Badge>
                {user.id === currentUserId && (
                  <span className="text-xs text-muted-foreground">Dig</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={updatingUserId === user.id || user.id === currentUserId}
                onClick={() => toggleAdmin(user.id, user.role)}
              >
                {updatingUserId === user.id
                  ? 'Gemmer...'
                  : user.role === 'admin'
                    ? 'Fjern admin'
                    : 'Gør til admin'}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={deletingUserId === user.id || user.id === currentUserId}
                onClick={() => setUserToDelete(user)}
                aria-label={`Slet ${user.email}`}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Slet bruger</span>
              </Button>
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={Boolean(userToDelete)} onOpenChange={(open) => {
        if (!open && !deletingUserId) setUserToDelete(null)
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slet bruger?</AlertDialogTitle>
            <AlertDialogDescription>
              {userToDelete?.email} bliver slettet permanent og kan ikke længere logge ind.
              Handlingen kan ikke fortrydes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingUserId)}>Annuller</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                void deleteUser()
              }}
              disabled={Boolean(deletingUserId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingUserId ? 'Sletter...' : 'Slet bruger'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
