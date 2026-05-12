import type { ExceptionContext } from "./train-data";

/**
 * Exception Handling Module
 * Реализация требований раздела 8 "Обработка исключительных ситуаций"
 * Обеспечивает бесперебойную работу системы и защиту от "человеческого фактора"
 */

interface AlertConfig {
  type: "success" | "info" | "warning" | "error";
  title: string;
  message: string;
  timestamp: Date;
  autoClose?: number;
}

export class EcoPlanException {
  context: ExceptionContext;

  constructor(context: ExceptionContext) {
    this.context = context;
  }

  getAlert(): AlertConfig {
    switch (this.context.type) {
      case "missing_tariff":
        return {
          type: "error",
          title: "Ошибка расчета",
          message: this.context.message,
          timestamp: new Date(),
        };

      case "integration_error":
        return {
          type: "warning",
          title: "Внимание",
          message: this.context.message,
          timestamp: new Date(),
        };

      case "invalid_input":
        return {
          type: "error",
          title: "Некорректный ввод",
          message: this.context.message,
          timestamp: new Date(),
        };

      case "data_validation":
        return {
          type: "warning",
          title: "Проверка данных",
          message: this.context.message,
          timestamp: new Date(),
        };

      default:
        return {
          type: "warning",
          title: "Системная ошибка",
          message: "Неизвестная ошибка",
          timestamp: new Date(),
        };
    }
  }
}

/**
 * 1. Сбой интеграции с мастер-системой (PassFlow недоступен)
 * Если API не отвечает более 10 секунд, используется локальный кэш
 */
export async function fetchWithCache<T>(
  fetchFn: () => Promise<T>,
  cacheKey: string,
  timeout: number = 10000
): Promise<{ data: T; isFromCache: boolean }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const data = await fetchFn();
    clearTimeout(timeoutId);

    // Сохраняем успешный результат в кэш
    if (typeof window !== "undefined") {
      sessionStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
    }

    return { data, isFromCache: false };
  } catch (error) {
    // Пытаемся использовать кэшированные данные
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const { data } = JSON.parse(cached);
          console.warn(`Using cached data for ${cacheKey} due to API timeout or error`);
          return { data, isFromCache: true };
        } catch (parseError) {
          console.error(`Failed to parse cached data for ${cacheKey}`);
        }
      }
    }

    throw new EcoPlanException({
      type: "integration_error",
      severity: "error",
      message: `Внимание: связь с сервером расписаний временно недоступна, используются данные по состоянию на [${new Date().toLocaleString("ru-RU")}]`,
      timestamp: new Date(),
    });
  }
}

/**
 * 2. Отсутствие тарифа в справочнике НСИ
 * Система блокирует итоговый расчет, если тариф не найден
 */
export function validateTariffExists(tariff: number | undefined, fieldName: string, stationName?: string): void {
  if (tariff === undefined || tariff === null) {
    throw new EcoPlanException({
      type: "missing_tariff",
      severity: "error",
      message: `Ошибка расчета: Отсутствует норматив '${fieldName}' для станции ${
        stationName || "—"
      }. Обратитесь к Администратору ЦА`,
      timestamp: new Date(),
    });
  }
}

/**
 * 3. Некорректный ввод данных Исполнителем
 */
export function validateInputData(value: number, fieldName: string, options?: { allowNegative?: boolean; minDate?: Date }): void {
  // Запрещен ввод отрицательных значений
  if (!options?.allowNegative && value < 0) {
    throw new EcoPlanException({
      type: "invalid_input",
      severity: "error",
      message: `Ошибка: Отрицательное значение для поля "${fieldName}" недопустимо`,
      timestamp: new Date(),
    });
  }
}

/**
 * Валидация даты (запрещено планирование прошлого периода без прав)
 */
export function validateDateInput(inputDate: Date, isCheckerOrAdmin: boolean): void {
  const now = new Date();
  if (inputDate < now && !isCheckerOrAdmin) {
    throw new EcoPlanException({
      type: "invalid_input",
      severity: "error",
      message: `Ошибка: Планирование прошлого периода возможно только для Контролеров и Администраторов`,
      timestamp: new Date(),
    });
  }
}

/**
 * Получение подходящей версии тарифа на определённую дату
 * (реализация требования по версионированию справочников)
 */
export function getVersionedTariff<T extends { validFrom: Date; validTo: Date | null }>(
  versions: T[],
  targetDate: Date
): T | undefined {
  // Сортируем по дате действия
  const sorted = [...versions].sort((a, b) => new Date(b.validFrom).getTime() - new Date(a.validFrom).getTime());

  // Ищем подходящую версию
  return sorted.find((v) => {
    const validFrom = new Date(v.validFrom);
    const validTo = v.validTo ? new Date(v.validTo) : null;

    return validFrom <= targetDate && (!validTo || targetDate <= validTo);
  });
}

export function handleException(exception: EcoPlanException): void {
  const alert = exception.getAlert();
  console.warn(`[${alert.type.toUpperCase()}] ${alert.title}: ${alert.message}`);

  // На практике здесь вызывается toast уведомление
  if (typeof window !== "undefined") {
    sessionStorage.setItem("last_exception", JSON.stringify(alert));
  }
}
