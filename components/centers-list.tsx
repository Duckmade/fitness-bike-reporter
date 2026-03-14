'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Trash2, Edit, Save } from 'lucide-react'

interface Bike {
  id: string
  bike_number: number
}

interface Center {
  id: string
  name: string
  bikes: Bike[]
}

export function CentersList() {
  const [centers, setCenters] = useState<Center[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingCenter, setEditingCenter] = useState<Center | null>(null)
  const [editName, setEditName] = useState('')
  const [editBikeCount, setEditBikeCount] = useState(0)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editingCenterId, setEditingCenterId] = useState<string | null>(null)
  const [editedBikeNumbers, setEditedBikeNumbers] = useState<Record<string, string>>({})
  const supabase = createClient()

  useEffect(() => {
    loadCenters()
    
    // Subscribe to real-time updates
    const centersChannel = supabase
      .channel('centers_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'centers' }, () => {
        loadCenters()
      })
      .subscribe()

    const bikesChannel = supabase
      .channel('bikes_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bikes' }, () => {
        loadCenters()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(centersChannel)
      supabase.removeChannel(bikesChannel)
    }
  }, [])

  async function loadCenters() {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('centers')
      .select(`
        *,
        bikes (
          id,
          bike_number
        )
      `)
      .order('name')

    if (error) {
      console.error('Error loading centers:', error)
      toast.error('Kunne ikke indlæse centre')
    } else {
      setCenters(data || [])
    }
    setIsLoading(false)
  }

  async function deleteCenter(centerId: string, centerName: string) {
    if (!confirm(`Er du sikker på at du vil slette "${centerName}"? Dette vil også slette alle tilhørende cykler og rapporter.`)) {
      return
    }

    const { error } = await supabase
      .from('centers')
      .delete()
      .eq('id', centerId)

    if (error) {
      console.error('Error deleting center:', error)
      toast.error('Kunne ikke slette center')
    } else {
      toast.success('Center slettet')
      loadCenters()
    }
  }

  function openEditDialog(center: Center) {
    setEditingCenter(center)
    setEditName(center.name)
    setEditBikeCount(center.bikes.length)
  }

  async function updateCenter() {
    if (!editingCenter || !editName.trim()) {
      toast.error('Indtast venligst et navn')
      return
    }

    if (editBikeCount < 1) {
      toast.error('Der skal være mindst 1 cykel')
      return
    }

    setIsUpdating(true)

    // Update center name
    const { error: nameError } = await supabase
      .from('centers')
      .update({ name: editName.trim() })
      .eq('id', editingCenter.id)

    if (nameError) {
      console.error('Error updating center:', nameError)
      toast.error('Kunne ikke opdatere center')
      setIsUpdating(false)
      return
    }

    // Handle bike count changes
    const currentBikeCount = editingCenter.bikes.length
    
    if (editBikeCount > currentBikeCount) {
      // Add new bikes
      const bikesToAdd = editBikeCount - currentBikeCount
      const maxBikeNumber = Math.max(...editingCenter.bikes.map(b => b.bike_number), 0)
      const newBikes = Array.from({ length: bikesToAdd }, (_, i) => ({
        center_id: editingCenter.id,
        bike_number: maxBikeNumber + i + 1
      }))

      const { error: addError } = await supabase
        .from('bikes')
        .insert(newBikes)

      if (addError) {
        console.error('Error adding bikes:', addError)
        toast.error('Kunne ikke tilføje cykler')
        setIsUpdating(false)
        return
      }
    } else if (editBikeCount < currentBikeCount) {
      // Remove bikes (remove the highest numbered ones)
      const bikesToRemove = currentBikeCount - editBikeCount
      const sortedBikes = [...editingCenter.bikes].sort((a, b) => b.bike_number - a.bike_number)
      const bikeIdsToRemove = sortedBikes.slice(0, bikesToRemove).map(b => b.id)

      const { error: removeError } = await supabase
        .from('bikes')
        .delete()
        .in('id', bikeIdsToRemove)

      if (removeError) {
        console.error('Error removing bikes:', removeError)
        toast.error('Kunne ikke fjerne cykler')
        setIsUpdating(false)
        return
      }
    }

    toast.success('Center opdateret')
    setEditingCenter(null)
    loadCenters()
    setIsUpdating(false)
  }

  function startEditingBikes(center: Center) {
    setEditingCenterId(center.id)
    const initialNumbers: Record<string, string> = {}
    center.bikes.forEach(bike => {
      initialNumbers[bike.id] = bike.bike_number.toString()
    })
    setEditedBikeNumbers(initialNumbers)
  }

  function cancelEditingBikes() {
    setEditingCenterId(null)
    setEditedBikeNumbers({})
  }

  async function saveBikeNumbers(centerId: string) {
    const center = centers.find(c => c.id === centerId)
    if (!center) return

    // Validate all numbers
    const updates: Array<{ id: string; number: number }> = []
    const seenNumbers = new Set<number>()

    for (const bike of center.bikes) {
      const newNumberStr = editedBikeNumbers[bike.id]
      const newNumber = parseInt(newNumberStr)

      if (isNaN(newNumber) || newNumber < 1) {
        toast.error('Alle cykel numre skal være gyldige tal større end 0')
        return
      }

      if (seenNumbers.has(newNumber)) {
        toast.error('Cykel numre skal være unikke')
        return
      }

      seenNumbers.add(newNumber)
      updates.push({ id: bike.id, number: newNumber })
    }

    // Update all bikes
    setIsUpdating(true)
    for (const update of updates) {
      const { error } = await supabase
        .from('bikes')
        .update({ bike_number: update.number })
        .eq('id', update.id)

      if (error) {
        console.error('Error updating bike number:', error)
        toast.error('Kunne ikke opdatere cykel numre')
        setIsUpdating(false)
        return
      }
    }

    toast.success('Cykel numre opdateret')
    cancelEditingBikes()
    loadCenters()
    setIsUpdating(false)
  }

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Indlæser...</div>
  }

  if (centers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Ingen centre oprettet endnu.</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        <Accordion type="single" collapsible className="w-full">
          {centers.map((center) => (
            <AccordionItem key={center.id} value={center.id}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 flex-1">
                  <span className="font-medium">{center.name}</span>
                  <Badge variant="secondary">{center.bikes.length} cykler</Badge>
                  <div className="ml-auto flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(center)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCenter(center.id, center.name)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-5 gap-2">
                    {center.bikes
                      .sort((a, b) => a.bike_number - b.bike_number)
                      .map((bike) => (
                        <div key={bike.id}>
                          {editingCenterId === center.id ? (
                            <Input
                              type="number"
                              value={editedBikeNumbers[bike.id] || ''}
                              onChange={(e) => setEditedBikeNumbers({
                                ...editedBikeNumbers,
                                [bike.id]: e.target.value
                              })}
                              className="h-9 text-center"
                            />
                          ) : (
                            <div className="flex items-center justify-center p-2 bg-muted rounded text-sm font-medium">
                              #{bike.bike_number}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                  
                  {editingCenterId === center.id ? (
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelEditingBikes}
                        disabled={isUpdating}
                      >
                        Annuller
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveBikeNumbers(center.id)}
                        disabled={isUpdating}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {isUpdating ? 'Gemmer...' : 'Gem Ændringer'}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEditingBikes(center)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Rediger Numre
                      </Button>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {editingCenter && (
        <Dialog open={!!editingCenter} onOpenChange={() => setEditingCenter(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rediger Center</DialogTitle>
              <DialogDescription>
                Opdater center navn og antal cykler
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Center Navn</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="F.eks. FitnessX Prismet"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-bike-count">Antal Cykler</Label>
                <Input
                  id="edit-bike-count"
                  type="number"
                  min="1"
                  value={editBikeCount}
                  onChange={(e) => setEditBikeCount(parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Nuværende: {editingCenter.bikes.length} cykler
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingCenter(null)}>
                Annuller
              </Button>
              <Button onClick={updateCenter} disabled={isUpdating}>
                {isUpdating ? 'Gemmer...' : 'Gem Ændringer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
