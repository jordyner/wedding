import type { MetadataRoute } from "next";

// A private wedding invitation: keep the whole site out of search results.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
