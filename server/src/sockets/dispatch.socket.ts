import { Server, Socket } from "socket.io";

/**
 * Dispatch namespace — real-time sync between ambulance units and the operator dashboard.
 *
 * Ambulance clients emit:
 *   "ambulance:update"  →  { ambulanceId, lat, lng, bearing, speed, eta, remainingM,
 *                            destination: {lat,lng,name}, routePoints: [{lat,lng}…],
 *                            currentLeg, progressPercent }
 *   "ambulance:activate"  →  { ambulanceId, lat, lng, destination }
 *   "ambulance:deactivate" → { ambulanceId }
 *
 * Operator clients:
 *   "operator:subscribe"   → { ambulanceId }   — joins the room for that ambulance
 *   "operator:unsubscribe" → { ambulanceId }   — leaves the room
 *
 * Broadcasts to operators (room = `amb:<ambulanceId>`):
 *   "ambulance:position"   — live position tick
 *   "ambulance:activated"  — a new emergency just started
 *   "ambulance:deactivated"— emergency ended
 *   "ambulance:list"       — full list of currently active ambulances
 */

// In-memory store of currently active ambulances
interface ActiveAmbulance {
  ambulanceId: string;
  lat: number;
  lng: number;
  bearing: number;
  speed: number;
  eta: number;
  remainingM: number;
  destination: { lat: number; lng: number; name: string } | null;
  routePoints: { lat: number; lng: number }[];
  currentLeg: string;
  progressPercent: number;
  lastUpdate: number;
}

const activeAmbulances = new Map<string, ActiveAmbulance>();

export function setupDispatchSocket(io: Server) {
  const ns = io.of("/dispatch");

  ns.on("connection", (socket: Socket) => {
    console.log("[Dispatch] Connected:", socket.id);

    // ─── Ambulance side ───

    socket.on("ambulance:activate", (data: {
      ambulanceId: string;
      lat: number;
      lng: number;
      destination: { lat: number; lng: number; name: string };
      routePoints: { lat: number; lng: number }[];
      currentLeg: string;
    }) => {
      const entry: ActiveAmbulance = {
        ambulanceId: data.ambulanceId,
        lat: data.lat,
        lng: data.lng,
        bearing: 0,
        speed: 0,
        eta: 0,
        remainingM: 0,
        destination: data.destination,
        routePoints: data.routePoints || [],
        currentLeg: data.currentLeg || "depot-to-patient",
        progressPercent: 0,
        lastUpdate: Date.now(),
      };
      activeAmbulances.set(data.ambulanceId, entry);

      // Join the room so the ambulance itself receives broadcasts
      socket.join(`amb:${data.ambulanceId}`);

      // Broadcast to all connected operator clients
      ns.emit("ambulance:activated", entry);

      console.log(`[Dispatch] Ambulance ${data.ambulanceId} activated`);
    });

    socket.on("ambulance:update", (data: {
      ambulanceId: string;
      lat: number;
      lng: number;
      bearing: number;
      speed: number;
      eta: number;
      remainingM: number;
      destination?: { lat: number; lng: number; name: string };
      routePoints?: { lat: number; lng: number }[];
      currentLeg?: string;
      progressPercent?: number;
    }) => {
      const existing = activeAmbulances.get(data.ambulanceId);
      const entry: ActiveAmbulance = {
        ambulanceId: data.ambulanceId,
        lat: data.lat,
        lng: data.lng,
        bearing: data.bearing ?? 0,
        speed: data.speed ?? 0,
        eta: data.eta ?? 0,
        remainingM: data.remainingM ?? 0,
        destination: data.destination ?? existing?.destination ?? null,
        routePoints: data.routePoints ?? existing?.routePoints ?? [],
        currentLeg: data.currentLeg ?? existing?.currentLeg ?? "idle",
        progressPercent: data.progressPercent ?? existing?.progressPercent ?? 0,
        lastUpdate: Date.now(),
      };
      activeAmbulances.set(data.ambulanceId, entry);

      // Broadcast to the ambulance-specific room (operators subscribed)
      ns.to(`amb:${data.ambulanceId}`).emit("ambulance:position", entry);
    });

    socket.on("ambulance:deactivate", (data: { ambulanceId: string }) => {
      activeAmbulances.delete(data.ambulanceId);
      ns.emit("ambulance:deactivated", { ambulanceId: data.ambulanceId });
      console.log(`[Dispatch] Ambulance ${data.ambulanceId} deactivated`);
    });

    // ─── Operator side ───

    socket.on("operator:subscribe", (data: { ambulanceId: string }) => {
      socket.join(`amb:${data.ambulanceId}`);
      // Send the current state immediately
      const current = activeAmbulances.get(data.ambulanceId);
      if (current) {
        socket.emit("ambulance:position", current);
      }
      console.log(`[Dispatch] Operator ${socket.id} subscribed to ${data.ambulanceId}`);
    });

    socket.on("operator:unsubscribe", (data: { ambulanceId: string }) => {
      socket.leave(`amb:${data.ambulanceId}`);
      console.log(`[Dispatch] Operator ${socket.id} unsubscribed from ${data.ambulanceId}`);
    });

    // When operator first connects, send the full list of active ambulances
    socket.on("operator:list", () => {
      const list = Array.from(activeAmbulances.values());
      socket.emit("ambulance:list", list);
    });

    socket.on("disconnect", () => {
      console.log("[Dispatch] Disconnected:", socket.id);
    });
  });

  // Clean up stale entries every 60s
  setInterval(() => {
    const now = Date.now();
    for (const [id, amb] of activeAmbulances) {
      if (now - amb.lastUpdate > 120_000) {
        activeAmbulances.delete(id);
        ns.emit("ambulance:deactivated", { ambulanceId: id });
      }
    }
  }, 60_000);
}
