import React, { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const REMEMBERED_EMAIL_KEY = "invoice_manager_remembered_email";

export default function Auth() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const heroImagePath = "/auth-login-hero.png";

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  const headingText = useMemo(
    () => (mode === "login" ? "Track invoices, payments, and financial records with ease" : "Create Your Account To Start Managing Invoices"),
    [mode]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login({ email, password });
        if (rememberMe && email.trim()) {
          localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim().toLowerCase());
        } else {
          localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        }
      } else {
        await register({ name, email, password });
      }
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#eef0ff] px-3 py-4 sm:px-4 sm:py-8">
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl items-start justify-center pt-10 sm:min-h-[calc(100vh-4rem)] sm:items-center sm:pt-0">
        <div className="grid w-full overflow-hidden rounded-xl border border-slate-200/60 bg-white/95 shadow-xl backdrop-blur-sm sm:rounded-2xl sm:shadow-2xl md:grid-cols-2">
          <div className="flex items-center">
            <div className="w-full max-w-md px-5 py-6 sm:px-8 sm:py-10 md:px-10">
              <div className="mb-5 overflow-hidden rounded-lg border border-slate-200 md:hidden">
                <img
                  src={heroImagePath}
                  alt="Finance and invoice illustration"
                  className="h-32 w-full object-cover object-center sm:h-40"
                />
              </div>
              <p className="text-[30px] font-semibold tracking-wide text-indigo-600">Invoice Manager</p>
              <h1 className="mt-4 text-[16px] font-semibold leading-tight text-slate-900 sm:mt-6 sm:text-[22px]">{headingText}</h1>
              <p className="mt-2 text-sm text-slate-500">
                {mode === "login" ? "Welcome back. Please log in to your account." : "Set up your credentials and continue."}
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4 sm:mt-7">
                {mode === "register" && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="h-12 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={6}
                      required
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      className="h-12 w-full rounded-md border border-slate-300 bg-white py-3 pl-3 pr-11 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-300"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline focus-visible:ring-2 focus-visible:ring-indigo-300"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
                    </button>
                  </div>
                  {mode === "login" ? (
                    <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      Remember me
                    </label>
                  ) : null}
                </div>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}

                <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                  <button
                    type={mode === "login" ? "submit" : "button"}
                    disabled={loading}
                    onClick={() => {
                      if (mode !== "login") {
                        setMode("login");
                        setError("");
                      }
                    }}
                    className={`h-11 ${
                      mode === "login"
                        ? "bg-indigo-600 text-white hover:bg-indigo-500"
                        : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                    } rounded-md px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {mode === "login" ? (loading ? "Please wait..." : "Login") : "Login"}
                  </button>
                  <button
                    type={mode === "register" ? "submit" : "button"}
                    disabled={loading}
                    onClick={() => {
                      if (mode !== "register") {
                        setMode("register");
                        setError("");
                      }
                    }}
                    className={`h-11 ${
                      mode === "register"
                        ? "bg-indigo-600 text-white hover:bg-indigo-500"
                        : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                    } rounded-md px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {mode === "register" ? (loading ? "Please wait..." : "Sign Up") : "Sign Up"}
                  </button>
                </div>

                {mode === "login" ? (
                  <p className="pt-2 text-sm text-slate-500">
                    New here?{" "}
                    <button
                      type="button"
                      className="font-medium text-indigo-600 hover:text-indigo-500"
                      onClick={() => {
                        setMode("register");
                        setError("");
                      }}
                    >
                      Create an account
                    </button>
                  </p>
                ) : (
                  <p className="pt-2 text-sm text-slate-500">
                    Already registered?{" "}
                    <button
                      type="button"
                      className="font-medium text-indigo-600 hover:text-indigo-500"
                      onClick={() => {
                        setMode("login");
                        setError("");
                      }}
                    >
                      Login instead
                    </button>
                  </p>
                )}
              </form>
            </div>
          </div>

          <div className="relative hidden min-h-[620px] md:block">
            <img
              src={heroImagePath}
              alt="Finance and invoice illustration"
              className="h-full w-full object-cover object-center"
            />
            <div className="pointer-events-none absolute inset-0 bg-indigo-500/10" />
          </div>
        </div>
      </div>
    </div>
  );
}
