import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RouteType, TrainType } from "@/lib/train-data";

interface TrainParamsProps {
  wagons: number;
  passengers: number;
  routeType: RouteType;
  trainType: TrainType;
  rollingStockMode: "rent" | "depreciation";
  monthlyRides: number;
  onWagonsChange: (v: number) => void;
  onPassengersChange: (v: number) => void;
  onRouteTypeChange: (v: RouteType) => void;
  onTrainTypeChange: (v: TrainType) => void;
  onRollingStockModeChange: (v: "rent" | "depreciation") => void;
  onMonthlyRidesChange: (v: number) => void;
  disabled?: boolean;
}

export function TrainParams({
  wagons, passengers, routeType, trainType, rollingStockMode, monthlyRides,
  onWagonsChange, onPassengersChange, onRouteTypeChange, onTrainTypeChange, onRollingStockModeChange, onMonthlyRidesChange,
  disabled,
}: TrainParamsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm font-semibold uppercase tracking-wide">
          Параметры
          <span className="text-xs font-normal normal-case text-muted-foreground">
            {wagons} ваг. / {passengers} пасс.
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Вагонов</Label>
            <Input
              type="number"
              min={0}
              value={wagons}
              onChange={(e) => onWagonsChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="h-9 text-sm"
              disabled={disabled}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Пассажиров</Label>
            <Input
              type="number"
              min={0}
              value={passengers}
              onChange={(e) => onPassengersChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="h-9 text-sm"
              disabled={disabled}
            />
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Рейсов в месяц</Label>
          <Input
            type="number"
            min={1}
            max={62}
            value={monthlyRides}
            onChange={(e) => onMonthlyRidesChange(Math.max(1, Math.min(62, parseInt(e.target.value, 10) || 30)))}
            className="h-9 text-sm"
            disabled={disabled}
          />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Тип маршрута</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["social", "commercial"] as const).map((type) => (
              <button key={type} onClick={() => onRouteTypeChange(type)} disabled={disabled}
                className={`h-9 rounded border text-xs font-medium transition-all ${
                  routeType === type
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/30"
                }`}
              >
                {type === "social" ? "Социальный" : "Коммерческий"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Тип поезда</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["standard", "talgo"] as const).map((type) => (
              <button key={type} onClick={() => onTrainTypeChange(type)} disabled={disabled}
                className={`h-9 rounded border text-xs font-medium transition-all ${
                  trainType === type
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/30"
                }`}
              >
                {type === "standard" ? "Стандарт" : "Тальго (x1.3)"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Подвижной состав</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["rent", "depreciation"] as const).map((mode) => (
              <button key={mode} onClick={() => onRollingStockModeChange(mode)} disabled={disabled}
                className={`h-9 rounded border text-xs font-medium transition-all ${
                  rollingStockMode === mode
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/30"
                }`}
              >
                {mode === "rent" ? "Аренда" : "Амортизация"}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
