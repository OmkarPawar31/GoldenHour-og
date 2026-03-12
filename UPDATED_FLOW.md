# Updated Private Emergency Flow - Ambulance Booking

## Complete User Journey

### BEFORE: Selection Screen Shows Ambulances
```
Right Panel shows:
┌─────────────────────────────────────┐
│ 🚑 NEARBY AMBULANCES                │
│ ┌─────────────────────────────────┐ │
│ │ AMB-12AB3CD4                    │ │
│ │ 0.8 km · 2 min away             │ │
│ │ Status: AVAILABLE               │ │
│ │ [Assign Dispatch Request]  ←─┐  │ │
│ └─────────────────────────────┼──┘ │
│ ┌─────────────────────────────┼──┐ │
│ │ AMB-45EF6GH7                │  │ │
│ │ 1.2 km · 3 min away         │  │ │
│ │ Status: EN-ROUTE            │  │ │
│ │ [Assign Dispatch Request]   │  │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### AFTER: Click Ambulance - Screen Changes Immediately

```json
Timeline:
T+0s    User clicks [Assign Dispatch Request]
T+0.5s  Log: "🚑 Ambulance Selected: AMB-12AB3CD4"
T+2.5s  Right Panel CHANGES to show:
        
        ✓ AMBULANCE BOOKED (green checkmark indicator)
        
        🏥 DESTINATION HOSPITAL
        ┌─────────────────────────────┐
        │ Civil Hospital              │
        │ 2.3 km away                 │
        │ 📍 Distance | ⏱ ETA        │
        └─────────────────────────────┘
        
        📋 JOURNEY STATUS
        ┌─────────────────────────────┐
        │ PHASE 1                     │
        │ 🟠 Ambulance approaching... │
        └─────────────────────────────┘

T+3-N   Ambulance travels to patient (Phase 1)
        Map shows: 🚑 Ambulance → 📍 Patient → 🏥 Hospital

T+N     Within 100m of patient
        Log: "✓ Ambulance arrived at patient location!"
        Phase changes to PHASE 2

T+N-M   Patient onboard, ambulance travels to hospital
        Map shows: 🚑 Ambulance at patient → 🏥 Hospital
        Right panel updates:
        
        📋 JOURNEY STATUS
        ┌─────────────────────────────┐
        │ PHASE 2                     │
        │ 🟢 Patient onboard, en      │
        │    route to hospital        │
        └─────────────────────────────┘

T+M     Ambulance reaches hospital
        Log: "Destination reached"
        Toast: "Simulation Complete"
```

---

## What User Sees on Map

### Phase 1: Ambulance Approaching Patient
```
MAP VIEW:
🚑 Ambulance Icon
  ↓ (Animated movement)
  │ (Route polyline - blue line)
  ↓
📍 Patient (GREEN PULSE - User's location)
  ↓ (Waypoint)
  │
  ↓
🏥 Hospital (Final destination)

Route Info:
Distance: Updates in real-time
ETA: Counts down
Current Position: Ambulance location on route
```

### Phase 2: Patient Onboard, En Route to Hospital
```
MAP VIEW:
🚑 Ambulance Icon (now at patient location)
  ↓ (Continues animated movement)
  │ (Route polyline - blue line continues)
  ↓
🏥 Hospital (Highlighted destination)

Route Info:
Distance to Hospital: Updates in real-time
ETA to Hospital: Counts down
Status: Patient onboard
```

---

## Right Panel Behavior

### Session = IDLE (Before Ambulance Selection)
Shows:
- Vehicle plate number input (if not submitted)
- Nearby ambulances list
- Search for dispatch status

### Session = PENDING (During 2.5s Approval)
Shows:
- Spinner/approval animation
- "Awaiting Admin Approval"

### Session = ACTIVE (After Ambulance Booked)
Shows EXACTLY:
1. ✓ Ambulance Booked (GREEN indicator)
2. 🏥 Destination Hospital (ONLY selected hospital, not list)
3. 📋 Journey Status (Phase indicator)
   - Phase 1: "Ambulance approaching..."
   - Phase 2: "Patient onboard, en route to hospital"

**Ambulance selection list DISAPPEARS completely!**

---

## Key Improvements

✅ **No More Ambulance List** - Hides once booked
✅ **Clear Booking Confirmation** - "Ambulance Booked" indicator
✅ **Single Hospital Display** - Shows only destination, not list
✅ **Live Journey Status** - Shows current phase
✅ **Clean UI** - No unnecessary information
✅ **Focused Experience** - User sees only what matters

---

## Bottom Panel: Session Logs

Always visible showing:
```
[10:25:34] 🚑 Ambulance Selected: AMB-12AB3CD4
[10:25:35] Distance: 0.8 km · ETA: 2 min
[10:25:36] Sending dispatch request...
[10:25:37] ⚠ Awaiting admin approval for dispatch…
[10:25:38] ✓ Successfully assigned AMB-12AB3CD4
[10:25:39] Starting route computation...
[10:25:40] Auto-selected hospital: Civil Hospital
[10:25:41] Activating green corridor...
[10:25:42] 🚑 PHASE 1: Ambulance En-Route to Patient
[10:25:43] Route: 2.9 km · 7 mins
[10:25:44] 🚑 Ambulance approaching patient location…
[... ambulance moving on map ...]
[10:25:N] ✓ Ambulance arrived at patient location!
[10:25:N] 📋 Patient onboard - Securing patient...
[10:25:N] 🚑 PHASE 2: Ambulance En-Route to Civil Hospital
[10:25:N] Proceeding to hospital...
[... ambulance continues to hospital ...]
[10:25:M] Destination reached
```

---

## User Experience Flow

```
1️⃣ BEFORE SELECTION
   User sees: Nearby ambulances list
   User thinks: "Which ambulance should I book?"
   User sees: Distance, ETA, Status for each

2️⃣ CLICKS AMBULANCE
   Panel immediately changes
   User sees: ✓ Ambulance Booked
   User thinks: "Perfect, my ambulance is on the way!"

3️⃣ WATCHING DELIVERY
   Map shows: Ambulance moving to patient
   Right panel shows: Phase 1 progress
   Logs show: Every step of journey

4️⃣ AUTO TRANSITION
   Ambulance reaches patient
   Right panel UPDATES to: Phase 2
   Toast shows: "Patient onboard..."

5️⃣ FINAL DELIVERY
   Ambulance reaches hospital
   Logs show: "Destination reached"
   User knows: Complete!
```

---

## Implementation Details

### When Session Changes
```javascript
session = "idle"       → Show ambulance selection
session = "pending"    → Show approval spinner
session = "active"     → Show booking confirmation + hospital + status
```

### Right Panel Rendering
```javascript
if (session === "idle") {
  // Show: Plate input, ambulance list, scan spinner
} else {
  // Show: Booked confirmation, selected hospital, journey status
}
```

### Phase Status Display
```javascript
if (currentLeg === 'depot-to-patient') {
  // Show: "🟠 Ambulance approaching..."
} else if (currentLeg === 'patient-to-hospital') {
  // Show: "🟢 Patient onboard, en route to hospital"
}
```

---

## Testing Checklist

- ✅ See ambulance selection list initially
- ✅ Click "Assign Dispatch Request"
- ✅ Ambulance selection list DISAPPEARS
- ✅ See "✓ Ambulance Booked" indicator
- ✅ See destination hospital only (not list)
- ✅ See "PHASE 1" status with orange indicator
- ✅ Watch ambulance animate on map from depot → patient
- ✅ Ambulance within 100m of patient
- ✅ Phase changes to "PHASE 2" with green indicator
- ✅ See "Patient onboard, en route to hospital"
- ✅ Watch ambulance continue to hospital
- ✅ Ambulance reaches hospital
- ✅ Logs show complete journey
- ✅ Can click "Terminate" to stop

---

**Status**: ✅ Implementation Complete
**Flow**: Simple, clear, and distraction-free
**User Experience**: Booking → Delivery → Completion
