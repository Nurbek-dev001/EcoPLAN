import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Download, Trash2, Eye, ArrowLeft, Mail, Check } from "lucide-react";
import { CreateRouteDialog } from "@/components/CreateRouteDialog";
import { loadCalculations, deleteCalculation, type SavedCalculation } from "@/lib/train-data";
import { calcRevenue } from "@/lib/train-data";
import { generatePdfReport } from "@/lib/pdf-report";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Отчёты — EcoPlan Hub" },
      { name: "description", content: "Отчёты по расходам пассажирских поездов с PDF экспортом" },
    ],
  }),
  component: ReportsGuard,
});

function ReportsGuard() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("demo_auth", "1");
      sessionStorage.setItem("demo_role", "checker");
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
            <h1 className="text-sm font-semibold">Отчёты</h1>
          </header>
          <main className="flex-1 overflow-auto">
            <ReportsPage />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function ReportsPage() {
  const { t } = useTranslation();

  const [calculations, setCalculations] = useState<SavedCalculation[]>([]);
  const [selectedCalc, setSelectedCalc] = useState<SavedCalculation | null>(null);
  const [reportType, setReportType] = useState<"full" | "cost" | "executive" | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    setCalculations(loadCalculations());
  }, []);

  const handleDelete = useCallback((id: string) => {
    deleteCalculation(id);
    setCalculations(loadCalculations());
    if (selectedCalc?.id === id) {
      setSelectedCalc(null);
      setReportType(null);
    }
  }, [selectedCalc]);

  const handleDownloadPdf = useCallback((calc: SavedCalculation, type: "full" | "cost" | "executive") => {
    generatePdfReport(calc, type);
  }, []);

  const handleBulkPdf = () => {
    const selected = calculations.filter((c) => selectedIds.has(c.id));
    selected.forEach((calc, i) => {
      setTimeout(() => generatePdfReport(calc, "executive"), i * 800);
    });
    toast.success("PDF генерация", { description: `Создано ${selected.length} отчётов` });
  };

  const handleSendEmail = () => {
    setSendingEmail(true);
    setTimeout(() => {
      setSendingEmail(false);
      toast.success("Email отправлен", { description: "Отчёты отправлены stakeholders (демо)" });
    }, 1500);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === calculations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(calculations.map((c) => c.id)));
    }
  };

  if (reportType && selectedCalc) {
    return (
      <ReportView
        calc={selectedCalc}
        type={reportType}
        onBack={() => { setReportType(null); setSelectedCalc(null); }}
        onDownload={() => handleDownloadPdf(selectedCalc, reportType)}
      />
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-3">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Сохранённые расчёты ({calculations.length})
        </h2>
        <div className="flex gap-2">
          <CreateRouteDialog onCreated={() => setCalculations(loadCalculations())} />
          {selectedIds.size > 0 && (
            <>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleBulkPdf}>
                <Download className="h-3 w-3" /> PDF ({selectedIds.size})
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleSendEmail} disabled={sendingEmail}>
                <Mail className="h-3 w-3" /> {sendingEmail ? "Отправка..." : "Email"}
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={selectAll}>
            {selectedIds.size === calculations.length ? "Снять все" : "Выбрать все"}
          </Button>
        </div>
      </div>

      {calculations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground">Нет сохранённых расчётов</p>
            <p className="text-xs text-muted-foreground mt-1">Выполните расчёт и сохраните результат</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {calculations.map((calc) => {
            const isProfit = calc.financial.financialResult >= 0;
            const selected = selectedIds.has(calc.id);
            return (
              <Card key={calc.id} className={selected ? "border-primary" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={selected} onCheckedChange={() => toggleSelect(calc.id)} />
                      <div>
                        <p className="text-sm font-semibold">Поезд {calc.trainNumber}</p>
                        <p className="text-xs text-muted-foreground">{calc.trainRoute}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(calc.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${isProfit ? "text-success" : "text-destructive"}`}>
                        {calc.financial.financialResult.toLocaleString("ru-RU")} тг
                      </p>
                      <p className="text-[10px] text-muted-foreground">{isProfit ? "прибыль" : "убыток"}</p>
                    </div>
                  </div>

                  <div className="flex gap-1.5 flex-wrap">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setSelectedCalc(calc); setReportType("full"); }}>
                      <Eye className="h-3 w-3" /> {t("reports.full")}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setSelectedCalc(calc); setReportType("cost"); }}>
                      <Eye className="h-3 w-3" /> {t("reports.cost")}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setSelectedCalc(calc); setReportType("executive"); }}>
                      <Eye className="h-3 w-3" /> {t("reports.executive")}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleDownloadPdf(calc, "full")}>
                      <Download className="h-3 w-3" /> PDF
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive ml-auto" onClick={() => handleDelete(calc.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReportView({ calc, type, onBack, onDownload }: { calc: SavedCalculation; type: "full" | "cost" | "executive"; onBack: () => void; onDownload: () => void }) {
  const isProfit = calc.financial.financialResult >= 0;
  const titles = {
    full: "Отчёт по экономической эффективности рейса",
    cost: "Отчёт по себестоимости рейса",
    executive: "Сводный отчёт для руководства",
  };
  const { ticketRevenue, totalRevenue } = calcRevenue(calc.revenue);

  const totalExpenses = calc.results.total;

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-3">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Назад
        </Button>
        <h2 className="text-sm font-semibold flex-1">{titles[type]}</h2>
        <Button size="sm" onClick={onDownload} className="gap-1">
          <Download className="h-4 w-4" /> Скачать PDF
        </Button>
      </div>

      {/* ===== COMMON: Basic Info ===== */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Общая информация</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`grid gap-x-6 gap-y-1 text-sm ${type === "executive" ? "grid-cols-2" : "grid-cols-2"}`}>
            <div className="flex justify-between"><span className="text-muted-foreground">Поезд</span><span className="font-medium">{calc.trainNumber}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Маршрут</span><span className="font-medium">{calc.trainRoute}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Время в пути</span><span className="font-medium">{calc.trainInfo.duration}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Расстояние</span><span className="font-medium">{calc.trainInfo.distanceKm} км</span></div>
            {type !== "executive" && (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">Вагонов</span><span className="font-medium">{calc.productionMetrics.totalWagons}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Мест</span><span className="font-medium">{calc.productionMetrics.totalSeats}</span></div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ===== FULL / EXECUTIVE: Revenue ===== */}
      {(type === "full" || type === "executive") && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{type === "executive" ? "Ключевые показатели" : "Доходы"}</CardTitle>
          </CardHeader>
          <CardContent>
            {type === "executive" ? (
              /* Executive: KPI dashboard */
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded bg-muted/50 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Доходы</p>
                  <p className="text-sm font-bold text-success">{calc.financial.totalRevenue.toLocaleString("ru-RU")} тг</p>
                </div>
                <div className="rounded bg-muted/50 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Расходы</p>
                  <p className="text-sm font-bold text-destructive">{calc.financial.totalExpenses.toLocaleString("ru-RU")} тг</p>
                </div>
                <div className={`rounded p-3 text-center ${isProfit ? "bg-green-50" : "bg-red-50"}`}>
                  <p className="text-[10px] text-muted-foreground uppercase">{isProfit ? "Прибыль" : "Убыток"}</p>
                  <p className={`text-sm font-bold ${isProfit ? "text-green-700" : "text-red-700"}`}>
                    {calc.financial.financialResult.toLocaleString("ru-RU")} тг
                  </p>
                </div>
                <div className="rounded bg-muted/50 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Рентабельность</p>
                  <p className="text-sm font-bold">{calc.financial.profitMargin.toFixed(1)}%</p>
                </div>
              </div>
            ) : (
              /* Full: detailed revenue */
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Доход от билетов</span>
                  <span className="font-mono">{ticketRevenue.toLocaleString("ru-RU")} тг</span>
                </div>
                {calc.revenue.subsidy > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Субсидии</span>
                    <span className="font-mono">{calc.revenue.subsidy.toLocaleString("ru-RU")} тг</span>
                  </div>
                )}
                <div className="border-t pt-1.5 flex justify-between font-semibold">
                  <span>Итого доходы</span>
                  <span className="text-success">{totalRevenue.toLocaleString("ru-RU")} тг</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== FULL / COST: Expense details ===== */}
      {type !== "executive" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {type === "cost" ? "Структура себестоимости" : "Расходы"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 text-sm">
              {Object.entries(calc.results.byGroup).map(([group, amount]) => {
                const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
                return (
                  <div key={group} className="flex justify-between items-center">
                    <span className="text-muted-foreground">{group}</span>
                    <div className="flex items-center gap-3">
                      {type === "cost" && (
                        <span className="text-[10px] text-muted-foreground w-10 text-right">{pct.toFixed(1)}%</span>
                      )}
                      <span className="font-mono w-28 text-right">{amount.toLocaleString("ru-RU")} тг</span>
                    </div>
                  </div>
                );
              })}
              <div className="border-t pt-1.5 flex justify-between font-semibold">
                <span>Итого расходы</span>
                <span className="text-destructive">{calc.results.total.toLocaleString("ru-RU")} тг</span>
              </div>
            </div>

            {/* COST: Unit economics */}
            {type === "cost" && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                <div className="rounded bg-muted/50 p-2.5 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">На вагон</p>
                  <p className="text-sm font-bold">{Math.round(calc.results.costPerWagon).toLocaleString("ru-RU")} тг</p>
                </div>
                <div className="rounded bg-muted/50 p-2.5 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">На пассажира</p>
                  <p className="text-sm font-bold">{Math.round(calc.results.costPerPassenger).toLocaleString("ru-RU")} тг</p>
                </div>
                <div className="rounded bg-muted/50 p-2.5 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">На 1 км</p>
                  <p className="text-sm font-bold">
                    {Math.round(calc.results.total / (calc.trainInfo.distanceKm || 1)).toLocaleString("ru-RU")} тг
                  </p>
                </div>
                <div className="rounded bg-muted/50 p-2.5 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">На 1 рейс</p>
                  <p className="text-sm font-bold">
                    {Math.round(calc.results.total / (calc.expenses.find(e => e.id === "mzs")?.quantity || 1)).toLocaleString("ru-RU")} тг
                  </p>
                </div>
              </div>
            )}

            {/* COST: Norm comparison */}
            {type === "cost" && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs font-semibold mb-2">Сравнение с нормативами</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Расход на вагон (факт)</span>
                    <span className="font-mono">{Math.round(calc.results.costPerWagon).toLocaleString("ru-RU")} тг</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Расход на вагон (норматив)</span>
                    <span className="font-mono">500 000 тг</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-muted-foreground">Отклонение</span>
                    <span className={calc.results.costPerWagon > 500000 ? "text-destructive" : "text-success"}>
                      {((calc.results.costPerWagon - 500000) / 500000 * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== FULL: Analytics ===== */}
      {type === "full" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Аналитика</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Рентабельность</span>
                <span className="font-mono">{calc.financial.profitMargin.toFixed(1)} %</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Расход на 1 вагон</span>
                <span className="font-mono">{Math.round(calc.results.costPerWagon).toLocaleString("ru-RU")} тг</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Расход на 1 пассажира</span>
                <span className="font-mono">{Math.round(calc.results.costPerPassenger).toLocaleString("ru-RU")} тг</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Доход на 1 пассажира</span>
                <span className="font-mono">{Math.round(calc.financial.totalRevenue / (calc.revenue.passengers || 1)).toLocaleString("ru-RU")} тг</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Пробег</span>
                <span className="font-mono">{calc.productionMetrics.mileageThousKm.toFixed(1)} тыс. ваг-км</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Пассажирооборот</span>
                <span className="font-mono">{calc.productionMetrics.passengerTurnover.toFixed(1)} тыс. пасс-км</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Вместимость</span>
                <span className="font-mono">{calc.productionMetrics.occupancyPercent} %</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== FULL / EXECUTIVE: Financial summary card ===== */}
      <Card className={`border-2 ${isProfit ? "border-success/40" : "border-destructive/40"}`}>
        <CardContent className="p-4">
          {type === "executive" ? (
            /* Executive: compact summary with trend indicator */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{calc.trainRoute}</p>
                  <p className="text-xs text-muted-foreground">Поезд {calc.trainNumber} · {calc.productionMetrics.totalWagons} вагонов · {calc.productionMetrics.occupancyPercent}% загрузка</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${isProfit ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {isProfit ? "Прибыльный" : "Убыточный"}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Доходы</p>
                  <p className="text-base font-bold text-success">{calc.financial.totalRevenue.toLocaleString("ru-RU")} тг</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Расходы</p>
                  <p className="text-base font-bold text-destructive">{calc.financial.totalExpenses.toLocaleString("ru-RU")} тг</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">{isProfit ? "Прибыль" : "Убыток"}</p>
                  <p className={`text-base font-bold ${isProfit ? "text-success" : "text-destructive"}`}>
                    {calc.financial.financialResult.toLocaleString("ru-RU")} тг
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isProfit ? "bg-green-500" : "bg-red-500"}`}
                    style={{ width: `${Math.min(Math.abs(calc.financial.profitMargin) * 2, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-medium">{calc.financial.profitMargin.toFixed(1)}%</span>
              </div>
            </div>
          ) : (
            /* Full: standard summary */
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Доходы</p>
                <p className="text-base font-bold text-success">{calc.financial.totalRevenue.toLocaleString("ru-RU")} тг</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Расходы</p>
                <p className="text-base font-bold text-destructive">{calc.financial.totalExpenses.toLocaleString("ru-RU")} тг</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">{isProfit ? "Прибыль" : "Убыток"}</p>
                <p className={`text-base font-bold ${isProfit ? "text-success" : "text-destructive"}`}>
                  {calc.financial.financialResult.toLocaleString("ru-RU")} тг
                </p>
              </div>
            </div>
          )}
          <p className="text-center text-xs text-muted-foreground mt-2">
            Рентабельность: {calc.financial.profitMargin.toFixed(1)}%
          </p>
        </CardContent>
      </Card>

      {/* ===== FULL: Approval section ===== */}
      {type === "full" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Статус утверждения</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                calc.status === "approved" ? "bg-green-100 text-green-700" :
                calc.status === "rejected" ? "bg-red-100 text-red-700" :
                "bg-yellow-100 text-yellow-700"
              }`}>
                {calc.status === "approved" ? "УТВЕРЖДЁН" : calc.status === "rejected" ? "ОТКЛОНЁН" : "НА УТВЕРЖДЕНИИ"}
              </span>
              {calc.anomalyExplanation && (
                <span className="text-xs text-muted-foreground">{calc.anomalyExplanation}</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
