import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { loadCalculations, type SavedCalculation, KTZ_BRANCHES } from "@/lib/train-data";
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useTranslation } from "react-i18next";

// Approximate coordinates for major Kazakhstan cities/stations
const STATION_COORDS: Record<string, [number, number]> = {
  "Астана": [51.1605, 71.4704],
  "Алматы": [43.2220, 76.8512],
  "Шымкент": [42.3417, 69.5901],
  "Караганда": [49.8028, 73.1055],
  "Актобе": [50.2839, 57.1670],
  "Уральск": [51.2278, 51.3865],
  "Костанай": [53.2144, 63.6246],
  "Павлодар": [52.2870, 76.9674],
  "Петропавловск": [54.8654, 69.1350],
  "Кызылорда": [44.8488, 65.4823],
  "Семей": [50.4057, 80.2265],
  "Актау": [43.6567, 51.1800],
  "Тараз": [42.8997, 71.3677],
  "Туркестан": [43.2970, 68.2690],
  "Усть-Каменогорск": [49.9481, 82.6285],
  "Атырау": [47.0945, 51.9238],
};

function getStationCoords(stationName: string): [number, number] | null {
  const key = Object.keys(STATION_COORDS).find((k) => stationName.toLowerCase().includes(k.toLowerCase()));
  return key ? STATION_COORDS[key] : null;
}

function parseRouteCoords(route: string): [number, number][] {
  const parts = route.split(/[–-]/).map((s) => s.trim());
  const coords: [number, number][] = [];
  for (const part of parts) {
    const c = getStationCoords(part);
    if (c) coords.push(c);
  }
  // Fallback: if no coords found, use center of Kazakhstan
  if (coords.length === 0) return [[48.0, 68.0]];
  return coords;
}

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Карта маршрутов — EcoPlan Hub" },
      { name: "description", content: "Геовизуализация финансовых маршрутов" },
    ],
  }),
  component: MapGuard,
});

function MapGuard() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("demo_auth", "1");
      sessionStorage.setItem("demo_role", "director");
      setReady(true);
    }
  }, []);
  if (!ready) return null;
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-11 flex items-center border-b bg-card/90 backdrop-blur-sm sticky top-0 z-10 px-3">
            <SidebarTrigger className="mr-2" />
            <h1 className="text-sm font-semibold">Карта маршрутов</h1>
          </header>
          <main className="flex-1 overflow-auto bg-muted/30">
            <MapPage />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function MapPage() {
  const { t } = useTranslation();
  const [calculations, setCalculations] = useState<SavedCalculation[]>([]);
  const [branchFilter, setBranchFilter] = useState<string>("all");

  useEffect(() => {
    setCalculations(loadCalculations());
  }, []);

  const filtered = useMemo(() => {
    if (branchFilter === "all") return calculations;
    return calculations.filter((c) => c.branch === branchFilter || !c.branch);
  }, [calculations, branchFilter]);

  const routeData = useMemo(() => {
    return filtered.map((calc) => {
      const coords = parseRouteCoords(calc.trainRoute);
      const isProfit = calc.financial.financialResult >= 0;
      const color = isProfit ? "#16a34a" : "#dc2626";
      const totalExpenses = calc.results.total;
      return {
        id: calc.id,
        trainNumber: calc.trainNumber,
        route: calc.trainRoute,
        coords,
        isProfit,
        color,
        totalExpenses,
        financialResult: calc.financial.financialResult,
        margin: calc.financial.profitMargin,
      };
    });
  }, [filtered]);

  const stationBubbles = useMemo(() => {
    const map: Record<string, { expenses: number; count: number; coords: [number, number] }> = {};
    for (const calc of filtered) {
      const parts = calc.trainRoute.split(/[–-]/).map((s) => s.trim());
      for (const part of parts) {
        const c = getStationCoords(part);
        if (!c) continue;
        if (!map[part]) map[part] = { expenses: 0, count: 0, coords: c };
        map[part].expenses += calc.results.total;
        map[part].count += 1;
      }
    }
    return Object.entries(map).map(([name, data]) => ({
      name,
      coords: data.coords,
      radius: Math.min(30, 5 + Math.sqrt(data.expenses) / 3000),
      expenses: data.expenses,
    }));
  }, [filtered]);

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-semibold">{t("map.title")}</h2>
          <p className="text-xs text-muted-foreground">Зелёный = прибыль, Красный = убыток</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setBranchFilter("all")}
            className={`text-xs rounded border px-3 py-1.5 transition-colors ${branchFilter === "all" ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent"}`}
          >
            {t("common.all")}
          </button>
          {KTZ_BRANCHES.map((b) => (
            <button
              key={b}
              onClick={() => setBranchFilter(b)}
              className={`text-xs rounded border px-3 py-1.5 transition-colors ${branchFilter === b ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent"}`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="h-[600px] w-full">
            <MapContainer center={[48.0, 68.0]} zoom={5} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {routeData.map((r) => (
                r.coords.length > 1 && (
                  <Polyline
                    key={r.id}
                    positions={r.coords}
                    pathOptions={{ color: r.color, weight: 4, opacity: 0.8 }}
                  >
                    <Popup>
                      <div className="text-sm space-y-1">
                        <p className="font-semibold">Поезд {r.trainNumber}</p>
                        <p className="text-muted-foreground">{r.route}</p>
                        <p>Расходы: {Math.round(r.totalExpenses).toLocaleString("ru-RU")} тг</p>
                        <p className={r.isProfit ? "text-green-600" : "text-red-600"}>
                          {r.isProfit ? "Прибыль" : "Убыток"}: {Math.round(r.financialResult).toLocaleString("ru-RU")} тг
                        </p>
                        <p>Рентабельность: {r.margin.toFixed(1)}%</p>
                      </div>
                    </Popup>
                  </Polyline>
                )
              ))}
              {stationBubbles.map((s) => (
                <CircleMarker
                  key={s.name}
                  center={s.coords}
                  radius={s.radius}
                  pathOptions={{
                    fillColor: "#2563eb",
                    color: "#1e40af",
                    fillOpacity: 0.4,
                    weight: 1,
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold">{s.name}</p>
                      <p>Расходы: {Math.round(s.expenses).toLocaleString("ru-RU")} тг</p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">{t("map.profitRoute")}</p>
            <p className="text-lg font-bold text-green-600">{routeData.filter((r) => r.isProfit).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">{t("map.lossRoute")}</p>
            <p className="text-lg font-bold text-red-600">{routeData.filter((r) => !r.isProfit).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Станций на карте</p>
            <p className="text-lg font-bold text-blue-600">{stationBubbles.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Всего рейсов</p>
            <p className="text-lg font-bold">{routeData.length}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
