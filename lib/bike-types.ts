export const BIKE_TYPES = [
  { value: 'smart_plus', label: 'Smart+' },
  { value: 'phantom', label: 'Phantom' },
] as const

export type BikeType = typeof BIKE_TYPES[number]['value']

export function getBikeTypeLabel(bikeType: BikeType | null | undefined) {
  return BIKE_TYPES.find((type) => type.value === bikeType)?.label ?? 'Cykeltype ikke valgt'
}
