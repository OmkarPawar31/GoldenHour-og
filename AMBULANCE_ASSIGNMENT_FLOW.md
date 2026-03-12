# Ambulance Assignment Flow - Complete Guide

## Overview
When a user selects an ambulance from the nearby list, the system initiates a complete journey simulation: **Ambulance Location → Patient Location → Hospital**.

## Step-by-Step Flow

### Step 1: User Selects Ambulance
**Location**: Private Emergency Dashboard (Right Panel)
**Action**: Click "Assign Dispatch Request" button on any nearby ambulance card

```
Nearby Ambulances Panel
┌─────────────────────────────────────────┐
│ 🚑 AMB-12AB3CD4                        │
│ Distance: 0.8 km · ETA: 2 min AWAY     │
│ Status: AVAILABLE                       │
│ [Assign Dispatch Request] ← Click here  │
└─────────────────────────────────────────┘
```

### Step 2: Ambulance Assignment Triggered
**Function**: `assignAmbulance(ambulance)`
**What Happens**:
- ✅ Validation: Checks if vehicle plate number is submitted
- ✅ State Update: Sets `session` to "pending"
- ✅ Logging: Shows selected ambulance details
  - `"🚑 Ambulance Selected: AMB-12AB3CD4"`
  - `"Distance: 0.8 km · ETA: 2 min"`

### Step 3: Admin Approval (Simulated)
**Duration**: 2.5 seconds
**Status**: "Awaiting admin approval for dispatch…"
**Log Messages**:
```
1. "Sending dispatch request..."
2. "Awaiting admin approval for dispatch…" (warning)
3. [After 2.5s] "✓ Successfully assigned AMB-12AB3CD4 to your location" (success)
4. "Starting route computation..."
5. "Activating green corridor..." (success)
```

### Step 4: Calculate Route - Three-Leg Journey
**Function**: `activateCorridor("AMBULANCE_EN_ROUTE", ambulance)`
**Route Calculation**:

```
AMBULANCE → PATIENT → HOSPITAL
   ↓          ↓         ↓
  0.8 km    2.1 km    8.5 km
  (2 min)   (5 min)  (20 min)
```

**Route Details**:
- **Start**: Ambulance's current location (lat, lng from nearby list)
- **Waypoint**: Patient location (origin) - **with stopover: true**
- **End**: Selected hospital location (destination)

**Google Directions API Call**:
```typescript
{
  origin: { lat: ambulance.lat, lng: ambulance.lng },
  waypoints: [
    { location: { lat: origin.lat, lng: origin.lng }, stopover: true }
  ],
  destination: { lat: hospital.lat, lng: hospital.lng },
  travelMode: DRIVING
}
```

### Step 5: Phase 1 - Ambulance to Patient
**Display**: "🚑 PHASE 1: Ambulance En-Route to Patient"
**Map shows**:
- ✅ Ambulance icon at starting location
- ✅ Patient marker (green pulse) at location
- ✅ Hospital marker at destination
- ✅ Complete route polyline from ambulance → patient → hospital

**Simulation**:
```
Ambulance simulates traveling along the route
Status: Continuously moving toward patient
ETA: Updates in real-time
Distance: Updates as ambulance moves
```

**Auto-Detection**: System monitors distance between ambulance and patient
```javascript
distance = computeDistance(ambulancePosition, patientLocation)
if (distance < 100 meters) {
  // Automatically transition to Phase 2
}
```

### Step 6: Phase 2 - Patient to Hospital (Auto-Trigger)
**Trigger**: When ambulance comes within 100 meters of patient
**Display Changes**:
- `currentLeg`: Changes from 'depot-to-patient' to 'patient-to-hospital'
- `destination`: Updates to hospital location
- `destName`: Shows hospital name

**Log Messages**:
```
✓ Ambulance arrived at patient location!
📋 Patient onboard - Securing patient...
🚑 PHASE 2: Ambulance En-Route to [Hospital Name]
Proceeding to hospital...
```

**Toast Notification**:
```
"Phase 2: Patient onboard, en route to hospital"
```

**Map Display**:
- Ambulance continues on the same route (toward hospital)
- Destination marker now highlighted at hospital
- Route continues from patient → hospital segment

### Step 7: Completion
When ambulance reaches hospital destination:
```
Log: "Destination reached"
Toast: "Simulation Complete"
Session: Remains active until terminated
```

---

## Complete Timeline

```
T+0s    → User clicks "Assign Dispatch Request"
T+0.5s  → assignAmbulance called
T+0.5s  → Logs: "🚑 Ambulance Selected: AMB-12AB3CD4"
T+1.0s  → Session changes to "pending"
T+1.0s  → Logs: "Sending dispatch request..."

T+2.5s  → Admin approval (simulated)
T+2.5s  → Logs: "✓ Successfully assigned..."
T+2.5s  → activateCorridor called
T+2.5s  → setCurrentLeg('depot-to-patient')

T+2.6s  → Logs: "🚑 PHASE 1: Ambulance En-Route to Patient"
T+2.7s  → Route calculation begins
T+2.8s  → Logs: "Route: X.X km · Y mins"
T+2.9s  → Session changes to "active"
T+3.0s  → Logs: "🚑 Ambulance approaching patient location…"
T+3.0s  → useAmbulanceSimulation starts
T+3.0s  → Ambulance begins moving on map

T+3-N   → Ambulance travels toward patient
T+N     → Ambulance comes within 100m of patient
T+N     → Logs: "✓ Ambulance arrived at patient location!"
T+N     → Logs: "📋 Patient onboard - Securing patient..."
T+N     → setCurrentLeg('patient-to-hospital')
T+N     → Logs: "🚑 PHASE 2: Ambulance En-Route to [Hospital]"

T+N-M   → Ambulance continues toward hospital
T+M     → Ambulance arrives at hospital
T+M     → Logs: "Destination reached"
```

---

## Technical Implementation

### Key State Variables
```typescript
session: "idle" | "pending" | "active" | "terminating"
activeMode: "IDLE" | "AMBULANCE_EN_ROUTE" | "DRIVING_TO_HOSPITAL"
currentLeg: "depot-to-patient" | "patient-to-hospital" | "idle"
ambulanceDepot: Location (ambulance starting position)
routePoints: Array of points for ambulance to follow
```

### Key Functions
- **`assignAmbulance(amb: NearbyAmbulance)`**: Entry point for ambulance selection
- **`activateCorridor(mode, ambulance?)`**: Sets up route and begins simulation
- **`useAmbulanceSimulation`**: Animates ambulance along route points
- **useEffect**: Monitors ambulance position and triggers phase transitions

### Map Display Props
```typescript
ambulancePosition={sim.ambulancePosition}  // Current ambulance position
destination={origin}  // Patient (Phase 1) or Hospital (Phase 2)
routePoints={routePoints}  // Complete multi-leg route
ambulanceDepot={ambulanceDepot}  // Ambulance starting position
currentLeg={currentLeg}  // UI indicator: which phase currently in
```

---

## User Experience

### For the User Selecting Ambulance
1. **Immediate Feedback**: "Ambulance Selected" log message
2. **Waiting Feedback**: "Awaiting admin approval" button shows spinner
3. **Confirmation**: "Successfully assigned" message
4. **Route Validation**: "Route: X.X km · Y mins"
5. **Live Tracking**: Ambulance icon moves toward patient on map
6. **Phase 2 Alert**: Toast notification when patient onboard
7. **Hospital Route**: Ambulance continues toward hospital

### For Observer (Hospital/Operator Dashboard)
- Sees ambulance dispatched with patient location
- Real-time position tracking
- Multi-leg route with waypoint (patient location)
- Phase transitions shown in real-time

---

## Error Handling

**If Plate Number Not Submitted**:
```
Log: "Enter and submit your plate number first"
Type: error
Button: Remains disabled
```

**If Map Not Ready**:
```
Auto-retry when map loads
Animation prevents interaction until ready
```

**If Google Directions API Fails**:
```
Fallback to OSRM (Open Source Routing Machine)
Toast: "Using alternate routing engine"
Continue with alternative route
```

---

## Testing Checklist

- ✅ User can see nearby ambulances list
- ✅ Ambulance card shows distance, ETA, and status
- ✅ Click "Assign Dispatch Request" when plate is submitted
- ✅ Phase 1 begins: ambulance visible on map
- ✅ Ambulance travels from starting location to patient location
- ✅ Phase 2 triggers automatically when within 100m of patient
- ✅ Phase 2: ambulance travels from patient to hospital location
- ✅ Toast notifications show at each phase transition
- ✅ Log panel shows detailed event sequence
- ✅ Route displays correctly on map with all segments

---

**Status**: ✅ Implementation Complete
**Last Updated**: 2026-03-13
