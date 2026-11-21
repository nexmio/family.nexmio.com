import { type ReactNode, useEffect, useState } from "react";

export type Transition = "fade" | "slide" | "zoom";

export const photoUrl = (id: number) => `/api/photos/photos/${id}/file`;

/** A photo series. One photo at a time (tile) or one big and four small (mosaic). */
export function Slideshow({
  photos, transition, intervalSec, layout = "tile", emptyLabel, caption,
}: {
  photos: number[]; transition: Transition; intervalSec: number; layout?: "tile" | "mosaic";
  emptyLabel: string; caption?: ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const count = photos.length;
  useEffect(() => {
    if (count < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), Math.max(3, intervalSec) * 1000);
    return () => clearInterval(id);
  }, [count, intervalSec]);

  if (count === 0) {
    return <div className="slideshow"><div className="slide-placeholder">{emptyLabel}</div></div>;
  }
  const at = (offset: number) => photos[(index + offset) % count];
  return (
    <div className="slideshow">
      {layout === "mosaic" ? (
        <div className="mosaic">
          {[0, 1, 2, 3, 4].map((o) => (
            <img key={`${index}-${o}`} className={`slide-in ${transition}`} src={photoUrl(at(o))} alt="" loading="lazy" />
          ))}
        </div>
      ) : (
        <img key={index} className={`slide-in ${transition}`} src={photoUrl(at(0))} alt="" />
      )}
      {caption && <span className="slide-caption">{caption}</span>}
    </div>
  );
}
