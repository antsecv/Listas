import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addShoppingListItemAction,
  deleteShoppingListAction,
  deleteShoppingListItemAction,
  omitShoppingListItemAction,
  sendShoppingListToReviewAction,
  updateShoppingListAction,
  updateShoppingListItemAction
} from "@/app/actions";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { AutoSaveNumberField } from "@/components/auto-save-number-field";
import { EditItemModal } from "@/components/edit-item-modal";
import { prisma } from "@/lib/prisma";
import { canEditList, canManagePurchases, canReviewProducts, canViewList } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import {
  calculateQuantityToBuy,
  getBuyQuantityClass,
  getPurchaseStatusClass,
  getPurchaseStatusLabel,
  getReviewStatusLabel,
  getShoppingListStatusLabel,
  purchaseStatusValues,
  reviewStatusValues
} from "@/lib/shopping";

type RouteParams = Promise<{ id: string }>;
type SearchParams = Promise<{ error?: string; success?: string; view?: string }>;

export default async function ListDetailPage({ params, searchParams }: { params: RouteParams; searchParams?: SearchParams }) {
  const user = await requireUser();
  const { id } = await params;
  const resolvedSearchParams = await searchParams;

  const list = await prisma.shoppingList.findFirst({
    where: { id },
    include: { author: true, items: { orderBy: { createdAt: "desc" } } }
  });

  if (!list) {
    notFound();
  }

  if (!canViewList(user, list)) {
    notFound();
  }

  const editable = canEditList(user, list);
  const purchasable = canManagePurchases(user, list);
  const reviewEditable = canReviewProducts(user, list);
  const viewMode = String(resolvedSearchParams?.view ?? (purchasable ? "to-buy" : "all")).toLowerCase();

  const reviewDone = list.items.filter((item) => item.reviewStatus !== "PENDIENTE").length;
  const reviewTotal = list.items.length;
  const purchaseRelevant = list.items.filter((item) => item.purchaseStatus !== "NO_REQUIERE").length;
  const purchaseDone = list.items.filter(
    (item) => item.purchaseStatus === "COMPRADO" || item.purchaseStatus === "NO_DISPONIBLE" || item.purchaseStatus === "NO_REQUIERE"
  ).length;

  const visibleItems = list.items.filter((item) => {
    if (!purchasable) {
      return true;
    }

    if (viewMode === "all") {
      return true;
    }

    if (viewMode === "to-buy") {
      return item.purchaseStatus === "PENDIENTE_COMPRA" || item.purchaseStatus === "NO_DISPONIBLE";
    }

    if (viewMode === "purchased") {
      return item.purchaseStatus === "COMPRADO";
    }

    if (viewMode === "no-required") {
      return item.purchaseStatus === "NO_REQUIERE";
    }

    if (viewMode === "unavailable") {
      return item.purchaseStatus === "NO_DISPONIBLE";
    }

    return true;
  });

  const totalToBuy = list.items.reduce(
    (sum, item) => sum + calculateQuantityToBuy(item.currentStock, item.minimumStock, item.maximumStock),
    0
  );

  const pendingReview = list.items.filter((item) => item.reviewStatus === "PENDIENTE").length;
  const canSendToReview = editable && list.status === "BORRADOR" && pendingReview === 0;

  return (
    <div className="grid" style={{ gap: 20 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="title">{list.name}</h1>
          <p className="subtitle">
            ID: {list.id} · Autor: {list.author.name} · Estado: {getShoppingListStatusLabel(list.status)} · Creada: {list.createdAt.toLocaleString("es-ES")}
          </p>
        </div>
        <div className="row">
          <Link href="/lists" className="button secondary">
            Volver
          </Link>
          {editable ? (
            <form action={deleteShoppingListAction}>
              <input type="hidden" name="listId" value={list.id} />
              <button type="submit" className="button danger">
                Eliminar lista
              </button>
            </form>
          ) : null}
        </div>
      </div>

      {resolvedSearchParams?.error ? <div className="error">{resolvedSearchParams.error}</div> : null}
      {resolvedSearchParams?.success ? <div className="notice">{resolvedSearchParams.success}</div> : null}

      <div className="grid grid-3">
        <div className="card">
          <div className="muted">Revisión</div>
          <h2>{reviewDone}/{reviewTotal}</h2>
          <p className="muted">Productos revisados</p>
        </div>
        <div className="card">
          <div className="muted">Compra</div>
          <h2>{purchaseDone}/{purchaseRelevant}</h2>
          <p className="muted">Productos resueltos</p>
        </div>
        <div className="card">
          <div className="muted">A comprar</div>
          <h2>{totalToBuy}</h2>
          <p className="muted">Cantidad total sugerida</p>
        </div>
      </div>

      {editable ? (
        <>
          <form action={updateShoppingListAction} className="card form">
            <input type="hidden" name="listId" value={list.id} />
            <div className="field">
              <label htmlFor="name">Nombre de la lista</label>
              <input id="name" name="name" type="text" defaultValue={list.name} required />
            </div>
            <div className="row">
              <button type="submit" className="button">Guardar nombre</button>
            </div>
          </form>

          {canSendToReview ? (
            <form action={sendShoppingListToReviewAction} className="card form">
              <input type="hidden" name="listId" value={list.id} />
              <button type="submit" className="button secondary">
                Enviar a revisión
              </button>
            </form>
          ) : list.status === "BORRADOR" ? (
            <div className="card">
              <span className="muted">Faltan {pendingReview} productos por revisar</span>
            </div>
          ) : null}
        </>
      ) : null}

      {purchasable ? (
        <form className="card form" method="get">
          <div className="grid grid-3">
            <div className="field">
              <label htmlFor="view">Vista</label>
              <select id="view" name="view" defaultValue={viewMode}>
                <option value="all">Todos</option>
                <option value="to-buy">Por comprar</option>
                <option value="purchased">Comprados</option>
                <option value="no-required">No requieren compra</option>
                <option value="unavailable">No disponibles</option>
              </select>
            </div>
          </div>
          <div className="row">
            <button type="submit" className="button">Filtrar</button>
            <Link href={`/lists/${list.id}`} className="button secondary">Limpiar</Link>
          </div>
        </form>
      ) : null}

      <div className="card stack">
        <h2 style={{ margin: 0 }}>Productos</h2>

        {visibleItems.length ? (
          <table className="table responsive-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Mínimo</th>
                <th>Máximo</th>
                <th>Actual</th>
                <th>Revisión</th>
                <th>Compra</th>
                <th>A comprar</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => {
                const buy = calculateQuantityToBuy(item.currentStock, item.minimumStock, item.maximumStock);

                return (
                  <tr key={item.id}>
                    <td data-label="Producto">
                      <div className="stack" style={{ gap: 4 }}>
                        <div>{item.name}</div>
                        {item.reviewStatus === "OMITIDO" && item.omitReason ? <div className="muted">{item.omitReason}</div> : null}
                      </div>
                    </td>
                    <td data-label="Mínimo">{item.minimumStock}</td>
                    <td data-label="Máximo">{item.maximumStock}</td>
                    <td data-label="Actual">
                      {editable ? (
                        <form id={`list-stock-${item.id}`} action={updateShoppingListItemAction} className="inline-table-form">
                          <input type="hidden" name="listId" value={list.id} />
                          <input type="hidden" name="itemId" value={item.id} />
                          <input type="hidden" name="name" value={item.name} />
                          <input type="hidden" name="minimumStock" value={item.minimumStock} />
                          <input type="hidden" name="maximumStock" value={item.maximumStock} />
                          <AutoSaveNumberField formId={`list-stock-${item.id}`} name="currentStock" defaultValue={item.currentStock} className="inline-number" />
                        </form>
                      ) : (
                        <span>{item.currentStock}</span>
                      )}
                    </td>
                    <td data-label="Revisión">
                      <span className={`badge ${getPurchaseStatusClass(item.reviewStatus === "OMITIDO" ? "NO_REQUIERE" : item.purchaseStatus)}`}>
                        {getReviewStatusLabel(item.reviewStatus)}
                      </span>
                    </td>
                    <td data-label="Compra">
                      {purchasable ? (
                        <AutoSubmitSelect
                          endpoint={`/api/lists/${list.id}/items/${item.id}/purchase-status`}
                          name="purchaseStatus"
                          defaultValue={item.purchaseStatus}
                          className={`badge status-select ${getPurchaseStatusClass(item.purchaseStatus)}`}
                          ariaLabel={`Compra de ${item.name}`}
                          options={purchaseStatusValues.map((status) => ({
                            value: status,
                            label: getPurchaseStatusLabel(status)
                          }))}
                        />
                      ) : (
                        <span className={`badge ${getPurchaseStatusClass(item.purchaseStatus)}`}>{getPurchaseStatusLabel(item.purchaseStatus)}</span>
                      )}
                    </td>
                    <td data-label="A comprar">
                      <span className={`badge ${getBuyQuantityClass(buy)}`}>{buy}</span>
                    </td>
                    <td data-label="Acciones">
                      {editable ? (
                        <EditItemModal title={`Editar ${item.name}`}>
                          <form action={updateShoppingListItemAction} className="form">
                            <input type="hidden" name="listId" value={list.id} />
                            <input type="hidden" name="itemId" value={item.id} />
                            <div className="grid grid-2">
                              <div className="field">
                                <label>Producto</label>
                                <input name="name" defaultValue={item.name} required />
                              </div>
                              <div className="field">
                                <label>A comprar</label>
                                <input value={buy} readOnly />
                              </div>
                              <div className="field">
                                <label>Mínimo</label>
                                <input name="minimumStock" type="number" min={0} defaultValue={item.minimumStock} required />
                              </div>
                              <div className="field">
                                <label>Máximo</label>
                                <input name="maximumStock" type="number" min={0} defaultValue={item.maximumStock} required />
                              </div>
                              <div className="field">
                                <label>Existencia actual</label>
                                <input name="currentStock" type="number" min={0} defaultValue={item.currentStock} required />
                              </div>
                            </div>
                            <div className="row">
                              <button type="submit" className="button">Guardar</button>
                            </div>
                          </form>

                          <form action={omitShoppingListItemAction} className="form" style={{ marginTop: 12 }}>
                            <input type="hidden" name="listId" value={list.id} />
                            <input type="hidden" name="itemId" value={item.id} />
                            <div className="field">
                              <label>Motivo para omitir</label>
                              <textarea name="omitReason" rows={3} placeholder="Motivo obligatorio" required />
                            </div>
                            <button type="submit" className="button secondary">Omitir</button>
                          </form>

                          <form action={deleteShoppingListItemAction} style={{ marginTop: 12 }}>
                            <input type="hidden" name="listId" value={list.id} />
                            <input type="hidden" name="itemId" value={item.id} />
                            <button type="submit" className="button danger">Eliminar</button>
                          </form>
                        </EditItemModal>
                      ) : (
                        <span className="muted">Solo lectura</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="muted">No hay productos para esta vista.</p>
        )}
      </div>

      {editable ? (
        <form action={addShoppingListItemAction} className="card form">
          <input type="hidden" name="listId" value={list.id} />
          <h2 style={{ margin: 0 }}>Agregar producto</h2>
          <div className="grid grid-2">
            <div className="field">
              <label htmlFor="item-name">Nombre</label>
              <input id="item-name" name="name" type="text" required />
            </div>
            <div className="field">
              <label htmlFor="currentStock-new">Existencia actual</label>
              <input id="currentStock-new" name="currentStock" type="number" min={0} defaultValue={0} required />
            </div>
            <div className="field">
              <label htmlFor="minimumStock-new">Mínimo</label>
              <input id="minimumStock-new" name="minimumStock" type="number" min={0} defaultValue={0} required />
            </div>
            <div className="field">
              <label htmlFor="maximumStock-new">Máximo</label>
              <input id="maximumStock-new" name="maximumStock" type="number" min={0} defaultValue={0} required />
            </div>
          </div>
          <button type="submit" className="button">Agregar</button>
        </form>
      ) : null}
    </div>
  );
}
