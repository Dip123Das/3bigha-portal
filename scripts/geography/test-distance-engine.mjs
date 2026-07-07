const EARTH_RADIUS_KM = 6371.0088;

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function haversineDistanceKm(from, to) {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function createBoundingBox(center, radiusKm) {
  const latDelta = radiusKm / 111.32;
  const lonDelta = radiusKm / (111.32 * Math.cos(toRadians(center.latitude)));

  return {
    minLatitude: center.latitude - latDelta,
    maxLatitude: center.latitude + latDelta,
    minLongitude: center.longitude - lonDelta,
    maxLongitude: center.longitude + lonDelta,
  };
}

const coochBehar = { latitude: 26.3242, longitude: 89.4512 };
const siliguri = { latitude: 26.7271, longitude: 88.3953 };

const distanceKm = haversineDistanceKm(coochBehar, siliguri);
const box10Km = createBoundingBox(coochBehar, 10);

console.log("H4.2A Distance Engine Test");
console.log("--------------------------");
console.log("Cooch Behar → Siliguri distance:", distanceKm.toFixed(2), "km");
console.log("10 km bounding box around Cooch Behar:");
console.log(box10Km);
