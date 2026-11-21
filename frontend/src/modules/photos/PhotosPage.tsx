import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError, api, newAction } from "../../shared/api/client";
import { errorText } from "../../shared/api/errors";
import { photoUrl } from "../../shared/ui/Slideshow";
import { Modal } from "../../shared/ui/Modal";

interface Album { id: number; name: string; count: number }
interface Albums { albums: Album[]; without_album: number }
interface Photo { id: number; album_id: number | null }

/** Shrinks a photo in the browser first, so the TV never has to load a 6 MB picture. */
async function shrink(file: File, max = 1920): Promise<Blob> {
  if (file.type === "image/gif") return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("shrink"))), "image/jpeg", 0.86),
  );
}

export default function PhotosPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [album, setAlbum] = useState<number | "all" | "none">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newAlbum, setNewAlbum] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const albums = useQuery({ queryKey: ["albums"], queryFn: () => api.get<Albums>("/api/photos/albums") });
  const filter = album === "all" ? "" : `?albums=${album}`;
  const photos = useQuery({ queryKey: ["photos", album], queryFn: () => api.get<Photo[]>(`/api/photos/photos${filter}`) });
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["albums"] });
    await queryClient.invalidateQueries({ queryKey: ["photos"] });
  };

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const action = newAction();
    try {
      let n = 0;
      for (const file of Array.from(files)) {
        n += 1;
        setBusy(t("photos.uploading", { n, total: files.length }));
        const blob = await shrink(file);
        const query = typeof album === "number" ? `?album_id=${album}` : "";
        const buffer = await blob.arrayBuffer();
        await api.withCode("POST", `/api/photos/photos${query}`, new Uint8Array(buffer), action);
      }
      await refresh();
    } catch (e) {
      const text = e instanceof ApiError && e.error === "not_an_image" ? t("photos.notImage") : errorText(e, t);
      if (text) setError(text);
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  }

  async function removePhoto(id: number) {
    try {
      await api.withCode("DELETE", `/api/photos/photos/${id}`, undefined, newAction());
      await refresh();
    } catch (e) {
      const text = errorText(e, t);
      if (text) setError(text);
    }
  }

  async function createAlbum() {
    const name = (newAlbum ?? "").trim();
    if (!name) return;
    try {
      const created = await api.withCode<Album>("POST", "/api/photos/albums", { name }, newAction());
      setNewAlbum(null);
      await refresh();
      setAlbum(created.id);
    } catch (e) {
      const text = e instanceof ApiError && e.error === "album_name_taken" ? t("photos.albumTaken") : errorText(e, t);
      if (text) setError(text);
    }
  }

  const current = typeof album === "number" ? albums.data?.albums.find((a) => a.id === album) : undefined;
  async function removeAlbum() {
    if (!current || !window.confirm(t("photos.confirmAlbum", { name: current.name }))) return;
    try {
      await api.withCode("DELETE", `/api/photos/albums/${current.id}`, undefined, newAction());
      setAlbum("all");
      await refresh();
    } catch (e) {
      const text = errorText(e, t);
      if (text) setError(text);
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>{t("photos.title")}</h1>
        <div className="toolbar">
          <label className="btn btn-primary" htmlFor="photo-file">{t("photos.upload")}</label>
          <input id="photo-file" ref={input} className="visually-hidden" type="file" accept="image/*" multiple onChange={(e) => void upload(e.target.files)} />
        </div>
      </div>
      <p className="muted">{t("photos.intro")}</p>

      <div className="chips" role="group" aria-label={t("photos.albums")}>
        <button className={`chip${album === "all" ? " on" : ""}`} onClick={() => setAlbum("all")}>{t("photos.all")}</button>
        {albums.data?.albums.map((a) => (
          <button key={a.id} className={`chip${album === a.id ? " on" : ""}`} onClick={() => setAlbum(a.id)}>{a.name} · {a.count}</button>
        ))}
        {(albums.data?.without_album ?? 0) > 0 && (
          <button className={`chip${album === "none" ? " on" : ""}`} onClick={() => setAlbum("none")}>{t("photos.noAlbum")} · {albums.data?.without_album}</button>
        )}
        <button className="chip" onClick={() => setNewAlbum("")}>+ {t("photos.newAlbum")}</button>
      </div>
      {current && <div><button className="btn btn-danger" onClick={() => void removeAlbum()}>{t("photos.deleteAlbum")}</button></div>}

      {busy && <p className="notice" role="status">{busy}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      {photos.isSuccess && photos.data.length === 0 && <p className="card">{t("photos.empty")}</p>}
      <div className="photo-grid">
        {photos.data?.map((p) => (
          <div key={p.id} className="photo">
            <img src={photoUrl(p.id)} alt="" loading="lazy" />
            <button type="button" aria-label={t("common.delete")} onClick={() => void removePhoto(p.id)}>✕</button>
          </div>
        ))}
      </div>

      {newAlbum !== null && (
        <Modal title={t("photos.newAlbum")} onClose={() => setNewAlbum(null)}>
          <form className="stack" onSubmit={(e) => { e.preventDefault(); void createAlbum(); }}>
            <label className="field-label" htmlFor="album-name">{t("photos.albumName")}</label>
            <input id="album-name" className="field" autoFocus value={newAlbum} maxLength={60} onChange={(e) => setNewAlbum(e.target.value)} />
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setNewAlbum(null)}>{t("common.cancel")}</button>
              <button type="submit" className="btn btn-primary" disabled={!newAlbum.trim()}>{t("common.save")}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
