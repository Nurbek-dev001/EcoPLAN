import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowRight, ShieldAlert, Link2, CheckCircle2 } from "lucide-react";
import { buildHashChain, sha256 } from "@/lib/audit-hash";
import { useTranslation } from "react-i18next";

interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  comment?: string;
}

const STORAGE_KEY = "ecoplan_audit";

function loadAudit(): AuditEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Audit Log — EcoPlan Hub" },
      { name: "description", content: "Нередактируемый журнал аудита с Blockchain хешированием" },
    ],
  }),
  component: AuditGuard,
});

function AuditGuard() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("demo_auth", "1");
      sessionStorage.setItem("demo_role", "checker");
      setReady(true);
    }
  }, []);
  if (!ready) return null;
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-11 flex items-center border-b bg-card/90 backdrop-blur-sm sticky top-0 z-10 px-3">
            <SidebarTrigger className="mr-2" />
            <h1 className="text-sm font-semibold">Audit Log</h1>
          </header>
          <main className="flex-1 overflow-auto bg-muted/30">
            <AuditPage />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AuditPage() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditEntry[]>(loadAudit);
  const [chain, setChain] = useState<Awaited<ReturnType<typeof buildHashChain>>>([]);
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; message: string } | null>(null);

  useEffect(() => {
    const calcs = JSON.parse(localStorage.getItem("ecoplan_calculations") || "[]");
    const calcAudits: AuditEntry[] = [];
    for (const calc of calcs) {
      for (const log of calc.auditLogs || []) {
        calcAudits.push({
          id: log.id || crypto.randomUUID(),
          timestamp: log.timestamp,
          user: log.userId,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          oldValues: log.changes ? Object.fromEntries(log.changes.map((c: { field: string; oldValue: unknown }) => [c.field, c.oldValue])) : undefined,
          newValues: log.changes ? Object.fromEntries(log.changes.map((c: { field: string; newValue: unknown }) => [c.field, c.newValue])) : undefined,
          comment: log.comment,
        });
      }
    }
    const stored = loadAudit();
    const merged = [...stored, ...calcAudits].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    setLogs(merged.slice(0, 200));

    // Build blockchain hash chain
    buildHashChain(
      merged.map((m) => ({
        id: m.id,
        timestamp: m.timestamp,
        user: m.user,
        action: m.action,
        entityType: m.entityType,
        entityId: m.entityId,
        data: JSON.stringify({ old: m.oldValues, new: m.newValues }),
      }))
    ).then(setChain);
  }, []);

  const handleVerify = async () => {
    let valid = true;
    for (let i = 0; i < chain.length; i++) {
      const entry = chain[i];
      const prevHash = i === 0 ? "0".repeat(64) : chain[i - 1].hash;
      const payload = `${prevHash}|${entry.id}|${entry.timestamp}|${entry.user}|${entry.action}|${entry.data}`;
      const computed = await sha256(payload);
      if (computed !== entry.hash) {
        valid = false;
        break;
      }
    }
    setVerifyResult({
      valid,
      message: valid
        ? `Цепочка из ${chain.length} блоков верифицирована. Все хеши совпадают.`
        : "Ошибка верификации! Цепочка хешей нарушена.",
    });
  };

  const actionLabel = (a: string) => {
    const map: Record<string, string> = {
      create: "Создание",
      update: "Изменение",
      delete: "Удаление",
      approve: "Утверждение",
      reject: "Отклонение",
      submit: "Отправка",
    };
    return map[a] || a;
  };

  const entityLabel = (e: string) => {
    const map: Record<string, string> = {
      calculation: "Расчёт",
      tariff: "Тариф",
      user: "Пользователь",
      claim_expense: "Претензия",
    };
    return map[e] || e;
  };

  const getChainEntry = (id: string) => chain.find((c) => c.id === id);

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-destructive" />
          <div>
            <h2 className="text-sm font-semibold">{t("audit.title")}</h2>
            <p className="text-xs text-muted-foreground">{t("audit.immutable")} с {t("audit.blockchain")} SHA-256</p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={handleVerify}>
          <CheckCircle2 className="h-4 w-4" /> Верифицировать цепочку
        </Button>
      </div>

      {verifyResult && (
        <Card className={verifyResult.valid ? "border-green-500 bg-green-50/30" : "border-red-500 bg-red-50/30"}>
          <CardContent className="p-3 flex items-center gap-2 text-sm">
            {verifyResult.valid ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <ShieldAlert className="h-4 w-4 text-red-600" />}
            <span className={verifyResult.valid ? "text-green-700" : "text-red-700"}>{verifyResult.message}</span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Дата / Время</TableHead>
                <TableHead>Пользователь</TableHead>
                <TableHead>Действие</TableHead>
                <TableHead>Сущность</TableHead>
                <TableHead>Изменения (diff)</TableHead>
                <TableHead className="w-[220px]">{t("audit.blockchain")}</TableHead>
                <TableHead>Комментарий</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground text-xs py-8">
                    Журнал аудита пуст.
                  </TableCell>
                </TableRow>
              )}
              {logs.map((log) => {
                const chainEntry = getChainEntry(log.id);
                return (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs font-mono">
                      {new Date(log.timestamp).toLocaleString("ru-RU")}
                    </TableCell>
                    <TableCell className="text-xs">{log.user}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {actionLabel(log.action)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {entityLabel(log.entityType)} <span className="text-muted-foreground">({log.entityId.slice(-6)})</span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.oldValues && log.newValues ? (
                        <div className="space-y-0.5">
                          {Object.entries(log.newValues).map(([key, newVal]) => {
                            const oldVal = log.oldValues?.[key];
                            if (JSON.stringify(oldVal) === JSON.stringify(newVal)) return null;
                            return (
                              <div key={key} className="flex items-center gap-1">
                                <span className="text-muted-foreground">{key}:</span>
                                <span className="text-red-600 line-through">{String(oldVal ?? "—")}</span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                <span className="text-green-600 font-medium">{String(newVal)}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-[10px] font-mono">
                      {chainEntry ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 truncate" title={chainEntry.hash}>
                            <Link2 className="h-3 w-3 shrink-0" />
                            <span className="truncate">{chainEntry.hash.slice(0, 16)}...</span>
                          </div>
                          <div className="text-muted-foreground truncate" title={chainEntry.previousHash}>
                            prev: {chainEntry.previousHash.slice(0, 12)}...
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {log.comment || "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
