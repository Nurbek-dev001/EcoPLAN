import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RevenueData } from "@/lib/train-data";
import { calcRevenue } from "@/lib/train-data";

interface RevenueBlockProps {
  revenue: RevenueData;
  onRevenueChange: (field: keyof RevenueData, value: number) => void;
  disabled?: boolean;
}

export function RevenueBlock({ revenue, onRevenueChange, disabled }: RevenueBlockProps) {
  const { ticketRevenue, totalRevenue } = calcRevenue(revenue);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm font-semibold uppercase tracking-wide">
          Доходы
          <span className="font-mono text-success text-base normal-case">
            {totalRevenue.toLocaleString("ru-RU")} тг
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Стоимость билета, тг</Label>
            <Input
              type="number" value={revenue.ticketPrice}
              onChange={(e) => onRevenueChange("ticketPrice", parseFloat(e.target.value) || 0)}
              className="h-9 text-sm mt-1" disabled={disabled}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Кол-во пассажиров</Label>
            <Input
              type="number" value={revenue.passengers}
              onChange={(e) => onRevenueChange("passengers", parseFloat(e.target.value) || 0)}
              className="h-9 text-sm mt-1" disabled={disabled}
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Субсидии, тг</Label>
          <Input
            type="number" value={revenue.subsidy}
            onChange={(e) => onRevenueChange("subsidy", parseFloat(e.target.value) || 0)}
            className="h-9 text-sm mt-1" disabled={disabled}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
          <div className="rounded bg-muted/60 p-2.5 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Билеты</p>
            <p className="text-sm font-semibold">{ticketRevenue.toLocaleString("ru-RU")} тг</p>
          </div>
          <div className="rounded bg-muted/60 p-2.5 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Субсидии</p>
            <p className="text-sm font-semibold">{revenue.subsidy.toLocaleString("ru-RU")} тг</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
