export interface LatLng {
  latitude: number;
  longitude: number;
}

export function isValidCoordinate(
  latitude?: number | null,
  longitude?: number | null
): boolean {
  if (latitude == null || longitude == null) return false;

  return (
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function toRadians(value: number): number {
  return value * Math.PI / 180;
}

export function normalizeCoordinate(
  latitude: number,
  longitude: number
): LatLng {
  return {
    latitude: Number(latitude),
    longitude: Number(longitude),
  };
}