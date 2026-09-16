import type { Metadata } from 'next'
import { PublicIssueReportForm } from '@/components/public-issue-report-form'

export const metadata: Metadata = {
  title: 'BodyBike fejlmelding | FitnessX Frisko',
  description: 'Registrér en fejl på en bike i FitnessX Frisko.',
}

export default function FriskoReportPage() {
  return <PublicIssueReportForm centerSlug="frisko" />
}
