import test from 'node:test'
import assert from 'node:assert/strict'
import { createPublicCenterSlug } from '../lib/public-center-slug.ts'
import { getConversionRate, getPublicStatsPeriodStart } from '../lib/public-form-analytics.ts'

test('creates stable public slugs including Danish characters', () => {
  assert.equal(createPublicCenterSlug('Prismet'), 'prismet')
  assert.equal(createPublicCenterSlug('Nørrebrogade'), 'noerrebrogade')
  assert.equal(createPublicCenterSlug('FitnessX Åbyhøj'), 'fitnessx-aabyhoej')
})

test('returns no conversion rate when there are no visits', () => {
  assert.equal(getConversionRate(0, 0), null)
})

test('calculates conversion rate from public submissions and visits', () => {
  assert.equal(getConversionRate(40, 10), 25)
})

test('calculates rolling period starts in UTC', () => {
  const now = Date.parse('2026-09-20T12:00:00.000Z')
  assert.equal(getPublicStatsPeriodStart('7d', now), '2026-09-13T12:00:00.000Z')
  assert.equal(getPublicStatsPeriodStart('30d', now), '2026-08-21T12:00:00.000Z')
  assert.equal(getPublicStatsPeriodStart('all', now), null)
})

