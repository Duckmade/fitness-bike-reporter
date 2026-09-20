'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { CheckCircle2, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { BikeType } from '@/lib/bike-types'

interface Bike {
  id: string
  bike_number: number
}

interface PublicFormData {
  center: {
    id: string
    name: string
    bike_type: BikeType | null
  }
  bikes: Bike[]
  categories: string[]
}

export function PublicIssueReportForm({ centerSlug }: { centerSlug: string }) {
  const [formData, setFormData] = useState<PublicFormData | null>(null)
  const [bikeId, setBikeId] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [website, setWebsite] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function registerVisit(centerId: string) {
      const visitKey = `fitness-bike-reporter:visit:${centerId}`

      try {
        const sessionKey = 'fitness-bike-reporter:public-session-id'

        if (sessionStorage.getItem(visitKey)) return

        let sessionId = sessionStorage.getItem(sessionKey)
        if (!sessionId) {
          sessionId = crypto.randomUUID()
          sessionStorage.setItem(sessionKey, sessionId)
        }

        sessionStorage.setItem(visitKey, 'pending')

        const response = await fetch(`/api/public/visits/${centerSlug}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })

        if (response.ok) {
          sessionStorage.setItem(visitKey, 'recorded')
        } else {
          sessionStorage.removeItem(visitKey)
        }
      } catch (visitError) {
        try {
          sessionStorage.removeItem(visitKey)
        } catch {
          // Storage may be unavailable. Statistics must never block the form.
        }
        console.warn('Visit registration failed:', visitError)
      }
    }

    async function loadForm() {
      try {
        const response = await fetch(`/api/public/reports/${centerSlug}`, { cache: 'no-store' })
        const data = await response.json()

        if (!response.ok) throw new Error(data.error ?? 'Kunne ikke indlæse siden')

        setFormData(data)
        void registerVisit(data.center.id)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Kunne ikke indlæse siden')
      } finally {
        setIsLoading(false)
      }
    }

    void loadForm()
  }, [centerSlug])

  function toggleCategory(category: string, checked: boolean) {
    setSelectedCategories((current) => (
      checked
        ? [...current, category]
        : current.filter((item) => item !== category)
    ))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (!bikeId) {
      setError('Vælg et cykelnummer')
      return
    }

    if (!description.trim()) {
      setError('Beskriv venligst fejlen')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/public/reports/${centerSlug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bikeId,
          categories: selectedCategories,
          description,
          website,
        }),
      })
      const data = await response.json()

      if (!response.ok) throw new Error(data.error ?? 'Kunne ikke registrere fejlmeldingen')

      setIsSubmitted(true)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Kunne ikke registrere fejlmeldingen')
    } finally {
      setIsSubmitting(false)
    }
  }

  function resetForm() {
    setBikeId('')
    setSelectedCategories([])
    setDescription('')
    setWebsite('')
    setError(null)
    setIsSubmitted(false)
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-6 flex justify-center">
          <Image src="/FitnessX.png" alt="FitnessX" width={180} height={108} className="object-contain" priority />
        </div>

        <Card>
          {isSubmitted ? (
            <CardContent className="flex flex-col items-center gap-5 px-6 py-10 text-center">
              <CheckCircle2 className="h-14 w-14 text-green-600" aria-hidden="true" />
              <div className="space-y-2">
                <h1 className="text-2xl font-bold">Tak for din hjælp</h1>
                <p className="text-muted-foreground">
                  Din fejlmelding er nu registreret, og vi sørger for at få udbedret fejlen.
                </p>
              </div>
              <Button variant="outline" onClick={resetForm}>Indsend en ny fejlmelding</Button>
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="text-2xl">BodyBike fejlmelding</CardTitle>
                <CardDescription>
                  {formData ? `FitnessX ${formData.center.name}` : 'FitnessX Prismet'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="py-8 text-center text-muted-foreground">Indlæser cykler...</p>
                ) : formData ? (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="public-bike">Cykelnummer *</Label>
                      <Select value={bikeId} onValueChange={setBikeId} required>
                        <SelectTrigger id="public-bike">
                          <SelectValue placeholder="Vælg cykel" />
                        </SelectTrigger>
                        <SelectContent>
                          {formData.bikes.map((bike) => (
                            <SelectItem key={bike.id} value={bike.id}>
                              Cykel #{bike.bike_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <fieldset className="space-y-3">
                      <legend className="text-sm font-medium">Hvor er problemet?</legend>
                      <div className="grid grid-cols-2 gap-3">
                        {formData.categories.map((category) => {
                          const id = `category-${category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
                          return (
                            <div key={category} className="flex items-center gap-2 rounded-md border p-3">
                              <Checkbox
                                id={id}
                                checked={selectedCategories.includes(category)}
                                onCheckedChange={(checked) => toggleCategory(category, checked === true)}
                              />
                              <Label htmlFor={id} className="cursor-pointer font-normal">{category}</Label>
                            </div>
                          )
                        })}
                      </div>
                    </fieldset>

                    {formData.center.bike_type === 'phantom' && selectedCategories.includes('Belastning') && (
                      <div className="flex gap-3 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
                        <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                        <p>
                          Hvis du oplever at din FTP er ustabil og springer op og ned, skyldes det i de fleste tilfælde,
                          at FTP er indstillet forkert. Du er velkommen til at tage en snak med instruktøren om indstilling
                          af FTP.
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="public-description">Beskriv fejlen *</Label>
                      <Textarea
                        id="public-description"
                        placeholder="Hvad er der galt med cyklen?"
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        rows={5}
                        maxLength={2000}
                        required
                      />
                    </div>

                    <div className="absolute -left-[9999px]" aria-hidden="true">
                      <Label htmlFor="website">Website</Label>
                      <input
                        id="website"
                        name="website"
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                        value={website}
                        onChange={(event) => setWebsite(event.target.value)}
                      />
                    </div>

                    {error && <p className="text-sm font-medium text-red-600" role="alert">{error}</p>}

                    <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                      {isSubmitting ? 'Sender...' : 'Send fejlmelding'}
                    </Button>
                  </form>
                ) : (
                  <p className="py-8 text-center text-red-600" role="alert">{error}</p>
                )}
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </main>
  )
}
