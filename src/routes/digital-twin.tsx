import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadCalculations, KTZ_BRANCHES } from "@/lib/train-data";
import { motion, AnimatePresence } from "framer-motion";

// Approximate station coordinates for Digital Twin
const STATIONS = [
  { name: "Астана", x: 520, y: 180, code: "AST", load: 0.82 },
  { name: "Алматы", x: 650, y: 420, code: "ALA", load: 0.91 },
  { name: "Шымкент", x: 520, y: 480, code: "SHY", load: 0.75 },
  { name: "Караганда", x: 580, y: 280, code: "KAR", load: 0.68 },
  { name: "Актобе", x: 280, y: 220, code: "AKT", load: 0.55 },
  { name: "Атырау", x: 180, y: 320, code: "ATY", load: 0.48 },
  { name: "Уральск", x: 220, y: 240, code: "URA", load: 0.52 },
  { name: "Костанай", x: 380, y: 160, code: "KST", load: 0.61 },
  { name: "Павлодар", x: 680, y: 180, code: "PAV", load: 0.70 },
  { name: "Петропавловск", x: 480, y: 120, code: "PET", load: 0.64 },
  { name: "Кызылорда", x: 480, y: 400, code: "KYZ", load: 0.58 },
  { name: "Семей", x: 780, y: 220, code: "SEM", load: 0.66 },
];

const ROUTES = [
  { from: "Астана", to: "Алматы", color: "#16a34a", load: 0.88 },
  { from: "Астана", to: "Петропавловск", color: "#2563eb", load: 0.72 },
  { from: "Алматы", to: "Шымкент", color: "#dc2626", load: 0.95 },
  { from: "Астана", to: "Караганда", color: "#f59e0b", load: 0.80 },
  { from: "Караганда", to: "Павлодар", color: "#16a34a", load: 0.65 },
  { from: "Актобе", to: "Уральск", color: "#2563eb", load: 0.60 },
  { from: "Атырау", to: "Актобе", color: "#dc2626", load: 0.55 },
  { from: "Костанай", to: "Астана", color: "#16a34a", load: 0.70 },
  { from: "Кызылорда", to: "Шымкент", color: "#f59e0b", load: 0.78 },
  { from: "Семей", to: "Павлодар", color: "#2563eb", load: 0.62 },
];

export const Route = createFileRoute("/digital-twin")({
  component: DigitalTwinGuard,
});

function DigitalTwinGuard() {
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
            <h1 className="text-sm font-semibold">Digital Twin — Сеть КТЖ</h1>
          </header>
          <main className="flex-1 overflow-auto bg-muted/30">
            <DigitalTwinPage />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function DigitalTwinPage() {
  const [calculations, setCalculations] = useState<any[]>([]);
  const [hoveredStation, setHoveredStation] = useState<string | null>(null);
  const [hoveredRoute, setHoveredRoute] = useState<number | null>(null);
  const [pulsePhase, setPulsePhase] = useState(0);

  useEffect(() => {
    setCalculations(loadCalculations());
    const interval = setInterval(() => setPulsePhase((p) => (p + 1) % 360), 50);
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    const total = calculations.length;
    const profitable = calculations.filter((c) => c.financial.financialResult >= 0).length;
    const unprofitable = total - profitable;
    const avgMargin = total > 0 ? calculations.reduce((s, c) => s + c.financial.profitMargin, 0) / total : 0;
    return { total, profitable, unprofitable, avgMargin };
  }, [calculations]);

  const stationLoad = (code: string) => {
    const s = STATIONS.find((st) => st.code === code);
    return s ? Math.round(s.load * 100) : 0;
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-semibold">Digital Twin — Сеть Казахстан Темір Жолы</h2>
          <p className="text-xs text-muted-foreground">Анимированная схема сети с пульсирующими маршрутами</p>
        </div>
        <div className="flex gap-2 text-[10px]">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" /> Прибыльный</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /> Убыточный</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" /> Внимание</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-3 overflow-hidden">
          <CardContent className="p-0 relative">
            <svg viewBox="0 0 900 550" className="w-full h-auto bg-[#0a0e1a]">
              {/* Grid */}
              {Array.from({ length: 10 }).map((_, i) => (
                <line key={`h${i}`} x1={0} y1={i * 55} x2={900} y2={i * 55} stroke="#1a1f2e" strokeWidth={0.5} />
              ))}
              {Array.from({ length: 18 }).map((_, i) => (
                <line key={`v${i}`} x1={i * 50} y1={0} x2={i * 50} y2={550} stroke="#1a1f2e" strokeWidth={0.5} />
              ))}

              {/* Routes */}
              {ROUTES.map((route, i) => {
                const from = STATIONS.find((s) => s.name === route.from);
                const to = STATIONS.find((s) => s.name === route.to);
                if (!from || !to) return null;
                const isHovered = hoveredRoute === i;
                const opacity = isHovered ? 1 : 0.4 + route.load * 0.4;
                const strokeWidth = isHovered ? 4 : 2 + route.load * 2;

                return (
                  <g key={i} onMouseEnter={() => setHoveredRoute(i)} onMouseLeave={() => setHoveredRoute(null)} style={{ cursor: "pointer" }}>
                    <line
                      x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                      stroke={route.color} strokeWidth={strokeWidth} opacity={opacity}
                    />
                    <line
                      x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                      stroke={route.color} strokeWidth={strokeWidth + 2} opacity={0.3}
                      strokeDasharray="8 12"
                    >
                      <animate attributeName="stroke-dashoffset" from="20" to="0" dur={`${2 - route.load}s`} repeatCount="indefinite" />
                    </line>
                    {/* Route tooltip on hover */}
                    {isHovered && (
                      <g>
                        <rect x={(from.x + to.x) / 2 - 60} y={(from.y + to.y) / 2 - 30} width={120} height={40} rx={4} fill="#0f172a" stroke={route.color} strokeWidth={1} />
                        <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 15} textAnchor="middle" fill="#fff" fontSize={10} fontFamily="sans-serif">
                          {route.from} — {route.to}
                        </text>
                        <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 2} textAnchor="middle" fill="#94a3b8" fontSize={9} fontFamily="sans-serif">
                          Загрузка: {Math.round(route.load * 100)}%
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Stations */}
              {STATIONS.map((station) => {
                const isHovered = hoveredStation === station.code;
                const pulse = Math.sin((pulsePhase * Math.PI) / 180 + station.x * 0.01) * 0.5 + 0.5;
                const r = isHovered ? 12 : 8 + pulse * 2;
                return (
                  <g
                    key={station.code}
                    onMouseEnter={() => setHoveredStation(station.code)}
                    onMouseLeave={() => setHoveredStation(null)}
                    style={{ cursor: "pointer" }}
                  >
                    <circle cx={station.x} cy={station.y} r={r} fill="#1e3a5f" stroke="#3b82f6" strokeWidth={isHovered ? 3 : 2} opacity={0.9} />
                    {isHovered && (
                      <circle cx={station.x} cy={station.y} r={r + 6} fill="none" stroke="#3b82f6" strokeWidth={1} opacity={0.5}>
                        <animate attributeName="r" values={`${r + 2};${r + 8};${r + 2}`} dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
                      </circle>
                    )}
                    <text x={station.x} y={station.y - 14} textAnchor="middle" fill="#93c5fd" fontSize={10} fontFamily="sans-serif">
                      {station.name}
                    </text>
                    {isHovered && (
                      <g>
                        <rect x={station.x - 50} y={station.y + 10} width={100} height={30} rx={4} fill="#0f172a" stroke="#3b82f6" strokeWidth={1} />
                        <text x={station.x} y={station.y + 22} textAnchor="middle" fill="#fff" fontSize={9} fontFamily="sans-serif">
                          Загрузка: {Math.round(station.load * 100)}%
                        </text>
                        <text x={station.x} y={station.y + 33} textAnchor="middle" fill="#94a3b8" fontSize={8} fontFamily="sans-serif">
                          {station.code}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Всего расчётов</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Прибыльных</p>
                <p className="text-2xl font-bold text-green-600">{stats.profitable}</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Убыточных</p>
                <p className="text-2xl font-bold text-red-600">{stats.unprofitable}</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Ср. рентабельность</p>
                <p className="text-2xl font-bold">{stats.avgMargin.toFixed(1)}%</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card>
              <CardContent className="p-3 space-y-2">
                <p className="text-[10px] text-muted-foreground uppercase">Топ загруженных станций</p>
                {STATIONS.sort((a, b) => b.load - a.load).slice(0, 3).map((s) => (
                  <div key={s.code} className="flex justify-between text-xs">
                    <span>{s.name}</span>
                    <span className="font-semibold">{Math.round(s.load * 100)}%</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
