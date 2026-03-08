"use client";

import { useState } from "react";

export function useEmergency() {
  const [isActive, setIsActive] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const triggerEmergency = async () => {
    setIsActive(true);
    // TODO: Call API to create emergency session
  };

  const cancelEmergency = async () => {
    setIsActive(false);
    setSessionId(null);
    // TODO: Call API to cancel emergency session
  };

  return { isActive, sessionId, triggerEmergency, cancelEmergency };
}
