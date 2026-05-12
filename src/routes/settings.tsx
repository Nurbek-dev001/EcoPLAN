import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TariffSettingsBlock } from "@/components/TariffSettingsBlock";
import { Button } from "@/components/ui/button";
import { Save, CheckCircle } from "lucide-react";
import { loadTariffs, saveTariffs } from "@/lib/storage";
import { toast } from "sonner";
import type { TariffSettings } from "@/lib/train-data";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Настройки — EcoPlan Hub" },
      { name: "description", content: "Настройки тарифов системы" },
    ],
  }),
  component: SettingsGuard,
});

function SettingsGuard() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("demo_auth", "1");
      sessionStorage.setItem("demo_role", "admin_nsi");
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
            <h1 className="text-sm font-semibold">Настройки тарифов</h1>
          </header>
          <main className="flex-1 overflow-auto">
            <SettingsPage />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function SettingsPage() {
  const [tariffs, setTariffs] = useState<TariffSettings>(loadTariffs());
  const [saved, setSaved] = useState(true);

  const handleTariffChange = (key: keyof TariffSettings, value: number) => {
    setTariffs((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    saveTariffs(tariffs);
    setSaved(true);
    toast.success("Тарифы сохранены");
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <TariffSettingsBlock tariffs={tariffs} onTariffChange={handleTariffChange} />
      <Button
        onClick={handleSave}
        disabled={saved}
        className="w-full h-10 gap-2"
        variant={saved ? "secondary" : "default"}
      >
        {saved ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
        {saved ? "Тарифы сохранены" : "Сохранить тарифы"}
      </Button>
    </div>
  );
}
