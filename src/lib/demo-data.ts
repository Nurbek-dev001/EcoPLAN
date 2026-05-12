import type { SavedCalculation, ClaimItem, AuditEntry } from "./train-data";

export const DEMO_TRAINS = [
  {
    number: "001", route: "Нурлы жол — Алматы", from: "Нурлы жол", to: "Алматы-2",
    duration: "10ч 20мин", durationHours: 10.2, nightHours: 0, distanceKm: 970, distanceTotal: 970,
    trainType: "talgo", isSocial: false, isInternational: false,
    electrifiedSegments: [{ from: "Нурлы жол", to: "Алматы-2", isElectrified: true, distanceKm: 970, isInKz: true }],
    stations: [
      { name: "Нурлы жол", arrival: "—", departure: "07:00", stop: "—" },
      { name: "Караганды", arrival: "09:35", departure: "09:45", stop: "10 мин" },
      { name: "Темиртау", arrival: "10:15", departure: "10:17", stop: "2 мин" },
      { name: "Шу", arrival: "14:20", departure: "14:30", stop: "10 мин" },
      { name: "Алматы-2", arrival: "17:15", departure: "—", stop: "—" },
    ],
  },
  {
    number: "003", route: "Алматы — Петропавловск", from: "Алматы-2", to: "Петропавловск",
    duration: "17ч 20мин", durationHours: 17.2, nightHours: 8, distanceKm: 1530, distanceTotal: 1530,
    trainType: "standard", isSocial: false, isInternational: false,
    electrifiedSegments: [
      { from: "Алматы-2", to: "Кокшетау", isElectrified: true, distanceKm: 1120, isInKz: true },
      { from: "Кокшетау", to: "Петропавловск", isElectrified: false, distanceKm: 410, isInKz: true },
    ],
    stations: [
      { name: "Алматы-2", arrival: "—", departure: "18:20", stop: "—" },
      { name: "Караганды", arrival: "23:10", departure: "23:20", stop: "10 мин" },
      { name: "Нурлы жол", arrival: "02:05", departure: "02:20", stop: "15 мин" },
      { name: "Кокшетау", arrival: "06:40", departure: "06:55", stop: "15 мин" },
      { name: "Петропавловск", arrival: "11:30", departure: "—", stop: "—" },
    ],
  },
  {
    number: "021", route: "Алматы — Шымкент", from: "Алматы-2", to: "Шымкент",
    duration: "8ч 30мин", durationHours: 8.5, nightHours: 0, distanceKm: 600, distanceTotal: 600,
    trainType: "standard", isSocial: false, isInternational: false,
    electrifiedSegments: [{ from: "Алматы-2", to: "Шымкент", isElectrified: true, distanceKm: 600, isInKz: true }],
    stations: [
      { name: "Алматы-2", arrival: "—", departure: "08:00", stop: "—" },
      { name: "Шу", arrival: "11:20", departure: "11:30", stop: "10 мин" },
      { name: "Тараз", arrival: "13:40", departure: "13:50", stop: "10 мин" },
      { name: "Шымкент", arrival: "16:30", departure: "—", stop: "—" },
    ],
  },
  {
    number: "083", route: "Алматы — Ташкент", from: "Алматы-2", to: "Ташкент",
    duration: "12ч 30мин", durationHours: 12.5, nightHours: 2, distanceKm: 810, distanceTotal: 810,
    trainType: "standard", isSocial: false, isInternational: true,
    electrifiedSegments: [
      { from: "Алматы-2", to: "Жибек Жолы (граница)", isElectrified: true, distanceKm: 680, isInKz: true },
      { from: "Жибек Жолы (граница)", to: "Ташкент", isElectrified: true, distanceKm: 130, isInKz: false },
    ],
    stations: [
      { name: "Алматы-2", arrival: "—", departure: "10:15", stop: "—" },
      { name: "Шу", arrival: "13:30", departure: "13:40", stop: "10 мин" },
      { name: "Тараз", arrival: "15:50", departure: "16:00", stop: "10 мин" },
      { name: "Шымкент", arrival: "18:30", departure: "18:50", stop: "20 мин" },
      { name: "Жибек Жолы (граница)", arrival: "20:00", departure: "20:30", stop: "30 мин" },
      { name: "Ташкент", arrival: "22:45", departure: "—", stop: "—" },
    ],
  },
  {
    number: "701", route: "Нурлы жол — Караганды (пригород)", from: "Нурлы жол", to: "Караганды",
    duration: "2ч 30мин", durationHours: 2.5, nightHours: 0, distanceKm: 210, distanceTotal: 210,
    trainType: "talgo", isSocial: true, isInternational: false,
    electrifiedSegments: [{ from: "Нурлы жол", to: "Караганды", isElectrified: true, distanceKm: 210, isInKz: true }],
    stations: [
      { name: "Нурлы жол", arrival: "—", departure: "06:30", stop: "—" },
      { name: "Караганды", arrival: "09:00", departure: "—", stop: "—" },
    ],
  },
];

export function createDemoCalculations(): SavedCalculation[] {
  const now = new Date().toISOString();
  return [
    {
      id: "demo-calc-1",
      date: now,
      trainNumber: "001",
      trainRoute: "Нурлы жол — Алматы",
      branch: "Астана",
      trainInfo: DEMO_TRAINS[0] as any,
      wagonTypes: [
        { id: "sv", type: "СВ", seats: 18, count: 1 },
        { id: "kupe", type: "Купе", seats: 36, count: 5 },
        { id: "plats", type: "Плацкарт", seats: 54, count: 4 },
      ],
      occupancy: 78,
      routeType: "commercial",
      trainType: "talgo",
      rollingStockMode: "rent",
      revenue: { ticketPrice: 12500, passengers: 420, subsidy: 0 },
      expenses: [
        { id: "mzs", label: "МЖС", enabled: true, tariff: 65000, quantity: 30, group: "МЖС", unit: "рейс", auto: true },
        { id: "water", label: "Вода (техническая)", enabled: true, tariff: 3000, quantity: 300, group: "Станционные", unit: "вагон·рейс", auto: true },
        { id: "fuel", label: "Топливо", enabled: true, tariff: 15300, quantity: 30, group: "Станционные", unit: "рейс", auto: true },
        { id: "cleaning", label: "Клининг", enabled: true, tariff: 5000, quantity: 300, group: "Станционные", unit: "вагон·рейс", auto: true },
        { id: "disinfection", label: "Дезинфекция", enabled: true, tariff: 4550, quantity: 300, group: "Санобработка", unit: "вагон·рейс", auto: true },
        { id: "deratization", label: "Дератизация", enabled: true, tariff: 2600, quantity: 10, group: "Санобработка", unit: "вагон·мес", auto: true },
        { id: "disinsection", label: "Дезинсекция", enabled: true, tariff: 3250, quantity: 3.3, group: "Санобработка", unit: "вагон·мес", auto: true },
        { id: "rent", label: "Аренда вагонов", enabled: true, tariff: 80000, quantity: 10, group: "Подвижной состав", unit: "вагон", auto: true },
        { id: "traction", label: "Локомотивная тяга", enabled: true, tariff: 29380, quantity: 1, group: "Тяга", unit: "мес", auto: true },
        { id: "linen", label: "Бельё", enabled: true, tariff: 1500, quantity: 12600, group: "Расходники", unit: "пасс.", auto: true },
        { id: "supplies", label: "Расходные материалы", enabled: true, tariff: 2000, quantity: 300, group: "Расходники", unit: "вагон·рейс", auto: true },
      ],
      results: {
        byGroup: { "МЖС": 1950000, "Станционные": 1377000, "Санобработка": 1683050, "Подвижной состав": 800000, "Тяга": 29380, "Расходники": 1350000 },
        total: 7193430,
        costPerWagon: 719343,
        costPerPassenger: 17127,
        anomalies: [],
        planVsFact: [
          { group: "МЖС", plan: 1800000, fact: 1950000, deviation: 150000, deviationPercent: 0.083 },
          { group: "Станционные", plan: 1400000, fact: 1377000, deviation: -23000, deviationPercent: 0.016 },
          { group: "Санобработка", plan: 1600000, fact: 1683050, deviation: 83050, deviationPercent: 0.052 },
          { group: "Подвижной состав", plan: 850000, fact: 800000, deviation: -50000, deviationPercent: 0.059 },
          { group: "Тяга", plan: 28000, fact: 29380, deviation: 1380, deviationPercent: 0.049 },
          { group: "Расходники", plan: 1300000, fact: 1350000, deviation: 50000, deviationPercent: 0.038 },
        ],
        exceptions: [],
      },
      financial: { totalRevenue: 5250000, totalExpenses: 7193430, financialResult: -1943430, profitMargin: -37.02 },
      productionMetrics: { totalWagons: 10, totalSeats: 540, mileageThousKm: 9.7, seatTurnover: 518.4, occupancyPercent: 78, passengerTurnover: 404.35, avgDistance: 970 },
      status: "draft",
      anomalyExplanation: "",
      auditLogs: [],
    },
    {
      id: "demo-calc-2",
      date: new Date(Date.now() - 86400000).toISOString(),
      trainNumber: "003",
      trainRoute: "Алматы — Петропавловск",
      branch: "Алматы",
      trainInfo: DEMO_TRAINS[1] as any,
      wagonTypes: [
        { id: "sv", type: "СВ", seats: 18, count: 2 },
        { id: "kupe", type: "Купе", seats: 36, count: 6 },
        { id: "plats", type: "Плацкарт", seats: 54, count: 6 },
      ],
      occupancy: 65,
      routeType: "commercial",
      trainType: "standard",
      rollingStockMode: "depreciation",
      revenue: { ticketPrice: 9500, passengers: 520, subsidy: 200000 },
      expenses: [
        { id: "mzs", label: "МЖС", enabled: true, tariff: 50000, quantity: 30, group: "МЖС", unit: "рейс", auto: true },
        { id: "water", label: "Вода (техническая)", enabled: true, tariff: 3000, quantity: 420, group: "Станционные", unit: "вагон·рейс", auto: true },
        { id: "fuel", label: "Топливо", enabled: true, tariff: 20400, quantity: 30, group: "Станционные", unit: "рейс", auto: true },
        { id: "cleaning", label: "Клининг", enabled: true, tariff: 5000, quantity: 420, group: "Станционные", unit: "вагон·рейс", auto: true },
        { id: "disinfection", label: "Дезинфекция", enabled: true, tariff: 3500, quantity: 420, group: "Санобработка", unit: "вагон·рейс", auto: true },
        { id: "deratization", label: "Дератизация", enabled: true, tariff: 2000, quantity: 14, group: "Санобработка", unit: "вагон·мес", auto: true },
        { id: "disinsection", label: "Дезинсекция", enabled: true, tariff: 2500, quantity: 4.7, group: "Санобработка", unit: "вагон·мес", auto: true },
        { id: "depreciation", label: "Амортизация", enabled: true, tariff: 60000, quantity: 14, group: "Подвижной состав", unit: "вагон", auto: true },
        { id: "traction", label: "Локомотивная тяга", enabled: true, tariff: 64965, quantity: 1, group: "Тяга", unit: "мес", auto: true },
        { id: "linen", label: "Бельё", enabled: true, tariff: 1500, quantity: 15600, group: "Расходники", unit: "пасс.", auto: true },
        { id: "supplies", label: "Расходные материалы", enabled: true, tariff: 2000, quantity: 420, group: "Расходники", unit: "вагон·рейс", auto: true },
      ],
      results: {
        byGroup: { "МЖС": 1500000, "Станционные": 2067000, "Санобработка": 1688050, "Подвижной состав": 840000, "Тяга": 64965, "Расходники": 1520000 },
        total: 7680015,
        costPerWagon: 548572,
        costPerPassenger: 14769,
        anomalies: [
          { type: "warning" as any, message: "Отклонение Санобработка: 5.5% (требуется пояснение)", group: "Санобработка", deviationPercent: 0.055, requiresExplanation: true },
        ],
        planVsFact: [
          { group: "МЖС", plan: 1600000, fact: 1500000, deviation: -100000, deviationPercent: 0.063 },
          { group: "Станционные", plan: 1900000, fact: 2067000, deviation: 167000, deviationPercent: 0.088 },
          { group: "Санобработка", plan: 1600000, fact: 1688050, deviation: 88050, deviationPercent: 0.055 },
          { group: "Подвижной состав", plan: 900000, fact: 840000, deviation: -60000, deviationPercent: 0.067 },
          { group: "Тяга", plan: 62000, fact: 64965, deviation: 2965, deviationPercent: 0.048 },
          { group: "Расходники", plan: 1450000, fact: 1520000, deviation: 70000, deviationPercent: 0.048 },
        ],
        exceptions: [],
      },
      financial: { totalRevenue: 5140000, totalExpenses: 7680015, financialResult: -2540015, profitMargin: -49.42 },
      productionMetrics: { totalWagons: 14, totalSeats: 720, mileageThousKm: 21.42, seatTurnover: 1378.8, occupancyPercent: 65, passengerTurnover: 896.22, avgDistance: 1530 },
      status: "submitted",
      anomalyExplanation: "Перерасход станционных расходов связан с незапланированной остановкой по требованию акимата г. Караганды (дополнительная подача воды и уборка)",
      auditLogs: [
        {
          id: "audit-1",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          userId: "demo-user",
          action: "update",
          entityType: "calculation",
          entityId: "demo-calc-2",
          changes: [
            { field: "expenses[Станционные]", oldValue: 1900000, newValue: 2067000 },
          ],
          comment: "Обновлены расходы после остановки в Караганде",
        },
      ],
    },
    {
      id: "demo-calc-3",
      date: new Date(Date.now() - 172800000).toISOString(),
      trainNumber: "021",
      trainRoute: "Алматы — Шымкент",
      branch: "Шымкент",
      trainInfo: DEMO_TRAINS[2] as any,
      wagonTypes: [
        { id: "kupe", type: "Купе", seats: 36, count: 4 },
        { id: "plats", type: "Плацкарт", seats: 54, count: 4 },
      ],
      occupancy: 82,
      routeType: "social",
      trainType: "standard",
      rollingStockMode: "rent",
      revenue: { ticketPrice: 3500, passengers: 380, subsidy: 1800000 },
      expenses: [
        { id: "mzs", label: "МЖС", enabled: true, tariff: 500, quantity: 30, group: "МЖС", unit: "рейс", auto: true },
        { id: "water", label: "Вода (техническая)", enabled: true, tariff: 3000, quantity: 240, group: "Станционные", unit: "вагон·рейс", auto: true },
        { id: "fuel", label: "Топливо", enabled: true, tariff: 10200, quantity: 30, group: "Станционные", unit: "рейс", auto: true },
        { id: "cleaning", label: "Клининг", enabled: true, tariff: 5000, quantity: 240, group: "Станционные", unit: "вагон·рейс", auto: true },
        { id: "disinfection", label: "Дезинфекция", enabled: true, tariff: 3500, quantity: 240, group: "Санобработка", unit: "вагон·рейс", auto: true },
        { id: "rent", label: "Аренда вагонов", enabled: true, tariff: 80000, quantity: 8, group: "Подвижной состав", unit: "вагон", auto: true },
        { id: "traction", label: "Локомотивная тяга", enabled: true, tariff: 18400, quantity: 1, group: "Тяга", unit: "мес", auto: true },
        { id: "linen", label: "Бельё", enabled: true, tariff: 1500, quantity: 11400, group: "Расходники", unit: "пасс.", auto: true },
      ],
      results: {
        byGroup: { "МЖС": 15000, "Станционные": 865200, "Санобработка": 842000, "Подвижной состав": 640000, "Тяга": 18400, "Расходники": 1140000 },
        total: 3530600,
        costPerWagon: 441325,
        costPerPassenger: 9291,
        anomalies: [],
        planVsFact: [
          { group: "МЖС", plan: 15000, fact: 15000, deviation: 0, deviationPercent: 0 },
          { group: "Станционные", plan: 900000, fact: 865200, deviation: -34800, deviationPercent: 0.039 },
          { group: "Санобработка", plan: 850000, fact: 842000, deviation: -8000, deviationPercent: 0.009 },
          { group: "Подвижной состав", plan: 700000, fact: 640000, deviation: -60000, deviationPercent: 0.086 },
          { group: "Тяга", plan: 20000, fact: 18400, deviation: -1600, deviationPercent: 0.08 },
          { group: "Расходники", plan: 1200000, fact: 1140000, deviation: -60000, deviationPercent: 0.05 },
        ],
        exceptions: [],
      },
      financial: { totalRevenue: 3130000, totalExpenses: 3530600, financialResult: -400600, profitMargin: -12.8 },
      productionMetrics: { totalWagons: 8, totalSeats: 360, mileageThousKm: 4.8, seatTurnover: 432, occupancyPercent: 82, passengerTurnover: 354.24, avgDistance: 600 },
      status: "approved",
      anomalyExplanation: "",
      auditLogs: [],
    },
  ];
}

export function createDemoClaims(): any[] {
  return [
    {
      id: "claim-1",
      bin: "940440001234",
      companyName: "ТОО «КазТрансСервис»",
      city: "Алматы",
      judgeName: "Иванов А.Б.",
      duty: 150000,
      penalty: 320000,
      attorney: 180000,
      status: "pending",
      description: "Претензия по задержке вагонов на станции Алматы-2 (март 2026)",
      date: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: "claim-2",
      bin: "960440005678",
      companyName: "АО «КазВагон»",
      city: "Нур-Султан",
      judgeName: "Петров С.В.",
      duty: 220000,
      penalty: 0,
      attorney: 95000,
      status: "resolved",
      description: "Спор по договору аренды подвижного состава",
      date: new Date(Date.now() - 86400000 * 12).toISOString(),
    },
    {
      id: "claim-3",
      bin: "980440009876",
      companyName: "ТОО «БалТранс»",
      city: "Актобе",
      judgeName: "Сидоров М.К.",
      duty: 85000,
      penalty: 410000,
      attorney: 120000,
      status: "rejected",
      description: "Претензия по повреждению груза в вагоне №445566",
      date: new Date(Date.now() - 86400000 * 20).toISOString(),
    },
  ];
}

export function createDemoAudit(): any[] {
  return [
    {
      id: "audit-demo-1",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      user: "demo@ecoplan.kz",
      action: "update",
      entityType: "calculation",
      entityId: "demo-calc-2",
      oldValues: { "Станционные расходы": "1 900 000 тг", "Статус": "draft" },
      newValues: { "Станционные расходы": "2 067 000 тг", "Статус": "submitted" },
      comment: "Обновлены расходы после остановки в Караганде",
    },
    {
      id: "audit-demo-2",
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      user: "admin@ecoplan.kz",
      action: "update",
      entityType: "tariff",
      entityId: "tariff-mzs-001",
      oldValues: { "МЖС тариф": "50 000 тг", "valid_to": null },
      newValues: { "МЖС тариф": "55 000 тг", "valid_to": "2026-06-01" },
      comment: "Повышение тарифа МЖС на 10%",
    },
    {
      id: "audit-demo-3",
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      user: "checker@ecoplan.kz",
      action: "approve",
      entityType: "calculation",
      entityId: "demo-calc-3",
      oldValues: { "Статус": "submitted" },
      newValues: { "Статус": "approved" },
      comment: "Утверждено без замечаний",
    },
    {
      id: "audit-demo-4",
      timestamp: new Date(Date.now() - 172800000).toISOString(),
      user: "manager@ecoplan.kz",
      action: "create",
      entityType: "claim_expense",
      entityId: "claim-1",
      oldValues: {},
      newValues: { "БИН": "940440001234", "Компания": "ТОО «КазТрансСервис»", "Сумма": "650 000 тг" },
      comment: "Новая претензия",
    },
  ];
}

export function seedDemoData() {
  if (typeof window === "undefined") return;

  const seeded = sessionStorage.getItem("demo_seeded");
  if (seeded) return;

  // Seed calculations
  const existingCalcs = JSON.parse(localStorage.getItem("ecoplan_calculations") || "[]");
  if (existingCalcs.length === 0) {
    localStorage.setItem("ecoplan_calculations", JSON.stringify(createDemoCalculations()));
  }

  // Seed claims
  const existingClaims = JSON.parse(localStorage.getItem("ecoplan_claims") || "[]");
  if (existingClaims.length === 0) {
    localStorage.setItem("ecoplan_claims", JSON.stringify(createDemoClaims()));
  }

  // Seed audit
  const existingAudit = JSON.parse(localStorage.getItem("ecoplan_audit") || "[]");
  if (existingAudit.length === 0) {
    localStorage.setItem("ecoplan_audit", JSON.stringify(createDemoAudit()));
  }

  sessionStorage.setItem("demo_seeded", "1");
  console.log("[EcoPlan] Demo data seeded");
}
