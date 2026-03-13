// hooks/useNearbyHospitals.ts
import { useState, useCallback } from "react";
import { Hospital, Location } from "../types";

const R = 6371e3;
const toRad = (v: number) => (v * Math.PI) / 180;

function haversineDist(a: Location, b: Location): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function useNearbyHospitals() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHospitals = useCallback(
    async (_map: google.maps.Map | null, origin: Location) => {
      setLoading(true);
      setError(null);
      setHospitals([]);

      // Overpass QL query — finds all hospitals within 10km
      const query = `
        [out:json][timeout:25];
        (
          node["amenity"="hospital"](around:10000,${origin.lat},${origin.lng});
          way["amenity"="hospital"](around:10000,${origin.lat},${origin.lng});
          node["amenity"="clinic"](around:8000,${origin.lat},${origin.lng});
        );
        out center;
      `;

      try {
        const res = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `data=${encodeURIComponent(query)}`,
        });

        if (!res.ok) throw new Error(`Overpass API error: ${res.status}`);

        const data = await res.json();

        if (!data.elements || data.elements.length === 0) {
          // Retry with larger radius 20km
          const retryQuery = `
            [out:json][timeout:25];
            (
              node["amenity"="hospital"](around:20000,${origin.lat},${origin.lng});
              way["amenity"="hospital"](around:20000,${origin.lat},${origin.lng});
              node["amenity"="clinic"](around:15000,${origin.lat},${origin.lng});
            );
            out center;
          `;
          const retry = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `data=${encodeURIComponent(retryQuery)}`,
          });
          if (!retry.ok) throw new Error(`Overpass retry error: ${retry.status}`);
          const retryData = await retry.json();
          data.elements = retryData.elements || [];
        }

        if (!data.elements || data.elements.length === 0) {
          setError("No hospitals found nearby.");
          setLoading(false);
          return;
        }

        type OsmElement = {
          type: string;
          id: number;
          lat?: number;
          lon?: number;
          center?: { lat: number; lon: number };
          tags?: { name?: string; "name:en"?: string; "addr:full"?: string; "addr:street"?: string };
        };

        const elements = data.elements as OsmElement[];
        const mapped: Hospital[] = elements
          .map((el) => {
            // nodes have lat/lon directly, ways have center
            const lat = el.lat ?? el.center?.lat;
            const lon = el.lon ?? el.center?.lon;
            if (!lat || !lon) return null;

            // Skip entries with no meaningful name
            const name = el.tags?.name || el.tags?.["name:en"];
            if (!name) return null;

            const loc: Location = { lat, lng: lon };

            const address =
              el.tags?.["addr:full"] ||
              el.tags?.["addr:street"] ||
              "Nearby";

            return {
              id: `${el.type}-${el.id}`,
              name,
              location: loc,
              address,
              distance: haversineDist(origin, loc),
            };
          })
          .filter((h): h is Hospital => h !== null)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 5);

        if (mapped.length === 0) {
          setError("No named hospitals found nearby.");
        } else {
          setHospitals(mapped);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? `Failed to fetch hospitals: ${err.message}`
            : "Unknown error fetching hospitals"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const resetAndRetry = useCallback(
    (map: google.maps.Map | null, origin: Location) => {
      setHospitals([]);
      setError(null);
      fetchHospitals(map, origin);
    },
    [fetchHospitals]
  );

  return { hospitals, setHospitals, fetchHospitals, resetAndRetry, loading, error };
}
