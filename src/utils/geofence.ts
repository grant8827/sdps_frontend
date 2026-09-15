export interface Position { latitude: number; longitude: number; accuracy: number; timestamp: number }
export interface Campus { latitude?: number | null; longitude?: number | null; geofenceRadius?: number | null }
export const DEFAULT_RADIUS_METERS = 150;
export function isAtCampus(position: Position | null, campus: Campus): boolean {
  if (!position || campus.latitude == null || campus.longitude == null || Date.now() - position.timestamp > 30000) return false;
  const radius = campus.geofenceRadius ?? DEFAULT_RADIUS_METERS;
  if (position.accuracy > radius) return false;
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(campus.latitude - position.latitude);
  const dLon = radians(campus.longitude - position.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(position.latitude)) * Math.cos(radians(campus.latitude)) * Math.sin(dLon / 2) ** 2;
  const distance = 6371000 * 2 * Math.asin(Math.sqrt(h));
  return distance + position.accuracy <= radius;
}
