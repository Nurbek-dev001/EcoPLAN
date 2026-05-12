import { Link, useLocation } from "@tanstack/react-router";
import {
  Calculator,
  FileText,
  Settings,
  LogOut,
  Shield,
  BarChart3,
  Briefcase,
  GitCompare,
  Gavel,
  FlaskConical,
  ClipboardList,
  Map,
  Bell,
  Box,
  Globe,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { getCurrentRole, canEditSettings, canViewReports } from "@/lib/roles";
import { ROLE_LABELS } from "@/lib/train-data";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { AlertCenter } from "./alerts/AlertCenter";
import { useTranslation } from "react-i18next";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const role = getCurrentRole();
  const { t } = useTranslation();

  const items = [
    { title: t("nav.calculation"), url: "/", icon: Calculator, visible: role === "manager" || role === "analyst" },
    { title: t("nav.planFact"), url: "/plan-fact", icon: GitCompare, visible: role === "director" || role === "manager" || role === "analyst" },
    { title: t("nav.scenarios"), url: "/scenarios", icon: FlaskConical, visible: role === "analyst" || role === "manager" || role === "director" },
    { title: t("nav.claims"), url: "/claims", icon: Gavel, visible: role === "manager" || role === "analyst" || role === "checker" },
    { title: t("nav.executive"), url: "/director", icon: Briefcase, visible: role === "director" || role === "manager" },
    { title: t("nav.reports"), url: "/reports", icon: FileText, visible: canViewReports() },
    { title: t("nav.analytics"), url: "/analytics", icon: BarChart3, visible: role === "analyst" || role === "manager" },
    { title: t("nav.map"), url: "/map", icon: Map, visible: role === "analyst" || role === "manager" || role === "director" },
    { title: t("nav.train3d"), url: "/train-3d", icon: Box, visible: role === "director" || role === "analyst" || role === "manager" },
    { title: t("nav.digitalTwin"), url: "/digital-twin", icon: Globe, visible: role === "director" || role === "analyst" || role === "manager" },
    { title: t("nav.audit"), url: "/audit", icon: ClipboardList, visible: role === "checker" || role === "admin_nsi" || role === "director" },
    { title: t("nav.settings"), url: "/settings", icon: Settings, visible: canEditSettings() },
  ].filter((i) => i.visible);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded flex items-center justify-center shrink-0 overflow-hidden">
            <img src="/ktzh-logo.png" alt="КТЖ" className="h-full w-full object-contain" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-sidebar-foreground truncate">{t("app.title")}</p>
              <p className="text-[10px] text-sidebar-foreground/60 truncate">{t("app.subtitle")}</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && (
          <div className="flex items-center gap-2 mb-3 px-1">
            <Shield className="h-3.5 w-3.5 text-sidebar-foreground/50" />
            {/* System role labels stay in Russian regardless of UI language (KTZh standard) */}
            <span className="text-xs text-sidebar-foreground/60">{ROLE_LABELS[role]}</span>
          </div>
        )}
        <div className="flex items-center gap-1 mb-2">
          <AlertCenter />
          <LanguageSwitcher />
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                sessionStorage.removeItem("demo_auth");
                sessionStorage.removeItem("demo_role");
                window.location.href = "/login";
              }}
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>{t("nav.logout")}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
