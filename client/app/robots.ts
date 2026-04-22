import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard/", "/workspace/"],
    },
    sitemap: "https://collabx.app/sitemap.xml",
  };
}
