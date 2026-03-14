'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'
import { Trash2 } from 'lucide-react'

interface IssueReport {
  id: string
  description: string
  parts_replaced: string | null
  status: string
  resolution_notes: string | null
  created_at: string | null
  bikes: {
    bike_number: number
    centers: {
      name: string
    }
  }
}

interface Center {
  id: string
  name: string
}

export function IssuesList({ isAdmin, refreshTrigger }: { isAdmin: boolean; refreshTrigger?: number }) {
  // Note: All users can update status, not just admins
  const [issues, setIssues] = useState<IssueReport[]>([])
  const [centers, setCenters] = useState<Center[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedIssue, setSelectedIssue] = useState<IssueReport | null>(null)
  const [newStatus, setNewStatus] = useState('')
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [selectedCenterFilter, setSelectedCenterFilter] = useState<string>('all')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadIssues(false)
  }, [refreshTrigger])

  useEffect(() => {
    loadCenters()
    loadIssues()
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('issue_reports_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issue_reports' }, (payload) => {
        console.log('Realtime event received:', payload)
        loadIssues(false) // Don't show loading spinner for real-time updates
      })
      .subscribe((status) => {
        console.log('Subscription status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    loadIssues(false)
  }, [showAll, selectedCenterFilter, selectedStatusFilter])

  async function loadCenters() {
    const { data, error } = await supabase
      .from('centers')
      .select('id, name')
      .order('name')

    if (error) {
      console.error('Error loading centers:', error)
    } else {
      setCenters(data || [])
    }
  }

  async function loadIssues(showLoading = true) {
    if (showLoading) {
      setIsLoading(true)
    }
    
    let query = supabase
      .from('issue_reports')
      .select(`
        *,
        bikes!inner (
          bike_number,
          center_id,
          centers!inner (
            name,
            id
          )
        )
      `)

    // Apply center filter if selected
    if (selectedCenterFilter !== 'all') {
      query = query.eq('bikes.center_id', selectedCenterFilter)
    }

    // Apply status filter if selected
    if (selectedStatusFilter !== 'all') {
      query = query.eq('status', selectedStatusFilter)
    }

    // Apply limit if not showing all
    if (!showAll) {
      query = query.limit(100) // Fetch more to allow proper sorting
    }

    const { data, error } = await query

    if (error) {
      console.error('Error loading issues:', error)
      toast.error('Kunne ikke indlæse rapporter')
    } else {
      // Sort by status priority first, then by date
      const statusPriority: Record<string, number> = {
        'open': 1,
        'pending': 2,
        'reported_to_technician': 3,
        'resolved': 4
      }
      
      const sortedData = (data || []).sort((a, b) => {
        // First sort by status priority
        const statusDiff = (statusPriority[a.status] || 999) - (statusPriority[b.status] || 999)
        if (statusDiff !== 0) return statusDiff
        
        // Then sort by date (newest first)
        const dateA = new Date(a.created_at || 0).getTime()
        const dateB = new Date(b.created_at || 0).getTime()
        return dateB - dateA
      })
      
      console.log('Sorted data sample:', sortedData.slice(0, 3).map(d => ({
        center: d.bikes.centers.name,
        status: d.status,
        date: d.created_at
      })))
      
      // Apply limit after sorting if not showing all
      setIssues(showAll ? sortedData : sortedData.slice(0, 20))
    }
    if (showLoading) {
      setIsLoading(false)
    }
  }

  async function handleUpdateIssue() {
    if (!selectedIssue) return

    if (newStatus === 'resolved' && !resolutionNotes.trim()) {
      toast.error('Beskriv venligst hvordan problemet blev løst')
      return
    }

    setIsUpdating(true)
    try {
      const { error } = await supabase
        .from('issue_reports')
        .update({
          status: newStatus,
          resolution_notes: resolutionNotes.trim() || null
        })
        .eq('id', selectedIssue.id)

      if (error) throw error

      toast.success('Rapport opdateret!')
      setSelectedIssue(null)
      setNewStatus('')
      setResolutionNotes('')
      // Manually reload to ensure we see the update
      await loadIssues(false)
    } catch (error) {
      console.error('Error updating issue:', error)
      toast.error('Kunne ikke opdatere rapport')
    } finally {
      setIsUpdating(false)
    }
  }

  async function handleDeleteIssue(issueId: string, event: React.MouseEvent) {
    event.stopPropagation()
    
    if (!confirm('Er du sikker på at du vil slette denne rapport?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('issue_reports')
        .delete()
        .eq('id', issueId)

      if (error) throw error

      toast.success('Rapport slettet!')
      await loadIssues(false)
    } catch (error) {
      console.error('Error deleting issue:', error)
      toast.error('Kunne ikke slette rapport')
    }
  }

  function openIssueDialog(issue: IssueReport) {
    setSelectedIssue(issue)
    setNewStatus(issue.status)
    setResolutionNotes(issue.resolution_notes || '')
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success', label: string }> = {
      open: { variant: 'outline', label: 'Åben' },
      pending: { variant: 'default', label: 'Afventer' },
      reported_to_technician: { variant: 'destructive', label: 'Fejlmeldt til tekniker' },
      resolved: { variant: 'success', label: 'Løst' }
    }
    const config = variants[status] || { variant: 'outline' as const, label: status }
    return <Badge variant={config.variant} className={status === 'pending' ? 'bg-orange-500 hover:bg-orange-600' : ''}>{config.label}</Badge>
  }

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Indlæser...</div>
  }

  if (issues.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Ingen rapporter endnu.</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4 mb-4">
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={selectedCenterFilter} onValueChange={setSelectedCenterFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrer efter center" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle centre</SelectItem>
              {centers.map((center) => (
                <SelectItem key={center.id} value={center.id}>
                  {center.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrer efter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statusser</SelectItem>
              <SelectItem value="open">Åben</SelectItem>
              <SelectItem value="pending">Afventer</SelectItem>
              <SelectItem value="reported_to_technician">Fejlmeldt til tekniker</SelectItem>
              <SelectItem value="resolved">Løst</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Vis seneste 20' : 'Vis alle rapporter'}
          </Button>
        </div>
      </div>

      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        {issues.map((issue) => (
          <div
            key={issue.id}
            className="border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => openIssueDialog(issue)}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2 flex-1">
                <div className="font-medium">
                  {issue.bikes.centers.name} - Cykel #{issue.bikes.bike_number}
                </div>
                {getStatusBadge(issue.status)}
              </div>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleDeleteIssue(issue.id, e)}
                  className="ml-2"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-2">{issue.description}</p>
            {issue.parts_replaced && (
              <div className="mt-2 text-sm bg-blue-50 p-2 rounded border border-blue-200">
                <strong>Udskiftede dele:</strong> {issue.parts_replaced}
              </div>
            )}
            <div className="text-xs text-muted-foreground mt-2">
              {issue.created_at && format(new Date(issue.created_at), 'PPp', { locale: da })}
            </div>
            {issue.resolution_notes && (
              <div className="mt-2 text-sm bg-muted p-2 rounded">
                <strong>Løsning:</strong> {issue.resolution_notes}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedIssue && (
        <Dialog open={!!selectedIssue} onOpenChange={() => setSelectedIssue(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Opdater Rapport</DialogTitle>
              <DialogDescription>
                {selectedIssue.bikes.centers.name} - Cykel #{selectedIssue.bikes.bike_number}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Problem</Label>
                <p className="text-sm">{selectedIssue.description}</p>
              </div>

              {selectedIssue.parts_replaced && (
                <div className="space-y-2">
                  <Label>Udskiftede Dele</Label>
                  <p className="text-sm bg-blue-50 p-2 rounded border border-blue-200">{selectedIssue.parts_replaced}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Åben</SelectItem>
                    <SelectItem value="pending">Afventer</SelectItem>
                    <SelectItem value="reported_to_technician">Fejlmeldt til tekniker</SelectItem>
                    <SelectItem value="resolved">Løst</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newStatus === 'resolved' && (
                <div className="space-y-2">
                  <Label htmlFor="resolution">Løsning *</Label>
                  <Textarea
                    id="resolution"
                    placeholder="Beskriv hvad der blev gjort for at løse problemet (f.eks. skiftet pedaler)..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    rows={4}
                    required
                  />
                </div>
              )}

              {newStatus !== 'resolved' && (
                <div className="space-y-2">
                  <Label htmlFor="resolution">Løsningsnoter (valgfrit)</Label>
                  <Textarea
                    id="resolution"
                    placeholder="Tilføj eventuelle noter..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    rows={4}
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedIssue(null)}>
                Annuller
              </Button>
              <Button onClick={handleUpdateIssue} disabled={isUpdating}>
                {isUpdating ? 'Opdaterer...' : 'Gem Ændringer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
