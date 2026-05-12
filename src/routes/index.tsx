import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TrainSearch } from "@/components/TrainSearch";
import { TrainParams } from "@/components/TrainParams";
import { ProductionBlock } from "@/components/ProductionBlock";
import { RevenueBlock } from "@/components/RevenueBlock";
import { ExpenseTracker } from "@/components/ExpenseTracker";
import { ResultsBlock } from "@/components/ResultsBlock";
import { FinancialResultBlock } from "@/components/FinancialResultBlock";
import { Calculator, Save, CheckCircle, Send } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { canEdit, canCalculate } from "@/lib/roles";
import { loadTariffs } from "@/lib/storage";
import { toast } from "sonner";
import {
  type TrainInfo,
  type RouteType,
  type TrainType,
  type TariffSettings,
  type ExpenseItem,
  type CalculationResult,
  type CalculationParams,
  type WagonTypeRow,
  type RevenueData,
  type ProductionMetrics,
  type FinancialSummary,
  KTZ_BRANCHES,
  DEFAULT_WAGON_TYPES,
  createDefaultExpenses,
  calculateExpenses,
  calcProductionMetrics,
  calcRevenue,
  calcFinancialResult,
  saveCalculation,
} from "@/lib/train-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EcoPlan Hub — Расчёт расходов" },
      { name: "description", content: "Система планирования и анализа расходов пассажирских поездов" },
    ],
  }),
  component: IndexGuard,
});

function IndexGuard() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("demo_auth", "1");
      sessionStorage.setItem("demo_role", "manager");
      const role = sessionStorage.getItem("demo_role");
      if (role === "director") {
        navigate({ to: "/director" });
        return;
      }
      setChecked(true);
    }
  }, [navigate]);

  if (!checked) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-11 flex items-center border-b bg-card/90 backdrop-blur-sm sticky top-0 z-10 px-3">
            <SidebarTrigger className="mr-2" />
            <h1 className="text-sm font-semibold">Расчёт расходов</h1>
          </header>
          <main className="flex-1 overflow-auto">
            <IndexPage />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function IndexPage() {
  const editAllowed = canEdit();
  const calcAllowed = canCalculate();

  const [train, setTrain] = useState<TrainInfo | null>(null);
  const [routeType, setRouteType] = useState<RouteType>("social");
  const [trainType, setTrainType] = useState<TrainType>("standard");
  const [rollingStockMode, setRollingStockMode] = useState<"rent" | "depreciation">("rent");
  const [monthlyRides, setMonthlyRides] = useState(30);
  const [branch, setBranch] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("demo_branch") || "Астана";
    }
    return "Астана";
  });
  const [tariffs] = useState<TariffSettings>(loadTariffs());
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [results, setResults] = useState<CalculationResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [explanation, setExplanation] = useState("");

  const [wagonTypes, setWagonTypes] = useState<WagonTypeRow[]>(DEFAULT_WAGON_TYPES);
  const [occupancy, setOccupancy] = useState(70);

  const [revenue, setRevenue] = useState<RevenueData>({
    ticketPrice: 8500,
    passengers: 360,
    subsidy: 0,
  });

  const [financial, setFinancial] = useState<FinancialSummary | null>(null);

  const prodMetrics: ProductionMetrics = train
    ? calcProductionMetrics(wagonTypes, train.distanceKm, occupancy)
    : { totalWagons: 0, totalSeats: 0, mileageThousKm: 0, seatTurnover: 0, occupancyPercent: 0, passengerTurnover: 0, avgDistance: 0 };

  const totalWagons = wagonTypes.reduce((s, w) => s + w.count, 0);
  const totalPassengers = Math.round(prodMetrics.totalSeats * (occupancy / 100));

  const getParams = useCallback(
    (t: TrainInfo): CalculationParams => ({
      wagons: totalWagons, passengers: totalPassengers, routeType, trainType, rollingStockMode, train: t, tariffs, monthlyRides,
    }),
    [totalWagons, totalPassengers, routeType, trainType, rollingStockMode, tariffs, monthlyRides]
  );

  const handleTrainFound = useCallback(
    (t: TrainInfo) => {
      setTrain(t);
      setResults(null);
      setFinancial(null);
      setSaved(false);
      setExplanation("");
      setExpenses(createDefaultExpenses({ wagons: totalWagons, passengers: totalPassengers, routeType, trainType, rollingStockMode, train: t, tariffs, monthlyRides }));
    },
    [totalWagons, totalPassengers, routeType, trainType, rollingStockMode, tariffs, monthlyRides]
  );

  const refreshExpenses = useCallback(() => {
    if (!train) return;
    setExpenses(createDefaultExpenses(getParams(train)));
    setResults(null);
    setFinancial(null);
    setSaved(false);
  }, [train, getParams]);

  const handleExpenseChange = useCallback((id: string, field: keyof ExpenseItem, value: unknown) => {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
    setResults(null);
    setFinancial(null);
    setSaved(false);
  }, []);

  const handleWagonChange = useCallback((id: string, field: keyof WagonTypeRow, value: number) => {
    setWagonTypes((prev) => prev.map((w) => (w.id === id ? { ...w, [field]: value } : w)));
  }, []);

  const handleTotalWagonsChange = useCallback((value: number) => {
    setWagonTypes((prev) => {
      const currentTotal = prev.reduce((sum, row) => sum + row.count, 0);
      if (currentTotal === value) return prev;
      if (currentTotal === 0) {
        return prev.map((row, index) => ({ ...row, count: index === 0 ? Math.max(0, value) : 0 }));
      }

      const normalized = prev.map((row) => ({
        ...row,
        count: Math.max(0, Math.round((row.count / currentTotal) * value)),
      }));

      let diff = value - normalized.reduce((sum, row) => sum + row.count, 0);
      let idx = 0;
      while (diff !== 0 && normalized.length > 0) {
        const row = normalized[idx];
        if (diff > 0) {
          normalized[idx] = { ...row, count: row.count + 1 };
          diff -= 1;
        } else if (row.count > 0) {
          normalized[idx] = { ...row, count: row.count - 1 };
          diff += 1;
        }
        idx = (idx + 1) % normalized.length;
      }

      return normalized;
    });
    setResults(null);
    setFinancial(null);
    setSaved(false);
  }, []);

  const handlePassengerCountChange = useCallback((value: number) => {
    const totalSeats = prodMetrics.totalSeats;
    if (totalSeats <= 0) return;
    const nextOccupancy = Math.max(0, Math.min(100, Math.round((value / totalSeats) * 100)));
    setOccupancy(nextOccupancy);
    setResults(null);
    setFinancial(null);
    setSaved(false);
  }, [prodMetrics.totalSeats]);

  const handleRevenueChange = useCallback((field: keyof RevenueData, value: number) => {
    setRevenue((prev) => ({ ...prev, [field]: value }));
    setFinancial(null);
    setSaved(false);
  }, []);

  const handleCalculate = useCallback(() => {
    if (!train) return;
    const res = calculateExpenses(expenses, getParams(train));
    setResults(res);
    const { totalRevenue } = calcRevenue(revenue);
    setFinancial(calcFinancialResult(totalRevenue, res.total));
    setSaved(false);
  }, [expenses, train, getParams, revenue]);

  const hasAnomalyRequiringExplanation = results?.anomalies.some((a) => a.requiresExplanation) ?? false;
  const canSubmit = !hasAnomalyRequiringExplanation || explanation.trim().length > 10;

  const handleSave = useCallback(() => {
    if (!train || !results || !financial) return;
    if (!canSubmit) {
      toast.error("Отправка заблокирована", { description: "Укажите причину перерасхода (минимум 10 символов)" });
      return;
    }
    saveCalculation({
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      trainNumber: train.number,
      trainRoute: train.route,
      branch,
      trainInfo: train,
      wagonTypes,
      occupancy,
      routeType,
      trainType,
      rollingStockMode,
      revenue,
      expenses,
      results,
      financial,
      productionMetrics: prodMetrics,
      anomalyExplanation: explanation,
      status: "draft",
      auditLogs: [],
    });
    setSaved(true);
    toast.success("Расчёт сохранён", { description: `Поезд ${train.number} · ${train.route}` });
  }, [train, results, financial, wagonTypes, occupancy, routeType, trainType, rollingStockMode, revenue, expenses, prodMetrics, explanation, canSubmit, branch]);

  useEffect(() => {
    if (train) refreshExpenses();
  }, [totalWagons, totalPassengers, routeType, trainType, rollingStockMode, tariffs, monthlyRides]);

  return (
    <div className="p-4">
      {/* Search always on top, full width */}
      <div className="mb-4">
        <TrainSearch onTrainFound={handleTrainFound} />
      </div>

      {train && (
        <>
          {/* Dashboard grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
            <TrainParams
              wagons={totalWagons} passengers={totalPassengers}
              routeType={routeType} trainType={trainType} rollingStockMode={rollingStockMode}
              monthlyRides={monthlyRides}
              onWagonsChange={() => {}} onPassengersChange={() => {}}
              onRouteTypeChange={setRouteType} onTrainTypeChange={setTrainType}
              onRollingStockModeChange={setRollingStockMode}
              onMonthlyRidesChange={setMonthlyRides}
              disabled={!editAllowed}
            />
            <ProductionBlock
              wagonTypes={wagonTypes} onWagonChange={handleWagonChange}
              metrics={prodMetrics} occupancy={occupancy} onOccupancyChange={setOccupancy}
              disabled={!editAllowed}
            />
            <RevenueBlock revenue={revenue} onRevenueChange={handleRevenueChange} disabled={!editAllowed} />
          </div>

          {/* Expenses full width */}
          <div className="mb-4">
            <ExpenseTracker expenses={expenses} onExpenseChange={handleExpenseChange} disabled={!editAllowed} />
          </div>

          {/* Calculate button */}
          {calcAllowed && (
            <Button onClick={handleCalculate} className="w-full h-11 font-semibold gap-2 mb-4" size="lg">
              <Calculator className="h-4 w-4" />
              Рассчитать
            </Button>
          )}

          {/* Results grid */}
          {results && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <ResultsBlock
                results={results}
                wagons={totalWagons}
                passengers={totalPassengers}
                explanation={explanation}
                onExplanationChange={setExplanation}
              />
              {financial && <FinancialResultBlock summary={financial} />}
            </div>
          )}

          {/* Save / Submit */}
          {results && (
            <Button
              variant={saved ? "secondary" : "default"}
              className="w-full h-10 gap-2"
              onClick={handleSave}
              disabled={saved || !canSubmit}
            >
              {saved ? <CheckCircle className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              {saved ? "Расчёт сохранён" : hasAnomalyRequiringExplanation ? "Отправить с обоснованием" : "Сохранить расчёт"}
            </Button>
          )}
        </>
      )}

      {/* Branch selector */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Филиал:</span>
        <select
          value={branch}
          onChange={(e) => {
            setBranch(e.target.value);
            sessionStorage.setItem("demo_branch", e.target.value);
          }}
          className="text-xs border rounded px-2 py-1 bg-card"
        >
          {KTZ_BRANCHES.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      {!train && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">Введите номер поезда или выберите из списка</p>
          <p className="text-xs mt-1">Доступны реальные маршруты КТЖ из PassFlow: 001, 003, 005, 007, 021, 083 и др.</p>
        </div>
      )}
    </div>
  );
}
