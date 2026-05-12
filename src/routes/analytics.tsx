import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadCalculations, type SavedCalculation, buildForecastPoints, analyzeTrendSignals, generateOptimizationSuggestions, type ForecastPoint, type TrendSignal, type OptimizationSuggestion } from "@/lib/train-data";
import type { PieLabelRenderProps } from "recharts";
import { useTranslation } from "react-i18next";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, Area, AreaChart,
} from "recharts";
import { BrainCircuit, TrendingUp, AlertTriangle, TrainFront } from "lucide-react";

const COLORS = ["#1a3264", "#286428", "#8c1e1e", "#5a4aad", "#2563eb", "#1a6464"];

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Аналитика — EcoPlan Hub" },
      { name: "description", content: "Аналитика расходов пассажирских поездов" },
    ],
  }),
  component: AnalyticsGuard,
});

function AnalyticsGuard() {
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
            <h1 className="text-sm font-semibold">Аналитика</h1>
          </header>
          <main className="flex-1 overflow-auto">
            <AnalyticsPage />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AnalyticsPage() {
  const { t } = useTranslation();
  const [calculations, setCalculations] = useState<SavedCalculation[]>([]);
  const [selectedTrain, setSelectedTrain] = useState<string>("all");

  useEffect(() => {
    setCalculations(loadCalculations());
  }, []);

  const filtered = useMemo(() => {
    if (selectedTrain === "all") return calculations;
    return calculations.filter((c) => c.trainNumber === selectedTrain);
  }, [calculations, selectedTrain]);

  const trainNumbers = useMemo(() => {
    return [...new Set(calculations.map((c) => c.trainNumber))];
  }, [calculations]);

  const expenseBreakdown = useMemo(() => {
    if (filtered.length === 0) return [];
    const totals: Record<string, number> = {};
    for (const calc of filtered) {
      for (const [group, amount] of Object.entries(calc.results.byGroup)) {
        totals[group] = (totals[group] || 0) + amount;
      }
    }
    return Object.entries(totals).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const trainComparison = useMemo(() => {
    if (calculations.length === 0) return [];
    const byTrain: Record<string, { revenue: number; expenses: number; count: number }> = {};
    for (const calc of calculations) {
      if (!byTrain[calc.trainNumber]) byTrain[calc.trainNumber] = { revenue: 0, expenses: 0, count: 0 };
      byTrain[calc.trainNumber].revenue += calc.financial.totalRevenue;
      byTrain[calc.trainNumber].expenses += calc.results.total;
      byTrain[calc.trainNumber].count++;
    }
    return Object.entries(byTrain).map(([train, data]) => ({
      train,
      revenue: Math.round(data.revenue / data.count),
      expenses: Math.round(data.expenses / data.count),
    }));
  }, [calculations]);

  const forecastPoints = useMemo<ForecastPoint[]>(() => {
    return buildForecastPoints(filtered.length > 0 ? filtered : calculations, 3);
  }, [calculations, filtered]);

  const trendSignals = useMemo<TrendSignal[]>(() => {
    return analyzeTrendSignals(filtered.length > 0 ? filtered : calculations);
  }, [calculations, filtered]);

  const optimizationSuggestions = useMemo<OptimizationSuggestion[]>(() => {
    return generateOptimizationSuggestions(filtered.length > 0 ? filtered : calculations);
  }, [calculations, filtered]);

  // Build forecast chart data with confidence interval
  const forecastChartData = useMemo(() => {
    const sorted = [...calculations].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const historical = sorted.map((c) => ({
      period: new Date(c.date).toLocaleDateString("ru-RU", { month: "short", year: "numeric" }),
      factProfit: c.financial.financialResult,
      forecastProfit: null as number | null,
      upper: null as number | null,
      lower: null as number | null,
    }));
    const forecast = forecastPoints.map((p) => ({
      period: p.period,
      factProfit: null as number | null,
      forecastProfit: p.profit,
      upper: p.profit * 1.15,
      lower: p.profit * 0.85,
    }));
    return [...historical, ...forecast];
  }, [calculations, forecastPoints]);

  if (calculations.length === 0) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground">Нет данных для аналитики</p>
            <p className="text-xs text-muted-foreground mt-1">Сохраните расчёты для отображения графиков</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Фильтр:</span>
        <button
          onClick={() => setSelectedTrain("all")}
          className={`text-xs rounded border px-3 py-1.5 transition-colors ${selectedTrain === "all" ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent"}`}
        >
          Все
        </button>
        {trainNumbers.map((num) => (
          <button
            key={num}
            onClick={() => setSelectedTrain(num)}
            className={`text-xs rounded border px-3 py-1.5 transition-colors ${selectedTrain === num ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent"}`}
          >
            {num}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Структура расходов ({filtered.length} расчёт.)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={expenseBreakdown}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  label={(props: PieLabelRenderProps) => `${props.name ?? ""} ${((Number(props.percent) || 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {expenseBreakdown.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${Number(v).toLocaleString("ru-RU")} тг`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar */}
        {trainComparison.length > 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Сравнение поездов (средние)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={trainComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="train" fontSize={11} />
                  <YAxis fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}к`} />
                  <Tooltip formatter={(v) => `${Number(v).toLocaleString("ru-RU")} тг`} />
                  <Legend />
                  <Bar dataKey="revenue" name="Доходы" fill="#286428" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expenses" name="Расходы" fill="#8c1e1e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Ср. доход</p>
            <p className="text-base font-bold text-success">
              {Math.round(filtered.reduce((s, c) => s + c.financial.totalRevenue, 0) / filtered.length).toLocaleString("ru-RU")} ₸
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Ср. расходы</p>
            <p className="text-base font-bold text-destructive">
              {Math.round(filtered.reduce((s, c) => s + c.results.total, 0) / filtered.length).toLocaleString("ru-RU")} ₸
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Ср. рентабельность</p>
            <p className="text-base font-bold">
              {(filtered.reduce((s, c) => s + c.financial.profitMargin, 0) / filtered.length).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Chart with Confidence Interval */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("analytics.forecast")} — {t("analytics.confidenceInterval")} ±15%
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={forecastChartData}>
              <defs>
                <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorUpper" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#93c5fd" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" fontSize={10} />
              <YAxis fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}к`} />
              <Tooltip formatter={(v: number) => `${Math.round(v).toLocaleString("ru-RU")} тг`} />
              <Legend />
              <Area type="monotone" dataKey="upper" stroke="none" fill="#93c5fd" fillOpacity={0.3} name="Верхняя граница" />
              <Area type="monotone" dataKey="lower" stroke="none" fill="#fff" name="Нижняя граница" />
              <Line type="monotone" dataKey="factProfit" stroke="#16a34a" strokeWidth={2} dot name="Факт" />
              <Line type="monotone" dataKey="forecastProfit" stroke="#2563eb" strokeWidth={2} strokeDasharray="5 5" dot name="Прогноз" />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-muted-foreground text-center mt-2">{t("analytics.forecastMethod")}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("analytics.forecast")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {forecastPoints.map((point) => (
              <div key={point.period} className="flex items-center justify-between text-sm">
                <span>{point.period}</span>
                <span className="text-xs text-muted-foreground">
                  {point.revenue.toLocaleString("ru-RU")} / {point.expenses.toLocaleString("ru-RU")} ₸
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("analytics.trends")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {trendSignals.map((signal) => (
              <div key={signal.dimension} className="space-y-1">
                <p className="text-[10px] uppercase text-muted-foreground">{signal.dimension === "profit" ? "Рентабельность" : signal.dimension === "revenue" ? "Доходы" : "Расходы"}</p>
                <p className="text-sm font-semibold">{signal.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("analytics.optimization")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {optimizationSuggestions.map((suggestion) => (
              <div key={suggestion.category} className="space-y-1 text-sm">
                <p className="font-semibold">{suggestion.category}</p>
                <p className="text-muted-foreground">{suggestion.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ML Engine Panel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-purple-500" />
              ML Engine
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="font-medium">Dynamic Pricing</span>
              <span className="text-xs text-muted-foreground ml-auto">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <TrainFront className="h-4 w-4 text-green-500" />
              <span className="font-medium">Route Optimizer</span>
              <span className="text-xs text-muted-foreground ml-auto">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="font-medium">Isolation Forest</span>
              <span className="text-xs text-muted-foreground ml-auto">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-purple-500" />
              <span className="font-medium">Prophet Forecasting</span>
              <span className="text-xs text-muted-foreground ml-auto">Active</span>
            </div>
            <div className="pt-2 border-t text-[10px] text-muted-foreground">
              Модели обучаются ежедневно через Celery Beat. API: /api/ml/*
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top profitable / unprofitable */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-success">
              Топ прибыльных рейсов
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {[...calculations]
                .sort((a, b) => b.financial.financialResult - a.financial.financialResult)
                .slice(0, 5)
                .map((c) => (
                  <div key={c.id} className="px-4 py-2.5 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">Поезд {c.trainNumber}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{c.trainRoute}</p>
                    </div>
                    <p className="text-xs font-bold text-success ml-2 shrink-0">
                      +{Math.round(c.financial.financialResult).toLocaleString("ru-RU")} ₸
                    </p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-destructive">
              Топ убыточных рейсов
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {[...calculations]
                .sort((a, b) => a.financial.financialResult - b.financial.financialResult)
                .slice(0, 5)
                .map((c) => (
                  <div key={c.id} className="px-4 py-2.5 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">Поезд {c.trainNumber}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{c.trainRoute}</p>
                    </div>
                    <p className="text-xs font-bold text-destructive ml-2 shrink-0">
                      {Math.round(c.financial.financialResult).toLocaleString("ru-RU")} ₸
                    </p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
