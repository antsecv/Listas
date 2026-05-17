"use client";

import { useState } from "react";

type EditItemModalProps = {
  triggerLabel?: string;
  title: string;
  children: React.ReactNode;
};

export function EditItemModal({ triggerLabel = "Editar", title, children }: EditItemModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="button secondary" onClick={() => setOpen(true)}>
        {triggerLabel}
      </button>

      {open ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <div className="modal-card" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h3 style={{ margin: 0 }}>{title}</h3>
              <button type="button" className="button secondary" onClick={() => setOpen(false)}>
                Cerrar
              </button>
            </div>
            <div className="modal-body">{children}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
