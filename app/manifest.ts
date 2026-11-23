import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Copilote de Jardin",
    short_name: "Jardin",
    description: "Assistant intelligent de jardinage",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#fefae0",
    theme_color: "#2d6a4f",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
