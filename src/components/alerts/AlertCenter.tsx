import { useState, useEffect, useCallback } from "react";
import { Bell, X, AlertTriangle, Info, AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { loadAlerts, markAlertRead, dismissAlert, type AlertItem, type AlertSeverity } from "@/lib/alerts/alert-store";
import { useTranslation } from "react-i18next";

const severityConfig: Record<AlertSeverity, { icon: typeof AlertTriangle; color: string; labelKey: string }> = {
  critical: { icon: AlertCircle, color: "text-red-600 bg-red-50 border-red-200", labelKey: "alerts.critical" },
  warning: { icon: AlertTriangle, color: "text-amber-600 bg-amber-50 border-amber-200", labelKey: "alerts.warning" },
  info: { icon: Info, color: "text-blue-600 bg-blue-50 border-blue-200", labelKey: "alerts.info" },
};

export function AlertCenter() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    setAlerts(loadAlerts());
  }, []);

  const unreadCount = alerts.filter((a) => !a.read).length;

  const handleMarkRead = useCallback((id: string) => {
    markAlertRead(id);
    setAlerts(loadAlerts());
  }, []);

  const handleDismiss = useCallback((id: string) => {
    dismissAlert(id);
    setAlerts(loadAlerts());
  }, []);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen((p) => !p)}
        aria-label={t("nav.alerts")}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4.5 w-4.5 flex items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 z-50 rounded-lg border bg-popover shadow-lg">
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-semibold text-sm">{t("alerts.title")}</h3>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="h-80">
            {alerts.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {t("common.all")} {t("alerts.title")} обработаны
              </div>
            ) : (
              <div className="divide-y">
                {alerts.map((alert) => {
                  const cfg = severityConfig[alert.severity];
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={alert.id}
                      className={`p-3 text-sm transition-colors ${alert.read ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-start gap-2">
                        <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.color.split(" ")[0]}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="font-medium truncate">{alert.title}</span>
                            <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>
                              {t(cfg.labelKey)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{alert.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {new Date(alert.timestamp).toLocaleString("ru-RU")}
                          </p>
                          <div className="flex gap-2 mt-2">
                            {!alert.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs gap-1"
                                onClick={() => handleMarkRead(alert.id)}
                              >
                                <Check className="h-3 w-3" /> {t("alerts.markRead")}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs text-muted-foreground hover:text-destructive"
                              onClick={() => handleDismiss(alert.id)}
                            >
                              <X className="h-3 w-3" /> {t("common.close")}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
