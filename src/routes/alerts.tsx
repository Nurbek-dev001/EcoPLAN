import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, AlertTriangle, Info, AlertCircle } from "lucide-react";
import { loadAlerts, markAlertRead, dismissAlert, generateAlertsFromCalculations, type AlertItem, type AlertSeverity } from "@/lib/alerts/alert-store";
import { loadCalculations } from "@/lib/train-data";
import { useTranslation } from "react-i18next";

const severityConfig: Record<AlertSeverity, { icon: typeof AlertTriangle; color: string; labelKey: string }> = {
  critical: { icon: AlertCircle, color: "bg-red-50 text-red-700 border-red-200", labelKey: "alerts.critical" },
  warning: { icon: AlertTriangle, color: "bg-amber-50 text-amber-700 border-amber-200", labelKey: "alerts.warning" },
  info: { icon: Info, color: "bg-blue-50 text-blue-700 border-blue-200", labelKey: "alerts.info" },
};

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Уведомления — EcoPlan Hub" },
      { name: "description", content: "Умные уведомления и аномалии" },
    ],
  }),
  component: AlertsGuard,
});

function AlertsGuard() {
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
            <h1 className="text-sm font-semibold">Уведомления</h1>
          </header>
          <main className="flex-1 overflow-auto bg-muted/30">
            <AlertsPage />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AlertsPage() {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [filter, setFilter] = useState<"all" | AlertSeverity>("all");

  useEffect(() => {
    const calcs = loadCalculations();
    const generated = generateAlertsFromCalculations(calcs);
    const stored = loadAlerts();
    // Merge generated with stored, avoiding duplicates by id
    const mergedMap = new Map<string, AlertItem>();
    for (const a of stored) mergedMap.set(a.id, a);
    for (const a of generated) {
      if (!mergedMap.has(a.id)) mergedMap.set(a.id, a);
    }
    const merged = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    setAlerts(merged);
  }, []);

  const filtered = alerts.filter((a) => (filter === "all" ? true : a.severity === filter));
  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-semibold">{t("alerts.title")}</h2>
          <p className="text-xs text-muted-foreground">
            Непрочитанных: {unreadCount}
          </p>
        </div>
        <div className="flex gap-2">
          {(["all", "critical", "warning", "info"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs rounded border px-3 py-1.5 transition-colors ${filter === f ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent"}`}
            >
              {f === "all" ? t("common.all") : t(`alerts.${f}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              {t("alerts.title")} — {t("common.all")} обработаны
            </CardContent>
          </Card>
        )}
        {filtered.map((alert) => {
          const cfg = severityConfig[alert.severity];
          const Icon = cfg.icon;
          return (
            <Card key={alert.id} className={`border-l-4 ${alert.severity === "critical" ? "border-l-red-500" : alert.severity === "warning" ? "border-l-amber-500" : "border-l-blue-500"}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`rounded-full p-2 shrink-0 ${cfg.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{alert.title}</span>
                      <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>
                        {t(cfg.labelKey)}
                      </Badge>
                      {!alert.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {new Date(alert.timestamp).toLocaleString("ru-RU")}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    {!alert.read && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { markAlertRead(alert.id); setAlerts(loadAlerts()); }}>
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => { dismissAlert(alert.id); setAlerts(loadAlerts()); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
