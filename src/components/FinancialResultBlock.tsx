import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FinancialSummary } from "@/lib/train-data";

interface FinancialResultBlockProps {
  summary: FinancialSummary;
}

export function FinancialResultBlock({ summary }: FinancialResultBlockProps) {
  const isProfit = summary.financialResult >= 0;

  return (
    <Card className={`border-2 ${isProfit ? "border-success/40" : "border-destructive/40"}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide">
          Финансовый результат
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded bg-muted/60 p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Доходы</p>
            <p className="text-lg font-bold text-success">{summary.totalRevenue.toLocaleString("ru-RU")} тг</p>
          </div>
          <div className="rounded bg-muted/60 p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Расходы</p>
            <p className="text-lg font-bold text-destructive">{summary.totalExpenses.toLocaleString("ru-RU")} тг</p>
          </div>
          <div className={`rounded p-3 text-center ${isProfit ? "bg-success/10" : "bg-destructive/10"}`}>
            <p className="text-[10px] text-muted-foreground uppercase">{isProfit ? "Прибыль" : "Убыток"}</p>
            <p className={`text-lg font-bold ${isProfit ? "text-success" : "text-destructive"}`}>
              {summary.financialResult.toLocaleString("ru-RU")} тг
            </p>
          </div>
        </div>
        <div className="text-center text-xs text-muted-foreground">
          Рентабельность: <span className="font-semibold text-foreground">{summary.profitMargin.toFixed(1)}%</span>
        </div>
      </CardContent>
    </Card>
  );
}
