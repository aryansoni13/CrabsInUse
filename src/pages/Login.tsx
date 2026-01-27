import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, ArrowRight } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate("/dashboard");
    }
  }, [currentUser, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setError("");
      setLoading(true);
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError("Failed to log in");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Visual Side (Hidden on Mobile) */}
      <div className="hidden lg:relative lg:flex flex-col justify-between p-12 bg-slate-900 text-white overflow-hidden">
        {/* Abstract Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-violet-900/80 z-0"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0 mix-blend-overlay"></div>

        {/* Floating Shapes */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/30 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-600/30 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 font-bold text-2xl tracking-tight">
            <div className="bg-white/10 backdrop-blur-sm p-2 rounded-lg border border-white/20">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span>CRABS</span>
          </div>
        </div>

        <div className="relative z-10 max-w-lg space-y-6">
          <h1 className="text-5xl font-extrabold tracking-tight leading-tight">
            Welcome back to <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-200">
              Smart Construction.
            </span>
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed">
            "The accuracy and speed of CRABS have completely transformed how we
            handle our billing cycles. It's indispensable."
          </p>
          <div className="flex items-center gap-4 pt-4">
            <div className="flex -space-x-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-700"
                ></div>
              ))}
            </div>
            <div className="text-sm font-medium text-slate-300">
              Used by 500+ Top Contractors
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-slate-400">
          © 2024 CRABS System. All Rights Reserved.
        </div>
      </div>

      {/* Login Form Side */}
      <div className="flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-[400px] space-y-8 animate-fade-in">
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight">
              Sign in to your account
            </h2>
            <p className="text-muted-foreground">
              Enter your details below to access your dashboard
            </p>
          </div>

          {error && (
            <Alert
              variant="destructive"
              className="animate-in slide-in-from-top-2"
            >
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 bg-secondary/30 border-border/60 focus:bg-background transition-all"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 bg-secondary/30 border-border/60 focus:bg-background transition-all"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? (
                "Signing in..."
              ) : (
                <span className="flex items-center">
                  Sign In <ArrowRight className="ml-2 h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                New to CRABS?
              </span>
            </div>
          </div>

          <div className="text-center">
            <Link to="/signup">
              <Button
                variant="outline"
                className="w-full h-11 border-2 border-border/60 hover:bg-secondary/50"
              >
                Create an account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
