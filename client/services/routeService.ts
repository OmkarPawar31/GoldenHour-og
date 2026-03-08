import { apiGet, apiPost } from "./api";

interface RouteRequest {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
}

interface RouteResponse {
  path: { lat: number; lng: number }[];
  estimatedTime: number;
  distance: number;
}

export async function getOptimalRoute(req: RouteRequest): Promise<RouteResponse> {
  return apiPost<RouteResponse>("/routes/optimal", req);
}

export async function getActiveRoutes(): Promise<RouteResponse[]> {
  return apiGet<RouteResponse[]>("/routes/active");
}
