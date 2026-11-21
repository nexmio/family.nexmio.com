import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <h2 style={{ margin: 0, flex: 1 }}>{title}</h2>
          <button type="button" className="icon-btn" style={{ width: 44, height: 44, borderRadius: "50%" }} aria-label={t("common.close")} onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
