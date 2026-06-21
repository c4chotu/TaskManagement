import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, KeyRound, Mail, Lock, ArrowLeft, Send, Sparkles } from "lucide-react";
import { authForgotPassword, authResetPassword } from "@/lib/queries";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — TaskFlow Pro" }] }),
  component: LoginPage,
});

type AuthMode = "login" | "forgot" | "reset";

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("login");

  // Login State
  const [email, setEmail] = useState("sarah@cyberdyne.io");
  const [password, setPassword] = useState("demo");

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState("");

  // Reset Password State
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authForgotPassword(forgotEmail);
      toast.success("Reset token generated!");
      if (res.token) {
        // Pre-fill reset token in dev/mock environments for seamless validation
        setResetToken(res.token);
        toast.info(`Dev Mode Token: ${res.token}`, { duration: 6000 });
      } else {
        toast.info("Check backend terminal logs for reset token");
      }
      setMode("reset");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await authResetPassword(resetToken, newPassword);
      toast.success("Password reset successfully. Sign in with your new password.");
      setPassword(""); // Clear old password
      setMode("login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Password reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className="relative group transition-all duration-300">
        {/* Soft glowing ambient card shadow */}
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/30 via-indigo-500/25 to-primary/35 opacity-75 blur-xl group-hover:opacity-100 transition duration-700 pointer-events-none" />

        <Card className="relative border border-primary/20 bg-card/75 p-8 backdrop-blur-xl rounded-2xl shadow-2xl transition-all duration-500">

          {/* Form Header */}
          <div className="space-y-1.5 text-left mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              {mode === "login" && <>Welcome back <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" /></>}
              {mode === "forgot" && <>Forgot Password?</>}
              {mode === "reset" && <>Reset Password</>}
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {mode === "login" && "Sign in to access your TaskFlow ops cockpit."}
              {mode === "forgot" && "Enter your email to request a validation reset token."}
              {mode === "reset" && "Specify the generated reset token and your new password."}
            </p>
          </div>

          {/* Form Switchers */}
          {mode === "login" && (
            <form className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300" onSubmit={handleLoginSubmit}>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="sarah@cyberdyne.io"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 h-9.5 bg-background/40 border-border/80 focus:border-primary/60 focus:ring-1 focus:ring-primary/60 transition-all rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email); // Autofill email in forgot password
                      setMode("forgot");
                    }}
                    className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors focus:outline-none cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 h-9.5 bg-background/40 border-border/80 focus:border-primary/60 focus:ring-1 focus:ring-primary/60 transition-all rounded-xl"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 bg-gradient-primary hover:opacity-95 text-primary-foreground font-semibold rounded-xl shadow-glow cursor-pointer transition-all active:scale-[0.98]"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                Sign in
              </Button>
            </form>
          )}

          {mode === "forgot" && (
            <form className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300" onSubmit={handleForgotSubmit}>
              <div className="space-y-1.5">
                <Label htmlFor="forgotEmail">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="forgotEmail"
                    type="email"
                    placeholder="sarah@cyberdyne.io"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="pl-9 h-9.5 bg-background/40 border-border/80 focus:border-primary/60 focus:ring-1 focus:ring-primary/60 transition-all rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMode("login")}
                  className="w-1/3 h-10 border-border/80 rounded-xl cursor-pointer hover:bg-muted/15"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-10 bg-gradient-primary hover:opacity-95 text-primary-foreground font-semibold rounded-xl shadow-glow cursor-pointer transition-all active:scale-[0.98]"
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send Code
                </Button>
              </div>
            </form>
          )}

          {mode === "reset" && (
            <form className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300" onSubmit={handleResetSubmit}>
              <div className="space-y-1.5">
                <Label htmlFor="resetToken">Reset Token</Label>
                <Input
                  id="resetToken"
                  type="text"
                  placeholder="Paste token from console"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  className="h-9.5 bg-background/40 border-border/80 focus:border-primary/60 focus:ring-1 focus:ring-primary/60 transition-all rounded-xl font-mono text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-9 h-9.5 bg-background/40 border-border/80 focus:border-primary/60 focus:ring-1 focus:ring-primary/60 transition-all rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMode("forgot")}
                  className="w-1/3 h-10 border-border/80 rounded-xl cursor-pointer hover:bg-muted/15"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-10 bg-gradient-primary hover:opacity-95 text-primary-foreground font-semibold rounded-xl shadow-glow cursor-pointer transition-all active:scale-[0.98]"
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Password"}
                </Button>
              </div>
            </form>
          )}

          {mode === "login" && (
            <p className="mt-6 text-center text-xs text-muted-foreground">
              No workspace yet?{" "}
              <Link to="/register" className="font-semibold text-primary hover:underline transition-all">
                Create one
              </Link>
            </p>
          )}
        </Card>
      </div>
    </AuthShell>
  );
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-screen lg:grid-cols-2 overflow-hidden bg-background">

      {/* Dynamic Animated Blobs in the Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-40 dark:opacity-20">
        <div className="absolute top-1/4 left-1/4 w-[35rem] h-[35rem] rounded-full bg-gradient-to-tr from-primary/10 to-indigo-500/10 blur-[120px] animate-pulse duration-10000" />
        <div className="absolute bottom-1/4 right-1/4 w-[40rem] h-[40rem] rounded-full bg-gradient-to-br from-emerald-500/5 to-primary/10 blur-[130px] animate-pulse duration-7000" />
      </div>

      <div className="relative hidden overflow-hidden bg-sidebar lg:block z-10 border-r border-border/50">
        {/* Abstract vector overlay in sidebar */}
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-primary/5 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(0.72_0.17_155/0.15),transparent_60%)]" />

        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow transition-transform hover:scale-105 duration-300">
              <span className="font-mono text-base font-bold text-primary-foreground">T</span>
            </div>
            <span className="text-base font-bold tracking-tight text-foreground">TaskFlow Pro</span>
          </div>

          <div className="space-y-6">
            <h2 className="text-3xl font-extrabold leading-tight text-foreground tracking-tight">
              Run projects, sprints, and incidents{" "}
              <span className="text-gradient-primary">in one operations cockpit.</span>
            </h2>
            <p className="max-w-md text-xs text-muted-foreground leading-relaxed">
              Role-aware boards, SLA-tracked incident response, on-call routing, and workload
              balancing — all wired to your REST backend.
            </p>
            <ul className="space-y-2.5 text-xs text-muted-foreground">
              {[
                "Kanban + Gantt + Calendar + Workload views",
                "SEV0–SEV3 incident timers with SLA breach alerts",
                "Department-aware auto-routing & on-call paging",
                "Time tracking with weekly approvals",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2.5 hover:text-foreground transition-colors duration-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow" /> {f}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            © 2026 Cyberdyne Systems
          </p>
        </div>
      </div>

      <div className="relative flex items-center justify-center p-6 lg:p-12 z-10 bg-background/50 backdrop-blur-md">
        <div className="w-full max-w-md z-10">{children}</div>
      </div>
    </div>
  );
}

