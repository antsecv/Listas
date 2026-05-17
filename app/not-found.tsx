import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card" style={{ maxWidth: 640, margin: "40px auto" }}>
      <h1 className="title">Página no encontrada</h1>
      <p className="subtitle">La ruta que buscabas no existe o no tienes acceso.</p>
      <Link href="/dashboard" className="button">Ir al dashboard</Link>
    </div>
  );
}
