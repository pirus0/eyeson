import type { MetadataRoute } from "next";
import { withBasePath } from "@/lib/basePath";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Eyes On",
    short_name: "Eyes On",
    description: "Ödemeler ve yapılacaklar için takvim üzerinden takip",
    start_url: withBasePath("/"),
    display: "standalone",
    orientation: "portrait",
    background_color: "#fafafa",
    theme_color: "#14171c",
    icons: [
      { src: withBasePath("/icons/icon-192.png"), sizes: "192x192", type: "image/png" },
      { src: withBasePath("/icons/icon-512.png"), sizes: "512x512", type: "image/png" },
      {
        src: withBasePath("/icons/icon-maskable-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
