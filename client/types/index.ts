// types/index.ts
export interface Location {
    lat: number;
    lng: number;
}

export interface Hospital {
    id: string;
    name: string;
    location: Location;
    address: string;
    distance: number;
}

export interface RouteInfo {
    distanceText: string;
    durationText: string;
    distanceValue: number;
    durationValue: number;
    routePoints: Location[];
}
