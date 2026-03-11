// components/HospitalSearch.tsx
"use client";

import { useEffect, useRef, useState } from "react";

interface HospitalSearchProps {
  onHospitalSelect: (hospital: { lat: number; lng: number; name: string; address: string }) => void;
  isLoaded: boolean;
  currentLocation?: { lat: number; lng: number };
}

interface PlacePrediction {
  place_id: string;
  description: string;
  main_text?: string;
  secondary_text?: string;
}

export default function HospitalSearch({ onHospitalSelect, isLoaded, currentLocation }: HospitalSearchProps) {
  const [searchInput, setSearchInput] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Google Places services
  useEffect(() => {
    if (!isLoaded || !window.google?.maps?.places) return;

    autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();

    // Create a hidden div for PlacesService (it requires a map element)
    const tempDiv = document.createElement("div");
    tempDiv.style.display = "none";
    document.body.appendChild(tempDiv);
    const tempMap = new window.google.maps.Map(tempDiv);
    placesServiceRef.current = new window.google.maps.places.PlacesService(tempMap);

    return () => {
      document.body.removeChild(tempDiv);
    };
  }, [isLoaded]);

  // Handle search input with debounce
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    setPredictions([]);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!value.trim()) {
      setIsOpen(false);
      return;
    }

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(() => {
      if (!autocompleteServiceRef.current) return;

      // Search for hospitals near current location
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: value,
          componentRestrictions: { country: "in" }, // Restrict to India (adjust as needed)
          types: ["establishment"], // Hospital is an establishment
          radius: 50000, // 50km radius
          ...(currentLocation && {
            location: new window.google.maps.LatLng(currentLocation.lat, currentLocation.lng),
            radius: 50000,
          }),
        },
        (results) => {
          // Filter for hospital-related results
          const hospitalResults = results
            ?.filter(
              (p) =>
                p.description.toLowerCase().includes("hospital") ||
                p.description.toLowerCase().includes("clinic") ||
                p.description.toLowerCase().includes("medical") ||
                p.description.toLowerCase().includes("care center") ||
                p.description.toLowerCase().includes("nursing home")
            )
            .map((p) => {
              // Parse the description to extract main and secondary text (format: "Name, Address")
              const parts = p.description.split(",");
              return {
                place_id: p.place_id,
                description: p.description,
                main_text: parts[0]?.trim() || p.description,
                secondary_text: parts.slice(1).join(",").trim(),
              };
            }) || [];

          setPredictions(hospitalResults);
          setIsOpen(hospitalResults.length > 0);
          setIsSearching(false);
        }
      );
    }, 300);
  };

  // Get place details when a prediction is selected
  const handleSelectPrediction = (prediction: PlacePrediction) => {
    if (!placesServiceRef.current) return;

    setIsSearching(true);
    setSelectedHospital(prediction.description);

    placesServiceRef.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ["geometry", "formatted_address", "name"],
      },
      (placeResult) => {
        if (placeResult?.geometry?.location) {
          const lat = placeResult.geometry.location.lat();
          const lng = placeResult.geometry.location.lng();
          const name = placeResult.name || prediction.main_text || "Unknown Hospital";
          const address = placeResult.formatted_address || prediction.description || "Unknown Address";

          // Trigger selection with smooth animation
          onHospitalSelect({ lat, lng, name, address });

          // Clear search
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
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full z-40">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <input
          ref={inputRef}
          type="text"
          placeholder="🏥 Search nearby hospitals..."
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => searchInput && predictions.length > 0 && setIsOpen(true)}
          disabled={!isLoaded}
          className="w-full pl-10 pr-4 py-2.5 bg-[#0a0e1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#2979FF] focus:ring-1 focus:ring-[#2979FF]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-mono text-sm"
        />

        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-[#2979FF]/30 border-t-[#2979FF] rounded-full animate-spin" />
          </div>
        )}

        {selectedHospital && !searchInput && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#00FF88]">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {/* Predictions Dropdown */}
      {isOpen && predictions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#0a0e1a] border border-gray-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-h-64 overflow-y-auto">
            {predictions.map((prediction) => (
              <button
                key={prediction.place_id}
                onClick={() => handleSelectPrediction(prediction)}
                className="w-full px-4 py-3 text-left hover:bg-gray-900/50 border-b border-gray-800 last:border-b-0 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="text-[#2979FF] mt-0.5 group-hover:text-[#00FF88] transition-colors">
                    📍
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-mono group-hover:text-[#00FF88] transition-colors truncate">
                      {prediction.main_text}
                    </p>
                    {prediction.secondary_text && (
                      <p className="text-gray-500 text-xs font-mono truncate mt-1">
                        {prediction.secondary_text}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No Results Message */}
      {isOpen && predictions.length === 0 && searchInput && !isSearching && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#0a0e1a] border border-gray-700 rounded-lg p-4 text-center animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-gray-400 text-sm font-mono">
            No hospitals found. Try a different search.
          </p>
        </div>
      )}
    </div>
  );
}
