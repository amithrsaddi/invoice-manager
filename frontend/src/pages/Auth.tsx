import React, { useMemo, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Moon, Sun } from "lucide-react";

export default function Auth() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const heroImagePath = "/auth-login-hero.png";

  const headingText = useMemo(
    () => (mode === "login" ? "Track invoices, payments, and financial records with ease" : "Create Your Account To Start Managing Invoices"),
    [mode]
  );

  const toggleTheme = () => {
    const nextIsDark = !isDark;
    setIsDark(nextIsDark);
    if (nextIsDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("invoice_manager_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("invoice_manager_theme", "light");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login({ email, password });
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
      <div className="absolute right-4 top-4 z-20">
        <button
          type="button"
          onClick={toggleTheme}
          className="h-7 w-[76px] rounded-full border border-border bg-card p-1 hover:bg-secondary"
          aria-label="Toggle light and dark mode"
        >
          <span className={`relative flex h-full w-full items-center ${isDark ? "justify-end" : "justify-start"}`}>
            <span className="absolute left-1 text-muted-foreground">
              <Sun className="h-[9px] w-[9px]" />
            </span>
            <span className="absolute right-1 text-muted-foreground">
              <Moon className="h-[9px] w-[9px]" />
            </span>
            <span className="z-10 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-all">
              {isDark ? <Moon className="h-[9px] w-[9px]" /> : <Sun className="h-[9px] w-[9px]" />}
            </span>
          </span>
        </button>
      </div>

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
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                    className="h-12 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-300"
                  />
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
