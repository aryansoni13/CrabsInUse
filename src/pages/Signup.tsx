import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, CheckCircle2, Phone, FileText } from "lucide-react";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  // New State variables
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [gstNumber, setGstNumber] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup, currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate("/dashboard");
    }
  }, [currentUser, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== passwordConfirm) {
      return setError("Passwords do not match");
    }

    if (password.length < 6) {
      return setError("Password must be at least 6 characters");
    }

    if (!fullName.trim()) {
      return setError("Full Name is required");
    }

    if (!companyName.trim()) {
      return setError("Company Name is required");
    }

    if (!mobileNumber.trim()) {
      return setError("Mobile Number is required");
    }

    try {
      setError("");
      setLoading(true);
      await signup(email, password, fullName, {
        companyName,
        mobileNumber,
        gstNumber,
      });
      navigate("/dashboard");
    } catch (err) {
      setError("Failed to create an account");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Visual Side (Hidden on Mobile) */}
      <div className="hidden lg:relative lg:flex flex-col justify-between p-12 bg-slate-900 text-white overflow-hidden order-1 lg:order-2">
        {/* Abstract Background */}
        <div className="absolute inset-0 bg-gradient-to-bl from-violet-900/80 to-primary/80 z-0"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0 mix-blend-overlay"></div>

        {/* Floating Shapes */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10 flex justify-end">
          <div className="flex items-center gap-2 font-bold text-2xl tracking-tight opacity-50">
            <Building2 className="h-6 w-6" />
            <span>CRABS</span>
          </div>
        </div>

        <div className="relative z-10 max-w-lg space-y-8">
          <h1 className="text-5xl font-extrabold tracking-tight leading-tight">
            Join the <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-emerald-200">
              Industry Leaders.
            </span>
          </h1>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/20 p-1 rounded-full text-emerald-300">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="font-medium text-slate-200">
                Free 14-day trial of Pro features
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/20 p-1 rounded-full text-emerald-300">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="font-medium text-slate-200">
                Unlimited projects and measurements
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/20 p-1 rounded-full text-emerald-300">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="font-medium text-slate-200">
                Priority support access
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-slate-400">
          © 2024 CRABS System. Privacy Policy
        </div>
      </div>

      {/* Signup Form Side */}
      <div className="flex items-center justify-center p-6 lg:p-12 bg-background order-2 lg:order-1 overflow-y-auto">
        <div className="w-full max-w-[400px] space-y-6 animate-fade-in py-8">
          <div className="space-y-2 text-center lg:text-left">
            <div className="flex items-center gap-2 font-bold text-xl text-primary lg:hidden justify-center mb-4">
              <Building2 className="h-5 w-5" />
              <span>CRABS</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight">
              Create your account
            </h2>
            <p className="text-muted-foreground">
              Get started with CRABS in seconds
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="e.g. John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="bg-secondary/30 h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="companyName"
                  type="text"
                  placeholder="e.g. Acme Constructions"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  className="pl-9 bg-secondary/30 h-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mobileNumber">Mobile Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="mobileNumber"
                    type="tel"
                    placeholder="9876543210"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    required
                    className="pl-9 bg-secondary/30 h-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gstNumber">GST Number (Optional)</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="gstNumber"
                    type="text"
                    placeholder="22AAAAA0000A1Z5"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    className="pl-9 bg-secondary/30 h-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-secondary/30 h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-secondary/30 h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password-confirm">Confirm Password *</Label>
              <Input
                id="password-confirm"
                type="password"
                placeholder="Confirm your password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                className="bg-secondary/30 h-10"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98] mt-2"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="text-center text-sm pb-8">
            <p className="text-muted-foreground">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium text-primary hover:underline underline-offset-4"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
