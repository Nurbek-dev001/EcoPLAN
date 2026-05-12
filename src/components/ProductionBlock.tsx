import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WagonTypeRow, ProductionMetrics } from "@/lib/train-data";

interface ProductionBlockProps {
  wagonTypes: WagonTypeRow[];
  onWagonChange: (id: string, field: keyof WagonTypeRow, value: number) => void;
  metrics: ProductionMetrics;
  occupancy: number;
  onOccupancyChange: (v: number) => void;
  disabled?: boolean;
}

const METRIC_ITEMS: { key: keyof ProductionMetrics; label: string; unit: string; decimals: number }[] = [
  { key: "totalWagons", label: "Вагонов", unit: "шт", decimals: 0 },
  { key: "totalSeats", label: "Мест", unit: "шт", decimals: 0 },
  { key: "mileageThousKm", label: "Пробег", unit: "тыс. ваг-км", decimals: 1 },
  { key: "seatTurnover", label: "Местооборот", unit: "тыс. мест-км", decimals: 1 },
  { key: "passengerTurnover", label: "Пасс. оборот", unit: "тыс. пасс-км", decimals: 1 },
  { key: "avgDistance", label: "Ср. дальность", unit: "км", decimals: 0 },
];

export function ProductionBlock({ wagonTypes, onWagonChange, metrics, occupancy, onOccupancyChange, disabled }: ProductionBlockProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide">
          Производственные показатели
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {wagonTypes.map((w) => (
          <div key={w.id} className="flex items-center gap-3 rounded border p-2.5">
            <span className="text-xs font-semibold w-16 text-muted-foreground">{w.type}</span>
            <div className="flex items-center gap-2 flex-1">
              <div className="flex-1">
                <Label className="text-[10px] text-muted-foreground">Мест</Label>
                <Input type="number" value={w.seats} onChange={(e) => onWagonChange(w.id, "seats", parseInt(e.target.value) || 0)} className="h-8 text-xs" disabled={disabled} />
              </div>
              <div className="flex-1">
                <Label className="text-[10px] text-muted-foreground">Кол-во</Label>
                <Input type="number" value={w.count} onChange={(e) => onWagonChange(w.id, "count", parseInt(e.target.value) || 0)} className="h-8 text-xs" disabled={disabled} />
              </div>
            </div>
          </div>
        ))}

        <div>
          <Label className="text-xs text-muted-foreground">Вместимость, %</Label>
          <Input type="number" min={0} max={100} value={occupancy} onChange={(e) => onOccupancyChange(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))} className="h-9 text-sm mt-1" disabled={disabled} />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {METRIC_ITEMS.map((m) => (
            <div key={m.key} className="rounded bg-muted/50 p-2 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">{m.label}</p>
              <p className="text-sm font-semibold">
                {typeof metrics[m.key] === "number" ? (metrics[m.key] as number).toFixed(m.decimals) : metrics[m.key]}
              </p>
              <p className="text-[9px] text-muted-foreground">{m.unit}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
