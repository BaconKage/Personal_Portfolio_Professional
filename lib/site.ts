const configured = process.env.NEXT_PUBLIC_SITE_URL;
const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
export const siteUrl =
  configured || (vercel ? `https://${vercel}` : "http://localhost:3000");
export const indexable =
  process.env.VERCEL_ENV === "production" ||
  (process.env.NODE_ENV === "production" &&
    Boolean(configured) &&
    !process.env.VERCEL_ENV);
