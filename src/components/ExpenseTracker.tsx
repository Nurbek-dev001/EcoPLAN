import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import type { ExpenseItem, Anomaly } from "@/lib/train-data";

interface ExpenseTrackerProps {
  expenses: ExpenseItem[];
  onExpenseChange: (id: string, field: keyof ExpenseItem, value: unknown) => void;
  disabled?: boolean;
  anomalies?: Anomaly[];
  exceptions?: any[];
}

export function ExpenseTracker({ expenses, onExpenseChange, disabled, anomalies = [], exceptions = [] }: ExpenseTrackerProps) {
  const groups = [...new Set(expenses.map((e) => e.group))];
  const grandTotal = expenses.reduce((s, e) => s + (e.enabled ? e.tariff * e.quantity : 0), 0);

  // Фильтруем критические ошибки
  const criticalErrors = exceptions.filter((e) => e.severity === "error");
  const warnings = anomalies.filter((a) => a.type === "warning");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm font-semibold uppercase tracking-wide">
          Расходы
          <span className="font-mono text-destructive text-base normal-case">
            {grandTotal.toLocaleString("ru-RU")} тг
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Критические ошибки */}
        {criticalErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold">Критические ошибки:</div>
              {criticalErrors.map((error, idx) => (
                <div key={idx} className="text-sm mt-1">
                  {error.message}
                </div>
              ))}
            </AlertDescription>
          </Alert>
        )}

        {/* Предупреждения об аномалиях */}
        {warnings.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold">Обнаружены аномалии:</div>
              {warnings.map((warning, idx) => (
                <div key={idx} className="text-sm mt-1">
                  {warning.message}
                  {warning.requiresExplanation && <span className="text-xs text-orange-600"> (требуется пояснение)</span>}
                </div>
              ))}
            </AlertDescription>
          </Alert>
        )}

        {/* Таблица расходов */}
        {groups.map((group) => {
          const items = expenses.filter((e) => e.group === group);
          const groupTotal = items.reduce((sum, e) => sum + (e.enabled ? e.tariff * e.quantity : 0), 0);
          const groupAnomalies = anomalies.filter((a) => a.group === group);

          return (
            <div key={group} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{group}</p>
                <span className="text-xs font-mono text-muted-foreground">{groupTotal.toLocaleString("ru-RU")} тг</span>
              </div>

              {/* Предупреждения по группам */}
              {groupAnomalies.length > 0 && (
                <div className="text-xs text-amber-600 ml-2">
                  {groupAnomalies.map((a, idx) => (
                    <div key={idx}>{a.message}</div>
                  ))}
                </div>
              )}

              {items.map((exp) => (
                <div
                  key={exp.id}
                  className={`rounded border p-2.5 flex items-center gap-2.5 transition-opacity ${
                    !exp.enabled ? "opacity-40" : ""
                  }`}
                >
                  <Checkbox
                    checked={exp.enabled}
                    onCheckedChange={(v) => onExpenseChange(exp.id, "enabled", !!v)}
                    disabled={disabled}
                  />
                  <span className="text-sm flex-1 min-w-0 truncate">{exp.label}</span>
                  <Input
                    type="number"
                    value={exp.tariff}
                    onChange={(e) => onExpenseChange(exp.id, "tariff", parseFloat(e.target.value) || 0)}
                    disabled={!exp.enabled || disabled}
                    className="h-7 w-20 text-xs text-right"
                  />
                  <span className="text-[10px] text-muted-foreground">x</span>
                  <Input
                    type="number"
                    value={exp.quantity}
                    onChange={(e) => onExpenseChange(exp.id, "quantity", parseFloat(e.target.value) || 0)}
                    disabled={!exp.enabled || disabled}
                    className="h-7 w-14 text-xs text-right"
                  />
                  <span className="text-[10px] text-muted-foreground w-10">{exp.unit}</span>
                  <span className="text-xs font-mono w-20 text-right">
                    {exp.enabled ? `${(exp.tariff * exp.quantity).toLocaleString("ru-RU")}` : "—"}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
