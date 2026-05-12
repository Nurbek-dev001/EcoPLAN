import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Gavel } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/claims")({
  head: () => ({
    meta: [
      { title: "Претензионные расходы — EcoPlan Hub" },
      { name: "description", content: "Управление претензионными расходами КТЖ" },
    ],
  }),
  component: ClaimsGuard,
});

interface ClaimItem {
  id: string;
  bin: string;
  companyName: string;
  city: string;
  judgeName: string;
  duty: number;
  penalty: number;
  attorney: number;
  status: "pending" | "resolved" | "rejected";
  description: string;
  date: string;
}

const STORAGE_KEY = "ecoplan_claims";

function loadClaims(): ClaimItem[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveClaims(claims: ClaimItem[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(claims));
  }
}

function ClaimsGuard() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("demo_auth", "1");
      sessionStorage.setItem("demo_role", "manager");
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
            <h1 className="text-sm font-semibold">Претензионные расходы</h1>
          </header>
          <main className="flex-1 overflow-auto bg-muted/30">
            <ClaimsPage />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

import { useEffect } from "react";

function ClaimsPage() {
  const [claims, setClaims] = useState<ClaimItem[]>(loadClaims);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    bin: "",
    companyName: "",
    city: "",
    judgeName: "",
    duty: 0,
    penalty: 0,
    attorney: 0,
    description: "",
  });

  useEffect(() => {
    saveClaims(claims);
  }, [claims]);

  const total = (c: ClaimItem) => c.duty + c.penalty + c.attorney;
  const fmt = (n: number) => `${n.toLocaleString("ru-RU")} тг`;

  const handleAdd = () => {
    if (!form.bin || !form.companyName || !form.city) {
      toast.error("Заполните обязательные поля: БИН, Компания, Город");
      return;
    }
    const newClaim: ClaimItem = {
      id: crypto.randomUUID(),
      bin: form.bin,
      companyName: form.companyName,
      city: form.city,
      judgeName: form.judgeName,
      duty: Number(form.duty) || 0,
      penalty: Number(form.penalty) || 0,
      attorney: Number(form.attorney) || 0,
      status: "pending",
      description: form.description,
      date: new Date().toISOString(),
    };
    setClaims((prev) => [newClaim, ...prev]);
    setShowForm(false);
    setForm({ bin: "", companyName: "", city: "", judgeName: "", duty: 0, penalty: 0, attorney: 0, description: "" });
    toast.success("Претензия добавлена");
  };

  const handleDelete = (id: string) => {
    setClaims((prev) => prev.filter((c) => c.id !== id));
    toast.success("Претензия удалена");
  };

  const handleStatusChange = (id: string, status: ClaimItem["status"]) => {
    setClaims((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
  };

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Претензионные расходы</h2>
          <p className="text-xs text-muted-foreground">БИН, судья, разбивка суммы</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" />
          {showForm ? "Отмена" : "Добавить"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Gavel className="h-4 w-4" />
              Новая претензия
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">БИН</Label>
                <Input value={form.bin} onChange={(e) => setForm((f) => ({ ...f, bin: e.target.value }))} className="h-9 text-sm" placeholder="940440001234" />
              </div>
              <div>
                <Label className="text-xs">Компания</Label>
                <Input value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Город</Label>
                <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Судья</Label>
                <Input value={form.judgeName} onChange={(e) => setForm((f) => ({ ...f, judgeName: e.target.value }))} className="h-9 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Пошлина (тг)</Label>
                <Input type="number" value={form.duty} onChange={(e) => setForm((f) => ({ ...f, duty: Number(e.target.value) }))} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Пеня (тг)</Label>
                <Input type="number" value={form.penalty} onChange={(e) => setForm((f) => ({ ...f, penalty: Number(e.target.value) }))} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Адвокат (тг)</Label>
                <Input type="number" value={form.attorney} onChange={(e) => setForm((f) => ({ ...f, attorney: Number(e.target.value) }))} className="h-9 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Описание</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="text-sm min-h-[60px]" />
            </div>
            <Button onClick={handleAdd} className="w-full h-9">Сохранить претензию</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>БИН / Компания</TableHead>
                <TableHead>Город / Судья</TableHead>
                <TableHead className="text-right">Пошлина</TableHead>
                <TableHead className="text-right">Пеня</TableHead>
                <TableHead className="text-right">Адвокат</TableHead>
                <TableHead className="text-right">Итого</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="w-[40px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground text-xs py-8">
                    Нет претензий. Нажмите «Добавить».
                  </TableCell>
                </TableRow>
              )}
              {claims.map((claim) => (
                <TableRow key={claim.id}>
                  <TableCell className="text-xs">
                    <div className="font-medium">{claim.companyName}</div>
                    <div className="text-muted-foreground">БИН: {claim.bin}</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div>{claim.city}</div>
                    <div className="text-muted-foreground">{claim.judgeName || "—"}</div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmt(claim.duty)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmt(claim.penalty)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmt(claim.attorney)}</TableCell>
                  <TableCell className="text-right font-mono text-xs font-bold">{fmt(total(claim))}</TableCell>
                  <TableCell>
                    <select
                      value={claim.status}
                      onChange={(e) => handleStatusChange(claim.id, e.target.value as ClaimItem["status"])}
                      className="text-xs border rounded px-1 py-0.5 bg-card"
                    >
                      <option value="pending">На рассмотрении</option>
                      <option value="resolved">Удовлетворена</option>
                      <option value="rejected">Отклонена</option>
                    </select>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDelete(claim.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
