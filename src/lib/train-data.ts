export type TrainType = "talgo" | "standard";
export type RouteType = "social" | "commercial" | "international";
export type UserRole = "manager" | "analyst" | "director" | "checker" | "admin_nsi";

// ===== AUDIT & TEMPORAL SUPPORT =====

export interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  action: "create" | "update" | "approve" | "reject" | "archive";
  entityType: "calculation" | "tariff" | "norm" | "expense";
  entityId: string;
  changes: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  comment?: string;
}

export interface TemporalData<T> {
  value: T;
  validFrom: Date;
  validTo: Date | null;
  version: number;
  archivedAt: Date | null;
}

// ===== MATHEMATICAL KERNEL INTERFACES =====

export interface MathKernelConfig {
  electricTariffPerHour: number; // 184 тг для электровоза
  thermalTariffPerHour: number; // 255 тг для тепловоза
  nightCoefficient: number; // 1.5 from 22:00 to 06:00
  maxLongRideDuration: number; // 50 hours - when staff doubles
  socialRouteDiscount: number; // 99% discount (99% subsidy)
  conductorPerWagon: {
    standard: number;
    talgo: number;
  };
}

export interface StationServiceNorm {
  stationName: string;
  waterNorm: number;
  coalNorm: number;
  dieselNorm: number;
  disinfectionCost: number;
  sanitationCost: number;
  linen: number;
}

export interface ExceptionContext {
  type: "missing_tariff" | "integration_error" | "invalid_input" | "data_validation";
  severity: "warning" | "error";
  message: string;
  recoveryAction?: string;
  timestamp: Date;
}

export interface TrainInfo {
  number: string;
  route: string;
  from: string;
  to: string;
  duration: string;
  durationHours: number;
  nightHours: number;
  distanceKm: number;
  distanceTotal: number;
  trainType?: TrainType;
  isSocial: boolean;
  isInternational: boolean;
  electrifiedSegments: Array<{
    from: string;
    to: string;
    isElectrified: boolean;
    distanceKm: number;
    isInKz: boolean;
  }>;
  stations: { name: string; arrival: string; departure: string; stop: string }[];
}

function calcNightHours(stations: TrainInfo["stations"]): number {
  const dep = stations[0]?.departure;
  const arr = stations[stations.length - 1]?.arrival;
  if (!dep || dep === "—" || !arr || arr === "—") return 0;
  const depH = parseInt(dep.split(":")[0]);
  const arrH = parseInt(arr.split(":")[0]);
  let night = 0;
  const nightStart = 22, nightEnd = 6;
  const totalH = depH > arrH ? (24 - depH + arrH) : (arrH - depH);
  for (let i = 0; i < totalH; i++) {
    const cur = (depH + i) % 24;
    if (cur >= nightStart || cur < nightEnd) night++;
  }
  return night;
}

function calcDuration(stations: TrainInfo["stations"]): { duration: string; durationHours: number } {
  const dep = stations[0]?.departure;
  const arr = stations[stations.length - 1]?.arrival;
  if (!dep || dep === "—" || !arr || arr === "—") return { duration: "—", durationHours: 0 };
  const [dH, dM] = dep.split(":").map(Number);
  const [aH, aM] = arr.split(":").map(Number);
  let totalMin = (aH * 60 + aM) - (dH * 60 + dM);
  if (totalMin < 0) totalMin += 24 * 60;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return { duration: `${hours}ч ${mins.toString().padStart(2, "0")}мин`, durationHours: hours + mins / 60 };
}

// ===== PASSFLOW INTEGRATION =====
// Trains are no longer hardcoded; they come from PassFlow API.
// See src/lib/passflow-api.ts for fetch helpers.

// ===== WAGON TYPES & PRODUCTION =====

export interface WagonTypeRow {
  id: string;
  type: string;
  seats: number;
  count: number;
}

export const DEFAULT_WAGON_TYPES: WagonTypeRow[] = [
  { id: "sv", type: "СВ", seats: 18, count: 1 },
  { id: "kupe", type: "Купе", seats: 36, count: 5 },
  { id: "plats", type: "Плацкарт", seats: 54, count: 4 },
];

export interface ProductionMetrics {
  totalWagons: number;
  totalSeats: number;
  mileageThousKm: number;
  seatTurnover: number;
  occupancyPercent: number;
  passengerTurnover: number;
  avgDistance: number;
}

export function calcProductionMetrics(
  wagonTypes: WagonTypeRow[],
  distanceKm: number,
  occupancy: number
): ProductionMetrics {
  const totalWagons = wagonTypes.reduce((s, w) => s + w.count, 0);
  const totalSeats = wagonTypes.reduce((s, w) => s + w.seats * w.count, 0);
  const mileageThousKm = (totalWagons * distanceKm) / 1000;
  const seatTurnover = (totalSeats * distanceKm) / 1000;
  const occupancyPercent = occupancy;
  const passengerTurnover = seatTurnover * (occupancy / 100);
  const avgDistance = distanceKm;
  return { totalWagons, totalSeats, mileageThousKm, seatTurnover, occupancyPercent, passengerTurnover, avgDistance };
}

// ===== REVENUE =====

export interface RevenueData {
  ticketPrice: number;
  passengers: number;
  subsidy: number;
}

export function calcRevenue(rev: RevenueData) {
  const ticketRevenue = rev.ticketPrice * rev.passengers;
  const totalRevenue = ticketRevenue + rev.subsidy;
  return { ticketRevenue, totalRevenue };
}

// ===== TARIFFS =====

export interface TariffSettings {
  mzs: number;
  water: number;
  fuel: number;
  cleaning: number;
  sanitation: number;
  disinfection: number;
  deratization: number;
  disinsection: number;
  rent: number;
  depreciation: number;
  linen: number;
  supplies: number;
  inventory: number;
  drinkWater: number;
  staffPerWagon: number;
  nightCoefficient: number;
}

export interface VersionedTariff extends TemporalData<TariffSettings> {
  tariffName: string;
  region: string;
}

export const DEFAULT_TARIFFS: TariffSettings = {
  mzs: 50000,
  water: 3000,
  fuel: 15000,
  cleaning: 5000,
  sanitation: 4000,
  disinfection: 3500,
  deratization: 2000,
  disinsection: 2500,
  rent: 80000,
  depreciation: 60000,
  linen: 1500,
  supplies: 2000,
  inventory: 5000,
  drinkWater: 500,
  staffPerWagon: 2,
  nightCoefficient: 1.5,
};

// ===== MATHEMATICAL KERNEL CONFIG =====

export const MATH_KERNEL_CONFIG: MathKernelConfig = {
  electricTariffPerHour: 184,
  thermalTariffPerHour: 255,
  nightCoefficient: 1.5,
  maxLongRideDuration: 50,
  socialRouteDiscount: 0.99,
  conductorPerWagon: {
    standard: 1.5,
    talgo: 1,
  },
};

const AVG_SPEED_KMH = 60;

// ===== EXPENSES =====

export interface ExpenseItem {
  id: string;
  label: string;
  enabled: boolean;
  tariff: number;
  quantity: number;
  group: string;
  unit: string;
  auto: boolean;
}

export interface CalculationParams {
  wagons: number;
  routeType: RouteType;
  trainType: TrainType;
  passengers: number;
  rollingStockMode: "rent" | "depreciation";
  train: TrainInfo;
  tariffs: TariffSettings;
  monthlyRides: number;
}

export function createDefaultExpenses(params: CalculationParams): ExpenseItem[] {
  const { wagons, trainType, passengers, rollingStockMode, train, tariffs, monthlyRides } = params;
  const trainMultiplier = trainType === "talgo" ? 1.3 : 1.0;
  const totalWagonsWithStaffCar = wagons + 1;

  // Тяга считается отдельно по участкам — добавляем как единую статью на основе сегментов
  const tractionCost = calcLocomotiveTraction(train.distanceKm, trainType, train, monthlyRides);

  // Санобработка по расписанию
  const disinfectionQty = totalWagonsWithStaffCar * monthlyRides; // каждый рейс
  const deratizationQty = totalWagonsWithStaffCar; // раз в месяц
  const disinsectionQty = Number((totalWagonsWithStaffCar / 3).toFixed(1)); // раз в квартал

  return [
    { id: "mzs", label: "МЖС", enabled: true, tariff: Math.round(tariffs.mzs * trainMultiplier), quantity: monthlyRides, group: "МЖС", unit: "рейс", auto: true },
    { id: "water", label: "Вода (техническая)", enabled: true, tariff: tariffs.water, quantity: totalWagonsWithStaffCar * monthlyRides, group: "Станционные", unit: "вагон·рейс", auto: true },
    { id: "fuel", label: "Топливо", enabled: true, tariff: Math.round(tariffs.fuel * (train.durationHours / 10)), quantity: monthlyRides, group: "Станционные", unit: "рейс", auto: true },
    { id: "cleaning", label: "Клининг", enabled: true, tariff: tariffs.cleaning, quantity: totalWagonsWithStaffCar * monthlyRides, group: "Станционные", unit: "вагон·рейс", auto: true },
    { id: "sanitation", label: "Ассенизация", enabled: true, tariff: tariffs.sanitation, quantity: totalWagonsWithStaffCar * monthlyRides, group: "Станционные", unit: "вагон·рейс", auto: true },
    { id: "disinfection", label: "Дезинфекция", enabled: true, tariff: Math.round(tariffs.disinfection * trainMultiplier), quantity: disinfectionQty, group: "Санобработка", unit: "вагон·рейс", auto: true },
    { id: "deratization", label: "Дератизация", enabled: true, tariff: Math.round(tariffs.deratization * trainMultiplier), quantity: deratizationQty, group: "Санобработка", unit: "вагон·мес", auto: true },
    { id: "disinsection", label: "Дезинсекция", enabled: true, tariff: Math.round(tariffs.disinsection * trainMultiplier), quantity: disinsectionQty, group: "Санобработка", unit: "вагон·мес", auto: true },
    ...(rollingStockMode === "rent"
      ? [{ id: "rent", label: "Аренда вагонов", enabled: true, tariff: tariffs.rent, quantity: totalWagonsWithStaffCar, group: "Подвижной состав", unit: "вагон", auto: true }]
      : [{ id: "depreciation", label: "Амортизация", enabled: true, tariff: tariffs.depreciation, quantity: totalWagonsWithStaffCar, group: "Подвижной состав", unit: "вагон", auto: true }]),
    { id: "staff_car_maintenance", label: "Обслуживание штабного вагона", enabled: true, tariff: 15000, quantity: 1, group: "Подвижной состав", unit: "вагон", auto: true },
    { id: "traction", label: "Локомотивная тяга", enabled: true, tariff: tractionCost, quantity: 1, group: "Тяга", unit: "мес", auto: true },
    { id: "linen", label: "Бельё", enabled: true, tariff: tariffs.linen, quantity: passengers * monthlyRides, group: "Расходники", unit: "пасс.", auto: true },
    { id: "drinkwater", label: "Вода (питьевая)", enabled: true, tariff: tariffs.drinkWater, quantity: passengers * monthlyRides, group: "Расходники", unit: "пасс.", auto: true },
    { id: "supplies", label: "Расходные материалы", enabled: true, tariff: tariffs.supplies, quantity: totalWagonsWithStaffCar * monthlyRides, group: "Расходники", unit: "вагон·рейс", auto: true },
    { id: "inventory_item", label: "Инвентарь", enabled: true, tariff: tariffs.inventory, quantity: totalWagonsWithStaffCar * monthlyRides, group: "Расходники", unit: "вагон·рейс", auto: true },
  ];
}

// ===== ANOMALIES & NORMS =====

export interface Norms {
  maxCostPerWagon: number;
  maxStationShare: number;
  anomalyThreshold: number;
}

export const DEFAULT_NORMS: Norms = {
  maxCostPerWagon: 500000,
  maxStationShare: 0.3,
  anomalyThreshold: 0.1,
};

export interface Anomaly {
  type: "warning" | "critical";
  message: string;
  group?: string;
  deviationPercent?: number;
  requiresExplanation?: boolean;
}

// ===== MATHEMATICAL KERNEL FUNCTIONS =====

export function calcStationExpense(
  wagonCount: number,
  consumptionNorm: number,
  tariff: number,
  monthlyRides: number
): number {
  if (wagonCount <= 0 || tariff <= 0) return 0;
  return wagonCount * consumptionNorm * tariff * monthlyRides;
}

/**
 * Расчет локомотивной тяги по участкам.
 * Только участки внутри КЗ. За границей → ноль.
 * Электро 184 тг/час, Тепло 255 тг/час.
 */
export function calcLocomotiveTraction(
  _distanceKmInKz: number,
  trainType: TrainType,
  route: TrainInfo,
  monthlyRides: number
): number {
  if (!route.electrifiedSegments || route.electrifiedSegments.length === 0) {
    // Fallback: считаем весь маршрут как один электрифицированный участок внутри КЗ
    const baseTariff = MATH_KERNEL_CONFIG.electricTariffPerHour;
    const adjusted = trainType === "talgo" ? baseTariff * 0.95 : baseTariff;
    const tariffPerKm = adjusted / AVG_SPEED_KMH;
    return _distanceKmInKz * tariffPerKm * monthlyRides;
  }

  let total = 0;
  for (const seg of route.electrifiedSegments) {
    if (!seg.isInKz || seg.distanceKm <= 0) continue;
    const baseTariff = seg.isElectrified
      ? MATH_KERNEL_CONFIG.electricTariffPerHour
      : MATH_KERNEL_CONFIG.thermalTariffPerHour;
    const adjusted = trainType === "talgo" ? baseTariff * 0.95 : baseTariff;
    const tariffPerKm = adjusted / AVG_SPEED_KMH;
    total += seg.distanceKm * tariffPerKm * monthlyRides;
  }
  return Math.round(total);
}

/**
 * Расчет ФОТ с матрицей сменяемости КТЖ:
 * - Стандарт → 1.5 проводника на вагон (среднее), головной/хвостовой → всегда 2
 * - Тальго → 1 проводник на вагон, головной/хвостовой → всегда 2
 * - Маршрут > 50 часов или международный → штат удваивается
 * - Ночное время 22:00–06:00 → коэффициент 1.5
 */
export function calcStaffCost(
  baseSalaryPerConductor: number,
  wagonCount: number,
  trainType: TrainType,
  durationHours: number,
  nightHours: number,
  monthlyRides: number,
  route: TrainInfo
): number {
  if (wagonCount <= 0 || baseSalaryPerConductor <= 0) return 0;

  let totalConductors: number;
  if (wagonCount === 1) {
    totalConductors = 2; // единственный вагон — одновременно головной и хвостовой
  } else {
    const head = 2;
    const tail = 2;
    const middleWagons = Math.max(0, wagonCount - 2);
    const middleRate = trainType === "talgo" ? 1.0 : 1.5;
    totalConductors = head + tail + middleWagons * middleRate;
  }

  const needsDoubleStaff = durationHours > MATH_KERNEL_CONFIG.maxLongRideDuration || route.isInternational;
  const staffMultiplier = needsDoubleStaff ? 2 : 1;
  const nightCoeff = nightHours > 0 ? MATH_KERNEL_CONFIG.nightCoefficient : 1;

  return baseSalaryPerConductor * totalConductors * staffMultiplier * nightCoeff * monthlyRides;
}

export interface CalculationResult {
  byGroup: Record<string, number>;
  total: number;
  costPerWagon: number;
  costPerPassenger: number;
  anomalies: Anomaly[];
  planVsFact: { group: string; plan: number; fact: number; deviation: number; deviationPercent: number }[];
  exceptions: ExceptionContext[];
}

export function calculateExpenses(
  expenses: ExpenseItem[],
  params: CalculationParams,
  norms: Norms = DEFAULT_NORMS,
  historicalData?: Record<string, number>
): CalculationResult {
  const results: Record<string, number> = {};
  let total = 0;
  const exceptions: ExceptionContext[] = [];

  for (const exp of expenses) {
    if (!exp.enabled) continue;

    if (exp.tariff < 0 || exp.quantity < 0) {
      exceptions.push({
        type: "invalid_input",
        severity: "error",
        message: `Отрицательное значение для ${exp.label}: тариф=${exp.tariff}, кол-во=${exp.quantity}`,
        timestamp: new Date(),
      });
      continue;
    }

    let cost = exp.tariff * exp.quantity;

    if (exp.id === "mzs" && params.routeType === "social") {
      cost = cost * (1 - MATH_KERNEL_CONFIG.socialRouteDiscount);
    }

    if (!results[exp.group]) results[exp.group] = 0;
    results[exp.group] += cost;
    total += cost;
  }

  const anomalies: Anomaly[] = [];
  const costPerWagon = params.wagons > 0 ? total / params.wagons : 0;
  const costPerPassenger = params.passengers > 0 ? total / params.passengers : 0;

  if (costPerWagon > norms.maxCostPerWagon) {
    anomalies.push({
      type: "warning",
      message: `Расходы на вагон (${Math.round(costPerWagon).toLocaleString("ru-RU")} тг) превышают норматив (${norms.maxCostPerWagon.toLocaleString("ru-RU")} тг)`,
    });
  }

  const stationShare = (results["Станционные"] || 0) / total;
  if (stationShare > norms.maxStationShare) {
    anomalies.push({
      type: "warning",
      message: `Доля станционных (${Math.round(stationShare * 100)}%) превышает норматив (${Math.round(norms.maxStationShare * 100)}%)`,
      group: "Станционные",
    });
  }

  // ===== ПЛАН-ФАКТНЫЙ АНАЛИЗ С ПРОВЕРКОЙ НА АНОМАЛИИ (>10%) =====
  const planMultiplier = params.trainType === "talgo" ? 1.15 : 1.0;
  const planVsFact = Object.entries(results)
    .map(([group, fact]) => {
      const historicalValue = historicalData?.[group] || fact * 0.95;
      const plan = Math.round(historicalValue * planMultiplier);
      const deviation = fact - plan;
      const deviationPercent = plan > 0 ? Math.abs(deviation / plan) : 0;

      if (deviationPercent > norms.anomalyThreshold) {
        anomalies.push({
          type: "warning",
          message: `Отклонение ${group}: ${(deviationPercent * 100).toFixed(1)}% (требуется пояснение)`,
          group,
          deviationPercent,
          requiresExplanation: true,
        });
      }

      return { group, plan, fact, deviation, deviationPercent };
    });

  return { byGroup: results, total, costPerWagon, costPerPassenger, anomalies, planVsFact, exceptions };
}

// ===== FINANCIAL RESULT =====

export interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  financialResult: number;
  profitMargin: number;
}

export function calcFinancialResult(totalRevenue: number, totalExpenses: number): FinancialSummary {
  const financialResult = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (financialResult / totalRevenue) * 100 : 0;
  return { totalRevenue, totalExpenses, financialResult, profitMargin };
}

export interface ForecastPoint {
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface TrendSignal {
  dimension: "revenue" | "expenses" | "profit";
  direction: "up" | "down" | "stable";
  score: number;
  message: string;
}

export interface OptimizationSuggestion {
  category: string;
  message: string;
  impactEstimate: number;
}

function sortByDate<T extends { date: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date.getTime());
  next.setMonth(next.getMonth() + months);
  return next;
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString("ru-RU", { month: "short", year: "numeric" });
}

function calculateLinearTrend(values: number[]) {
  const n = values.length;
  const last = values[n - 1] ?? 0;
  if (n < 2) {
    return { slope: 0, intercept: last };
  }

  const x = values.map((_, idx) => idx + 1);
  const y = values;
  const xAvg = x.reduce((sum, value) => sum + value, 0) / n;
  const yAvg = y.reduce((sum, value) => sum + value, 0) / n;
  const numerator = x.reduce((sum, xi, idx) => sum + (xi - xAvg) * (y[idx] - yAvg), 0);
  const denominator = x.reduce((sum, xi) => sum + Math.pow(xi - xAvg, 2), 0);
  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yAvg - slope * xAvg;
  return { slope, intercept };
}

function forecastSeries(values: number[], months: number): number[] {
  if (values.length === 0) return Array.from({ length: months }, () => 0);
  if (values.length === 1) return Array.from({ length: months }, () => values[0]);

  const { slope, intercept } = calculateLinearTrend(values);
  const lastIndex = values.length;
  return Array.from({ length: months }, (_, idx) => {
    const forecast = intercept + slope * (lastIndex + idx + 1);
    return Math.max(0, Math.round(forecast));
  });
}

export function buildForecastPoints(calculations: SavedCalculation[], months = 3): ForecastPoint[] {
  const sorted = sortByDate(calculations);
  if (sorted.length === 0) return [];

  const revenueSeries = sorted.map((calc) => calc.financial.totalRevenue);
  const expenseSeries = sorted.map((calc) => calc.results.total);
  const profitSeries = sorted.map((calc) => calc.financial.financialResult);

  const revenueForecast = forecastSeries(revenueSeries, months);
  const expenseForecast = forecastSeries(expenseSeries, months);
  const profitForecast = revenueForecast.map((rev, idx) => rev - expenseForecast[idx]);

  const lastDate = new Date(sorted[sorted.length - 1].date);
  return revenueForecast.map((_, idx) => {
    const pointDate = addMonths(lastDate, idx + 1);
    return {
      period: formatMonthLabel(pointDate),
      revenue: revenueForecast[idx],
      expenses: expenseForecast[idx],
      profit: profitForecast[idx],
    };
  });
}

export function analyzeTrendSignals(calculations: SavedCalculation[]): TrendSignal[] {
  const sorted = sortByDate(calculations);
  if (sorted.length < 2) {
    return [
      { dimension: "revenue", direction: "stable", score: 0, message: "Недостаточно данных для трендов" },
      { dimension: "expenses", direction: "stable", score: 0, message: "Недостаточно данных для трендов" },
      { dimension: "profit", direction: "stable", score: 0, message: "Недостаточно данных для трендов" },
    ];
  }

  const revenueSeries = sorted.map((calc) => calc.financial.totalRevenue);
  const expenseSeries = sorted.map((calc) => calc.results.total);
  const profitSeries = sorted.map((calc) => calc.financial.financialResult);

  const metrics = [
    { dimension: "revenue" as const, series: revenueSeries },
    { dimension: "expenses" as const, series: expenseSeries },
    { dimension: "profit" as const, series: profitSeries },
  ];

  return metrics.map(({ dimension, series }) => {
    const { slope } = calculateLinearTrend(series);
    const average = series.reduce((sum, value) => sum + value, 0) / series.length || 1;
    const score = Math.min(1, Math.abs(slope) / Math.max(average, 1));
    const direction = slope > average * 0.03 ? "up" : slope < -average * 0.03 ? "down" : "stable";
    const label = dimension === "profit" ? "рентабельности" : dimension === "revenue" ? "доходов" : "расходов";
    const message = direction === "stable"
      ? `Тренд ${label} сохраняется стабильно.`
      : direction === "up"
        ? `Тренд ${label} положительный: показатели растут.`
        : `Тренд ${label} отрицательный: показатели снижаются.`;

    return { dimension, direction, score: Number(score.toFixed(2)), message };
  });
}

export function generateOptimizationSuggestions(calculations: SavedCalculation[]): OptimizationSuggestion[] {
  if (calculations.length === 0) return [];

  const latest = sortByDate(calculations).slice(-1)[0];
  const byGroup = latest.results.byGroup;
  const total = latest.results.total || 1;
  const topGroups = Object.entries(byGroup)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const suggestions: OptimizationSuggestion[] = [];
  for (const [group, value] of topGroups) {
    const share = value / total;
    if (share > 0.25) {
      suggestions.push({
        category: group,
        impactEstimate: Math.round(value * 0.1),
        message: `Проверьте нормы и тарифы для группы «${group}»: она формирует ${(share * 100).toFixed(0)}% текущих расходов. Снижение на 10% даст примерно ${Math.round(value * 0.1).toLocaleString("ru-RU")} тг выгоды.`,
      });
    }
  }

  if (suggestions.length === 0) {
    suggestions.push({
      category: "Общие расходы",
      impactEstimate: Math.round(latest.results.total * 0.05),
      message: `Текущие расходы сбалансированы, но есть возможность снизить затраты на 5% за счёт оптимизации закупок и логистики.`,
    });
  }

  return suggestions;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  manager: "Менеджер",
  analyst: "Аналитик",
  director: "Руководство",
  checker: "Контролер (РМО)",
  admin_nsi: "Администратор НСИ",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  manager: "Ввод данных и расчёт расходов",
  analyst: "Анализ и формирование отчётов",
  director: "Просмотр итогов и отчётов",
  checker: "Проверка и утверждение бюджетов",
  admin_nsi: "Управление справочниками и тарифами",
};

// ===== SAVED CALCULATIONS =====

export interface SavedCalculation {
  id: string;
  date: string;
  trainNumber: string;
  trainRoute: string;
  branch?: string;
  trainInfo: TrainInfo;
  wagonTypes: WagonTypeRow[];
  occupancy: number;
  routeType: RouteType;
  trainType: TrainType;
  rollingStockMode: "rent" | "depreciation";
  revenue: RevenueData;
  expenses: ExpenseItem[];
  results: CalculationResult;
  financial: FinancialSummary;
  productionMetrics: ProductionMetrics;
  status: "draft" | "submitted" | "approved" | "rejected";
  submittedBy?: string;
  approvedBy?: string;
  rejectionReason?: string;
  anomalyExplanation?: string;
  auditLogs: AuditLog[];
}

export const KTZ_BRANCHES = [
  "Астана", "Алматы", "Шымкент", "Караганда", "Актобе",
  "Атырау", "Уральск", "Костанай", "Павлодар", "Петропавловск",
  "Кызылорда", "Семей",
] as const;

export type KtzBranch = typeof KTZ_BRANCHES[number];

const STORAGE_KEY = "ecoplan_calculations";

export function saveCalculation(calc: SavedCalculation): void {
  const existing = loadCalculations();
  existing.unshift(calc);
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  }
}

export function loadCalculations(branchFilter?: string): SavedCalculation[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const all: SavedCalculation[] = data ? JSON.parse(data) : [];
    if (branchFilter) {
      return all.filter((c) => c.branch === branchFilter || !c.branch);
    }
    // Demo RBAC: if user has a branch in session, filter by it for managers
    const demoBranch = sessionStorage.getItem("demo_branch");
    const demoRole = sessionStorage.getItem("demo_role");
    if (demoRole === "manager" && demoBranch) {
      return all.filter((c) => c.branch === demoBranch || !c.branch);
    }
    return all;
  } catch {
    return [];
  }
}

export function deleteCalculation(id: string): void {
  const existing = loadCalculations().filter((c) => c.id !== id);
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  }
}

// ===== CUSTOM ROUTES (Manager-created + Tablo import) =====

const CUSTOM_TRAINS_KEY = "ecoplan_custom_trains";

export function saveCustomTrain(train: TrainInfo): void {
  if (typeof window === "undefined") return;
  const existing = loadCustomTrains();
  const idx = existing.findIndex((t) => t.number === train.number);
  if (idx >= 0) {
    existing[idx] = train;
  } else {
    existing.push(train);
  }
  localStorage.setItem(CUSTOM_TRAINS_KEY, JSON.stringify(existing));
}

export function loadCustomTrains(): TrainInfo[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(CUSTOM_TRAINS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function deleteCustomTrain(number: string): void {
  if (typeof window === "undefined") return;
  const existing = loadCustomTrains().filter((t) => t.number !== number);
  localStorage.setItem(CUSTOM_TRAINS_KEY, JSON.stringify(existing));
}

export function getAllAvailableTrains(): TrainInfo[] {
  const custom = loadCustomTrains();
  // Merge with demo trains, custom takes precedence
  const merged = new Map<string, TrainInfo>();
  for (const t of DEMO_TRAINS as TrainInfo[]) {
    merged.set(t.number, t);
  }
  for (const t of custom) {
    merged.set(t.number, t);
  }
  return Array.from(merged.values());
}
