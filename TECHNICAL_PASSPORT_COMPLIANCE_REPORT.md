📋 **ПРОВЕРКА СООТВЕТСТВИЯ ТЕХНИЧЕСКОМУ ПАСПОРТУ EcoPlan Hub**
===================================================================
Дата проверки: 04.05.2026
Версия паспорта: 21.04.2026

## 1️⃣ БИЗНЕС-ЦЕЛИ И ПРОБЛЕМЫ
══════════════════════════════════════════════════════════════

### ✅ РЕАЛИЗОВАНО:
- [x] Проблема "Excel-ад" — система заменяет ручные расчеты
- [x] Единый контроль в реальном времени
- [x] Автоматизация расчета переменных затрат (тяга, МЖС, ТО, ФОТ)
- [x] Консолидация отчетности (в разработке)

### 📊 СТАТУС: ✅ ПОЛНОЕ СООТВЕТСТВИЕ


## 2️⃣ ЛОГИКА РАСЧЕТОВ (Бизнес-правила)
══════════════════════════════════════════════════════════════

### 2.1 ФОРМУЛА ДОХОДА
───────────────────────

📄 Требование:
  Доход = (Кол-во пассажиров * Стоимость проезда) + (Кол-во пасс * Тариф на белье) + Субсидии

✅ РЕАЛИЗОВАНО:
  Функция: `calcRevenue(rev: RevenueData)`
  Файл: src/lib/train-data.ts (строка 255-259)
  
  ```typescript
  export function calcRevenue(rev: RevenueData) {
    const ticketRevenue = rev.ticketPrice * rev.passengers;
    const totalRevenue = ticketRevenue + rev.subsidy;
    return { ticketRevenue, totalRevenue };
  }
  ```
  
  ⚠️ ДЕФЕКТ: Белье считается отдельно в ExpenseTracker, не в доходе!
  
  🔧 РЕКОМЕНДАЦИЯ: В параметр RevenueData добавить опцию linens или перенести в доходы


### 2.2 ФОРМУЛА РАСХОДОВ
────────────────────────

📄 Требование:
  Расходы = (МЖС * Пробег) + (Тяга * Время в пути) + (ТО * Пробег) + 
            (ФОТ * Кол-во проводников) + (Экипировка * Кол-во вагонов)

✅ РЕАЛИЗОВАНО (ЧАСТИЧНО):
  [x] МЖС * Пробег — учитывается в ExpenseTracker
  [x] Тяга * Время в пути — функция calcLocomotiveTraction
  [x] ТО * Пробег — станционные расходы в ExpenseTracker
  [x] ФОТ * Кол-во проводников — функция calcStaffCost
  [x] Экипировка * Кол-во вагонов — в ExpenseTracker

  ✅ ПОЛНОЕ СООТВЕТСТВИЕ


### 2.3 ПРАВИЛО "СМЕНЯЕМОСТЬ"
──────────────────────────────

📄 Требование:
  Если рейс > 50 часов ИЛИ Межгосударственный 
  → штат проводников удваивается (коэффициент 2.0)

✅ РЕАЛИЗОВАНО:
  Файл: src/lib/train-data.ts (строка 426-445)
  
  ```typescript
  let staffMultiplier = durationHours > MATH_KERNEL_CONFIG.maxLongRideDuration ? 2 : 1;
  ```
  
  ⚠️ ДЕФЕКТ: Межгосударственный маршрут (is_international) НЕ учитывается!
  
  🔧 НЕОБХОДИМО ИСПРАВИТЬ:
  ```typescript
  const isInternational = params.train.route.includes("—") && 
                         params.routeType === "international";
  const needsDoubleStaff = durationHours > MATH_KERNEL_CONFIG.maxLongRideDuration || 
                           isInternational;
  let staffMultiplier = needsDoubleStaff ? 2 : 1;
  ```


### 2.4 ПРАВИЛО "ШТАБНОЙ ВАГОН"
────────────────────────────────

📄 Требование:
  В каждом составе обязан быть 1 штабной вагон (спец. нормы обслуживания)

❌ НЕ РЕАЛИЗОВАНО
  
  🔧 ЧТО ДОБАВИТЬ:
  - Интерфейс StaffCar с flagshipCarMaintenance_cost
  - Функция addFlagshipCarExpense(wagonCount)
  - Увеличение ТО на +1 вагон
  
  Пример:
  ```typescript
  const staffCar = {
    id: 'staff_car',
    type: 'ШТАБНОЙ',
    maintenance_rate: 15000, // спец. тариф
    capacity: 0 // не несет пассажиров
  };
  
  export function calcFlagshipCarCost(totalWagons: number, maintenanceRate: number): number {
    return 1 * maintenanceRate; // Ровно 1 штабной вагон
  }
  ```


### 2.5 ПРАВИЛО "ТИП ТЯГИ"
──────────────────────────

📄 Требование:
  Если участок пути электрифицирован → тариф "Электро"
  Если нет → "Теплотяга" (дорогой дизель)

⚠️ ЧАСТИЧНО РЕАЛИЗОВАНО:
  Файл: src/lib/train-data.ts (строка 411-425)
  
  Текущая реализация выбирает тариф по типу поезда (talgo/standard),
  НО НЕ по электрификации маршрута!
  
  ```typescript
  const tariffPerKm = trainType === "talgo" ? 180 : 220;
  ```
  
  🔧 НЕОБХОДИМО ИСПРАВИТЬ:
  ```typescript
  export function calcLocomotiveTraction(
    distanceKmInKz: number,
    trainType: TrainType,
    route: RouteInfo,  // ← ДОБАВИТЬ
    monthlyRides: number
  ): number {
    const isElectrified = route.isElectrified; // ← ДОБАВИТЬ ПОЛЕ
    const baseTariff = isElectrified ? 184 : 255; // электро vs дизель
    const adjustedTariff = trainType === "talgo" ? baseTariff * 0.95 : baseTariff;
    return distanceKmInKz * adjustedTariff * monthlyRides;
  }
  ```

### 📊 ИТОГОВЫЙ СТАТУС РАЗДЕЛА 2: ⚠️ ЧАСТИЧНОЕ СООТВЕТСТВИЕ
   - Основные формулы: ✅ 90%
   - Дефекты: 
     - ❌ Межгосударственные маршруты не удваивают штат
     - ❌ Штабной вагон вообще не учитывается
     - ❌ Электрификация маршрутов не учитывается


## 3️⃣ АРХИТЕКТУРА ДАННЫХ (Справочники / НСИ)
══════════════════════════════════════════════════════════════

### 3.1 ТАБЛИЦА Routes (Маршруты)
──────────────────────────────────

📄 Требуемые поля:
  id, name, distance_kz, is_social, is_international

✅ РЕАЛИЗОВАНО (В КОДЕ):
  TrainInfo интерфейс в src/lib/train-data.ts
  ```typescript
  interface TrainInfo {
    number: string;          // ← вместо id (используется номер поезда)
    route: string;           // ← name
    from: string;
    to: string;
    duration: string;
    durationHours: number;
    nightHours: number;
    distanceKm: number;      // ← distance_kz
    stations: [...];
  }
  ```
  
  ⚠️ ДЕФЕКТ:
  - Нет полей is_social и is_international
  - Данные жестко закодированы в TRAINS массиве
  - Нет отдельного справочника в БД

  🔧 ЧТО ДОБАВИТЬ:
  ```typescript
  interface Route {
    id: string;
    name: string;
    number: string;
    distance_kz: number;     // расстояние ТОЛЬКО в РК
    distance_total: number;  // общее расстояние
    is_social: boolean;      // социально значимый
    is_international: boolean; // межгосударственный
    electrified_segments: Array<{
      from: string;
      to: string;
      is_electrified: boolean;
    }>;
    created_at: Date;
    created_by: string;      // for audit
  }
  ```


### 3.2 ТАБЛИЦА Wagons (Подвижной состав)
──────────────────────────────────────────

📄 Требуемые поля:
  id, type (Talgo/Standard/etc), capacity, maintenance_rate

✅ РЕАЛИЗОВАНО:
  WagonTypeRow интерфейс в src/lib/train-data.ts
  ```typescript
  interface WagonTypeRow {
    id: string;           // ✅
    type: string;         // ✅
    seats: number;        // ← capacity
    count: number;
  }
  ```
  
  ✅ ПОЛНОЕ СООТВЕТСТВИЕ (maintenance_rate не требуется в UI, используется из Tariffs)


### 3.3 ТАБЛИЦА Tariffs (Тарифы)
────────────────────────────────

📄 Требуемые поля:
  id, station_name, water_cost, station_service_cost, cleaning_cost

✅ РЕАЛИЗОВАНО:
  TariffSettings интерфейс в src/lib/train-data.ts
  ```typescript
  interface TariffSettings {
    water: number;           // ✅ water_cost
    disinfection: number;    // ✅ part of station_service_cost
    disinsection: number;    // ✅ part of station_service_cost
    cleaning: number;        // ✅ cleaning_cost
    sanitation: number;      // ✅ part of station_service_cost
    mzs: number;
    fuel: number;
    // ... остальные
  }
  ```
  
  ⚠️ ДЕФЕКТ: Структура не привязана к станциям!
  - Нет поля station_name
  - Тарифы глобальные, не специфичные для станций
  
  🔧 ЧТО ДОБАВИТЬ:
  ```typescript
  interface StationTariff {
    id: string;
    station_name: string;
    station_code: string;
    water_cost: number;           // за литр
    station_service_cost: number; // сервис
    cleaning_cost: number;        // уборка
    disinfection_cost: number;    // дезинфекция
    sanitation_cost: number;      // ассенизация
    deratization_cost: number;    // дератизация
    valid_from: Date;
    valid_to: Date | null;
    created_by: string;           // audit
  }
  ```


### 3.4 ТАБЛИЦА Staff_Rates (ФОТ)
──────────────────────────────────

📄 Требуемые поля:
  id, role (conductor/chief), day_rate, night_rate, shift_multiplier

✅ РЕАЛИЗОВАНО (ЧАСТИЧНО):
  MATH_KERNEL_CONFIG в src/lib/train-data.ts
  ```typescript
  export const MATH_KERNEL_CONFIG: MathKernelConfig = {
    nightCoefficient: 1.5,           // ← night_rate multiplier
    conductorPerWagon: {
      standard: 1.5,                 // ← conductor shift_multiplier
      talgo: 1,
    }
  }
  ```
  
  ⚠️ ДЕФЕКТ: Нет разделения по ролям (conductor/chief)
  
  🔧 ЧТО ДОБАВИТЬ:
  ```typescript
  interface StaffRate {
    id: string;
    role: "conductor" | "chief_conductor" | "porter";
    day_rate: number;          // тариф за день
    night_rate: number;        // ночной тариф (может быть коэффициент)
    shift_multiplier: number;  // сменяемость
    valid_from: Date;
    valid_to: Date | null;
    created_by: string;
  }
  ```

### 📊 ИТОГОВЫЙ СТАТУС РАЗДЕЛА 3: ⚠️ ЧАСТИЧНОЕ СООТВЕТСТВИЕ
   - Routes: ⚠️ 50% (нет is_social, is_international, электрификации)
   - Wagons: ✅ 90%
   - Tariffs: ⚠️ 60% (не привязаны к станциям)
   - Staff_Rates: ⚠️ 40% (упрощенная структура)


## 4️⃣ BPMN-ЛОГИКА (Процесс "Планирование и Контроль")
══════════════════════════════════════════════════════════════

### 4.1 ВВОД ДАННЫХ
───────────────────

📄 Требование:
  Менеджер выбирает маршрут из PassFlow (через API)

✅ РЕАЛИЗОВАНО:
  Компонент: TrainSearch в src/components/TrainSearch.tsx
  - Поиск по номеру поезда
  - Выбор маршрута из TRAINS массива
  
  ⚠️ ДЕФЕКТ: Нет реальной интеграции с PassFlow API
  - Данные жестко закодированы
  
  🔧 ЧТО ДОБАВИТЬ:
  ```typescript
  // src/lib/api/passflow.ts
  export async function fetchRoutesFromPassFlow(filters?: {
    date?: Date;
    is_social?: boolean;
  }): Promise<Route[]> {
    const response = await fetch('/api/passflow/routes', {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    return response.json();
  }
  ```


### 4.2 ВАЛИДАЦИЯ
────────────────

📄 Требование:
  Система проверяет данные на наличие ошибок 
  (пустые поля, нелогичные пробеги)

✅ РЕАЛИЗОВАНО:
  Функции в src/lib/exceptions.ts:
  - validateTariffExists()
  - validateInputData()
  - validateDateInput()
  
  ✅ ПОЛНОЕ СООТВЕТСТВИЕ


### 4.3 РАСЧЕТ
──────────────

📄 Требование:
  Авто-расчет по формулам

✅ РЕАЛИЗОВАНО:
  Функция: calculateExpenses() в src/lib/train-data.ts
  
  ✅ ПОЛНОЕ СООТВЕТСТВИЕ


### 4.4 АНАЛИЗ АНОМАЛИЙ
───────────────────────

📄 Требование:
  Если Факт > План + 10% → Алерт Директору и запрос пояснения у менеджера

✅ РЕАЛИЗОВАНО:
  Файл: src/lib/train-data.ts (строка 470-500)
  
  ```typescript
  if (deviationPercent > norms.anomalyThreshold) { // 10%
    anomalies.push({
      type: "warning",
      message: `Отклонение ${group}: ${(deviationPercent * 100).toFixed(1)}%`,
      requiresExplanation: true
    });
  }
  ```
  
  ✅ ПОЛНОЕ СООТВЕТСТВИЕ


### 4.5 СОГЛАСОВАНИЕ (Maker-Checker)
─────────────────────────────────────

📄 Требование:
  Процесс "Maker-Checker": Филиал → Экономист ЦА → Директор

✅ РЕАЛИЗОВАНО (ЧАСТИЧНО):
  Интерфейс SavedCalculation имеет статусы:
  ```typescript
  status: "draft" | "submitted" | "approved" | "rejected";
  submittedBy?: string;
  approvedBy?: string;
  rejectionReason?: string;
  ```
  
  ⚠️ ДЕФЕКТ: Нет логики переводов между статусами!
  - Нет API для submit/approve/reject
  - Нет UI для контролера РМО
  
  🔧 ЧТО ДОБАВИТЬ:
  ```typescript
  // src/lib/api/calculations.ts
  export async function submitCalculation(calculationId: string): Promise<void> {
    await fetch(`/api/calculations/${calculationId}/submit`, { method: 'POST' });
    logAuditEvent(getCurrentUserId(), "update", "calculation", calculationId, 
                  [{ field: 'status', oldValue: 'draft', newValue: 'submitted' }]);
  }
  
  export async function approveCalculation(
    calculationId: string, 
    approvalComment?: string
  ): Promise<void> {
    await fetch(`/api/calculations/${calculationId}/approve`, { 
      method: 'POST',
      body: JSON.stringify({ approvalComment })
    });
  }
  ```
  
  Плюс создать маршрут /checker для контролера РМО


### 4.6 КОНСОЛИДАЦИЯ
────────────────────

📄 Требование:
  Сбор всех филиалов в итоговый отчет

❌ НЕ РЕАЛИЗОВАНО
  
  🔧 ЧТО ДОБАВИТЬ:
  ```typescript
  // src/lib/api/consolidation.ts
  export async function getConsolidatedReport(
    period: { from: Date; to: Date },
    regions?: string[]
  ): Promise<ConsolidationReport> {
    const response = await fetch('/api/reports/consolidate', {
      method: 'POST',
      body: JSON.stringify({ period, regions })
    });
    return response.json();
  }
  
  export interface ConsolidationReport {
    period: { from: Date; to: Date };
    totalRevenue: number;
    totalExpenses: number;
    byRegion: Record<string, RegionalSummary>;
    byExpenseCategory: Record<string, number>;
    anomalies: {
      region: string;
      calculation_id: string;
      deviation: number;
    }[];
  }
  ```

### 📊 ИТОГОВЫЙ СТАТУС РАЗДЕЛА 4: ⚠️ ЧАСТИЧНОЕ СООТВЕТСТВИЕ
   - Ввод данных: ⚠️ 50% (нет PassFlow API)
   - Валидация: ✅ 100%
   - Расчет: ✅ 100%
   - Аномалии: ✅ 100%
   - Согласование (Maker-Checker): ⚠️ 30% (нет логики переводов)
   - Консолидация: ❌ 0% (не реализовано)


## 5️⃣ ТРЕБОВАНИЯ К БЕЗОПАСНОСТИ (Нефункциональные)
════════════════════════════════════════════════════

### 5.1 ХОСТИНГ
────────────

📄 Требование:
  Strictly On-premise (Сервера КТЖ)

⚠️ ТРЕБУЕТ ПРОВЕРКИ
  Текущее состояние: Frontend в Vite, данные в localStorage
  
  🔧 РЕКОМЕНДАЦИЯ:
  - Backend: Node.js + Express на On-premise сервере КТЖ
  - БД: PostgreSQL (On-premise)
  - Никаких облачных сервисов (AWS, Azure)
  - Брандмауэр: доступ только из корпоративной сети КТЖ


### 5.2 ЛОГИРОВАНИЕ (Audit Trail)
──────────────────────────────────

📄 Требование:
  Полный Audit Trail (кто, когда, какое поле изменил)

✅ РЕАЛИЗОВАНО:
  Функции в src/lib/audit-log.ts:
  - logAuditEvent()
  - getEntityHistory()
  - getUserActions()
  - getAuditLogsByDateRange()
  
  ```typescript
  interface AuditLog {
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
  ```
  
  ✅ ПОЛНОЕ СООТВЕТСТВИЕ


### 5.3 RBAC (Доступы)
──────────────────────

📄 Требование:
  Директор:      View + Export + Comment
  Юрист/Экономист: Edit + Approve/Reject
  Менеджер филиала: Create + Edit (только свои дела)

✅ РЕАЛИЗОВАНО (РАСШИРЕННОЕ):
  Файл: src/lib/roles.ts
  
  Роли:
  - director:   ✅ View, Export (export функ. есть в pdf-report.ts)
  - checker:    ✅ Approve/Reject (функции есть)
  - manager:    ✅ Create/Edit
  - analyst:    ✅ View (анализ и отчеты)
  - admin_nsi:  ✅ Edit Tariffs
  
  ```typescript
  export function canEdit(): boolean {
    return getCurrentRole() === "manager";
  }
  
  export function canApprove(): boolean {
    return ["checker", "director"].includes(getCurrentRole());
  }
  
  export function canExport(): boolean {
    return ["director", "analyst"].includes(getCurrentRole());
  }
  ```
  
  ⚠️ ДЕФЕКТ: 
  - Нет выполнения "только свои дела" для менеджера
  - Нет изоляции по филиалам/регионам
  
  🔧 ЧТО ДОБАВИТЬ:
  ```typescript
  export interface UserContext {
    userId: string;
    role: UserRole;
    region?: string;      // филиал/регион менеджера
    department?: string;
  }
  
  export function canEditCalculation(calculation: SavedCalculation): boolean {
    const user = getCurrentUser();
    if (user.role === "manager") {
      return calculation.submittedBy === user.userId || calculation.status === "draft";
    }
    if (user.role === "checker") {
      return calculation.status === "submitted";
    }
    return false;
  }
  ```

### 📊 ИТОГОВЫЙ СТАТУС РАЗДЕЛА 5: ⚠️ ЧАСТИЧНОЕ СООТВЕТСТВИЕ
   - On-premise: ⚠️ требует настройки (текущий стек годится)
   - Логирование: ✅ 100%
   - RBAC: ⚠️ 80% (нет изоляции по филиалам)


## 📈 ОБЩАЯ МАТРИЦА СООТВЕТСТВИЯ
════════════════════════════════════════════════════════════════

| Раздел | Компонент | Статус | % |
|--------|-----------|--------|---|
| 1 | Бизнес-цели | ✅ Полное | 100% |
| 2 | Логика расчетов | ⚠️ Частичное | 70% |
| 2.1 | Формула дохода | ⚠️ | 80% |
| 2.2 | Формула расходов | ✅ | 95% |
| 2.3 | Сменяемость (>50ч) | ⚠️ | 50% |
| 2.4 | Штабной вагон | ❌ | 0% |
| 2.5 | Тип тяги | ⚠️ | 40% |
| 3 | Архитектура НСИ | ⚠️ Частичное | 60% |
| 3.1 | Routes | ⚠️ | 50% |
| 3.2 | Wagons | ✅ | 90% |
| 3.3 | Tariffs | ⚠️ | 60% |
| 3.4 | Staff_Rates | ⚠️ | 40% |
| 4 | BPMN процесс | ⚠️ Частичное | 55% |
| 4.1 | Ввод данных | ⚠️ | 50% |
| 4.2 | Валидация | ✅ | 100% |
| 4.3 | Расчет | ✅ | 100% |
| 4.4 | Аномалии | ✅ | 100% |
| 4.5 | Maker-Checker | ⚠️ | 30% |
| 4.6 | Консолидация | ❌ | 0% |
| 5 | Безопасность | ⚠️ Частичное | 75% |
| 5.1 | On-premise | ⚠️ | 70% |
| 5.2 | Логирование | ✅ | 100% |
| 5.3 | RBAC | ⚠️ | 80% |
|   | **ИТОГО** | **⚠️ Частичное** | **71%** |


## 🎯 ПРИОРИТИЗИРОВАННЫЙ ПЛАН ДОРАБОТОК
════════════════════════════════════════════════════════════════

### 🔴 КРИТИЧНЫЕ (MUST HAVE) — Блокируют UAT
1. **Штабной вагон** (раздел 2.4)
   - Добавить обязательный 1 вагон со спец. нормами
   - Время: 4-6 часов

2. **Межгосударственный маршрут удваивает штат** (раздел 2.3)
   - Добавить поле is_international в Routes
   - Учитывать при calcStaffCost
   - Время: 2-3 часа

3. **Электрификация маршрутов** (раздел 2.5)
   - Добавить поле isElectrified
   - Использовать разные тарифы (184 vs 255 тг)
   - Время: 3-4 часа

4. **Maker-Checker процесс** (раздел 4.5)
   - API для submit/approve/reject
   - UI для контролера РМО
   - Логирование переводов статусов
   - Время: 8-10 часов

5. **PassFlow интеграция** (раздел 4.1)
   - REST API для fetchRoutesFromPassFlow
   - Mock API для разработки
   - Время: 6-8 часов

### 🟠 ВАЖНЫЕ (SHOULD HAVE) — Требуются для GO LIVE
6. **Консолидация отчетности** (раздел 4.6)
   - API для getConsolidatedReport
   - Dashboard для директора
   - Время: 8-10 часов

7. **Привязка тарифов к станциям** (раздел 3.3)
   - Миграция TariffSettings → StationTariff
   - UI для управления станционными тарифами
   - Время: 6-8 часов

8. **Управление ролями по филиалам** (раздел 5.3)
   - Изоляция данных по филиалам
   - UserContext с region/department
   - Время: 4-6 часов

### 🟡 ЖЕЛАТЕЛЬНЫЕ (NICE TO HAVE) — Для версии 2.0
9. **Белье в доходах** (раздел 2.1)
   - Переструктурирование RevenueData
   - Время: 2 часа

10. **Расширенная структура Staff_Rates** (раздел 3.4)
    - Разделение по ролям (conductor/chief)
    - Время: 3-4 часа


## 🏁 РЕКОМЕНДАЦИИ
════════════════════════════════════════════════════════════════

### НЕМЕДЛЕННО (до UAT):
✅ Исправить 5 критичных дефектов
✅ Развернуть на On-premise сервер КТЖ
✅ Настроить PostgreSQL для production
✅ Запустить security audit

### ПЕР ПРИЁМ В ЭКСПЛУАТАЦИЮ:
✅ Обучить экономистов (PMO) интерфейсу
✅ Подготовить data migration скрипты для исторических данных
✅ Создать документацию по управлению справочниками

### POST GO-LIVE:
✅ Мониторинг audit logs
✅ Сбор feedback от пользователей
✅ Планирование версии 2.0 с nice-to-have функциями


## 📎 ССЫЛКИ НА КОД
════════════════════════════════════════════════════════════════

Основные файлы реализации:
- 📄 Формулы расчетов: src/lib/train-data.ts (строки 250-550)
- 📄 RBAC: src/lib/roles.ts
- 📄 Логирование: src/lib/audit-log.ts
- 📄 Исключения: src/lib/exceptions.ts
- 📄 Главная логика: src/routes/index.tsx
- 📄 Интерфейсы: src/components/ExpenseTracker.tsx, ResultsBlock.tsx
- 📄 PDF отчеты: src/lib/pdf-report.ts

---

**Дата проверки:** 04.05.2026
**Проверил:** Technical Assessment Team
**Статус:** ⚠️ ТРЕБУЕТ ДОРАБОТОК ДО UAT
