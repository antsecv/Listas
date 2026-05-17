import Link from "next/link";
import { loginAction } from "@/app/actions";

type SearchParams = Promise<{ error?: string; success?: string }>;

export default async function LoginPage({ searchParams }: { searchParams?: SearchParams }) {
  const resolvedSearchParams = await searchParams;

  return (
    <div className="grid" style={{ maxWidth: 520, margin: "40px auto" }}>
      <div>
        <h1 className="title">Ingresar</h1>
        <p className="subtitle">Accede a tus listas y plantillas.</p>
      </div>

      {resolvedSearchParams?.error ? <div className="error">{resolvedSearchParams.error}</div> : null}
      {resolvedSearchParams?.success ? <div className="notice">{resolvedSearchParams.success}</div> : null}

      <form action={loginAction} className="card form">
        <div className="field">
          <label htmlFor="email">Correo</label>
          <input id="email" name="email" type="email" required />
        </div>
        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <input id="password" name="password" type="password" required />
        </div>
        <button type="submit" className="button">Entrar</button>
      </form>

      <p className="muted">
        ¿No tienes cuenta? <Link href="/register">Crear una cuenta</Link>
      </p>
    </div>
  );
}
