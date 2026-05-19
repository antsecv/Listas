import Link from "next/link";
import { createTemplateAction } from "@/app/actions";
import { getPurchaseCostModeLabel, purchaseCostModeValues } from "@/lib/shopping";

type SearchParams = Promise<{ error?: string }>;

export default async function NewTemplatePage({ searchParams }: { searchParams?: SearchParams }) {
  const resolvedSearchParams = await searchParams;

  return (
    <div className="grid" style={{ maxWidth: 720, margin: "0 auto" }}>
      <div>
        <h1 className="title">Nueva plantilla</h1>
        <p className="subtitle">La plantilla se creará con un identificador automático.</p>
      </div>

      {resolvedSearchParams?.error ? <div className="error">{resolvedSearchParams.error}</div> : null}

      <form action={createTemplateAction} className="card form">
        <div className="field">
          <label htmlFor="purchaseCostMode">Modo de compra</label>
          <select id="purchaseCostMode" name="purchaseCostMode" defaultValue="TOTAL_LISTA">
            {purchaseCostModeValues.map((mode) => (
              <option key={mode} value={mode}>
                {getPurchaseCostModeLabel(mode)}
              </option>
            ))}
          </select>
        </div>
        <div className="row">
          <button type="submit" className="button">Crear plantilla</button>
          <Link href="/templates" className="button secondary">Volver</Link>
        </div>
      </form>
    </div>
  );
}
