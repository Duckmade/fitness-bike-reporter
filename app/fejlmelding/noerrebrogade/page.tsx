import type { Metadata } from 'next'
import { PublicIssueReportForm } from '@/components/public-issue-report-form'

export const metadata: Metadata = {
  title: 'BodyBike fejlmelding | FitnessX Nørrebrogade',
  description: 'Registrér en fejl på en bike i FitnessX Nørrebrogade.',
}

export default function NoerrebrogadeReportPage() {
  return <PublicIssueReportForm centerSlug="noerrebrogade" />
}
