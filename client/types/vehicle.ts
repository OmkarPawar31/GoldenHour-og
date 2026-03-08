export interface Vehicle {
  id: string;
  type: "ambulance" | "private";
  plateNumber: string;
  driverId: string;
  status: "available" | "en-route" | "busy" | "offline";
  location: { lat: number; lng: number };
}
