import type { Metadata } from 'next'
import { PublicIssueReportForm } from '@/components/public-issue-report-form'

export const metadata: Metadata = {
  title: 'BodyBike fejlmelding | FitnessX PMV',
  description: 'Registrér en fejl på en bike i FitnessX PMV.',
}

export default function PmvReportPage() {
  return <PublicIssueReportForm centerSlug="pmv" />
}
