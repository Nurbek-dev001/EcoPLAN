import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABELS, ROLE_DESCRIPTIONS, type UserRole } from "@/lib/train-data";
import { LogIn } from "lucide-react";

const ROLES: UserRole[] = ["manager", "analyst", "director", "checker", "admin_nsi"];

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Вход — EcoPlan Hub" },
      { name: "description", content: "Выберите роль для входа в EcoPlan Hub" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<UserRole>("manager");

  const handleLogin = () => {
    sessionStorage.setItem("demo_auth", "1");
    sessionStorage.setItem("demo_role", selectedRole);

    const roleRoutes: Record<string, string> = {
      manager: "/",
      analyst: "/analytics",
      director: "/director",
      checker: "/reports",
      admin_nsi: "/settings",
    };

    navigate({ to: roleRoutes[selectedRole] || "/" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="h-10 w-10 rounded flex items-center justify-center overflow-hidden">
              <img src="/ktzh-logo.png" alt="КТЖ" className="h-full w-full object-contain" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">EcoPlan Hub</CardTitle>
          <p className="text-center text-sm text-muted-foreground">
            Выберите роль для входа
          </p>
        </CardHeader>

        <CardContent className="space-y-3">
          {ROLES.map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                selectedRole === role
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-accent"
              }`}
            >
              <div
                className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  selectedRole === role ? "border-primary" : "border-muted-foreground/30"
                }`}
              >
                {selectedRole === role && (
                  <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{ROLE_LABELS[role]}</p>
                <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
              </div>
            </button>
          ))}

          <Button onClick={handleLogin} className="w-full gap-2 mt-2">
            <LogIn className="h-4 w-4" />
            Войти
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
