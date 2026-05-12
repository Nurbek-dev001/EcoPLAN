const TARIFF_STORAGE_KEY = "ecoplan_tariffs";

import { DEFAULT_TARIFFS, type TariffSettings } from "./train-data";

export function loadTariffs(): TariffSettings {
  if (typeof window === "undefined") return DEFAULT_TARIFFS;
  try {
    const data = localStorage.getItem(TARIFF_STORAGE_KEY);
    return data ? { ...DEFAULT_TARIFFS, ...JSON.parse(data) } : DEFAULT_TARIFFS;
  } catch {
    return DEFAULT_TARIFFS;
  }
}

export function saveTariffs(tariffs: TariffSettings): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(TARIFF_STORAGE_KEY, JSON.stringify(tariffs));
  }
}
