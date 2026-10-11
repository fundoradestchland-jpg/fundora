"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { BrandGlyph } from "@/components/fundora-brand";
import { isSafeNextPath } from "@/lib/format";

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="page-shell auth-page"><section className="auth-shell"><div className="auth-panel auth-form-panel"><h1>Cargando…</h1></div></section></main>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = useMemo(() => {
    const nextPath = searchParams.get("next");
    return isSafeNextPath(nextPath) ? nextPath : null;
  }, [searchParams]);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) return null;
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "La verificación de sesión no está disponible.");
        return result.user as { role: "admin" | "applicant"; user: string } | null;
      })
      .then((user) => {
        if (!active) return;
        if (user) {
          router.replace(redirectPath ?? (user.role === "admin" ? "/admin/dossiers" : `/dashboard/${user.user}`));
        } else {
          setCheckingSession(false);
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "La verificación de sesión no está disponible.");
          setCheckingSession(false);
        }
      });
    return () => { active = false; };
  }, [redirectPath, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (mode === "register" && password !== confirmPassword) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(mode === "register" ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Operación imposible.");

      try {
        localStorage.setItem("fundora_session", JSON.stringify(result.user));
      } catch (storageError) {
        console.error("No se pudo guardar la sesión en caché", storageError);
      }
      window.dispatchEvent(new Event("fundora-session-updated"));

      const destination = redirectPath ?? (result.user.role === "admin" ? "/admin/dossiers" : `/dashboard/${result.user.user}`);
      window.location.assign(destination);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Operación imposible.");
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingSession) {
    return (
      <main className="page-shell auth-page">
        <section className="auth-shell">
          <div className="auth-panel auth-form-panel">
            <h1>Verificando tu sesión…</h1>
            {error ? <p className="auth-error" role="alert">{error}</p> : null}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell auth-page">
      <section className="auth-shell">
        <div className="auth-panel auth-visual" aria-label="Inicio de sesión Fundación Amira Aldahab">
          <div className="auth-badge">Cuenta segura</div>
          <div className="auth-visual-copy">
            <span className="eyebrow">Acceso seguro</span>
            <h2>Bienvenido a Fundación Amira Aldahab</h2>
            <p>Gestiona tus solicitudes, donaciones y saldo desde un espacio simple y fiable.</p>
          </div>

        </div>

        <div className="auth-panel auth-form-panel">
          <div className="brand" aria-label="Fundación Amira Aldahab brand">
            <BrandGlyph />
          </div>

          <div className="auth-form-header">
            <span className="eyebrow">{mode === "login" ? "Iniciar sesión" : "Registro"}</span>
            <h1>{mode === "login" ? "Accede a tu espacio." : "Crea tu cuenta en Fundación Amira Aldahab."}</h1>
          </div>

          <div className="auth-mode-switch" role="group" aria-label="Elegir una acción">
            <button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>Iniciar sesión</button>
            <button type="button" className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }}>Registrarse</button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "register" && (
              <label className="field">
                <span>Nombre completo</span>
                <input type="text" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Tu nombre completo" minLength={2} maxLength={200} required />
              </label>
            )}

            <label className="field">
              <span>Correo electrónico</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nombre@ejemplo.com"
                required
              />
            </label>

            <label className="field">
              <span>Contraseña</span>
              <div className="password-control">
                <input type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Al menos 8 caracteres" minLength={mode === "register" ? 8 : undefined} required />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? "Ocultar" : "Mostrar"}</button>
              </div>
            </label>

            {mode === "register" && (
              <label className="field">
                <span>Confirmar contraseña</span>
                <div className="password-control">
                  <input type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repite la contraseña" minLength={8} required />
                  <button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? "Ocultar confirmación" : "Mostrar confirmación"}>{showConfirmPassword ? "Ocultar" : "Mostrar"}</button>
                </div>
              </label>
            )}

            <div className="login-options">
              <label className="remember-me">
                <input type="checkbox" defaultChecked />
                <span>Recordarme</span>
              </label>
              <span>Acceso de administrador o solicitante</span>
            </div>

            {error ? <p className="auth-error">{error}</p> : null}

            <button type="submit" className="primary-button login-button" disabled={submitting}>
              {submitting ? "Procesando…" : mode === "login" ? "Iniciar sesión" : "Crear mi cuenta"}
            </button>
          </form>

          <div className="auth-meta">
            <span>{mode === "login" ? "¿Aún no tienes cuenta?" : "¿Ya tienes cuenta?"}</span>
            <button type="button" className="auth-mode-link" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
              {mode === "login" ? "Crear cuenta" : "Iniciar sesión"}
            </button>
          </div>
          <div className="auth-meta">
            <Link href="/">Volver al inicio</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
