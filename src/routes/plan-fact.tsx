import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Search, ArrowLeft, ChevronRight } from "lucide-react";
import { loadCalculations, type SavedCalculation } from "@/lib/train-data";

export const Route = createFileRoute("/plan-fact")({
  head: () => ({
    meta: [
      { title: "План vs Факт — EcoPlan Hub" },
      { name: "description", content: "Сравнение плановых и фактических показателей" },
    ],
  }),
  component: PlanFactGuard,
});

function PlanFactGuard() {
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
            <h1 className="text-sm font-semibold">План vs Факт</h1>
          </header>
          <main className="flex-1 overflow-auto bg-muted/30">
            <PlanFactPage />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

type DrillLevel = "summary" | "trips" | "stations";

export default function PlanFactPage() {
  const [calculations, setCalculations] = useState<SavedCalculation[]>([]);
  const [search, setSearch] = useState("");
  const [drill, setDrill] = useState<{ level: DrillLevel; group?: string; calc?: SavedCalculation }>({
    level: "summary",
  });

  useEffect(() => {
    setCalculations(loadCalculations());
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return calculations;
    const q = search.toLowerCase();
    return calculations.filter(
      (c) =>
        c.trainNumber.toLowerCase().includes(q) ||
        c.trainRoute.toLowerCase().includes(q)
    );
  }, [calculations, search]);

  // Aggregate all calculations by expense group
  const summaryRows = useMemo(() => {
    const agg: Record<
      string,
      { plan: number; fact: number }
    > = {};

    for (const calc of filtered) {
      for (const row of calc.results.planVsFact || []) {
        if (!agg[row.group]) agg[row.group] = { plan: 0, fact: 0 };
        agg[row.group].plan += row.plan;
        agg[row.group].fact += row.fact;
      }
    }

    return Object.entries(agg).map(([group, vals]) => {
      const deviation = vals.fact - vals.plan;
      const deviationPercent = vals.plan > 0 ? Math.abs(deviation / vals.plan) : 0;
      return {
        group,
        plan: vals.plan,
        fact: vals.fact,
        deviation,
        deviationPercent,
        isOver: deviation > 0,
        isUnder: deviation < 0,
        isAnomaly: deviationPercent > 0.1,
      };
    });
  }, [filtered]);

  const fmt = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} тг`;

  if (filtered.length === 0) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Card>
          <CardContent className="p-10 text-center">
            <p className="text-sm text-muted-foreground">Нет сохранённых расчётов для анализа</p>
            <p className="text-xs text-muted-foreground mt-1">Сохраните расчёты на главной странице</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        {drill.level !== "summary" && (
          <Button variant="outline" size="sm" onClick={() => setDrill({ level: drill.level === "stations" ? "trips" : "summary" })}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Назад
          </Button>
        )}
        <h2 className="text-sm font-semibold">
          {drill.level === "summary" && "Сводный План vs Факт"}
          {drill.level === "trips" && `Детализация по рейсам: ${drill.group}`}
          {drill.level === "stations" && `Детализация по станциям: Поезд ${drill.calc?.trainNumber}`}
        </h2>
      </div>

      {drill.level === "summary" && (
        <>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск по номеру или маршруту"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-9"
            />
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Статья</TableHead>
                    <TableHead className="text-right">План</TableHead>
                    <TableHead className="text-right">Факт</TableHead>
                    <TableHead className="text-right">Отклонение</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="w-[40px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaryRows.map((row) => (
                    <TableRow
                      key={row.group}
                      className={`cursor-pointer hover:bg-muted/50 ${row.isAnomaly ? "bg-red-50/50" : ""}`}
                      onClick={() => setDrill({ level: "trips", group: row.group })}
                    >
                      <TableCell className="font-medium">{row.group}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(row.plan)}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(row.fact)}</TableCell>
                      <TableCell className="text-right font-mono">
                        <span className={row.isOver ? "text-red-600" : row.isUnder ? "text-green-600" : ""}>
                          {row.deviation > 0 ? "+" : ""}
                          {fmt(row.deviation)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {row.isAnomaly ? (
                          <Badge variant="destructive" className="gap-1">
                            <TrendingUp className="h-3 w-3" />
                            +{(row.deviationPercent * 100).toFixed(0)}%
                          </Badge>
                        ) : row.isUnder ? (
                          <Badge variant="default" className="bg-green-600 gap-1">
                            <TrendingDown className="h-3 w-3" />
                            {(row.deviationPercent * 100).toFixed(0)}%
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <Minus className="h-3 w-3" />
                            {(row.deviationPercent * 100).toFixed(0)}%
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {drill.level === "trips" && drill.group && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Поезд</TableHead>
                  <TableHead>Маршрут</TableHead>
                  <TableHead className="text-right">План</TableHead>
                  <TableHead className="text-right">Факт</TableHead>
                  <TableHead className="text-right">Отклонение</TableHead>
                  <TableHead className="w-[40px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((calc) => {
                  const row = calc.results.planVsFact?.find((r) => r.group === drill.group);
                  if (!row) return null;
                  const deviation = row.fact - row.plan;
                  const isOver = deviation > 0;
                  const isAnomaly = row.plan > 0 && Math.abs(deviation / row.plan) > 0.1;
                  return (
                    <TableRow
                      key={calc.id}
                      className={`cursor-pointer hover:bg-muted/50 ${isAnomaly ? "bg-red-50/50" : ""}`}
                      onClick={() => setDrill({ level: "stations", group: drill.group, calc })}
                    >
                      <TableCell className="font-medium">{calc.trainNumber}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{calc.trainRoute}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(row.plan)}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(row.fact)}</TableCell>
                      <TableCell className="text-right font-mono">
                        <span className={isOver ? "text-red-600" : "text-green-600"}>
                          {isOver ? "+" : ""}
                          {fmt(deviation)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {drill.level === "stations" && drill.calc && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Маршрут поезда {drill.calc.trainNumber} — {drill.calc.trainRoute}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded border p-3 max-h-64 overflow-y-auto">
              <div className="space-y-0.5">
                {drill.calc.trainInfo.stations.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="flex flex-col items-center">
                      <div className={`h-1.5 w-1.5 rounded-full ${i === 0 || i === drill.calc!.trainInfo.stations.length - 1 ? "bg-primary" : "bg-muted-foreground/30"}`} />
                      {i < drill.calc!.trainInfo.stations.length - 1 && <div className="w-px h-3 bg-border" />}
                    </div>
                    <div className="flex-1 flex items-center justify-between min-w-0">
                      <span className="truncate">{s.name}</span>
                      <div className="flex gap-2 text-muted-foreground shrink-0">
                        {s.arrival !== "—" && <span>{s.arrival}</span>}
                        {s.departure !== "—" && <span>{s.departure}</span>}
                        {s.stop !== "—" && <span className="text-primary">{s.stop}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {drill.calc.results.planVsFact?.map((row) => (
                <div key={row.group} className="rounded border p-2.5 text-xs">
                  <p className="text-muted-foreground mb-1">{row.group}</p>
                  <p className="font-mono font-semibold">{fmt(row.fact)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    План: {fmt(row.plan)} · Отклонение: {((row.deviation / Math.max(row.plan, 1)) * 100).toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
