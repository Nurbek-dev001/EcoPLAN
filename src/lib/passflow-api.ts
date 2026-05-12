import type { TrainInfo } from "./train-data";
import { DEMO_TRAINS } from "./demo-data";
import { getAllAvailableTrains } from "./train-data";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export interface PassFlowStation {
  name: string;
  arrival: string | null;
  departure: string | null;
  stop_minutes: number;
  distance_from_start: number;
}

export interface PassFlowTractionSegment {
  from_station: string;
  to_station: string;
  is_electrified: boolean;
  distance_km: number;
  is_in_kz: boolean;
}

export interface PassFlowRoute {
  number: string;
  name: string;
  from_station: string;
  to_station: string;
  distance_km: number;
  duration_hours: number;
  night_hours: number;
  route_type: string;
  train_type: string;
  stations: PassFlowStation[];
  traction_segments: PassFlowTractionSegment[];
}

function mapPassFlowToTrainInfo(route: PassFlowRoute): TrainInfo {
  const stations = route.stations.map((s) => ({
    name: s.name,
    arrival: s.arrival ?? "—",
    departure: s.departure ?? "—",
    stop: s.stop_minutes > 0 ? `${s.stop_minutes} мин` : "—",
  }));

  const durH = Math.floor(route.duration_hours);
  const durM = Math.round((route.duration_hours - durH) * 60);

  return {
    number: route.number,
    route: route.name,
    from: route.from_station,
    to: route.to_station,
    duration: `${durH}ч ${String(durM).padStart(2, "0")}мин`,
    durationHours: route.duration_hours,
    nightHours: route.night_hours,
    distanceKm: route.distance_km,
    distanceTotal: route.distance_km,
    trainType: route.train_type as TrainInfo["trainType"],
    isSocial: route.route_type === "social",
    isInternational: route.route_type === "international",
    electrifiedSegments: route.traction_segments.map((seg) => ({
      from: seg.from_station,
      to: seg.to_station,
      isElectrified: seg.is_electrified,
      distanceKm: seg.distance_km,
      isInKz: seg.is_in_kz,
    })),
    stations,
  };
}

export async function fetchPassFlowRoutes(
  q?: string,
  routeType?: string,
  trainType?: string
): Promise<TrainInfo[]> {
  try {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (routeType) params.set("route_type", routeType);
    if (trainType) params.set("train_type", trainType);

    const res = await fetch(`${API_BASE}/passflow/routes?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch routes from PassFlow");
    const data: PassFlowRoute[] = await res.json();
    return data.map(mapPassFlowToTrainInfo);
  } catch {
    // Fallback to local demo + custom trains if API is unavailable
    let result = getAllAvailableTrains();
    if (q) {
      const qq = q.trim().toLowerCase();
      result = result.filter(
        (t) =>
          t.number.toLowerCase().includes(qq) ||
          t.route.toLowerCase().includes(qq) ||
          t.from.toLowerCase().includes(qq) ||
          t.to.toLowerCase().includes(qq)
      );
    }
    if (routeType) {
      result = result.filter((t) =>
        routeType === "social" ? t.isSocial : routeType === "international" ? t.isInternational : !t.isSocial && !t.isInternational
      );
    }
    if (trainType) {
      result = result.filter((t) => (trainType === "talgo" ? t.trainType === "talgo" : t.trainType === "standard"));
    }
    return result;
  }
}

export async function findTrainInPassFlow(query: string): Promise<TrainInfo | undefined> {
  try {
    const routes = await fetchPassFlowRoutes(query);
    const q = query.trim().toLowerCase();
    return routes.find(
      (t) =>
        t.number.toLowerCase() === q ||
        t.number.toLowerCase() === q.replace(/^0+/, "") ||
        q === t.number.padStart(3, "0") ||
        t.route.toLowerCase().includes(q) ||
        t.from.toLowerCase().includes(q) ||
        t.to.toLowerCase().includes(q)
    );
  } catch {
    // Fallback to local demo + custom trains
    const q = query.trim().toLowerCase();
    return getAllAvailableTrains().find(
      (t) =>
        t.number.toLowerCase() === q ||
        t.number.toLowerCase() === q.replace(/^0+/, "") ||
        q === t.number.padStart(3, "0") ||
        t.route.toLowerCase().includes(q) ||
        t.from.toLowerCase().includes(q) ||
        t.to.toLowerCase().includes(q)
    );
  }
}

export async function syncPassFlowToEcoPlan(): Promise<{ created: number; updated: number; total: number }> {
  const res = await fetch(`${API_BASE}/passflow/sync`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to sync PassFlow routes");
  return res.json();
}
