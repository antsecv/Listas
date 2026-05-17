import Link from "next/link";
import { registerAction } from "@/app/actions";

type SearchParams = Promise<{ error?: string }>;

export default async function RegisterPage({ searchParams }: { searchParams?: SearchParams }) {
  const resolvedSearchParams = await searchParams;

  return (
    <div className="grid" style={{ maxWidth: 520, margin: "40px auto" }}>
      <div>
        <h1 className="title">Crear cuenta</h1>
        <p className="subtitle">Regístrate para administrar tus listas.</p>
      </div>

      {resolvedSearchParams?.error ? <div className="error">{resolvedSearchParams.error}</div> : null}

      <form action={registerAction} className="card form">
        <div className="field">
          <label htmlFor="name">Nombre</label>
          <input id="name" name="name" type="text" required />
        </div>
        <div className="field">
          <label htmlFor="email">Correo</label>
          <input id="email" name="email" type="email" required />
        </div>
        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <input id="password" name="password" type="password" minLength={6} required />
        </div>
        <button type="submit" className="button">Crear cuenta</button>
      </form>

      <p className="muted">
        ¿Ya tienes cuenta? <Link href="/login">Iniciar sesión</Link>
      </p>
    </div>
  );
}
