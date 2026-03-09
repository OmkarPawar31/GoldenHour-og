"use client";

import { useState, useCallback } from "react";
import { apiPost, apiPatch } from "../services/api";

interface EmergencyResponse {
  session: { _id: string; priority: string; status: string };
  route: { path: { lat: number; lng: number }[]; estimatedTime: number; distance: number } | null;
}

export function useEmergency() {
  const [isActive, setIsActive] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerEmergency = useCallback(async (data: {
    origin: { lat: number; lng: number };
    destination?: { lat: number; lng: number };
    vehicleId?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiPost<EmergencyResponse>("/emergency", data);
      setSessionId(res.session._id);
      setIsActive(true);
      return res;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create emergency");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelEmergency = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      await apiPatch(`/emergency/${sessionId}/resolve`);
      setIsActive(false);
      setSessionId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve emergency");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  return { isActive, sessionId, loading, error, triggerEmergency, cancelEmergency };
}
