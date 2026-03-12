# Golden Hour Emergency System - Implementation Plan

## Overview
Implement two-condition emergency handling in private-emergency page and enhance ambulance dashboard with voice alerts and dummy car markers.

## Requirements Gathering Results
- **Ambulance nearby threshold**: 1 kilometer
- **Alert message style**: Generic (e.g., "Ambulance nearby")
- **Voice delivery**: Eleven Labs API (already has `useElevenLabsVoice` hook)

## Implementation Tasks

### 1. Create Hook: `useNearbyAmbulances`
**File**: `client/hooks/useNearbyAmbulances.ts`
- Generates simulated ambulances near user location
- Calculates distance from user to each ambulance
- Returns ambulances within 1km radius
- Updates periodically (already partially exists in private-emergency)
- Export reusable version for both pages

### 2. Create Hook: `useAmbulanceProximityAlert`
**File**: `client/hooks/useAmbulanceProximityAlert.ts`
- Detects when ambulance comes within 1km of patient
- Triggers voice alert using `useElevenLabsVoice`
- Manages alert debouncing (don't repeat within 15s)
- Returns: `{isNearby: boolean, nearbyAmbulance?: NearbyAmbulance}`

### 3. Modify Private Emergency Page
**File**: `client/app/private-emergency/page.tsx`

#### 3a. Add Two-Condition Logic
In the emergency request handler (around line 266-330):
```
If user clicks "Request Emergency":
  - Get nearby ambulances (1km radius)
  - If ambulances found:
    → CONDITION 1: Dispatch to nearest ambulance
    → Send user location to ambulance via socket
    → Set mode to "AMBULANCE_EN_ROUTE"
    → Show: "Ambulance dispatched! ETA: X minutes"
  - Else:
    → CONDITION 2: Route to nearest hospital
    → Find nearest hospital from list
    → Set path to hospital
    → Set mode to "DRIVING_TO_HOSPITAL"
    → Show: "No ambulance nearby. Routing to nearest hospital"
```

#### 3b. Integrate Voice Alert
- Use `useElevenLabsVoice` hook
- When dispatching ambulance: speak "Ambulance dispatched"
- When routing to hospital: speak "Routing to nearest hospital"

### 4. Modify Ambulance Page
**File**: `client/app/ambulance/page.tsx`

#### 4a. Add Dummy Car Markers
- When ambulance comes within 1km of patient location:
  - Generate 2-3 random dummy cars within 500-1500m radius
  - Add markers to map visualization
  - Mark as "nearby traffic" with different color

#### 4b. Implement Proximity Alert
- Use `useAmbulanceProximityAlert` hook
- Trigger voice alert: "Ambulance nearby, slow down traffic"
- Log alert with timestamp
- Don't repeat alert within 15 seconds

### 5. Update MapView Component
**File**: `client/components/MapView.tsx` (if needed)
- Add dummy car marker rendering
- Accept `dummyCars` prop with array of nearby car locations
- Display with distinct styling (e.g., orange/yellow markerst)

### 6. API Endpoint (Optional)
Check if `/api/tts` endpoint exists:
- Should accept POST with `{text: string}`
- Returns audio blob from Eleven Labs
- Fallback: Browser SpeechSynthesis in `useElevenLabsVoice`

## File Structure
```
client/
├── hooks/
│   ├── useNearbyAmbulances.ts      (NEW)
│   ├── useAmbulanceProximityAlert.ts (NEW)
│   ├── useElevenLabsVoice.ts        (EXISTS - use as-is)
│   ├── useNearbyHospitals.ts        (EXISTS - use as-is)
│   └── useLocation.ts              (EXISTS - use as-is)
├── app/
│   ├── private-emergency/page.tsx   (MODIFY)
│   ├── ambulance/page.tsx           (MODIFY)
│   └── hospital/page.tsx            (EXISTS - no changes)
└── components/
    └── MapView.tsx                 (POTENTIALLY MODIFY)
```

## Implementation Order
1. Create `useNearbyAmbulances` hook
2. Create `useAmbulanceProximityAlert` hook
3. Modify private-emergency page with two-condition logic
4. Modify ambulance page with dummy car rendering
5. Test both flows
