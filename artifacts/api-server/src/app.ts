import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Clerk frontend-API proxy must be mounted BEFORE body parsers (it streams raw bytes).
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors());
// Keep the global JSON body limit small. Routes that need to accept larger
// payloads (e.g. the drawing analyser, which receives base64-encoded images)
// mount their own express.json() with a higher limit at the route level.
// We deliberately SKIP the global parser for those routes so the global
// 256 KB limit doesn't reject their large payloads before the route-scoped
// parser (and any auth/rate-limit checks that gate it) ever run.
const PATHS_WITHOUT_GLOBAL_JSON: ReadonlySet<string> = new Set([
  "/api/rigplan/analyze",
]);
const globalJsonParser = express.json({ limit: "256kb" });
app.use((req, res, next) => {
  if (PATHS_WITHOUT_GLOBAL_JSON.has(req.path)) return next();
  return globalJsonParser(req, res, next);
});
app.use(express.urlencoded({ extended: true }));

app.use(clerkMiddleware());

app.use("/api", router);

export default app;
