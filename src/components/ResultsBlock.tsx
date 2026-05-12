import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { CalculationResult } from "@/lib/train-data";

interface ResultsBlockProps {
  results: CalculationResult;
  wagons: number;
  passengers: number;
  explanation: string;
  onExplanationChange: (value: string) => void;
}

export function ResultsBlock({ results, explanation, onExplanationChange }: ResultsBlockProps) {
  const maxVal = Math.max(...Object.values(results.byGroup), 1);
  const requiresExplanation = results.anomalies.some((a) => a.requiresExplanation);

  return (
    <div className="space-y-3">
      {/* Критические аномалии и исключения */}
      {(results.anomalies.length > 0 || results.exceptions?.length > 0) && (
        <Alert variant={results.anomalies.some((a) => a.type === "critical") ? "destructive" : "default"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1.5">
              {results.anomalies.map((a, i) => (
                <div key={`anom-${i}`} className="text-xs">
                  <span className="font-semibold">{a.message}</span>
                  {a.requiresExplanation && (
                    <span className="block text-[11px] text-muted-foreground mt-0.5">
                      ⚠ Обязательно укажите текстовое обоснование перед отправкой
                    </span>
                  )}
                </div>
              ))}
              {results.exceptions?.map((e, i) => (
                <div key={`exc-${i}`} className="text-xs text-destructive">
                  {e.message}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Обоснование при аномалии */}
      {requiresExplanation && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-destructive">
              Обоснование перерасхода
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Укажите причину превышения плана более чем на 10%..."
              value={explanation}
              onChange={(e) => onExplanationChange(e.target.value)}
              className="min-h-[80px] text-sm"
            />
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Без заполнения этого поля отправка расчёта заблокирована.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Расходы по категориям */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide">Расходы по категориям</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(results.byGroup).map(([group, amount]) => (
            <div key={group}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium">{group}</span>
                <span className="font-mono text-sm font-bold">{amount.toLocaleString("ru-RU")} тг</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${(amount / maxVal) * 100}%` }}
                />
              </div>
            </div>
          ))}

          <div className="grid grid-cols-3 gap-2 pt-3 border-t">
            <div className="rounded bg-muted/60 p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Итого</p>
              <p className="text-sm font-bold">{results.total.toLocaleString("ru-RU")} тг</p>
            </div>
            <div className="rounded bg-muted/60 p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">На вагон</p>
              <p className="text-sm font-bold">{Math.round(results.costPerWagon).toLocaleString("ru-RU")} тг</p>
            </div>
            <div className="rounded bg-muted/60 p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">На пасс.</p>
              <p className="text-sm font-bold">{Math.round(results.costPerPassenger).toLocaleString("ru-RU")} тг</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* План-Фактный анализ */}
      {results.planVsFact && results.planVsFact.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide">План-Фактный анализ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {results.planVsFact.map((item) => {
              const isOver = item.deviation > 0;
              const isUnder = item.deviation < 0;
              const deviationPercent = item.deviationPercent ? (item.deviationPercent * 100).toFixed(1) : "0.0";
              const isAnomaly = item.deviationPercent > 0.1;

              return (
                <div key={item.group} className={`text-xs border rounded p-2 ${isAnomaly ? "bg-red-50 border-red-200" : ""}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{item.group}</span>
                    <div className="flex items-center gap-1">
                      {isOver && <TrendingUp className="h-3 w-3 text-red-500" />}
                      {isUnder && <TrendingDown className="h-3 w-3 text-green-600" />}
                      {!isOver && !isUnder && <Minus className="h-3 w-3 text-slate-400" />}
                      <span className={`font-mono font-semibold ${isAnomaly ? "text-red-600" : isOver ? "text-red-600" : isUnder ? "text-green-600" : ""}`}>
                        {isOver ? "+" : ""}{item.deviation.toLocaleString("ru-RU")} ({deviationPercent}%)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>План: {item.plan.toLocaleString("ru-RU")} тг</span>
                    <span>Факт: {item.fact.toLocaleString("ru-RU")} тг</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
