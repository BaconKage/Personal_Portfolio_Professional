import type { MetadataRoute } from "next";
import { projects } from "@/data/projects";
import { siteUrl } from "@/lib/site";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/work", ...projects.map((p) => `/work/${p.slug}`)].map(
    (path) => ({
      url: `${siteUrl}${path}`,
      changeFrequency: "monthly",
      priority: path === "" ? 1 : 0.8,
    }),
  );
}
