import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { deleteTemplateAction } from "@/app/actions";

type SearchParams = Promise<{ error?: string; success?: string }>;

export default async function TemplatesPage({ searchParams }: { searchParams?: SearchParams }) {
  const user = await requireAdmin();
  const resolvedSearchParams = await searchParams;
  const templates = await prisma.template.findMany({
    where: { authorId: user.id },
    include: { author: true, items: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="grid" style={{ gap: 20 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="title">Plantillas</h1>
          <p className="subtitle">Guarda productos frecuentes para reutilizarlos en nuevas listas.</p>
        </div>
        <Link href="/templates/new" className="button">Nueva plantilla</Link>
      </div>

      {resolvedSearchParams?.error ? <div className="error">{resolvedSearchParams.error}</div> : null}
      {resolvedSearchParams?.success ? <div className="notice">{resolvedSearchParams.success}</div> : null}

      <div className="card">
        {templates.length ? (
          <table className="table responsive-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Autor</th>
                <th>Productos</th>
                <th>Creada</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                  <tr key={template.id}>
                    <td data-label="ID">
                      <Link href={`/templates/${template.id}`}>
                        <strong>{template.id.slice(0, 8)}</strong>
                      </Link>
                    </td>
                    <td data-label="Nombre">{template.name}</td>
                    <td data-label="Autor">{template.author.name}</td>
                    <td data-label="Productos">{template.items.length}</td>
                    <td data-label="Creada">{template.createdAt.toLocaleString("es-ES")}</td>
                    <td data-label="Acciones">
                    <div className="row table-actions">
                      <Link href={`/templates/${template.id}`} className="button secondary">Editar</Link>
                      <form action={deleteTemplateAction}>
                        <input type="hidden" name="templateId" value={template.id} />
                        <button type="submit" className="button danger">Eliminar</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">No tienes plantillas creadas.</p>
        )}
      </div>
    </div>
  );
}
