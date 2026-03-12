# Private Emergency Flow - Complete Implementation

## Overview
When a **private vehicle user** selects an ambulance, the system shows the ambulance traveling to pick them up, then to the hospital (**Ambulance → Patient → Hospital**). This mirrors the ambulance driver flow.

---

## User Journey: Private Vehicle User

### Step 1: Enter Vehicle Details
```
1. User enters vehicle plate number
2. Clicks "Set" to submit
3. Plate becomes locked/confirmed
```

### Step 2: See Nearby Ambulances
```
Right Panel shows: "Nearby Ambulances"
- Ambulance ID
- Distance (e.g., 0.8 km)
- ETA (e.g., 2 min)
- Status (AVAILABLE, EN-ROUTE, BUSY)
- [Assign Dispatch Request] button
```

### Step 3: Select Ambulance
**Action**: Click "Assign Dispatch Request" button

**Timeline**:
```
T+0s    → Click button
T+0.5s  → "🚑 Ambulance Selected: AMB-12AB3CD4"
T+1s    → "Distance: 0.8 km · ETA: 2 min"
T+1.5s  → "Sending dispatch request..."
T+2s    → Button shows spinner: "Awaiting Approval"
T+2.5s  → "✓ Successfully assigned AMB-12AB3CD4"
T+2.6s  → "Starting route computation..."
T+2.7s  → "Auto-selected hospital: [Hospital Name]"
T+2.8s  → "Activating green corridor..."
T+3s    → Emergency goes ACTIVE
```

---

## What User Sees on Map - The Three Phases

### Phase 1: Ambulance → Patient
The moment user selects ambulance:

```
🚑 Ambulance Icon (at starting location)
↓ (Moving toward patient)
📍 Patient (User location) - GREEN PULSE
↓ (Via waypoint)
🏥 Hospital (marked destination)

Status: "🚑 PHASE 1: Ambulance En-Route to Patient"
ETA: Updates in real-time
Distance: Updates as ambulance moves
```

**What Happens**:
- Ambulance icon appears at its starting location
- Ambulance animation starts immediately
- Shows complete route: ambulance → patient → hospital
- Route is one continuous path with waypoint at patient
- User watches ambulance approaching

### Phase 2: Patient → Hospital (Auto-Triggered)
When ambulance gets within 100m of patient:

```
🚑 Ambulance Icon (at patient location)
↓ (Moving toward hospital)
🏥 Hospital (highlighted destination)

Status: "🚑 PHASE 2: Ambulance En-Route to [Hospital]"
Patient Onboard: "📋 Patient onboard - Securing patient..."
ETA: Now to hospital only
Distance: Updates toward hospital
```

**Auto-Detection**:
```javascript
distance(ambulancePosition, patientLocation) < 100 meters
→ Automatically trigger Phase 2
```

---

## Complete Route Details

### Route Calculation
```
START:     Ambulance's current location (ambulance.lat/lng)
WAYPOINT:  Patient's location (user's GPS location)
           - stopover: true (ambulance stops here to pick up)
END:       Hospital location (auto-selected nearest)

Total: One continuous route with all 3 segments
```

### Distance Example
```
Ambulance Station     0.8 km (2 min)     User Location
       ↓ ─────────────────────────────→ ↓
                                        2.1 km (5 min)
                                        ↓
                                     Hospital

Total Journey: ~2.9 km, ~7 minutes
```

---

## Hospital Auto-Selection

### How It Works
1. **User selects ambulance**
2. System checks: Is hospital already selected?
   - **YES**: Use it
   - **NO**: Auto-select nearest hospital
3. **Hospital locked in** before simulation starts
4. Log shows: "Auto-selected hospital: [Name]"

---

## Real-time Updates During Journey

**Every Frame**:
- Ambulance position on map
- Ambulance icon rotation (bearing)

**Every 1-2 Seconds**:
- ETA to destination
- Remaining distance
- Progress percentage

**In Logs**:
- Every status change
- Phase transitions
- Hospital selection

---

## On Map - What User Sees

| Element | Meaning | Shows When |
|---------|---------|-----------|
| 🚑 Ambulance icon | Current ambulance position | Always animated |
| Movement indicator | Shows direction ambulance is going | Always moving |
| 📍 Patient marker | User's location (green pulse) | Phase 1 active |
| 🏥 Hospital | Destination (blue/red marker) | Always visible |
| Route polyline | Path ambulance will follow | Always drawn |
| 🚗 Dummy traffic | Nearby cars | Ambulance within 1km |

---

## Comparison: Ambulance Driver vs Private User

### Ambulance Driver Page
```
I am the driver
I see: My ambulance, patient location, hospital
I control: When to start, which hospital to go to
I navigate: Follow the route on map
Perspective: "Where do I need to go?"
```

### Private Emergency Page
```
I am the patient/civilian
I see: Ambulance coming, hospital it will take me to
I control: Which ambulance to select, which hospital (optional)
I watch: Ambulance arriving, then going to hospital
Perspective: "When will ambulance arrive?"
```

**Key Difference**: Private user is PASSIVE (watches), Ambulance driver is ACTIVE (controls)

---

## State Transitions

```
START: idle state
   ↓
USER CLICKS BUTTON
   ↓
session = "pending" (2.5s approval animation)
   ↓
APPROVAL CONFIRMED
   ↓
session = "active"
activeMode = "AMBULANCE_EN_ROUTE"
currentLeg = "depot-to-patient"
   ↓
SIMULATION STARTS
Ambulance animates toward patient
   ↓
WITHIN 100M OF PATIENT
   ↓
currentLeg = "patient-to-hospital"
Ambulance continues toward hospital
   ↓
REACHES HOSPITAL
   ↓
(User can terminate or keep active)
```

---

## Key Features Implemented

✅ **Ambulance Selection** - User picks from nearby list
✅ **Automatic Hospital Assignment** - Nearest hospital auto-selected
✅ **Real-time Animation** - Ambulance moves on map
✅ **Auto Phase Detection** - Switches to Phase 2 at 100m
✅ **Complete Route** - Shows ambulance → patient → hospital
✅ **Live ETA** - Updates during journey
✅ **Voice Alerts** - Eleven Labs TTS (with fallback)
✅ **Toast Notifications** - Feedback at key moments
✅ **Detailed Logging** - Every event timestamped
✅ **Dummy Traffic** - Shows nearby cars as ambulance approaches

---

## Testing Flow

1. **Enter plate number** and click "Set"
2. **See nearby ambulances** in right panel
3. **Click "Assign Dispatch Request"** on any ambulance
4. **Watch map**:
   - Ambulance icon appears at starting location
   - Route polyline shows full path
   - Ambulance animates toward patient
5. **Check logs** for Phase 1 status
6. **Wait for auto-transition** when ambulance within 100m
7. **See Phase 2** logs and toast notification
8. **Watch ambulance** continue to hospital
9. **See "Destination reached"** when complete

---

**Status**: ✅ Complete Implementation
**Flow**: Ambulance → Patient (User) → Hospital
**User Perspective**: Passive observer watching ambulance delivery
