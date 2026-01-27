import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, ArrowLeft, Mail } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setMessage("");
      setError("");
      setLoading(true);
      await resetPassword(email);
      setMessage("Check your inbox for further instructions");
    } catch (err) {
      setError("Failed to reset password");
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
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-slate-800 to-primary/40 z-0"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0 mix-blend-overlay"></div>

        {/* Floating Shapes */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-sky-500/20 rounded-full blur-[100px]" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 font-bold text-2xl tracking-tight opacity-50">
            <Building2 className="h-6 w-6" />
            <span>CRABS</span>
          </div>
        </div>

        <div className="relative z-10 max-w-lg space-y-6">
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
            Account Recovery
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed">
            Don't worry, even the best builders lose their blueprints sometimes.
            We'll help you get back on track.
          </p>
        </div>

        <div className="relative z-10 text-sm text-slate-400">
          © 2024 CRABS System
        </div>
      </div>

      {/* Form Side */}
      <div className="flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-[400px] space-y-8 animate-fade-in">
          <div className="space-y-2 text-center lg:text-left">
            <Link
              to="/login"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Login
            </Link>
            <h2 className="text-3xl font-bold tracking-tight">
              Reset Password
            </h2>
            <p className="text-muted-foreground">
              Enter your email to receive reset instructions
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

          {message && (
            <Alert className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 animate-in slide-in-from-top-2">
              <AlertDescription>{message}</AlertDescription>
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

            <Button
              type="submit"
              className="w-full h-11 text-base shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? (
                "Sending Instructions..."
              ) : (
                <span className="flex items-center">
                  Send Reset Link <Mail className="ml-2 h-4 w-4" />
                </span>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
