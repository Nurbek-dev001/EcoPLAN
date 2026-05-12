import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadCalculations, type SavedCalculation } from "@/lib/train-data";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Html } from "@react-three/drei";
import * as THREE from "three";

export const Route = createFileRoute("/train-3d")({
  component: Train3DGuard,
});

function Train3DGuard() {
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
            <h1 className="text-sm font-semibold">3D-модель поезда</h1>
          </header>
          <main className="flex-1 overflow-auto bg-muted/30">
            <Train3DPage />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function WagonDetail({
  wagon,
  index,
  expenses,
  onClose,
}: {
  wagon: any;
  index: number;
  expenses: any[];
  onClose: () => void;
}) {
  const wagonExpenses = expenses.filter(
    (e: any) => e.enabled && (e.group === wagon.type || e.group === "Станционные" || e.group === "Расходники")
  );
  const totalWagonCost = wagonExpenses.reduce((s: number, e: any) => s + e.tariff * e.quantity / (wagon.count || 1), 0);

  return (
    <Html center>
      <div className="bg-black/90 text-white p-3 rounded-lg shadow-xl border border-white/10 min-w-[220px] pointer-events-auto">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold uppercase">Вагон #{index + 1}</span>
          <button onClick={onClose} className="text-white/60 hover:text-white text-xs">✕</button>
        </div>
        <div className="text-[10px] text-white/70 mb-1">{wagon.type}</div>
        <div className="text-xs font-semibold text-green-400 mb-2">
          {Math.round(totalWagonCost).toLocaleString("ru-RU")} ₸/мес
        </div>
        <div className="space-y-1 max-h-[120px] overflow-auto">
          {wagonExpenses.slice(0, 4).map((e: any, i: number) => (
            <div key={i} className="flex justify-between text-[10px]">
              <span className="text-white/80">{e.label}</span>
              <span>{Math.round(e.tariff * e.quantity / (wagon.count || 1)).toLocaleString("ru-RU")} ₸</span>
            </div>
          ))}
        </div>
      </div>
    </Html>
  );
}

function Wagon({
  position,
  color,
  onClick,
  isSelected,
  children,
}: {
  position: [number, number, number];
  color: string;
  onClick: () => void;
  isSelected: boolean;
  children?: React.ReactNode;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(Date.now() * 0.002 + position[0]) * 0.02;
    }
  });

  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[2, 1.2, 0.8]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
      </mesh>
      {/* Windows */}
      <mesh position={[0, 0.15, 0.42]}>
        <boxGeometry args={[1.6, 0.5, 0.05]} />
        <meshStandardMaterial color="#1a1a2e" transparent opacity={0.6} />
      </mesh>
      {/* Wheels */}
      {[-0.6, 0.6].map((x, i) => (
        <mesh key={i} position={[x, -0.7, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.2, 0.2, 0.85, 16]} />
          <meshStandardMaterial color="#333" />
        </mesh>
      ))}
      {isSelected && (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2.2, 1.4, 1]} />
          <meshBasicMaterial color="#3b82f6" wireframe transparent opacity={0.5} />
        </mesh>
      )}
      {isSelected && children}
    </group>
  );
}

function Locomotive({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (ref.current) {
      ref.current.position.y = position[1] + Math.sin(Date.now() * 0.002 + position[0]) * 0.02;
    }
  });

  return (
    <group position={position}>
      <mesh ref={ref} castShadow>
        <boxGeometry args={[2.4, 1.5, 0.9]} />
        <meshStandardMaterial color="#2563eb" metalness={0.4} roughness={0.3} />
      </mesh>
      {/* Cabin */}
      <mesh position={[1.3, 0.1, 0]}>
        <boxGeometry args={[0.8, 1.3, 0.95]} />
        <meshStandardMaterial color="#1d4ed8" />
      </mesh>
      {/* Chimney */}
      <mesh position={[1.3, 0.9, 0]}>
        <cylinderGeometry args={[0.1, 0.15, 0.4, 16]} />
        <meshStandardMaterial color="#444" />
      </mesh>
      {/* Wheels */}
      {[-0.7, 0.7].map((x, i) => (
        <mesh key={i} position={[x, -0.8, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.22, 0.22, 0.95, 16]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      ))}
    </group>
  );
}

function Scene({
  wagons,
  expenses,
  selectedIndex,
  setSelectedIndex,
}: {
  wagons: any[];
  expenses: any[];
  selectedIndex: number | null;
  setSelectedIndex: (i: number | null) => void;
}) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <pointLight position={[-5, 5, 5]} intensity={0.5} color="#3b82f6" />

      <Locomotive position={[-(wagons.length + 1) * 1.5, 0, 0]} />

      {wagons.map((w, i) => {
        const isProfit = w.financialResult >= 0;
        const color = isProfit ? "#16a34a" : "#dc2626";
        return (
          <Wagon
            key={i}
            position={[-i * 1.5, 0, 0]}
            color={color}
            onClick={() => setSelectedIndex(selectedIndex === i ? null : i)}
            isSelected={selectedIndex === i}
          >
            {selectedIndex === i && (
              <WagonDetail wagon={w} index={i} expenses={expenses} onClose={() => setSelectedIndex(null)} />
            )}
          </Wagon>
        );
      })}

      {/* Track */}
      <mesh position={[-(wagons.length * 1.5) / 2, -1.05, 0]} receiveShadow>
        <boxGeometry args={[wagons.length * 1.5 + 4, 0.1, 1.2]} />
        <meshStandardMaterial color="#555" />
      </mesh>

      <OrbitControls enablePan={true} enableZoom={true} />
      <gridHelper args={[40, 40, "#333", "#222"]} position={[0, -1.2, 0]} />
    </>
  );
}

function Train3DPage() {
  const [calculations, setCalculations] = useState<SavedCalculation[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    setCalculations(loadCalculations());
  }, []);

  // Demo data fallback when no calculations exist
  const latest = calculations[0] || {
    id: "demo-3d",
    trainNumber: "001 «Нурлы жол»",
    trainRoute: "Астана — Алматы",
    wagonTypes: [
      { type: "Плацкарт", count: 4, seats: 54 },
      { type: "Купе", count: 3, seats: 36 },
      { type: "СВ", count: 1, seats: 18 },
    ],
    productionMetrics: { totalWagons: 8, totalSeats: 306 },
    financial: { financialResult: 1250000, profitMargin: 12.5 },
    expenses: [
      { id: "water", label: "Вода", enabled: true, tariff: 3000, quantity: 240, group: "Станционные" },
      { id: "fuel", label: "Топливо", enabled: true, tariff: 15000, quantity: 30, group: "Станционные" },
      { id: "cleaning", label: "Клининг", enabled: true, tariff: 5000, quantity: 240, group: "Станционные" },
      { id: "mzs", label: "МЖС", enabled: true, tariff: 50000, quantity: 30, group: "МЖС" },
      { id: "linen", label: "Бельё", enabled: true, tariff: 1500, quantity: 9000, group: "Расходники" },
    ],
  };

  const wagons = latest.wagonTypes || [];
  const isProfit = latest.financial.financialResult >= 0;
  const expenses = latest.expenses || [];

  // Build per-wagon data for 3D scene
  const wagonData = wagons.flatMap((w: any) =>
    Array.from({ length: w.count || 1 }).map(() => ({
      type: w.type,
      count: w.count,
      seats: w.seats,
      financialResult: latest.financial.financialResult,
    }))
  );

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-4">
      <h2 className="text-sm font-semibold">3D-модель поезда {latest.trainNumber}</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-[500px] rounded border bg-black relative">
          <Canvas camera={{ position: [0, 3, 10], fov: 50 }} shadows>
            <Scene
              wagons={wagonData}
              expenses={expenses}
              selectedIndex={selectedIndex}
              setSelectedIndex={setSelectedIndex}
            />
          </Canvas>
          <div className="absolute top-2 left-2 text-[10px] text-white/60 bg-black/50 px-2 py-1 rounded">
            🖱 ЛКМ — выбрать вагон | 🖱 ПКМ — вращать | 🖱 Колёсико — масштаб
          </div>
        </div>
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase">Информация о поезде</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>Маршрут: {latest.trainRoute}</p>
              <p>Вагонов: {latest.productionMetrics.totalWagons}</p>
              <p>Мест: {latest.productionMetrics.totalSeats}</p>
              <p className={isProfit ? "text-green-600" : "text-red-600"}>
                {isProfit ? "Прибыль" : "Убыток"}: {Math.round(latest.financial.financialResult).toLocaleString("ru-RU")} тг
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase">Состав вагонов</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {wagons.map((w: any, i: number) => (
                <div
                  key={i}
                  className={`flex justify-between cursor-pointer rounded px-1 py-0.5 transition-colors ${
                    selectedIndex !== null && wagons.slice(0, selectedIndex + 1).reduce((a: number, c: any, idx: number) => a + (idx < selectedIndex ? c.count : 0), 0) <= selectedIndex &&
                    selectedIndex < wagons.slice(0, i + 1).reduce((a: number, c: any) => a + c.count, 0)
                      ? "bg-blue-100 dark:bg-blue-900"
                      : "hover:bg-muted"
                  }`}
                >
                  <span>{w.type}</span>
                  <span className="text-muted-foreground">{w.count} шт · {w.seats} мест</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
