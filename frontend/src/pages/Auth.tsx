import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    <div className="relative min-h-screen bg-muted/20 flex flex-col items-center justify-center p-4">
      <div className="absolute right-4 top-4">
        <Button
          type="button"
          variant="ghost"
          onClick={toggleTheme}
          className="h-8 w-[76px] rounded-full bg-card border border-border p-1 hover:bg-secondary"
          aria-label="Toggle light and dark mode"
        >
          <span className={`relative flex h-full w-full items-center ${isDark ? "justify-end" : "justify-start"}`}>
            <span className="absolute left-1 text-muted-foreground">
              <Sun className="h-[9px] w-[9px]" />
            </span>
            <span className="absolute right-1 text-muted-foreground">
              <Moon className="h-[9px] w-[9px]" />
            </span>
            <span className="z-10 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-all">
              {isDark ? <Moon className="h-[9px] w-[9px]" /> : <Sun className="h-[9px] w-[9px]" />}
            </span>
          </span>
        </Button>
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-6 text-foreground">
        Invoice Manager
      </h1>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{mode === "login" ? "Login" : "Create account"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={(value) => { setMode(value); setError(""); }} className="mb-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
          </Tabs>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Please wait..." : mode === "login" ? "Login" : "Register"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
