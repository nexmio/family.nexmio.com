import { useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { LoginForm } from "./LoginForm";
import { answerLogin, getPending, subscribe } from "./store";

/** Shown over the page when the login has run out in the middle of a change. */
export function CodeDialog() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const pending = useSyncExternalStore(subscribe, getPending);
  if (!pending) return null;
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="login-title" key={pending.id}>
        <h2 id="login-title">{t("code.title")}</h2>
        <p className="muted">{t("code.expired")}</p>
        <LoginForm
          onDone={() => {
            void queryClient.invalidateQueries({ queryKey: ["session"] });
            answerLogin(true);
          }}
          onCancel={() => answerLogin(false)}
        />
      </div>
    </div>
  );
}
