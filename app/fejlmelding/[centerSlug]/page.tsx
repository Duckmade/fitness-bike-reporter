import type { Metadata } from 'next'
import { PublicIssueReportForm } from '@/components/public-issue-report-form'

export const metadata: Metadata = {
  title: 'BodyBike fejlmelding | FitnessX',
  description: 'Registrér en fejl på en bike i dit FitnessX-center.',
}

export default function PublicIssueReportPage({
  params,
}: {
  params: { centerSlug: string }
}) {
  return <PublicIssueReportForm centerSlug={params.centerSlug} />
}
