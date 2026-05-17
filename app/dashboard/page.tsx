import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { canCreateLists, canManageTemplates, canManageUsers, canViewAllLists } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { calculateQuantityToBuy } from "@/lib/shopping";

type SearchParams = Promise<{ error?: string; success?: string }>;

export default async function DashboardPage({ searchParams }: { searchParams?: SearchParams }) {
  const user = await requireUser();
  const resolvedSearchParams = await searchParams;
  const showTemplates = canManageTemplates(user);
  const showAdmin = canManageUsers(user);
  const showCreateList = canCreateLists(user);
  const [lists, templates] = await Promise.all([
    prisma.shoppingList.findMany({
      where: canViewAllLists(user) ? {} : { authorId: user.id },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.template.findMany({
      where: showTemplates ? {} : { authorId: user.id },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 5
    })
  ]);

  const totalToBuy = lists[0]?.items.reduce(
    (sum, item) => sum + calculateQuantityToBuy(item.currentStock, item.minimumStock, item.maximumStock),
    0
  );

  return (
    <div className="grid" style={{ gap: 20 }}>
      <div className="card">
        <h1 className="title">Hola, {user.name}</h1>
        <p className="subtitle">Rol: {user.role} · Administra listas, productos y plantillas desde un solo lugar.</p>
      </div>

      {resolvedSearchParams?.error ? <div className="error">{resolvedSearchParams.error}</div> : null}
      {resolvedSearchParams?.success ? <div className="notice">{resolvedSearchParams.success}</div> : null}

      <div className="grid grid-3">
        <div className="card">
          <div className="muted">Listas</div>
          <h2>{lists.length}</h2>
          <p className="muted">Creadas recientemente</p>
        </div>
        {showTemplates ? (
          <div className="card">
            <div className="muted">Plantillas</div>
            <h2>{templates.length}</h2>
            <p className="muted">Reutilizables para nuevas listas</p>
          </div>
        ) : null}
        <div className="card">
          <div className="muted">Sugerido en la primera lista</div>
          <h2>{totalToBuy ?? 0}</h2>
          <p className="muted">Cantidad total a comprar</p>
        </div>
      </div>

      <div className="grid grid-2">
        <section className="card stack">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h3 style={{ margin: 0 }}>Listas recientes</h3>
            {showCreateList ? <Link href="/lists/new" className="button">Nueva lista</Link> : null}
          </div>
          {lists.length ? (
            <div className="stack">
              {lists.map((list) => (
                <Link key={list.id} href={`/lists/${list.id}`} className="card" style={{ padding: 14 }}>
                  <strong>{list.name}</strong>
                  <div className="muted">{list.items.length} productos · {list.createdAt.toLocaleString("es-ES")}</div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted">Todavía no tienes listas.</p>
          )}
        </section>

        {showTemplates ? (
          <section className="card stack">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h3 style={{ margin: 0 }}>Plantillas recientes</h3>
            <Link href="/templates/new" className="button secondary">Nueva plantilla</Link>
          </div>
          {templates.length ? (
            <div className="stack">
              {templates.map((template) => (
                <Link key={template.id} href={`/templates/${template.id}`} className="card" style={{ padding: 14 }}>
                  <strong>{template.name}</strong>
                  <div className="muted">{template.items.length} productos · {template.createdAt.toLocaleString("es-ES")}</div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted">Todavía no tienes plantillas.</p>
          )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
