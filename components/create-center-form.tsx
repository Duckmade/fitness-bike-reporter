'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { BIKE_TYPES, type BikeType } from '@/lib/bike-types'

export function CreateCenterForm() {
  const [centerName, setCenterName] = useState('')
  const [bikeType, setBikeType] = useState<BikeType | ''>('')
  const [bikeCount, setBikeCount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    const count = parseInt(bikeCount)
    if (!centerName.trim() || !bikeType || isNaN(count) || count < 1) {
      toast.error('Udfyld venligst alle felter korrekt')
      return
    }

    setIsLoading(true)

    try {
      // Create center
      const { data: center, error: centerError } = await supabase
        .from('centers')
        .insert({ name: centerName.trim(), bike_type: bikeType })
        .select()
        .single()

      if (centerError) throw centerError

      // Create bikes for the center
      const bikes = Array.from({ length: count }, (_, i) => ({
        center_id: center.id,
        bike_number: i + 1
      }))

      const { error: bikesError } = await supabase
        .from('bikes')
        .insert(bikes)

      if (bikesError) throw bikesError

      toast.success(`Center "${centerName}" oprettet med ${count} cykler!`)
      setCenterName('')
      setBikeType('')
      setBikeCount('')
      router.refresh()
    } catch (error) {
      console.error('Error creating center:', error)
      toast.error('Kunne ikke oprette center')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="centerName">Center Navn</Label>
        <Input
          id="centerName"
          value={centerName}
          onChange={(e) => setCenterName(e.target.value)}
          placeholder="F.eks. FitnessX Prismet"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bikeType">Cykeltype</Label>
        <Select value={bikeType} onValueChange={(value) => setBikeType(value as BikeType)} required>
          <SelectTrigger id="bikeType">
            <SelectValue placeholder="Vælg cykeltype" />
          </SelectTrigger>
          <SelectContent>
            {BIKE_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bikeCount">Antal Cykler</Label>
        <Input
          id="bikeCount"
          type="number"
          min="1"
          placeholder="F.eks. 20"
          value={bikeCount}
          onChange={(e) => setBikeCount(e.target.value)}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Opretter...' : 'Opret Center'}
      </Button>
    </form>
  )
}
