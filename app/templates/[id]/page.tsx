import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addTemplateItemAction,
  deleteTemplateAction,
  deleteTemplateItemAction,
  updateTemplateAction,
  updateTemplateItemAction
} from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { AutoSaveNumberField } from "@/components/auto-save-number-field";
import { calculateQuantityToBuy, getBuyQuantityClass } from "@/lib/shopping";
import { EditItemModal } from "@/components/edit-item-modal";

type RouteParams = Promise<{ id: string }>;
type SearchParams = Promise<{ error?: string; success?: string }>;

export default async function TemplateDetailPage({ params, searchParams }: { params: RouteParams; searchParams?: SearchParams }) {
  const user = await requireAdmin();
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const template = await prisma.template.findFirst({
    where: { id, authorId: user.id },
    include: { author: true, items: { orderBy: { createdAt: "desc" } } }
  });

  if (!template) {
    notFound();
  }

  return (
    <div className="grid" style={{ gap: 20 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="title">{template.name}</h1>
          <p className="subtitle">
            ID: {template.id} · Autor: {template.author.name} · Creada: {template.createdAt.toLocaleString("es-ES")}
          </p>
        </div>
        <div className="row">
          <Link href="/templates" className="button secondary">Volver</Link>
          <form action={deleteTemplateAction}>
            <input type="hidden" name="templateId" value={template.id} />
            <button type="submit" className="button danger">Eliminar plantilla</button>
          </form>
        </div>
      </div>

      {resolvedSearchParams?.error ? <div className="error">{resolvedSearchParams.error}</div> : null}
      {resolvedSearchParams?.success ? <div className="notice">{resolvedSearchParams.success}</div> : null}

      <form action={updateTemplateAction} className="card form">
        <input type="hidden" name="templateId" value={template.id} />
        <div className="field">
          <label htmlFor="name">Nombre de la plantilla</label>
          <input id="name" name="name" type="text" defaultValue={template.name} required />
        </div>
        <button type="submit" className="button">Guardar nombre</button>
      </form>

      <div className="card stack">
        <h2 style={{ margin: 0 }}>Productos</h2>
        {template.items.length ? (
          <table className="table responsive-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Mínimo</th>
                <th>Máximo</th>
                <th>Actual</th>
                <th>A comprar</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {template.items.map((item) => {
                const buy = calculateQuantityToBuy(item.currentStock, item.minimumStock, item.maximumStock);

                return (
                  <tr key={item.id}>
                    <td data-label="Producto">{item.name}</td>
                    <td data-label="Mínimo">{item.minimumStock}</td>
                    <td data-label="Máximo">{item.maximumStock}</td>
                    <td data-label="Actual">
                      <form id={`template-stock-${item.id}`} action={updateTemplateItemAction} className="inline-table-form">
                        <input type="hidden" name="templateId" value={template.id} />
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="name" value={item.name} />
                        <input type="hidden" name="minimumStock" value={item.minimumStock} />
                        <input type="hidden" name="maximumStock" value={item.maximumStock} />
                        <AutoSaveNumberField formId={`template-stock-${item.id}`} name="currentStock" defaultValue={item.currentStock} className="inline-number" />
                      </form>
                    </td>
                    <td data-label="A comprar">
                      <span className={`badge ${getBuyQuantityClass(buy)}`}>{buy}</span>
                    </td>
                    <td data-label="Acciones">
                      <EditItemModal title={`Editar ${item.name}`}>
                        <form action={updateTemplateItemAction} className="form">
                          <input type="hidden" name="templateId" value={template.id} />
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

                        <form action={deleteTemplateItemAction} style={{ marginTop: 12 }}>
                          <input type="hidden" name="templateId" value={template.id} />
                          <input type="hidden" name="itemId" value={item.id} />
                          <button type="submit" className="button danger">Eliminar</button>
                        </form>
                      </EditItemModal>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="muted">Aún no hay productos.</p>
        )}
      </div>

      <form action={addTemplateItemAction} className="card form">
        <input type="hidden" name="templateId" value={template.id} />
        <h2 style={{ margin: 0 }}>Agregar producto a la plantilla</h2>
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
    </div>
  );
}
