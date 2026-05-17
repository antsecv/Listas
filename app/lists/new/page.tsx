import Link from "next/link";
import { createShoppingListAction } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { canCreateLists } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { redirect } from "next/navigation";

type SearchParams = Promise<{ error?: string }>;

export default async function NewListPage({ searchParams }: { searchParams?: SearchParams }) {
  const user = await requireUser();
  if (!canCreateLists(user)) {
    redirect("/dashboard");
  }

  const resolvedSearchParams = await searchParams;
  const templatesWithAuthors = await prisma.template.findMany({
    include: { author: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="grid" style={{ maxWidth: 720, margin: "0 auto" }}>
      <div>
        <h1 className="title">Nueva lista</h1>
        <p className="subtitle">La lista se creará con un identificador automático.</p>
      </div>

      {resolvedSearchParams?.error ? <div className="error">{resolvedSearchParams.error}</div> : null}

      <form action={createShoppingListAction} className="card form">
        <div className="field">
          <label htmlFor="templateId">Plantilla opcional</label>
          <select id="templateId" name="templateId" defaultValue="">
            <option value="">Lista vacía</option>
            {templatesWithAuthors.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} · {template.author.name}
              </option>
            ))}
          </select>
        </div>

        <div className="row">
          <button type="submit" className="button">Crear lista</button>
          <Link href="/lists" className="button secondary">Volver</Link>
        </div>
      </form>
    </div>
  );
}
