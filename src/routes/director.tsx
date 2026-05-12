import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, TrendingUp, TrendingDown, DollarSign, Wallet, ArrowRight, Lightbulb, Film } from "lucide-react";
import { VideoReportGenerator } from "@/components/VideoReportGenerator";
import { loadCalculations, type SavedCalculation, KTZ_BRANCHES } from "@/lib/train-data";
import { generatePdfReport } from "@/lib/pdf-report";
import { useTranslation } from "react-i18next";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#16a34a", "#dc2626", "#2563eb", "#f59e0b", "#8b5cf6", "#14b8a6"];

export const Route = createFileRoute("/director")({
  head: () => ({
    meta: [
      { title: "Руководство — EcoPlan Hub" },
      { name: "description", content: "Управленческий обзор для руководства" },
    ],
  }),
  component: DirectorGuard,
});

function DirectorGuard() {
  const [ready, setReady] = useState(false);
  const { t } = useTranslation();

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
            <h1 className="text-sm font-semibold">{t("nav.executive")}</h1>
          </header>
          <main className="flex-1 overflow-auto bg-muted/30">
            <DirectorPage />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function DirectorPage() {
  const { t } = useTranslation();
  const [calculations, setCalculations] = useState<SavedCalculation[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

  useEffect(() => {
    setCalculations(loadCalculations());
  }, []);

  const branch = typeof window !== "undefined" ? sessionStorage.getItem("demo_branch") : null;

  const kpis = useMemo(() => {
    const data = selectedBranch
      ? calculations.filter((c) => c.branch === selectedBranch || !c.branch)
      : calculations;
    if (data.length === 0) {
      return { totalRevenue: 0, totalExpenses: 0, profit: 0, profitable: 0, unprofitable: 0, avgMargin: 0 };
    }
    const totalRevenue = data.reduce((s, c) => s + c.financial.totalRevenue, 0);
    const totalExpenses = data.reduce((s, c) => s + c.results.total, 0);
    const profit = totalRevenue - totalExpenses;
    const profitable = data.filter((c) => c.financial.financialResult >= 0).length;
    const unprofitable = data.length - profitable;
    const avgMargin = data.reduce((s, c) => s + c.financial.profitMargin, 0) / data.length;
    return { totalRevenue, totalExpenses, profit, profitable, unprofitable, avgMargin };
  }, [calculations, selectedBranch]);

  // Sparkline data: group by date
  const sparklineData = useMemo(() => {
    const sorted = [...calculations].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return sorted.map((c) => ({
      date: new Date(c.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
      revenue: c.financial.totalRevenue,
      expenses: c.results.total,
      profit: c.financial.financialResult,
    }));
  }, [calculations]);

  // Branch drill-down
  const branchData = useMemo(() => {
    const map: Record<string, { revenue: number; expenses: number; count: number; profit: number }> = {};
    for (const calc of calculations) {
      const b = calc.branch || "Без филиала";
      if (!map[b]) map[b] = { revenue: 0, expenses: 0, count: 0, profit: 0 };
      map[b].revenue += calc.financial.totalRevenue;
      map[b].expenses += calc.results.total;
      map[b].profit += calc.financial.financialResult;
      map[b].count += 1;
    }
    return Object.entries(map).map(([name, d]) => ({
      name,
      revenue: d.revenue,
      expenses: d.expenses,
      profit: d.profit,
      count: d.count,
      margin: d.revenue > 0 ? (d.profit / d.revenue) * 100 : 0,
    }));
  }, [calculations]);

  // Traffic light by expense groups
  const trafficLight = useMemo(() => {
    if (calculations.length === 0) return [];
    const groupTotals: Record<string, number> = {};
    for (const c of calculations) {
      for (const [g, v] of Object.entries(c.results.byGroup)) {
        groupTotals[g] = (groupTotals[g] || 0) + v;
      }
    }
    const total = Object.values(groupTotals).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(groupTotals).map(([group, value]) => {
      const share = value / total;
      const status = share > 0.35 ? "red" : share > 0.25 ? "yellow" : "green";
      return { group, share, status, value };
    }).sort((a, b) => b.share - a.share);
  }, [calculations]);

  const sortedReports = useMemo(
    () => [...calculations].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [calculations],
  );

  const fmt = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₸`;

  if (calculations.length === 0) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Card>
          <CardContent className="p-10 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">Нет сохранённых отчётов</p>
            <p className="text-xs text-muted-foreground mt-1">Отчёты появятся после сохранения расчётов</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-5">
      {/* Branch filter + Video Report */}
      <div className="flex flex-col lg:flex-row gap-3 justify-between">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedBranch(null)}
            className={`text-xs rounded border px-3 py-1.5 transition-colors ${selectedBranch === null ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent"}`}
          >
            {t("common.all")}
          </button>
          {KTZ_BRANCHES.map((b) => (
            <button
              key={b}
              onClick={() => setSelectedBranch(b)}
              className={`text-xs rounded border px-3 py-1.5 transition-colors ${selectedBranch === b ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent"}`}
            >
              {b}
            </button>
          ))}
        </div>
        <div className="w-full lg:w-80">
          <VideoReportGenerator />
        </div>
      </div>

      {/* KPI Grid with sparklines */}
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          {t("dashboard.summary")}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiSparkline
            label={t("dashboard.totalRevenue")}
            value={fmt(kpis.totalRevenue)}
            icon={DollarSign}
            tone="success"
            data={sparklineData}
            dataKey="revenue"
          />
          <KpiSparkline
            label={t("dashboard.totalExpenses")}
            value={fmt(kpis.totalExpenses)}
            icon={Wallet}
            tone="destructive"
            data={sparklineData}
            dataKey="expenses"
          />
          <KpiSparkline
            label={kpis.profit >= 0 ? t("dashboard.profit") : t("dashboard.loss")}
            value={fmt(kpis.profit)}
            icon={kpis.profit >= 0 ? TrendingUp : TrendingDown}
            tone={kpis.profit >= 0 ? "success" : "destructive"}
            data={sparklineData}
            dataKey="profit"
          />
          <KpiCard label={t("dashboard.avgMargin")} value={`${kpis.avgMargin.toFixed(1)} %`} tone="neutral" />
        </div>
      </div>

      {/* Trip status + Traffic Light */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="border-l-4 border-l-success">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase text-muted-foreground tracking-wide">{t("dashboard.profitableTrips")}</p>
              <p className="text-2xl font-bold text-success">{kpis.profitable}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-success/40" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase text-muted-foreground tracking-wide">{t("dashboard.unprofitableTrips")}</p>
              <p className="text-2xl font-bold text-destructive">{kpis.unprofitable}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-destructive/40" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] uppercase text-muted-foreground tracking-wide mb-2">Traffic Light</p>
            <div className="flex gap-2">
              <div className="flex items-center gap-1 text-[10px]">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span>{t("dashboard.trafficLight.green")}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px]">
                <div className="h-3 w-3 rounded-full bg-amber-500" />
                <span>{t("dashboard.trafficLight.yellow")}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px]">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span>{t("dashboard.trafficLight.red")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Traffic light by direction */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Светофор по направлениям расходов
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {trafficLight.map((t) => (
              <div key={t.group} className="flex items-center gap-3 p-2.5 rounded border">
                <div className={`h-4 w-4 rounded-full shrink-0 ${t.status === "green" ? "bg-green-500" : t.status === "yellow" ? "bg-amber-500" : "bg-red-500"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{t.group}</p>
                  <p className="text-[10px] text-muted-foreground">{Math.round(t.share * 100)}% от общих расходов</p>
                </div>
                <p className="text-xs font-mono shrink-0">{fmt(t.value)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("dashboard.byBranch")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={branchData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={10} interval={0} angle={-30} textAnchor="end" height={60} />
                <YAxis fontSize={10} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend />
                <Bar dataKey="revenue" name="Доходы" fill="#16a34a" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expenses" name="Расходы" fill="#dc2626" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Структура расходов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={trafficLight}
                  dataKey="value"
                  nameKey="group"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(p) => `${p.name}: ${Math.round((p.percent || 0) * 100)}%`}
                  labelLine={false}
                >
                  {trafficLight.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Drill-down branch table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("dashboard.drillDown")} — Филиалы
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {branchData.map((b) => {
              const isProfit = b.profit >= 0;
              return (
                <div key={b.name} className="p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{b.name}</p>
                    <p className="text-[10px] text-muted-foreground">{b.count} расчётов</p>
                  </div>
                  <div className="text-right text-xs space-y-0.5">
                    <p className="text-muted-foreground">Доходы: {fmt(b.revenue)}</p>
                    <p className="text-muted-foreground">Расходы: {fmt(b.expenses)}</p>
                  </div>
                  <div className="text-right shrink-0 w-28">
                    <p className={`text-sm font-bold ${isProfit ? "text-success" : "text-destructive"}`}>
                      {fmt(b.profit)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{b.margin.toFixed(1)}%</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => setSelectedBranch(b.name === "Без филиала" ? null : b.name)}
                  >
                    <ArrowRight className="h-3 w-3" /> Фильтр
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Reports list */}
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Отчёты по рейсам ({sortedReports.length})
        </h2>
        <Card>
          <CardContent className="p-0 divide-y">
            {sortedReports.slice(0, 10).map((calc) => {
              const isProfit = calc.financial.financialResult >= 0;
              return (
                <div key={calc.id} className="p-3 lg:p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <p className="text-sm font-semibold">Поезд {calc.trainNumber}</p>
                      <p className="text-xs text-muted-foreground truncate">{calc.trainRoute}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(calc.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${isProfit ? "text-success" : "text-destructive"}`}>
                      {fmt(calc.financial.financialResult)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {isProfit ? "прибыль" : "убыток"} · {calc.financial.profitMargin.toFixed(1)}%
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => generatePdfReport(calc, "executive")}
                  >
                    <Download className="h-3.5 w-3.5" /> PDF
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone: "success" | "destructive" | "neutral";
}) {
  const colorClass =
    tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-3.5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
          {Icon && <Icon className={`h-3.5 w-3.5 ${colorClass} opacity-60`} />}
        </div>
        <p className={`text-lg font-bold ${colorClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function KpiSparkline({
  label,
  value,
  icon: Icon,
  tone,
  data,
  dataKey,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone: "success" | "destructive" | "neutral";
  data: Array<Record<string, number | string>>;
  dataKey: string;
}) {
  const colorClass =
    tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "text-foreground";
  const colorHex = tone === "success" ? "#16a34a" : tone === "destructive" ? "#dc2626" : "#374151";

  return (
    <Card>
      <CardContent className="p-3.5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
          {Icon && <Icon className={`h-3.5 w-3.5 ${colorClass} opacity-60`} />}
        </div>
        <p className={`text-lg font-bold ${colorClass}`}>{value}</p>
        {data.length > 1 && (
          <div className="h-10 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colorHex} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={colorHex} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey={dataKey}
                  stroke={colorHex}
                  strokeWidth={2}
                  fill={`url(#grad-${dataKey})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
