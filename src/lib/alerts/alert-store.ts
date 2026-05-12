export type AlertSeverity = "critical" | "warning" | "info";

export interface AlertItem {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  entityType: "calculation" | "expense" | "train" | "system";
  entityId?: string;
  read: boolean;
  timestamp: string;
}

const STORAGE_KEY = "ecoplan_alerts";

export function loadAlerts(): AlertItem[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : generateDemoAlerts();
  } catch {
    return generateDemoAlerts();
  }
}

export function saveAlerts(alerts: AlertItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
}

export function markAlertRead(id: string): void {
  const alerts = loadAlerts();
  const updated = alerts.map((a) => (a.id === id ? { ...a, read: true } : a));
  saveAlerts(updated);
}

export function dismissAlert(id: string): void {
  const alerts = loadAlerts().filter((a) => a.id !== id);
  saveAlerts(alerts);
}

export function addAlert(alert: Omit<AlertItem, "id" | "timestamp" | "read">): AlertItem {
  const newAlert: AlertItem = {
    ...alert,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    read: false,
  };
  const alerts = [newAlert, ...loadAlerts()].slice(0, 100);
  saveAlerts(alerts);
  return newAlert;
}

export function generateAlertsFromCalculations(calcs: import("@/lib/train-data").SavedCalculation[]): AlertItem[] {
  const alerts: AlertItem[] = [];
  for (const calc of calcs) {
    if (calc.financial.financialResult < 0) {
      alerts.push({
        id: `loss-${calc.id}`,
        title: `Поезд ${calc.trainNumber} — убыток`,
        message: `Финансовый результат: ${Math.round(calc.financial.financialResult).toLocaleString("ru-RU")} тг. Требуется анализ.`,
        severity: "warning",
        entityType: "train",
        entityId: calc.id,
        read: false,
        timestamp: calc.date,
      });
    }
    for (const anomaly of calc.results.anomalies || []) {
      alerts.push({
        id: `anom-${calc.id}-${anomaly.message.slice(0, 20)}`,
        title: `Аномалия: ${calc.trainNumber}`,
        message: anomaly.message,
        severity: anomaly.type === "critical" ? "critical" : "warning",
        entityType: "calculation",
        entityId: calc.id,
        read: false,
        timestamp: calc.date,
      });
    }
  }
  return alerts.slice(0, 20);
}

function generateDemoAlerts(): AlertItem[] {
  return [
    {
      id: "demo-1",
      title: "Расходы на ФОТ превысили план",
      message: "Расходы на ФОТ превысили план на 12% — требуется объяснение",
      severity: "critical",
      entityType: "expense",
      read: false,
      timestamp: new Date().toISOString(),
    },
    {
      id: "demo-2",
      title: "Поезд 083 — убыточность",
      message: "Поезд 083 3 дня подряд работает с убытком",
      severity: "warning",
      entityType: "train",
      read: false,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "demo-3",
      title: "Дезинфекция — отклонение",
      message: "Отклонение Санобработка: 15.2% (требуется пояснение)",
      severity: "info",
      entityType: "calculation",
      read: true,
      timestamp: new Date(Date.now() - 7200000).toISOString(),
    },
  ];
}
