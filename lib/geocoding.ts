/**
 * Server-only geocoding via Google's Geocoding API. Uses a separate,
 * IP-restricted key (GOOGLE_MAPS_SERVER_API_KEY) -- never the browser
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, which is referrer-restricted instead.
 */
export interface GeocodeResult {
  lat: number;
  lng: number;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!apiKey || !address.trim()) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("components", "country:ZA");
  url.searchParams.set("key", apiKey);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = await res.json();
    const location = data?.results?.[0]?.geometry?.location;
    if (typeof location?.lat !== "number" || typeof location?.lng !== "number") return null;
    return { lat: location.lat, lng: location.lng };
  } catch {
    return null;
  }
}
