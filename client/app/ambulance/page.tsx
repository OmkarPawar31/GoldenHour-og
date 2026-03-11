// app/ambulance/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useLocation } from "../../hooks/useLocation";
import { useNearbyHospitals } from "../../hooks/useNearbyHospitals";
import { useDirectionsRoute } from "../../hooks/useDirectionsRoute";
import HospitalCard from "../../components/HospitalCard";
import RouteInfoBar from "../../components/RouteInfoBar";
import { haversineMeters } from "../../utils/geoUtils";
import { Location, Hospital } from "../../types";

const MapView = dynamic(() => import("../../components/MapView"), { ssr: false });

const FALLBACK_GPS: Location = { lat: 18.9894, lng: 73.1175 };

export default function AmbulancePage() {
  const { location, error: gpsError } = useLocation();
  const [gpsFallbackTriggered, setGpsFallbackTriggered] = useState(false);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  const demoMode = !location && gpsFallbackTriggered;
  const origin = location || (gpsFallbackTriggered ? FALLBACK_GPS : null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!location) {
      timer = setTimeout(() => {
        setGpsFallbackTriggered(true);
      }, 4000);
    }
    return () => clearTimeout(timer);
  }, [location]);

  const { hospitals, fetchHospitals, resetAndRetry, loading: searchingHospitals, error: hospitalsError } = useNearbyHospitals();
  const { directions, routeInfo, fetchRoute } = useDirectionsRoute();

  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);
  const hospitalsFetched = useRef(false);
  const lastRerouteTime = useRef<number>(0);

  // BUG 3: Auto-select nearest hospital when hospitals list changes (fix setState during render)
  useEffect(() => {
    if (hospitals.length === 0) return;
    setSelectedHospitalId((prev) => {
      const stillExists = hospitals.find((h) => h.id === prev);
      return stillExists ? prev : hospitals[0].id;
    });
  }, [hospitals]);

  const selectedHospital = hospitals.find(h => h.id === selectedHospitalId) || null;

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    setMapInstance(map);
  }, []);

  // BUG 2: Fetch hospitals once when both mapInstance and origin are ready
  useEffect(() => {
    if (!origin || hospitalsFetched.current) return;
    hospitalsFetched.current = true;
    fetchHospitals(null, origin);
  }, [origin, fetchHospitals]);

  // FIX 2: When user clicks a hospital card → immediately route to it
  const handleHospitalSelect = useCallback(
    (h: Hospital) => {
      setSelectedHospitalId(h.id);
      if (origin && mapInstance) {
        fetchRoute(origin, h.location); // pass h.location directly, not via state
      }
    },
    [origin, mapInstance, fetchRoute]
  );

  // FIX 2: Route useEffect — only for auto-route on first hospital load
  useEffect(() => {
    if (!origin || !selectedHospital || !mapInstance) return;
    // Only auto-route if no route exists yet (first load)
    if (!directions) {
      fetchRoute(origin, selectedHospital.location);
    }
  }, [selectedHospital, mapInstance]); // Do NOT include fetchRoute or origin in deps

  // BUG 4: Live rerouting with cooldown to prevent infinite loop
  useEffect(() => {
    if (!location || !selectedHospital || !routeInfo || routeInfo.routePoints.length === 0) {
      return;
    }

    const now = Date.now();
    if (now - lastRerouteTime.current < 10000) return; // cooldown 10s

    // Find minimum distance from GPS position to any point on the route
    let minDist = Infinity;
    for (const point of routeInfo.routePoints) {
      const distance = haversineMeters(location, point);
      if (distance < minDist) {
        minDist = distance;
      }
    }

    // If GPS is more than 50m away from route → reroute
    if (minDist > 50) {
      lastRerouteTime.current = now;
      fetchRoute(location, selectedHospital.location);
    }
  }, [location]); // ONLY depend on location to prevent infinite loops

  const handleStartEmergency = () => {
    alert(`Emergency started for ${selectedHospital?.name}`);
  };

  const handleChangeHospital = () => {
    document.getElementById("hospital-cards-panel")?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!origin && !gpsFallbackTriggered) {
    return (
      <div className="min-h-screen bg-[#050B14] flex flex-col font-sans items-center justify-center text-white">
        <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="font-mono text-xs mt-4 uppercase tracking-widest text-gray-500">Acquiring GPS Signal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050B14] flex flex-col font-sans h-screen">
      <header className="h-16 shrink-0 border-b border-gray-800 bg-[#0a0e1a]/90 flex flex-col md:flex-row md:items-center px-6 z-50 justify-center md:justify-start">
        <h1 className="text-xl font-bold tracking-widest text-white uppercase flex items-center gap-2">
          <span className="text-red-500">🚑</span> GoldenHour
          <span className="text-gray-500 font-light ml-2 border-l border-gray-700 pl-3">
            AMBULANCE MAP
          </span>
        </h1>
        {gpsError && !demoMode && <span className="text-red-500 text-[10px] md:text-xs font-mono md:ml-4">{gpsError}</span>}
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        <div className="w-full lg:w-[65%] shrink-0 lg:h-full flex flex-col p-4 relative justify-start">
          {origin && (
            <MapView
              origin={origin}
              hospitals={hospitals}
              selectedHospitalId={selectedHospitalId}
              directions={directions}
              routeInfo={routeInfo}
              isDemoMode={demoMode}
              onMapLoad={handleMapLoad}
              onHospitalSelect={handleHospitalSelect}
            />
          )}
        </div>

        <div id="hospital-cards-panel" className="w-full lg:w-[35%] lg:h-full overflow-y-auto p-4 flex flex-col gap-4 border-t lg:border-t-0 lg:border-l border-gray-800 bg-[#050B14]">
          <h2 className="text-white font-bold tracking-widest uppercase mb-1 text-sm flex items-center justify-between">
            <span>Nearby Hospitals</span>
            {searchingHospitals && <span className="w-3 h-3 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></span>}
          </h2>

          {hospitals.map((h, i) => (
            <HospitalCard
              key={h.id}
              hospital={h}
              isNearest={i === 0}
              isSelected={h.id === selectedHospitalId}
              onSelect={handleHospitalSelect}
            />
          ))}

          {hospitals.length === 0 && !searchingHospitals && (
            <div className="flex flex-col gap-2">
              <p className="text-gray-500 text-sm italic py-2">
                {hospitalsError || "No hospitals found nearby."}
              </p>
              {origin && (
                <button
                  onClick={() => resetAndRetry(mapInstance, origin)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 
                    text-white text-xs font-bold rounded-lg w-fit"
                >
                  RETRY
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {routeInfo && selectedHospital && (
        <RouteInfoBar
          hospital={selectedHospital}
          routeInfo={routeInfo}
          onChangeHospital={handleChangeHospital}
          onStartEmergency={handleStartEmergency}
        />
      )}
    </div>
  );
}