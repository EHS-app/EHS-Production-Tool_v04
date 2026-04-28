/**
 * Clerk Frontend API Proxy Middleware
 *
 * Proxies Clerk Frontend API requests through your domain, enabling Clerk
 * authentication on custom domains and .replit.app deployments without
 * requiring CNAME DNS configuration.
 *
 * AUTH CONFIGURATION: To manage users, enable/disable login providers
 * (Google, GitHub, etc.), change app branding, or configure OAuth credentials,
 * use the Auth pane in the workspace toolbar. There is no external Clerk
 * dashboard — all auth configuration is done through the Auth pane.
 *
 * IMPORTANT:
 * - Only active in production (Clerk proxying doesn't work for dev instances)
 * - Must be mounted BEFORE express.json() middleware
 *
 * Usage in app.ts:
 *   import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
 *   app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
 */

import { createProxyMiddleware } from "http-proxy-middleware";
import type { RequestHandler } from "express";

const CLERK_FAPI = "https://frontend-api.clerk.dev";
export const CLERK_PROXY_PATH = "/api/__clerk";

export function clerkProxyMiddleware(): RequestHandler {
  // Only run proxy in production — Clerk proxying doesn't work for dev instances
  if (process.env.NODE_ENV !== "production") {
    return (_req, _res, next) => next();
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return (_req, _res, next) => next();
  }

  return createProxyMiddleware({
    target: CLERK_FAPI,
    changeOrigin: true,
    pathRewrite: (path: string) =>
      path.replace(new RegExp(`^${CLERK_PROXY_PATH}`), ""),
    selfHandleResponse: true,
    on: {
      proxyReq: (proxyReq, req) => {
        const protocol = req.headers["x-forwarded-proto"] || "https";
        const host = req.headers.host || "";
        const proxyUrl = `${protocol}://${host}${CLERK_PROXY_PATH}`;

        proxyReq.setHeader("Clerk-Proxy-Url", proxyUrl);
        proxyReq.setHeader("Clerk-Secret-Key", secretKey);

        const xff = req.headers["x-forwarded-for"];
        const clientIp =
          (Array.isArray(xff) ? xff[0] : xff)?.split(",")[0]?.trim() ||
          req.socket?.remoteAddress ||
          "";
        if (clientIp) {
          proxyReq.setHeader("X-Forwarded-For", clientIp);
        }
      },
      proxyRes: (proxyRes, req, res) => {
        // Mirror status + headers so the client gets an unchanged response.
        res.statusCode = proxyRes.statusCode || 200;
        for (const [k, v] of Object.entries(proxyRes.headers)) {
          if (v !== undefined) {
            try {
              res.setHeader(k, v as string | string[] | number);
            } catch {
              /* drop hop-by-hop or invalid headers silently */
            }
          }
        }

        // Capture the body so we can both forward it and log failures
        // for sensitive endpoints (sign-in / sign-up). This is invaluable
        // for debugging "Account not found" / "Wrong password" issues.
        const url = (req as { url?: string }).url || "";
        const isAuthEndpoint =
          /\/v1\/client\/sign_(ins|ups)/.test(url) ||
          /\/v1\/client\/sign_ins\/[^/]+\/(prepare|attempt)_first_factor/.test(url);

        if (isAuthEndpoint && (proxyRes.statusCode || 200) >= 400) {
          const chunks: Buffer[] = [];
          proxyRes.on("data", (chunk: Buffer) => chunks.push(chunk));
          proxyRes.on("end", () => {
            const body = Buffer.concat(chunks);
            try {
              const text = body.toString("utf8");
              // Log the JSON error body for debugging
              // eslint-disable-next-line no-console
              console.warn(
                "[clerkProxy] auth failure",
                JSON.stringify({
                  url,
                  status: proxyRes.statusCode,
                  body: text.slice(0, 1000),
                }),
              );
            } catch {
              /* ignore */
            }
            res.end(body);
          });
          proxyRes.on("error", (err: Error) => {
            // eslint-disable-next-line no-console
            console.warn("[clerkProxy] upstream error", err.message);
            res.end();
          });
        } else {
          // Pass-through for everything else
          proxyRes.pipe(res);
        }
      },
    },
  }) as RequestHandler;
}
