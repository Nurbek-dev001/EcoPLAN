import type { AuditLog } from "./train-data";

const AUDIT_LOG_KEY = "ecoplan_audit_logs";

/**
 * Функция логирования изменений в систему EcoPlan Hub
 * Логирует: Кто, Когда, Было, Стало
 * Все изменения фиксируются в неудаляемом журнале
 */
export function logAuditEvent(
  userId: string,
  action: AuditLog["action"],
  entityType: AuditLog["entityType"],
  entityId: string,
  changes: AuditLog["changes"],
  comment?: string
): AuditLog {
  const auditLog: AuditLog = {
    id: generateAuditId(),
    timestamp: new Date(),
    userId,
    action,
    entityType,
    entityId,
    changes,
    comment,
  };

  // Сохраняем в локальное хранилище (на практике - в БД)
  if (typeof window !== "undefined") {
    try {
      const existing = loadAuditLogs();
      existing.push(auditLog);
      localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(existing));
    } catch (e) {
      console.error("Failed to save audit log:", e);
    }
  }

  return auditLog;
}

export function loadAuditLogs(): AuditLog[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(AUDIT_LOG_KEY);
    if (!data) return [];
    return JSON.parse(data).map((log: any) => ({
      ...log,
      timestamp: new Date(log.timestamp),
    }));
  } catch (e) {
    console.error("Failed to load audit logs:", e);
    return [];
  }
}

/**
 * Получение истории изменений для конкретной сущности
 */
export function getEntityHistory(entityId: string): AuditLog[] {
  return loadAuditLogs().filter((log) => log.entityId === entityId);
}

/**
 * Получение всех действий конкретного пользователя
 */
export function getUserActions(userId: string): AuditLog[] {
  return loadAuditLogs().filter((log) => log.userId === userId);
}

/**
 * Получение логов за определённый период
 */
export function getAuditLogsByDateRange(startDate: Date, endDate: Date): AuditLog[] {
  return loadAuditLogs().filter((log) => {
    const logDate = new Date(log.timestamp);
    return logDate >= startDate && logDate <= endDate;
  });
}

function generateAuditId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Форматирование записи аудита для отображения
 */
export function formatAuditLog(log: AuditLog): string {
  const timestamp = log.timestamp.toLocaleString("ru-RU");
  const actionLabel = getActionLabel(log.action);
  const changesSummary = log.changes
    .map((c) => `${c.field}: ${c.oldValue} → ${c.newValue}`)
    .join("; ");

  return `[${timestamp}] ${log.userId} ${actionLabel} ${log.entityType} #${log.entityId}: ${changesSummary}${
    log.comment ? ` (Примечание: ${log.comment})` : ""
  }`;
}

function getActionLabel(action: AuditLog["action"]): string {
  const labels: Record<AuditLog["action"], string> = {
    create: "создал",
    update: "обновил",
    approve: "одобрил",
    reject: "отклонил",
    archive: "архивировал",
  };
  return labels[action];
}
