import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Train, Globe } from "lucide-react";
import { toast } from "sonner";
import { saveCustomTrain, type TrainInfo } from "@/lib/train-data";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

interface StationInput {
  name: string;
  arrival: string;
  departure: string;
  stop: string;
}

export function CreateRouteDialog({ onCreated }: { onCreated?: () => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [searchNumber, setSearchNumber] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<TrainInfo | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Manual form state
  const [number, setNumber] = useState("");
  const [route, setRoute] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [duration, setDuration] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [trainType, setTrainType] = useState<"talgo" | "standard">("standard");
  const [routeType, setRouteType] = useState<"social" | "commercial" | "international">("commercial");
  const [stations, setStations] = useState<StationInput[]>([
    { name: "", arrival: "—", departure: "", stop: "—" },
    { name: "", arrival: "", departure: "—", stop: "—" },
  ]);

  const resetForm = () => {
    setSearchNumber("");
    setSearchResult(null);
    setNotFound(false);
    setNumber("");
    setRoute("");
    setFrom("");
    setTo("");
    setDuration("");
    setDistanceKm("");
    setTrainType("standard");
    setRouteType("commercial");
    setStations([
      { name: "", arrival: "—", departure: "", stop: "—" },
      { name: "", arrival: "", departure: "—", stop: "—" },
    ]);
  };

  const handleSearch = async () => {
    if (!searchNumber.trim()) return;
    setSearching(true);
    setSearchResult(null);
    setNotFound(false);

    try {
      // Try backend first
      const res = await fetch(`${API_BASE}/api/tablo/search/${searchNumber.trim()}`);
      if (res.ok) {
        const data = await res.json();
        const train: TrainInfo = {
          number: data.number,
          route: data.route,
          from: data.from_station,
          to: data.to_station,
          duration: `${data.duration_hours}ч`,
          durationHours: data.duration_hours,
          nightHours: 0,
          distanceKm: data.distance_km,
          distanceTotal: data.distance_km,
          trainType: "standard",
          isSocial: false,
          isInternational: false,
          electrifiedSegments: [{ from: data.from_station, to: data.to_station, isElectrified: true, distanceKm: data.distance_km, isInKz: true }],
          stations: data.schedule_data?.stations || [{ name: data.from_station, arrival: "—", departure: "—", stop: "—" }, { name: data.to_station, arrival: "—", departure: "—", stop: "—" }],
        };
        setSearchResult(train);
        toast.success("Поезд найден", { description: `${train.number} — ${train.route}` });
      } else {
        // Fallback: check local custom trains + demo trains
        const { getAllAvailableTrains } = await import("@/lib/train-data");
        const all = getAllAvailableTrains();
        const q = searchNumber.trim().toLowerCase();
        const found = all.find(
          (t) =>
            t.number.toLowerCase() === q ||
            t.number.toLowerCase() === q.replace(/^0+/, "") ||
            q === t.number.padStart(3, "0")
        );
        if (found) {
          setSearchResult(found);
          toast.success("Поезд найден (локально)", { description: `${found.number} — ${found.route}` });
        } else {
          setNotFound(true);
          toast.info("Поезд не найден", { description: "Заполните данные вручную" });
        }
      }
    } catch {
      setNotFound(true);
      toast.error("Ошибка поиска", { description: "Проверьте соединение с сервером" });
    } finally {
      setSearching(false);
    }
  };

  const handleSaveSearchResult = () => {
    if (!searchResult) return;
    saveCustomTrain(searchResult);
    toast.success("Маршрут сохранён", { description: `${searchResult.number} — ${searchResult.route}` });
    setOpen(false);
    resetForm();
    onCreated?.();
  };

  const handleSaveManual = () => {
    if (!number.trim() || !route.trim() || !from.trim() || !to.trim()) {
      toast.error("Заполните обязательные поля", { description: "Номер, маршрут, откуда, куда" });
      return;
    }

    const validStations = stations.filter((s) => s.name.trim());
    if (validStations.length < 2) {
      toast.error("Добавьте минимум 2 станции");
      return;
    }

    const dist = parseFloat(distanceKm) || 0;
    const durHours = parseFloat(duration) || 0;

    const train: TrainInfo = {
      number: number.trim(),
      route: route.trim(),
      from: from.trim(),
      to: to.trim(),
      duration: duration.includes("ч") ? duration : `${duration}ч`,
      durationHours: durHours,
      nightHours: 0,
      distanceKm: dist,
      distanceTotal: dist,
      trainType,
      isSocial: routeType === "social",
      isInternational: routeType === "international",
      electrifiedSegments: [{ from: from.trim(), to: to.trim(), isElectrified: true, distanceKm: dist, isInKz: true }],
      stations: validStations.map((s, i) => ({
        name: s.name.trim(),
        arrival: s.arrival.trim() || (i === 0 ? "—" : ""),
        departure: s.departure.trim() || (i === validStations.length - 1 ? "—" : ""),
        stop: s.stop.trim() || "—",
      })),
    };

    saveCustomTrain(train);
    toast.success("Маршрут создан", { description: `${train.number} — ${train.route}` });
    setOpen(false);
    resetForm();
    onCreated?.();
  };

  const updateStation = (idx: number, field: keyof StationInput, value: string) => {
    setStations((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const addStation = () => {
    setStations((prev) => [...prev, { name: "", arrival: "", departure: "", stop: "" }]);
  };

  const removeStation = (idx: number) => {
    setStations((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
          <Plus className="h-3 w-3" /> Создать маршрут
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">{t("route.create")}</DialogTitle>
          <DialogDescription className="text-xs">
            {t("route.search")} — {t("route.manual")}
          </DialogDescription>
        </DialogHeader>

        {/* Search section */}
        <div className="space-y-2">
          <Label className="text-xs">{t("route.search")}</Label>
          <div className="flex gap-2">
            <Input
              placeholder={t("route.searchPlaceholder")}
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              className="h-8 text-xs"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button size="sm" className="h-8 gap-1" onClick={handleSearch} disabled={searching}>
              <Search className="h-3 w-3" /> {searching ? "..." : t("route.searchBtn")}
            </Button>
          </div>

          {searchResult && (
            <div className="rounded border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Train className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{searchResult.number} — {searchResult.route}</span>
              </div>
              <p className="text-xs text-muted-foreground">{searchResult.from} → {searchResult.to} · {searchResult.distanceKm} км</p>
              <Button size="sm" className="w-full h-7 text-xs" onClick={handleSaveSearchResult}>
                <Plus className="h-3 w-3 mr-1" /> {t("route.save")}
              </Button>
            </div>
          )}

          {notFound && (
            <div className="rounded border border-dashed p-3 text-center">
              <p className="text-xs text-muted-foreground">{t("route.notFound")}</p>
              <p className="text-[10px] text-muted-foreground">{t("route.manual")}</p>
            </div>
          )}
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">{t("route.manual")}</span>
          </div>
        </div>

        {/* Manual form */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">{t("route.number")} *</Label>
              <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="001" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("route.trainType")}</Label>
              <Select value={trainType} onValueChange={(v) => setTrainType(v as "talgo" | "standard")}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">{t("route.standard")}</SelectItem>
                  <SelectItem value="talgo">{t("route.talgo")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{t("route.routeName")} *</Label>
            <Input value={route} onChange={(e) => setRoute(e.target.value)} placeholder="Алматы — Астана" className="h-8 text-xs" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">{t("route.from")} *</Label>
              <Input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Алматы-2" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("route.to")} *</Label>
              <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Нурлы жол" className="h-8 text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">{t("route.duration")}</Label>
              <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="10.5" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("route.distance")}</Label>
              <Input value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} placeholder="970" className="h-8 text-xs" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{t("route.routeType")}</Label>
            <Select value={routeType} onValueChange={(v) => setRouteType(v as "social" | "commercial" | "international")}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="commercial">{t("route.commercial")}</SelectItem>
                <SelectItem value="social">{t("route.social")}</SelectItem>
                <SelectItem value="international">{t("route.international")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t("route.stations")}</Label>
              <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={addStation}>
                <Plus className="h-3 w-3 mr-1" /> {t("route.addStation")}
              </Button>
            </div>
            <div className="space-y-1.5">
              {stations.map((s, i) => (
                <div key={i} className="grid grid-cols-12 gap-1 items-center">
                  <span className="col-span-1 text-[10px] text-muted-foreground text-center">{i + 1}</span>
                  <Input
                    placeholder="Станция"
                    value={s.name}
                    onChange={(e) => updateStation(i, "name", e.target.value)}
                    className="col-span-4 h-7 text-xs"
                  />
                  <Input
                    placeholder="Прибытие"
                    value={s.arrival}
                    onChange={(e) => updateStation(i, "arrival", e.target.value)}
                    className="col-span-3 h-7 text-xs"
                  />
                  <Input
                    placeholder="Отправление"
                    value={s.departure}
                    onChange={(e) => updateStation(i, "departure", e.target.value)}
                    className="col-span-3 h-7 text-xs"
                  />
                  {stations.length > 2 && (
                    <Button size="sm" variant="ghost" className="col-span-1 h-7 w-7 p-0" onClick={() => removeStation(i)}>
                      <span className="text-destructive text-xs">×</span>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setOpen(false)}>
            {t("route.cancel")}
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1" onClick={handleSaveManual}>
            <Globe className="h-3 w-3" /> {t("route.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
