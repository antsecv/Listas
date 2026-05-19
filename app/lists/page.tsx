import Link from "next/link";
import { Prisma } from "@prisma/client";
import type { ShoppingListStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canChangeListStatus, canViewAllLists } from "@/lib/permissions";
import {
  calculateQuantityToBuy,
  getShoppingListStatusClass,
  getShoppingListStatusLabel,
  shoppingListStatusValues
} from "@/lib/shopping";
import { deleteShoppingListAction } from "@/app/actions";
import { AutoSubmitSelect } from "@/components/auto-submit-select";

type SearchParams = Promise<{
  error?: string;
  success?: string;
  status?: string;
  author?: string;
  from?: string;
  to?: string;
}>;

export default async function ListsPage({ searchParams }: { searchParams?: SearchParams }) {
  const user = await requireUser();
  const resolvedSearchParams = await searchParams;
  const statusFilter = String(resolvedSearchParams?.status ?? "").trim();
  const authorFilter = String(resolvedSearchParams?.author ?? "").trim();
  const fromFilter = String(resolvedSearchParams?.from ?? "").trim();
  const toFilter = String(resolvedSearchParams?.to ?? "").trim();

  const conditions: Prisma.ShoppingListWhereInput[] = [];

  if (!canViewAllLists(user)) {
    conditions.push({ authorId: user.id });
  }

  if (user.role === "COMPRADOR") {
    conditions.push({ status: { not: "BORRADOR" } });
  }

  if (statusFilter && shoppingListStatusValues.includes(statusFilter as (typeof shoppingListStatusValues)[number])) {
    conditions.push({ status: statusFilter as ShoppingListStatus });
  }

  if (authorFilter && canViewAllLists(user)) {
    conditions.push({
      author: {
        name: {
          contains: authorFilter,
          mode: "insensitive"
        }
      }
    });
  }

  if (fromFilter || toFilter) {
    const createdAtFilter: { gte?: Date; lte?: Date } = {};

    if (fromFilter) {
      const fromDate = new Date(fromFilter);
      if (!Number.isNaN(fromDate.getTime())) {
        createdAtFilter.gte = fromDate;
      }
    }

    if (toFilter) {
      const toDate = new Date(toFilter);
      if (!Number.isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        createdAtFilter.lte = toDate;
      }
    }

    conditions.push({ createdAt: createdAtFilter });
  }

  const where: Prisma.ShoppingListWhereInput = conditions.length ? { AND: conditions } : {};

  const lists = await prisma.shoppingList.findMany({
    where,
    include: { author: true, items: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="grid" style={{ gap: 20 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="title">Listas</h1>
          <p className="subtitle">Crea listas, revisa productos y calcula compras.</p>
        </div>
        <Link href="/lists/new" className="button">Nueva lista</Link>
      </div>

      {resolvedSearchParams?.error ? <div className="error">{resolvedSearchParams.error}</div> : null}
      {resolvedSearchParams?.success ? <div className="notice">{resolvedSearchParams.success}</div> : null}

      <form className="card filter-panel" method="get">
        <div className="grid grid-3">
          <div className="field">
            <label htmlFor="status">Estado</label>
            <select id="status" name="status" defaultValue={statusFilter}>
              <option value="">Todos</option>
              {shoppingListStatusValues.map((status) => (
                <option key={status} value={status}>
                  {getShoppingListStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>
          {canViewAllLists(user) ? (
            <div className="field">
              <label htmlFor="author">Autor</label>
              <input id="author" name="author" type="text" placeholder="Nombre del autor" defaultValue={authorFilter} />
            </div>
          ) : (
            <div className="field">
              <label>Autor</label>
              <input value={String(user.name ?? "")} readOnly />
            </div>
          )}
          <div className="field">
            <label htmlFor="from">Desde</label>
            <input id="from" name="from" type="date" defaultValue={fromFilter} />
          </div>
          <div className="field">
            <label htmlFor="to">Hasta</label>
            <input id="to" name="to" type="date" defaultValue={toFilter} />
          </div>
        </div>
        <div className="row">
          <button type="submit" className="button">Filtrar</button>
          <Link href="/lists" className="button secondary">Limpiar</Link>
        </div>
      </form>

      <div className="card">
        {lists.length ? (
          <table className="table responsive-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Autor</th>
                <th>Estado</th>
                <th>Productos</th>
                <th>Comprar</th>
                <th>Creada</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lists.map((list) => {
                const totalToBuy = list.items.reduce(
                  (sum, item) => sum + calculateQuantityToBuy(item.currentStock, item.minimumStock, item.maximumStock),
                  0
                );

                return (
                  <tr key={list.id}>
                    <td data-label="ID">
                      <Link href={`/lists/${list.id}`}>
                        <strong>{list.id.slice(0, 8)}</strong>
                      </Link>
                    </td>
                    <td data-label="Autor">{list.author.name}</td>
                    <td data-label="Estado">
                      {canChangeListStatus(user) ? (
                        <AutoSubmitSelect
                          endpoint={`/api/lists/${list.id}/status`}
                          name="status"
                          defaultValue={list.status ?? "BORRADOR"}
                          className="badge status-select"
                          ariaLabel={`Estado de ${list.id.slice(0, 8)}`}
                          statusKind="shopping-list"
                          eventName="shopping-list-status-saved"
                          eventDetail={{ listId: list.id }}
                          options={shoppingListStatusValues.map((status) => ({
                            value: status,
                            label: getShoppingListStatusLabel(status)
                          }))}
                        />
                      ) : (
                        <span className={`badge ${getShoppingListStatusClass(list.status)}`}>{getShoppingListStatusLabel(list.status)}</span>
                      )}
                    </td>
                    <td data-label="Productos">{list.items.length}</td>
                    <td data-label="Comprar">{totalToBuy}</td>
                    <td data-label="Creada">{list.createdAt.toLocaleString("es-ES")}</td>
                    <td data-label="Acciones">
                      <div className="row table-actions">
                        <Link href={`/lists/${list.id}`} className="button secondary">Editar</Link>
                        <form action={deleteShoppingListAction}>
                          <input type="hidden" name="listId" value={list.id} />
                          <button type="submit" className="button danger">Eliminar</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="muted">No tienes listas creadas.</p>
        )}
      </div>
    </div>
  );
}
