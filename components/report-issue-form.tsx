'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Center {
  id: string
  name: string
}

interface Bike {
  id: string
  bike_number: number
  center_id: string
}

export function ReportIssueForm({ userId, onReportCreated }: { userId: string; onReportCreated?: () => void }) {
  const [centers, setCenters] = useState<Center[]>([])
  const [bikes, setBikes] = useState<Bike[]>([])
  const [selectedCenter, setSelectedCenter] = useState<string>('')
  const [selectedBike, setSelectedBike] = useState<string>('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<string>('open')
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadCenters()
  }, [])

  useEffect(() => {
    if (selectedCenter) {
      loadBikes(selectedCenter)
    } else {
      setBikes([])
      setSelectedBike('')
    }
  }, [selectedCenter])

  async function loadCenters() {
    const { data, error } = await supabase
      .from('centers')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error loading centers:', error)
      toast.error('Kunne ikke indlæse centre')
    } else {
      setCenters(data || [])
    }
  }

  async function loadBikes(centerId: string) {
    const { data, error } = await supabase
      .from('bikes')
      .select('*')
      .eq('center_id', centerId)
      .order('bike_number')

    if (error) {
      console.error('Error loading bikes:', error)
      toast.error('Kunne ikke indlæse cykler')
    } else {
      setBikes(data || [])
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!selectedBike || !description.trim()) {
      toast.error('Vælg venligst en cykel og beskriv problemet')
      return
    }

    if (status === 'resolved' && !resolutionNotes.trim()) {
      toast.error('Beskriv venligst hvordan problemet blev løst')
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase
        .from('issue_reports')
        .insert({
          bike_id: selectedBike,
          user_id: userId,
          description: description.trim(),
          parts_replaced: null,
          status: status,
          resolution_notes: status === 'resolved' ? resolutionNotes.trim() : null
        })

      if (error) throw error

      toast.success('Problem rapporteret!')
      setDescription('')
      setSelectedBike('')
      setSelectedCenter('')
      setStatus('open')
      setResolutionNotes('')
      // Notify parent component to refresh the list
      onReportCreated?.()
    } catch (error) {
      console.error('Error submitting report:', error)
      toast.error('Kunne ikke indsende rapport')
    } finally {
      setIsLoading(false)
    }
  }

  if (centers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Ingen centre tilgængelige endnu.</p>
        <p className="text-sm mt-2">Kontakt en administrator for at oprette centre og cykler.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="center">Center *</Label>
        <Select value={selectedCenter} onValueChange={setSelectedCenter} required>
          <SelectTrigger id="center">
            <SelectValue placeholder="Vælg center" />
          </SelectTrigger>
          <SelectContent>
            {centers.map((center) => (
              <SelectItem key={center.id} value={center.id}>
                {center.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCenter && (
        <div className="space-y-2">
          <Label htmlFor="bike">Cykel Nummer *</Label>
          <Select value={selectedBike} onValueChange={setSelectedBike} required>
            <SelectTrigger id="bike">
              <SelectValue placeholder="Vælg cykel" />
            </SelectTrigger>
            <SelectContent>
              {bikes.map((bike) => (
                <SelectItem key={bike.id} value={bike.id}>
                  Cykel #{bike.bike_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="description">Beskrivelse af Problem *</Label>
        <Textarea
          id="description"
          placeholder="Beskriv problemet med cyklen..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status *</Label>
        <Select value={status} onValueChange={setStatus} required>
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

      {status === 'resolved' && (
        <div className="space-y-2">
          <Label htmlFor="resolution">Løsning *</Label>
          <Textarea
            id="resolution"
            placeholder="Beskriv hvad der blev gjort for at løse problemet (f.eks. skiftet pedaler)..."
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            rows={3}
            required
          />
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isLoading || !selectedBike}>
        {isLoading ? 'Indsender...' : 'Rapportér Problem'}
      </Button>
    </form>
  )
}
