import type { Metadata } from 'next'
import { PublicIssueReportForm } from '@/components/public-issue-report-form'

export const metadata: Metadata = {
  title: 'Fejlmeld en bike | FitnessX Prismet',
  description: 'Registrér en fejl på en bike i FitnessX Prismet.',
}

export default function PrismetIssueReportPage() {
  return <PublicIssueReportForm centerSlug="prismet" />
}
