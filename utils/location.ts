// Calculate distance between two coordinates using Haversine formula
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c // Distance in km
  return distance
}

// Convert degrees to radians
export function deg2rad(deg: number): number {
  return deg * (Math.PI / 180)
}

// Format distance for display
export function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`
  }
  return `${Math.round(distance * 10) / 10} km`
}

// Get coordinates from address (geocoding)
// This would typically use a service like Google Maps Geocoding API
export async function getCoordinatesFromAddress(
  address: string,
): Promise<{ latitude: number; longitude: number } | null> {
  // In a real app, you would implement this with a geocoding service
  // For this example, we'll return null
  console.log("Geocoding not implemented")
  return null
}

// Get address from coordinates (reverse geocoding)
// This would typically use a service like Google Maps Geocoding API
export async function getAddressFromCoordinates(latitude: number, longitude: number): Promise<string | null> {
  // In a real app, you would implement this with a geocoding service
  // For this example, we'll return null
  console.log("Reverse geocoding not implemented")
  return null
}
