import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AuthShell } from "./login";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Create workspace — TaskFlow Pro" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", orgName: "", password: "" });
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success("Workspace created");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally { setLoading(false); }
  }

  return (
    <AuthShell>
      <Card className="border-border/60 bg-card/80 p-8 backdrop-blur">
        <h1 className="text-2xl font-semibold tracking-tight">Create your workspace</h1>
        <p className="mt-1 text-sm text-muted-foreground">As Org Owner, you'll have full L5 authority.</p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          {([
            ["name", "Full name", "text", "Sarah Connor"],
            ["email", "Work email", "email", "you@company.com"],
            ["orgName", "Organization", "text", "Cyberdyne Systems"],
            ["password", "Password", "password", "••••••••"],
          ] as const).map(([k, label, type, ph]) => (
            <div className="space-y-1.5" key={k}>
              <Label htmlFor={k}>{label}</Label>
              <Input id={k} type={type} placeholder={ph} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} required />
            </div>
          ))}
          <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground shadow-glow">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create workspace
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Already have one? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
        </p>
      </Card>
    </AuthShell>
  );
}
