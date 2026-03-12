// hooks/useAmbulanceSimulation.ts
"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ─────────────────────────────────────────
   TYPES
───────────────────────────────────────── */
export interface LatLng {
    lat: number;
    lng: number;
}

export interface TrafficSignal {
    id: string;
    lat: number;
    lng: number;
    status: "red" | "green" | "passed";
}

export interface DummyCar {
    id: string;
    lat: number;
    lng: number;
    alerted: boolean;
}

export interface SimulationState {
    ambulancePosition: LatLng | null;
    currentRouteIndex: number;
    trafficSignals: TrafficSignal[];
    remainingDistanceM: number;
    etaMinutes: number;
    nextSignalDistanceM: number;
    greenSignalCount: number;
    totalSignalCount: number;
    isComplete: boolean;
    speedKmh: number;
    progressPercent: number;
    bearing: number;
}

export interface UseAmbulanceSimulationProps {
    routePoints: LatLng[];
    realGpsLocation: LatLng | null;
    isActive: boolean;
    onToast?: (message: string, type: "success" | "warning" | "info") => void;
    onRecalculate?: (lat: number, lng: number) => void;
    onLegComplete?: () => void;
    onDummyCarAlert?: (car: DummyCar) => void;
}

/* ─────────────────────────────────────────
   CONFIG
───────────────────────────────────────── */
const GREEN_CORRIDOR_RADIUS_M = 250;
const PASSED_SIGNAL_RADIUS_M = 600;
const GPS_SYNC_INTERVAL_MS = 5000;
const MAP_DEVIATE_THRESHOLD_M = 50;
const SIGNAL_FETCH_RADIUS_M = 600;
const DEFAULT_SPEED_KMH = 40;
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const DUMMY_CAR_ALERT_RADIUS_M = 300;

/* ─────────────────────────────────────────
   MATH UTILITIES
───────────────────────────────────────── */
export function haversineDistance(p1: LatLng, p2: LatLng): number {
    const R = 6371000;
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
    const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((p1.lat * Math.PI) / 180) *
        Math.cos((p2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function computeBearing(p1: LatLng, p2: LatLng): number {
    const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
    const lat1Rad = (p1.lat * Math.PI) / 180;
    const lat2Rad = (p2.lat * Math.PI) / 180;
    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x =
        Math.cos(lat1Rad) * Math.sin(lat2Rad) -
        Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
    return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
}

export function calcRemainingDistance(fromIndex: number, points: LatLng[]): number {
    let total = 0;
    for (let i = fromIndex; i < points.length - 1; i++) {
        total += haversineDistance(points[i], points[i + 1]);
    }
    return total;
}

/* ─────────────────────────────────────────
   HOOK
───────────────────────────────────────── */
export function useAmbulanceSimulation({
    routePoints,
    realGpsLocation,
    isActive,
    onToast,
    onRecalculate,
    onLegComplete,
    onDummyCarAlert,
}: UseAmbulanceSimulationProps) {
    /* ── State ── */
    const [ambulancePosition, setAmbulancePosition] = useState<LatLng | null>(null);
    const [trafficSignals, setTrafficSignals] = useState<TrafficSignal[]>([]);
    const [remainingDistanceM, setRemainingDistanceM] = useState(0);
    const [etaMinutes, setEtaMinutes] = useState(0);
    const [nextSignalDistanceM, setNextSignalDistanceM] = useState(0);
    const [greenSignalCount, setGreenSignalCount] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [speedKmh, setSpeedKmh] = useState(DEFAULT_SPEED_KMH);
    const [progressPercent, setProgressPercent] = useState(0);
    const [bearing, setBearing] = useState(0);
    const [currentRouteIndex, setCurrentRouteIndex] = useState(0);
    const [dummyCars, setDummyCars] = useState<DummyCar[]>([]);

    /* ── Refs ── */
    const currentIndexRef = useRef(0);
    const signalsRef = useRef<TrafficSignal[]>([]);
    const animIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const routePointsRef = useRef<LatLng[]>([]);
    const speedRef = useRef(DEFAULT_SPEED_KMH);
    const isActiveRef = useRef(false);
    const signalsFetchedRef = useRef(false);
    const dummyCarsRef = useRef<DummyCar[]>([]);
    const dummyCarsPlacedRef = useRef(false);

    /* Keep refs in sync */
    useEffect(() => {
        routePointsRef.current = routePoints;
    }, [routePoints]);

    useEffect(() => {
        speedRef.current = speedKmh;
    }, [speedKmh]);

    useEffect(() => {
        isActiveRef.current = isActive;
    }, [isActive]);

    /* ── Speed setter ── */
    const setSpeed = useCallback((s: number) => {
        setSpeedKmh(s);
    }, []);

    /* ── Reset simulation (for replay) ── */
    const resetSimulation = useCallback(() => {
        currentIndexRef.current = 0;
        setCurrentRouteIndex(0);
        setIsComplete(false);
        setProgressPercent(0);
        setGreenSignalCount(0);
        signalsFetchedRef.current = false;
        dummyCarsPlacedRef.current = false;
        dummyCarsRef.current = [];
        setDummyCars([]);

        // Reset all signal statuses
        setTrafficSignals((prev) => {
            const reset = prev.map((s) => ({ ...s, status: "red" as const }));
            signalsRef.current = reset;
            return reset;
        });

        if (routePointsRef.current.length > 0) {
            setAmbulancePosition(routePointsRef.current[0]);
        }
    }, []);

    /* ── Fetch traffic signals from Overpass API ── */
    const fetchSignals = useCallback(
        async (points: LatLng[]) => {
            if (points.length === 0) return;

            // Calculate midpoint of route for query
            const midIdx = Math.floor(points.length / 2);
            const midLat = points[midIdx].lat;
            const midLng = points[midIdx].lng;

            const query = `[out:json][timeout:25];node["highway"="traffic_signals"](around:${SIGNAL_FETCH_RADIUS_M},${midLat},${midLng});out body;`;

            try {
                const response = await fetch(OVERPASS_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: `data=${encodeURIComponent(query)}`,
                });

                if (!response.ok) throw new Error(`Overpass HTTP ${response.status}`);

                const data = await response.json();
                const elements = data.elements as Array<{ id: number; lat: number; lon: number }>;

                if (elements && elements.length > 0) {
                    // Filter signals that are actually near the route (within 200m of any route point)
                    const nearRouteSignals: TrafficSignal[] = [];
                    for (const el of elements) {
                        const signalPos: LatLng = { lat: el.lat, lng: el.lon };
                        // Check if this signal is near ANY route point
                        let isNearRoute = false;
                        for (let i = 0; i < points.length; i += Math.max(1, Math.floor(points.length / 30))) {
                            if (haversineDistance(signalPos, points[i]) < 200) {
                                isNearRoute = true;
                                break;
                            }
                        }
                        if (isNearRoute) {
                            nearRouteSignals.push({
                                id: `osm-${el.id}`,
                                lat: el.lat,
                                lng: el.lon,
                                status: "red",
                            });
                        }
                    }

                    if (nearRouteSignals.length >= 3) {
                        signalsRef.current = nearRouteSignals;
                        setTrafficSignals(nearRouteSignals);
                        onToast?.(`📡 ${nearRouteSignals.length} traffic signals detected on route`, "info");
                        console.log(
                            `[GreenCorridor] Loaded ${nearRouteSignals.length} real signals from Overpass`
                        );
                        return;
                    }
                }

                // Fallback: not enough real signals
                throw new Error("Insufficient signals from Overpass");
            } catch (err) {
                console.warn("[GreenCorridor] Overpass fetch failed or insufficient, using fallback:", err);
                placeFallbackSignals(points);
            }
        },
        [onToast]
    );

    /* ── Fallback signal placement ── */
    const placeFallbackSignals = useCallback(
        (points: LatLng[]) => {
            const numSignals = Math.max(5, Math.floor(points.length / 40));
            const step = Math.floor(points.length / (numSignals + 1));
            const signals: TrafficSignal[] = [];

            for (let i = 1; i <= numSignals; i++) {
                const idx = Math.min(step * i, points.length - 1);
                signals.push({
                    id: `sim-${i}`,
                    lat: points[idx].lat,
                    lng: points[idx].lng,
                    status: "red",
                });
            }

            signalsRef.current = signals;
            setTrafficSignals(signals);
            onToast?.(`🔧 ${signals.length} simulated signals placed along route`, "warning");
            console.log(`[GreenCorridor] Placed ${signals.length} fallback signals`);
        },
        [onToast]
    );

    /* ── Place dummy cars on route ── */
    const placeDummyCars = useCallback(
        (points: LatLng[]) => {
            if (points.length < 10) return;
            // Place one dummy car at ~35% along the route
            const idx = Math.floor(points.length * 0.35);
            const car: DummyCar = {
                id: `dummy-car-1`,
                lat: points[idx].lat,
                lng: points[idx].lng,
                alerted: false,
            };
            dummyCarsRef.current = [car];
            setDummyCars([car]);
            console.log(`[DummyCar] Placed dummy car at route index ${idx}`);
        },
        []
    );

    /* ── Check dummy car proximity ── */
    const checkDummyCarProximity = useCallback(
        (position: LatLng) => {
            let changed = false;
            const updated = dummyCarsRef.current.map((car) => {
                if (car.alerted) return car;
                const dist = haversineDistance(position, { lat: car.lat, lng: car.lng });
                if (dist <= DUMMY_CAR_ALERT_RADIUS_M) {
                    changed = true;
                    onToast?.(`⚠️ Vehicle ahead! Move aside — ambulance approaching (${Math.round(dist)}m)`, "warning");
                    console.log(`[DummyCar] Alert triggered for ${car.id} at ${Math.round(dist)}m`);
                    onDummyCarAlert?.(car);
                    return { ...car, alerted: true };
                }
                return car;
            });
            if (changed) {
                dummyCarsRef.current = updated;
                setDummyCars([...updated]);
            }
        },
        [onToast, onDummyCarAlert]
    );

    /* ── Green corridor check ── */
    const checkSignalProximity = useCallback(
        (position: LatLng) => {
            let changed = false;
            let greenCount = 0;
            let minUpcomingDist = Infinity;

            const updated = signalsRef.current.map((signal) => {
                const dist = haversineDistance(position, { lat: signal.lat, lng: signal.lng });

                if (signal.status === "green") greenCount++;

                if (dist <= GREEN_CORRIDOR_RADIUS_M && signal.status === "red") {
                    changed = true;
                    greenCount++;
                    onToast?.(`🟢 Signal ahead turned GREEN (${Math.round(dist)}m)`, "success");
                    console.log(`[GreenCorridor] Signal ${signal.id} activated at ${Math.round(dist)}m`);
                    return { ...signal, status: "green" as const };
                }

                if (dist > PASSED_SIGNAL_RADIUS_M && signal.status === "green") {
                    changed = true;
                    return { ...signal, status: "passed" as const };
                }

                // Track nearest upcoming red signal
                if (signal.status === "red" && dist < minUpcomingDist) {
                    minUpcomingDist = dist;
                }

                return signal;
            });

            if (changed) {
                signalsRef.current = updated;
                setTrafficSignals([...updated]);
            }

            setGreenSignalCount(greenCount);
            setNextSignalDistanceM(minUpcomingDist === Infinity ? 0 : minUpcomingDist);
        },
        [onToast]
    );

    /* ── Update dashboard stats ── */
    const updateStats = useCallback(
        (index: number, points: LatLng[]) => {
            const remaining = calcRemainingDistance(index, points);
            setRemainingDistanceM(remaining);

            const etaMins = (remaining / 1000 / speedRef.current) * 60;
            setEtaMinutes(etaMins);

            const progress = points.length > 1 ? (index / (points.length - 1)) * 100 : 0;
            setProgressPercent(Math.min(progress, 100));

            setCurrentRouteIndex(index);
        },
        []
    );

    /* ── Animation interval speed mapping ── */
    const getAnimIntervalMs = useCallback(() => {
        // Faster speed = shorter interval between steps
        if (speedRef.current >= 60) return 600;
        if (speedRef.current >= 40) return 1000;
        return 1800;
    }, []);

    /* ── MAIN ANIMATION ENGINE ── */
    useEffect(() => {
        if (!isActive || routePoints.length === 0) {
            // Stop animation
            if (animIntervalRef.current) {
                clearInterval(animIntervalRef.current);
                animIntervalRef.current = null;
            }
            return;
        }

        // Set initial position
        if (currentIndexRef.current === 0) {
            setAmbulancePosition(routePoints[0]);
        }

        // Fetch signals if not yet done
        if (!signalsFetchedRef.current) {
            signalsFetchedRef.current = true;
            fetchSignals(routePoints);
        }

        // Place dummy cars if not yet done
        if (!dummyCarsPlacedRef.current) {
            dummyCarsPlacedRef.current = true;
            placeDummyCars(routePoints);
        }

        // Start animation
        const startAnimation = () => {
            if (animIntervalRef.current) clearInterval(animIntervalRef.current);

            animIntervalRef.current = setInterval(() => {
                if (!isActiveRef.current) return;

                const points = routePointsRef.current;
                if (points.length === 0) return;

                // Advance by 1-3 points depending on speed to make movement smoother
                const step = speedRef.current >= 60 ? 3 : speedRef.current >= 40 ? 2 : 1;
                currentIndexRef.current = Math.min(currentIndexRef.current + step, points.length - 1);
                const idx = currentIndexRef.current;

                // Check if arrived at end of current leg
                if (idx >= points.length - 1) {
                    setAmbulancePosition(points[points.length - 1]);
                    setProgressPercent(100);
                    if (animIntervalRef.current) {
                        clearInterval(animIntervalRef.current);
                        animIntervalRef.current = null;
                    }
                    // Reset index for potential next leg
                    currentIndexRef.current = 0;
                    if (onLegComplete) {
                        onLegComplete();
                    } else {
                        setIsComplete(true);
                    }
                    return;
                }

                const pos = points[idx];
                const nextPos = points[Math.min(idx + 1, points.length - 1)];

                // Update position
                setAmbulancePosition(pos);

                // Update bearing
                const newBearing = computeBearing(pos, nextPos);
                setBearing(newBearing);

                // Check signal proximity
                checkSignalProximity(pos);

                // Check dummy car proximity
                checkDummyCarProximity(pos);

                // Update stats
                updateStats(idx, points);
            }, getAnimIntervalMs());
        };

        startAnimation();

        return () => {
            if (animIntervalRef.current) {
                clearInterval(animIntervalRef.current);
                animIntervalRef.current = null;
            }
        };
    }, [
        isActive,
        routePoints,
        fetchSignals,
        checkSignalProximity,
        checkDummyCarProximity,
        placeDummyCars,
        updateStats,
        getAnimIntervalMs,
        onLegComplete,
    ]);

    /* ── Restart animation when speed changes ── */
    useEffect(() => {
        if (!isActive || routePoints.length === 0 || isComplete) return;

        // Restart interval with new speed
        if (animIntervalRef.current) {
            clearInterval(animIntervalRef.current);
        }

        animIntervalRef.current = setInterval(() => {
            if (!isActiveRef.current) return;

            const points = routePointsRef.current;
            if (points.length === 0) return;

            const step = speedRef.current >= 60 ? 3 : speedRef.current >= 40 ? 2 : 1;
            currentIndexRef.current = Math.min(currentIndexRef.current + step, points.length - 1);
            const idx = currentIndexRef.current;

            if (idx >= points.length - 1) {
                setAmbulancePosition(points[points.length - 1]);
                setProgressPercent(100);
                if (animIntervalRef.current) {
                    clearInterval(animIntervalRef.current);
                    animIntervalRef.current = null;
                }
                currentIndexRef.current = 0;
                if (onLegComplete) {
                    onLegComplete();
                } else {
                    setIsComplete(true);
                }
                return;
            }

            const pos = points[idx];
            const nextPos = points[Math.min(idx + 1, points.length - 1)];
            setAmbulancePosition(pos);
            setBearing(computeBearing(pos, nextPos));
            checkSignalProximity(pos);
            checkDummyCarProximity(pos);
            updateStats(idx, points);
        }, getAnimIntervalMs());

        return () => {
            if (animIntervalRef.current) {
                clearInterval(animIntervalRef.current);
                animIntervalRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [speedKmh]);

    /* ── GPS SYNC ── */
    useEffect(() => {
        if (!isActive || routePoints.length === 0) {
            if (gpsIntervalRef.current) {
                clearInterval(gpsIntervalRef.current);
                gpsIntervalRef.current = null;
            }
            return;
        }

        gpsIntervalRef.current = setInterval(() => {
            if (!realGpsLocation || !isActiveRef.current) return;

            const points = routePointsRef.current;
            if (points.length === 0) return;

            // Find nearest point on route to GPS position
            let minDist = Infinity;
            let nearestIdx = currentIndexRef.current;

            for (let i = currentIndexRef.current; i < points.length; i++) {
                const dist = haversineDistance(realGpsLocation, points[i]);
                if (dist < minDist) {
                    minDist = dist;
                    nearestIdx = i;
                }
            }

            if (minDist > MAP_DEVIATE_THRESHOLD_M) {
                // GPS has deviated too far — request recalculation
                onRecalculate?.(realGpsLocation.lat, realGpsLocation.lng);
                onToast?.("📍 Route recalculating — GPS deviation detected", "warning");
            } else {
                // Snap to nearest point
                if (nearestIdx > currentIndexRef.current) {
                    currentIndexRef.current = nearestIdx;
                }
            }
        }, GPS_SYNC_INTERVAL_MS);

        return () => {
            if (gpsIntervalRef.current) {
                clearInterval(gpsIntervalRef.current);
                gpsIntervalRef.current = null;
            }
        };
    }, [isActive, routePoints, realGpsLocation, onRecalculate, onToast]);

    /* ── Cleanup on unmount ── */
    useEffect(() => {
        return () => {
            if (animIntervalRef.current) clearInterval(animIntervalRef.current);
            if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
        };
    }, []);

    return {
        ambulancePosition,
        currentRouteIndex,
        trafficSignals,
        dummyCars,
        remainingDistanceM,
        etaMinutes,
        nextSignalDistanceM,
        greenSignalCount,
        totalSignalCount: trafficSignals.length,
        isComplete,
        speedKmh,
        progressPercent,
        bearing,
        setSpeed,
        resetSimulation,
    };
}
