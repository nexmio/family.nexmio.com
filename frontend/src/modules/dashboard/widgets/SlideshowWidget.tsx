import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Slideshow } from "../../../shared/ui/Slideshow";
import { dashboardGet } from "../dashboardApi";
import type { PhotoWidget, SlideshowSettings } from "../types";

export const usePhotoIds = (albums: number[]) =>
  useQuery({
    queryKey: ["display-photos", albums.join(",")],
    queryFn: () => dashboardGet<{ id: number }[]>(`/api/photos/photos${albums.length ? `?albums=${albums.join(",")}` : ""}`),
    refetchInterval: 300_000,
  });

export function SlideshowWidget({ config, slideshow }: { config: PhotoWidget; slideshow: SlideshowSettings }) {
  const { t } = useTranslation();
  const photos = usePhotoIds(slideshow.albums);
  return (
    <Slideshow
      photos={(photos.data ?? []).map((p) => p.id)}
      transition={slideshow.transition}
      intervalSec={slideshow.interval}
      layout={config.settings.layout}
      emptyLabel={t("dashboard.display.noPhotos")}
    />
  );
}
