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
import { AutoSaveDecimalField } from "@/components/auto-save-decimal-field";
import { AutoSaveStockField } from "@/components/auto-save-stock-field";
import { EditItemModal } from "@/components/edit-item-modal";
import { ReviewCompletionGate } from "@/components/review-completion-gate";
import { ReviewStatusBadge } from "@/components/review-status-badge";
import { PurchaseItemFields } from "@/components/purchase-item-fields";
import { QuantityToBuyBadge } from "@/components/quantity-to-buy-badge";
import { ShoppingListLiveSummary } from "@/components/shopping-list-live-summary";
import { prisma } from "@/lib/prisma";
import { canEditList, canManagePurchases, canViewList } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import {
  calculateQuantityToBuy,
  getPurchaseCostModeLabel,
  getPurchaseStatusClass,
  getPurchaseStatusLabel,
  getShoppingListStatusLabel,
  formatDecimal,
  purchaseStatusValues,
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
  const viewMode = String(resolvedSearchParams?.view ?? (purchasable ? "to-buy" : "all")).toLowerCase();

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

  const pendingReviewItemIds = list.items.filter((item) => item.reviewStatus === "PENDIENTE").map((item) => item.id);

  return (
    <div className="grid" style={{ gap: 20 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="title">{list.name}</h1>
          <p className="subtitle">
            ID: {list.id} · Autor: {list.author.name} · Estado: {getShoppingListStatusLabel(list.status)} · Modo: {getPurchaseCostModeLabel(list.purchaseCostMode)} · Creada: {list.createdAt.toLocaleString("es-ES")}
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

      {list.observations ? (
        <div className="card stack">
          <div className="muted">Observaciones para compra</div>
          <div>{list.observations}</div>
        </div>
      ) : null}

      <ShoppingListLiveSummary
        listId={list.id}
        initialItems={list.items.map((item) => ({
          id: item.id,
          currentStock: item.currentStock,
          minimumStock: item.minimumStock,
          maximumStock: item.maximumStock,
          reviewStatus: item.reviewStatus,
          purchaseStatus: item.purchaseStatus,
          purchasedQuantity: item.purchasedQuantity === null ? null : Number(item.purchasedQuantity),
          purchaseCost: item.purchaseCost === null ? null : Number(item.purchaseCost)
        }))}
        purchaseCostMode={list.purchaseCostMode}
        initialPurchaseTotalCost={list.purchaseTotalCost === null ? 0 : Number(list.purchaseTotalCost)}
      />

      {editable ? (
        <>
          <form action={updateShoppingListAction} className="card form">
            <input type="hidden" name="listId" value={list.id} />
            <div className="field">
              <label htmlFor="name">Nombre de la lista</label>
              <input id="name" name="name" type="text" defaultValue={list.name} required />
            </div>
            <div className="field">
              <label htmlFor="observations">Observaciones para compra</label>
              <textarea
                id="observations"
                name="observations"
                rows={4}
                defaultValue={list.observations ?? ""}
                placeholder="Indica pedidos especiales, marcas o condiciones de compra"
              />
            </div>
            <div className="row">
              <button type="submit" className="button">Guardar cambios</button>
            </div>
          </form>

          <ReviewCompletionGate
            listId={list.id}
            pendingItemIds={pendingReviewItemIds}
            visible={editable && list.status === "BORRADOR"}
            sendAction={sendShoppingListToReviewAction}
          />
        </>
      ) : null}

      {purchasable ? (
        <>
          {list.purchaseCostMode === "TOTAL_LISTA" ? (
            <div className="card form">
              <div className="field">
                <label htmlFor="purchaseTotalCost">Valor total de compra</label>
                <AutoSaveDecimalField
                  endpoint={`/api/lists/${list.id}/purchase-total`}
                  fieldName="purchaseTotalCost"
                  defaultValue={list.purchaseTotalCost ? Number(list.purchaseTotalCost) : null}
                  step="0.01"
                  inputMode="decimal"
                  className="inline-number"
                  ariaLabel="Valor total de compra"
                  eventName="shopping-list-purchase-total-saved"
                  eventDetail={{ listId: list.id }}
                />
              </div>
            </div>
          ) : null}

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
        </>
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
                <th>Comprado</th>
                {list.purchaseCostMode === "POR_PRODUCTO" ? <th>Costo</th> : null}
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
                        <AutoSaveStockField
                          endpoint={`/api/lists/${list.id}/items/${item.id}/current-stock`}
                          listId={list.id}
                          itemId={item.id}
                          defaultValue={item.reviewStatus === "PENDIENTE" && item.currentStock === 0 ? null : item.currentStock}
                          minimumStock={item.minimumStock}
                          maximumStock={item.maximumStock}
                          className="inline-number"
                          ariaLabel={`Existencia actual de ${item.name}`}
                        />
                      ) : (
                        <span>{item.currentStock}</span>
                      )}
                    </td>
                    <td data-label="Revisión">
                      <ReviewStatusBadge listId={list.id} itemId={item.id} initialStatus={item.reviewStatus} />
                    </td>
                    <td data-label="Compra">
                      {purchasable ? (
                        <AutoSubmitSelect
                          endpoint={`/api/lists/${list.id}/items/${item.id}/purchase-status`}
                          name="purchaseStatus"
                          defaultValue={item.purchaseStatus}
                          className="badge status-select"
                          ariaLabel={`Compra de ${item.name}`}
                          statusKind="purchase"
                          eventName="shopping-list-purchase-status-saved"
                          eventDetail={{ listId: list.id, itemId: item.id }}
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
                      <QuantityToBuyBadge
                        eventName="shopping-list-stock-saved"
                        scopeKey="listId"
                        scopeId={list.id}
                        itemId={item.id}
                        currentStock={item.currentStock}
                        minimumStock={item.minimumStock}
                        maximumStock={item.maximumStock}
                      />
                    </td>
                    {purchasable ? (
                      <PurchaseItemFields
                        listId={list.id}
                        itemId={item.id}
                        itemName={item.name}
                        initialPurchaseStatus={item.purchaseStatus}
                        initialPurchasedQuantity={item.purchasedQuantity === null ? null : Number(item.purchasedQuantity)}
                        initialPurchaseCost={item.purchaseCost === null ? null : Number(item.purchaseCost)}
                        purchaseCostMode={list.purchaseCostMode}
                      />
                    ) : (
                      <>
                        <td data-label="Comprado">
                          <span>{item.purchasedQuantity ? formatDecimal(Number(item.purchasedQuantity), 3) : "—"}</span>
                        </td>
                        {list.purchaseCostMode === "POR_PRODUCTO" ? (
                          <td data-label="Costo">
                            <span>{item.purchaseCost ? formatDecimal(Number(item.purchaseCost), 2) : "—"}</span>
                          </td>
                        ) : null}
                      </>
                    )}
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
