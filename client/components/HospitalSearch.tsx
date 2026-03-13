// components/HospitalSearch.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Building2 } from "lucide-react";

interface HospitalSearchProps {
  onHospitalSelect: (hospital: { lat: number; lng: number; name: string; address: string }) => void;
  isLoaded: boolean;
  currentLocation?: { lat: number; lng: number };
}

interface HospitalResult {
  place_id: string;
  name: string;
  address: string;
  distance?: number;
  lat?: number;
  lng?: number;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export default function HospitalSearch({ onHospitalSelect, isLoaded, currentLocation }: HospitalSearchProps) {
  const [searchInput, setSearchInput] = useState("");
  const [predictions, setPredictions] = useState<HospitalResult[]>([]);
  const [nearbyHospitals, setNearbyHospitals] = useState<HospitalResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const nearbyFetchedRef = useRef<string>("");

  // Initialize Google Places services
  useEffect(() => {
    if (!isLoaded || !window.google?.maps?.places) return;

    autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();

    const tempDiv = document.createElement("div");
    tempDiv.style.display = "none";
    document.body.appendChild(tempDiv);
    const tempMap = new window.google.maps.Map(tempDiv);
    placesServiceRef.current = new window.google.maps.places.PlacesService(tempMap);

    return () => {
      document.body.removeChild(tempDiv);
    };
  }, [isLoaded]);

  // Fetch truly nearby hospitals using nearbySearch
  const fetchNearbyHospitals = useCallback(() => {
    if (!placesServiceRef.current || !currentLocation) return;

    const locKey = `${currentLocation.lat.toFixed(3)},${currentLocation.lng.toFixed(3)}`;
    if (nearbyFetchedRef.current === locKey) return;
    nearbyFetchedRef.current = locKey;

    setIsLoadingNearby(true);

    const request: google.maps.places.PlaceSearchRequest = {
      location: new window.google.maps.LatLng(currentLocation.lat, currentLocation.lng),
      rankBy: window.google.maps.places.RankBy.DISTANCE,
      type: "hospital",
    };

    placesServiceRef.current.nearbySearch(request, (results, status) => {
      setIsLoadingNearby(false);
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
        const hospitals: HospitalResult[] = results
          .filter((r) => r.geometry?.location && r.name)
          .slice(0, 8)
          .map((r) => {
            const lat = r.geometry!.location!.lat();
            const lng = r.geometry!.location!.lng();
            const dist = currentLocation ? haversineKm(currentLocation, { lat, lng }) : undefined;
            return {
              place_id: r.place_id || "",
              name: r.name || "Hospital",
              address: r.vicinity || "",
              distance: dist,
              lat,
              lng,
            };
          })
          .sort((a, b) => (a.distance || 99) - (b.distance || 99));

        setNearbyHospitals(hospitals);
      }
    });
  }, [currentLocation]);

  // Auto-fetch nearby hospitals when API is loaded and location is available
  useEffect(() => {
    if (isLoaded && currentLocation && placesServiceRef.current) {
      fetchNearbyHospitals();
    }
  }, [isLoaded, currentLocation, fetchNearbyHospitals]);

  // Handle search input with debounce
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    setPredictions([]);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!value.trim()) {
      setIsOpen(nearbyHospitals.length > 0);
      return;
    }

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(() => {
      if (!autocompleteServiceRef.current) return;

      const request: google.maps.places.AutocompletionRequest = {
        input: value,
        componentRestrictions: { country: "in" },
        types: ["hospital"],
        ...(currentLocation && {
          locationRestriction: new window.google.maps.LatLngBounds(
            new window.google.maps.LatLng(
              currentLocation.lat - 0.135, // ~15km south
              currentLocation.lng - 0.135
            ),
            new window.google.maps.LatLng(
              currentLocation.lat + 0.135, // ~15km north
              currentLocation.lng + 0.135
            )
          ),
        }),
      };

      autocompleteServiceRef.current.getPlacePredictions(request, (results) => {
        const hospitalResults = (results || []).map((p) => {
          const parts = p.description.split(",");
          return {
            place_id: p.place_id,
            name: parts[0]?.trim() || p.description,
            address: parts.slice(1).join(",").trim(),
          };
        });

        setPredictions(hospitalResults);
        setIsOpen(hospitalResults.length > 0);
        setIsSearching(false);
      });
    }, 300);
  };

  // Handle selecting a nearby hospital (already has lat/lng)
  const handleSelectNearby = (hospital: HospitalResult) => {
    if (hospital.lat !== undefined && hospital.lng !== undefined) {
      setSelectedHospital(hospital.name);
      onHospitalSelect({
        lat: hospital.lat,
        lng: hospital.lng,
        name: hospital.name,
        address: hospital.address,
      });
      setSearchInput("");
      setIsOpen(false);
    }
  };

  // Get place details for autocomplete results
  const handleSelectPrediction = (prediction: HospitalResult) => {
    if (!placesServiceRef.current) return;

    setIsSearching(true);
    setSelectedHospital(prediction.name);

    placesServiceRef.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ["geometry", "formatted_address", "name"],
      },
      (placeResult) => {
        if (placeResult?.geometry?.location) {
          const lat = placeResult.geometry.location.lat();
          const lng = placeResult.geometry.location.lng();
          const name = placeResult.name || prediction.name || "Hospital";
          const address = placeResult.formatted_address || prediction.address;

          onHospitalSelect({ lat, lng, name, address });
          setSearchInput("");
          setPredictions([]);
          setIsOpen(false);
          setIsSearching(false);
        }
      }
    );
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showNearby = !searchInput.trim() && nearbyHospitals.length > 0;
  const showPredictions = searchInput.trim() && predictions.length > 0;

  return (
    <div ref={containerRef} className="relative w-full z-40">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <input
          ref={inputRef}
          type="text"
          placeholder="Search nearby hospitals..."
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => {
            if (nearbyHospitals.length > 0 || (searchInput && predictions.length > 0)) {
              setIsOpen(true);
            }
          }}
          disabled={!isLoaded}
          className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-[13px] shadow-sm hover:shadow-md"
        />

        {isSearching && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}

        {selectedHospital && !searchInput && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (showNearby || showPredictions) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-slate-100 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
          {/* Nearby hospitals section */}
          {showNearby && (
            <>
              <div className="px-4 pt-3 pb-2 flex items-center gap-2 bg-slate-50 border-b border-slate-100">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">Nearby Hospitals</span>
                {isLoadingNearby && <div className="w-3 h-3 border border-blue-500/30 border-t-blue-500 rounded-full animate-spin ml-auto" />}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {nearbyHospitals.map((hospital) => (
                  <button
                    key={hospital.place_id}
                    onClick={() => handleSelectNearby(hospital)}
                    className="w-full px-5 py-3.5 text-left hover:bg-slate-50 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 w-7 h-7 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0 group-hover:bg-red-100 transition-colors">
                        <Building2 size={16} className="text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-800 text-sm font-semibold group-hover:text-blue-600 transition-colors truncate">
                          {hospital.name}
                        </p>
                        <p className="text-slate-500 text-[11px] truncate mt-0.5">
                          {hospital.address}
                        </p>
                      </div>
                      {hospital.distance !== undefined && (
                        <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full shrink-0 border border-blue-100">
                          {hospital.distance < 1 ? `${Math.round(hospital.distance * 1000)}m` : `${hospital.distance.toFixed(1)}km`}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Search results section */}
          {showPredictions && (
            <>
              <div className="px-4 pt-3 pb-2 flex items-center gap-2 bg-slate-50 border-b border-slate-100">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">Search Results</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {predictions.map((prediction) => (
                  <button
                    key={prediction.place_id}
                    onClick={() => handleSelectPrediction(prediction)}
                    className="w-full px-5 py-3.5 text-left hover:bg-slate-50 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 w-7 h-7 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0 group-hover:bg-amber-100 transition-colors">
                        <span className="text-xs">📍</span>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <p className="text-slate-800 text-sm font-semibold group-hover:text-blue-600 transition-colors truncate">
                          {prediction.name}
                        </p>
                        {prediction.address && (
                          <p className="text-slate-500 text-[11px] truncate mt-0.5">
                            {prediction.address}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* No Results Message */}
      {isOpen && searchInput && predictions.length === 0 && !isSearching && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white backdrop-blur-xl border border-slate-200 rounded-xl p-4 text-center animate-in fade-in slide-in-from-top-2 duration-200 shadow-lg">
          <p className="text-slate-500 text-sm font-medium">
            No hospitals found. Try a different search.
          </p>
        </div>
      )}
    </div>
  );
}
