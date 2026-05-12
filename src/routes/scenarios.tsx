import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, Copy, Trash2 } from "lucide-react";
import {
  loadCalculations,
  type SavedCalculation,
  type TariffSettings,
  DEFAULT_TARIFFS,
  calculateExpenses,
  calcRevenue,
  calcFinancialResult,
} from "@/lib/train-data";
import { useTranslation } from "react-i18next";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";

export const Route = createFileRoute("/scenarios")({
  head: () => ({
    meta: [
      { title: "Сценарное моделирование — EcoPlan Hub" },
      { name: "description", content: "What-if анализ для планирования расходов" },
    ],
  }),
  component: ScenariosGuard,
});

function ScenariosGuard() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("demo_auth", "1");
      sessionStorage.setItem("demo_role", "analyst");
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
            <h1 className="text-sm font-semibold">Сценарное моделирование</h1>
          </header>
          <main className="flex-1 overflow-auto bg-muted/30">
            <ScenariosPage />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

interface ScenarioState {
  id: string;
  label: string;
  adjustments: Record<string, number>;
  wagonDelta: number;
  passengerDelta: number;
  ticketPriceDelta: number;
  subsidyDelta: number;
}

interface ScenarioResult {
  id: string;
  label: string;
  totalExpenses: number;
  totalRevenue: number;
  profit: number;
  margin: number;
  diffExpenses: number;
  diffProfit: number;
  diffRevenue: number;
}

export default function ScenariosPage() {
  const { t } = useTranslation();
  const [calculations] = useState<SavedCalculation[]>(loadCalculations);
  const [scenarios, setScenarios] = useState<ScenarioState[]>([
    {
      id: "baseline",
      label: t("scenarios.baseline"),
      adjustments: {},
      wagonDelta: 0,
      passengerDelta: 0,
      ticketPriceDelta: 0,
      subsidyDelta: 0,
    },
    {
      id: "s1",
      label: "Сценарий А",
      adjustments: { fuel: 20 },
      wagonDelta: 0,
      passengerDelta: 0,
      ticketPriceDelta: 0,
      subsidyDelta: 0,
    },
    {
      id: "s2",
      label: "Сценарий Б",
      adjustments: { fuel: -10, rent: 15 },
      wagonDelta: -2,
      passengerDelta: 10,
      ticketPriceDelta: 0,
      subsidyDelta: 0,
    },
  ]);
  const [activeScenarioId, setActiveScenarioId] = useState<string>("s1");

  const latest = calculations[0];

  const results = useMemo<ScenarioResult[]>(() => {
    if (!latest) return [];
    const base = latest.results.total;
    const baseRev = latest.financial.totalRevenue;
    const baseProfit = latest.financial.financialResult;

    return scenarios.map((sc) => {
      const adjTariffs: TariffSettings = { ...DEFAULT_TARIFFS };
      for (const [key, pct] of Object.entries(sc.adjustments)) {
        if (key in adjTariffs) {
          (adjTariffs as Record<string, number>)[key] = (DEFAULT_TARIFFS as Record<string, number>)[key] * (1 + pct / 100);
        }
      }

      const newWagons = Math.max(1, latest.productionMetrics.totalWagons + sc.wagonDelta);
      const newPassengers = Math.max(0, latest.revenue.passengers + sc.passengerDelta);
      const newTicketPrice = Math.max(0, latest.revenue.ticketPrice * (1 + sc.ticketPriceDelta / 100));
      const newSubsidy = Math.max(0, latest.revenue.subsidy * (1 + sc.subsidyDelta / 100));

      const params = {
        wagons: newWagons,
        passengers: newPassengers,
        routeType: latest.routeType,
        trainType: latest.trainType,
        rollingStockMode: latest.rollingStockMode,
        train: latest.trainInfo,
        tariffs: adjTariffs,
        monthlyRides: 30,
      };

      const newExp = calculateExpenses(
        latest.expenses.map((e) => ({
          ...e,
          tariff:
            e.id === "mzs"
              ? Math.round(adjTariffs.mzs * (latest.trainType === "talgo" ? 1.3 : 1))
              : e.id === "water"
              ? adjTariffs.water
              : e.id === "fuel"
              ? Math.round(adjTariffs.fuel * (latest.trainInfo.durationHours / 10))
              : e.id === "cleaning"
              ? adjTariffs.cleaning
              : e.id === "disinfection"
              ? Math.round(adjTariffs.disinfection * (latest.trainType === "talgo" ? 1.3 : 1))
              : e.id === "deratization"
              ? Math.round(adjTariffs.deratization * (latest.trainType === "talgo" ? 1.3 : 1))
              : e.id === "disinsection"
              ? Math.round(adjTariffs.disinsection * (latest.trainType === "talgo" ? 1.3 : 1))
              : e.id === "rent"
              ? adjTariffs.rent
              : e.id === "linen"
              ? adjTariffs.linen
              : e.id === "supplies"
              ? adjTariffs.supplies
              : e.tariff,
          quantity:
            e.id === "linen"
              ? newPassengers * 30
              : e.id === "drinkwater"
              ? newPassengers * 30
              : ["water", "cleaning", "sanitation", "supplies", "inventory_item"].includes(e.id)
              ? (newWagons + 1) * 30
              : e.id === "rent" || e.id === "depreciation"
              ? newWagons + 1
              : e.quantity,
        })),
        params,
      );

      const rev = calcRevenue({ ticketPrice: newTicketPrice, passengers: newPassengers, subsidy: newSubsidy });
      const fin = calcFinancialResult(rev.totalRevenue, newExp.total);

      return {
        id: sc.id,
        label: sc.label,
        totalExpenses: newExp.total,
        totalRevenue: fin.totalRevenue,
        profit: fin.financialResult,
        margin: fin.profitMargin,
        diffExpenses: newExp.total - base,
        diffProfit: fin.financialResult - baseProfit,
        diffRevenue: fin.totalRevenue - baseRev,
      };
    });
  }, [latest, scenarios]);

  const activeScenario = scenarios.find((s) => s.id === activeScenarioId) || scenarios[1];

  const updateActive = (patch: Partial<ScenarioState>) => {
    setScenarios((prev) => prev.map((s) => (s.id === activeScenarioId ? { ...s, ...patch } : s)));
  };

  const addScenario = () => {
    const id = `s${scenarios.length}`;
    setScenarios((prev) => [
      ...prev,
      {
        id,
        label: `Сценарий ${String.fromCharCode(65 + prev.length - 1)}`,
        adjustments: {},
        wagonDelta: 0,
        passengerDelta: 0,
        ticketPriceDelta: 0,
        subsidyDelta: 0,
      },
    ]);
    setActiveScenarioId(id);
  };

  const removeScenario = (id: string) => {
    if (scenarios.length <= 2) return;
    setScenarios((prev) => prev.filter((s) => s.id !== id));
    if (activeScenarioId === id) setActiveScenarioId(scenarios[0].id);
  };

  const fmt = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} тг`;

  if (!latest) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Card>
          <CardContent className="p-10 text-center">
            <p className="text-sm text-muted-foreground">Нет сохранённых расчётов для сценарного анализа</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const comparisonData = results.map((r) => ({
    name: r.label,
    Расходы: r.totalExpenses,
    Доходы: r.totalRevenue,
    Прибыль: r.profit,
  }));

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-5">
      <div>
        <h2 className="text-sm font-semibold">{t("scenarios.title")}</h2>
        <p className="text-xs text-muted-foreground">
          База: поезд {latest.trainNumber} · {latest.trainRoute}
        </p>
      </div>

      {/* Scenario tabs */}
      <div className="flex gap-2 flex-wrap">
        {scenarios.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveScenarioId(s.id)}
            className={`text-xs rounded border px-3 py-1.5 transition-colors flex items-center gap-2 ${
              activeScenarioId === s.id ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent"
            }`}
          >
            {s.label}
            {s.id !== "baseline" && (
              <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); removeScenario(s.id); }} />
            )}
          </button>
        ))}
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addScenario}>
          + Добавить
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Controls */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Параметры сценария</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeScenarioId !== "baseline" && (
              <>
                <SliderControl
                  label={t("scenarios.wagonCount")}
                  value={activeScenario.wagonDelta}
                  onChange={(v) => updateActive({ wagonDelta: v })}
                  min={-5}
                  max={5}
                  step={1}
                  unit="ваг"
                />
                <SliderControl
                  label={t("scenarios.passengers")}
                  value={activeScenario.passengerDelta}
                  onChange={(v) => updateActive({ passengerDelta: v })}
                  min={-100}
                  max={100}
                  step={10}
                  unit="чел"
                />
                <SliderControl
                  label={t("scenarios.ticketPrice")}
                  value={activeScenario.ticketPriceDelta}
                  onChange={(v) => updateActive({ ticketPriceDelta: v })}
                  min={-30}
                  max={30}
                  step={1}
                  unit="%"
                />
                <SliderControl
                  label={t("scenarios.subsidy")}
                  value={activeScenario.subsidyDelta}
                  onChange={(v) => updateActive({ subsidyDelta: v })}
                  min={-30}
                  max={30}
                  step={1}
                  unit="%"
                />
                <div className="border-t pt-3">
                  <p className="text-xs font-semibold mb-2">Корректировки тарифов (%)</p>
                  {[
                    { key: "mzs", label: "МЖС" },
                    { key: "water", label: "Вода" },
                    { key: "fuel", label: "Топливо" },
                    { key: "cleaning", label: "Клининг" },
                    { key: "disinfection", label: "Дезинфекция" },
                    { key: "rent", label: "Аренда вагонов" },
                    { key: "linen", label: "Бельё" },
                    { key: "supplies", label: "Расходные материалы" },
                  ].map(({ key, label }) => (
                    <SliderControl
                      key={key}
                      label={label}
                      value={activeScenario.adjustments[key] || 0}
                      onChange={(v) =>
                        updateActive({
                          adjustments: { ...activeScenario.adjustments, [key]: v },
                        })
                      }
                      min={-30}
                      max={30}
                      step={1}
                      unit="%"
                    />
                  ))}
                </div>
              </>
            )}
            {activeScenarioId === "baseline" && (
              <p className="text-sm text-muted-foreground">Базовый расчёт без изменений</p>
            )}
          </CardContent>
        </Card>

        {/* Results cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {results.map((r) => (
              <Card key={r.id} className={r.id === activeScenarioId ? "border-primary" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">{r.label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded bg-muted/60 p-2.5">
                      <p className="text-muted-foreground">Расходы</p>
                      <p className="font-mono font-bold text-sm">{fmt(r.totalExpenses)}</p>
                    </div>
                    <div className="rounded bg-muted/60 p-2.5">
                      <p className="text-muted-foreground">Доходы</p>
                      <p className="font-mono font-bold text-sm">{fmt(r.totalRevenue)}</p>
                    </div>
                    <div className="rounded bg-muted/60 p-2.5">
                      <p className="text-muted-foreground">Прибыль / Убыток</p>
                      <p className={`font-mono font-bold text-sm ${r.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {fmt(r.profit)}
                      </p>
                    </div>
                    <div className="rounded bg-muted/60 p-2.5">
                      <p className="text-muted-foreground">Рентабельность</p>
                      <p className="font-mono font-bold text-sm">{r.margin.toFixed(1)}%</p>
                    </div>
                  </div>
                  {r.id !== "baseline" && (
                    <div className="text-xs space-y-1 pt-2 border-t">
                      <DiffRow label="Изменение расходов" value={r.diffExpenses} inverse />
                      <DiffRow label="Изменение доходов" value={r.diffRevenue} />
                      <DiffRow label="Изменение прибыли" value={r.diffProfit} />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Comparison chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{t("scenarios.comparison")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={10} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                  <Bar dataKey="Расходы" fill="#dc2626" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Доходы" fill="#16a34a" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Прибыль" fill="#2563eb" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SliderControl({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span>{label}</span>
        <Badge variant={value > 0 ? "destructive" : value < 0 ? "default" : "outline"}>
          {value > 0 ? "+" : ""}
          {value}
          {unit}
        </Badge>
      </div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} />
    </div>
  );
}

function DiffRow({ label, value, inverse }: { label: string; value: number; inverse?: boolean }) {
  const isPositive = inverse ? value < 0 : value > 0;
  const color = isPositive ? "text-green-600" : value === 0 ? "" : "text-red-600";
  return (
    <div className="flex items-center gap-1">
      {value > 0 ? <TrendingUp className="h-3 w-3 text-green-600" /> : value < 0 ? <TrendingDown className="h-3 w-3 text-red-600" /> : <Minus className="h-3 w-3" />}
      <span>{label}: </span>
      <span className={`font-mono font-semibold ${color}`}>
        {value > 0 ? "+" : ""}
        {Math.round(value).toLocaleString("ru-RU")} тг
      </span>
    </div>
  );
}
