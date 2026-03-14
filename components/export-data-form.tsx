'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface Center {
  id: string
  name: string
}

export function ExportDataForm() {
  const [centers, setCenters] = useState<Center[]>([])
  const [selectedCenter, setSelectedCenter] = useState<string>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadCenters()
  }, [])

  async function loadCenters() {
    const { data, error } = await supabase
      .from('centers')
      .select('id, name')
      .order('name')

    if (error) {
      console.error('Error loading centers:', error)
      toast.error('Kunne ikke indlæse centre')
    } else {
      setCenters(data || [])
    }
  }

  async function handleExport() {
    if (!selectedCenter || !startDate || !endDate) {
      toast.error('Udfyld venligst alle felter')
      return
    }

    setIsLoading(true)

    try {
      // Fetch all bikes for the center
      const { data: bikes, error: bikesError } = await supabase
        .from('bikes')
        .select('id, bike_number')
        .eq('center_id', selectedCenter)
        .order('bike_number')

      if (bikesError) throw bikesError

      // Fetch issue reports with user info
      const { data: reports, error: reportsError } = await supabase
        .from('issue_reports')
        .select(`
          *,
          bikes!inner (
            bike_number,
            center_id,
            centers!inner (
              name
            )
          )
        `)
        .eq('bikes.center_id', selectedCenter)
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59')
        .order('created_at', { ascending: true })

      if (reportsError) throw reportsError

      if (!reports || reports.length === 0) {
        toast.error('Ingen data fundet for den valgte periode')
        return
      }

      // Get user emails for reports using the database function
      const { data: userEmails, error: userError } = await supabase
        .rpc('get_user_emails_with_roles')
      
      if (userError) {
        console.error('Error fetching user emails:', userError)
      }
      
      const userMap = new Map<string, string | undefined>(
        userEmails?.map((u: any) => [u.user_id as string, u.email as string | undefined]) || []
      )

      // Convert to CSV with bikes as columns
      const centerName = centers.find(c => c.id === selectedCenter)?.name || 'Unknown'
      const csvContent = convertToBikeHistoryCSV(reports, bikes || [], centerName, startDate, endDate, userMap)
      
      // Download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `${centerName}_${startDate}_${endDate}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('Data eksporteret!')
    } catch (error) {
      console.error('Error exporting data:', error)
      toast.error('Kunne ikke eksportere data')
    } finally {
      setIsLoading(false)
    }
  }

  function replaceDanishChars(text: string): string {
    return text
      .replace(/æ/g, 'ae')
      .replace(/ø/g, 'oe')
      .replace(/å/g, 'aa')
      .replace(/Æ/g, 'Ae')
      .replace(/Ø/g, 'Oe')
      .replace(/Å/g, 'Aa')
  }

  function convertToBikeHistoryCSV(
    reports: any[], 
    bikes: any[], 
    centerName: string, 
    startDate: string, 
    endDate: string,
    userMap: Map<string, string | undefined>
  ): string {
    // Title row
    const title = replaceDanishChars(`${centerName} - ${format(new Date(startDate), 'dd/MM/yyyy')} til ${format(new Date(endDate), 'dd/MM/yyyy')}`)
    
    // Group reports by bike
    const reportsByBike = new Map<number, any[]>()
    reports.forEach(report => {
      const bikeNum = report.bikes.bike_number
      if (!reportsByBike.has(bikeNum)) {
        reportsByBike.set(bikeNum, [])
      }
      reportsByBike.get(bikeNum)!.push(report)
    })

    // Create header row with bike numbers
    const bikeNumbers = bikes.map(b => replaceDanishChars(`Cykel #${b.bike_number}`))
    const headerRow = ['', ...bikeNumbers].join(';')

    // Create data rows
    const maxReports = Math.max(...Array.from(reportsByBike.values()).map(r => r.length), 0)
    const dataRows: string[] = []

    for (let i = 0; i < maxReports; i++) {
      // Dato row
      const dateRow = ['Dato', ...bikes.map(bike => {
        const bikeReports = reportsByBike.get(bike.bike_number) || []
        const report = bikeReports[i]
        return report ? format(new Date(report.created_at), 'dd/MM/yyyy HH:mm') : ''
      })].join(';')
      dataRows.push(dateRow)

      // Fejlmelding row
      const descRow = [replaceDanishChars('Fejlmelding'), ...bikes.map(bike => {
        const bikeReports = reportsByBike.get(bike.bike_number) || []
        const report = bikeReports[i]
        return report ? `"${replaceDanishChars(report.description.replace(/"/g, '""'))}"` : ''
      })].join(';')
      dataRows.push(descRow)

      // Udskiftede dele row
      const partsRow = [replaceDanishChars('Udskiftede dele'), ...bikes.map(bike => {
        const bikeReports = reportsByBike.get(bike.bike_number) || []
        const report = bikeReports[i]
        return report && report.parts_replaced ? `"${replaceDanishChars(report.parts_replaced.replace(/"/g, '""'))}"` : ''
      })].join(';')
      dataRows.push(partsRow)

      // Status row
      const statusRow = ['Status', ...bikes.map(bike => {
        const bikeReports = reportsByBike.get(bike.bike_number) || []
        const report = bikeReports[i]
        if (!report) return ''
        const statusMap: Record<string, string> = {
          'open': 'Aaben',
          'reported_to_technician': 'Fejlmeldt til tekniker',
          'resolved': 'Loest'
        }
        return replaceDanishChars(statusMap[report.status] || report.status)
      })].join(';')
      dataRows.push(statusRow)

      // Loesning row
      const solutionRow = [replaceDanishChars('Loesning'), ...bikes.map(bike => {
        const bikeReports = reportsByBike.get(bike.bike_number) || []
        const report = bikeReports[i]
        return report && report.resolution_notes ? `"${replaceDanishChars(report.resolution_notes.replace(/"/g, '""'))}"` : ''
      })].join(';')
      dataRows.push(solutionRow)

      // Bruger row
      const userRow = ['Bruger', ...bikes.map(bike => {
        const bikeReports = reportsByBike.get(bike.bike_number) || []
        const report = bikeReports[i]
        return report ? replaceDanishChars(userMap.get(report.user_id) || 'Ukendt') : ''
      })].join(';')
      dataRows.push(userRow)

      // Empty row between reports
      if (i < maxReports - 1) {
        dataRows.push('')
      }
    }

    return [title, '', headerRow, ...dataRows].join('\n')
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="export-center">Center</Label>
        <Select value={selectedCenter} onValueChange={setSelectedCenter}>
          <SelectTrigger id="export-center">
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

      <div className="space-y-2">
        <Label htmlFor="start-date">Start Dato</Label>
        <Input
          id="start-date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="end-date">Slut Dato</Label>
        <Input
          id="end-date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          required
        />
      </div>

      <Button 
        onClick={handleExport} 
        className="w-full" 
        disabled={isLoading || !selectedCenter || !startDate || !endDate}
      >
        {isLoading ? 'Eksporterer...' : 'Eksportér til CSV'}
      </Button>
    </div>
  )
}
