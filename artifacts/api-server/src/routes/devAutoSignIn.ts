import { Router, type IRouter, type Request, type Response } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const ADMIN_USER_ID = "user_3Cx5qiY52TcaJowheSkwll49BRQ";

router.post("/dev/auto-signin-token", async (_req: Request, res: Response) => {
  if (process.env.NODE_ENV === "production") {
    res.status(404).json({ error: "not_found" });
    return;
  }

  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) {
    res.status(500).json({ error: "missing_clerk_secret" });
    return;
  }

  try {
    const r = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: ADMIN_USER_ID,
        expires_in_seconds: 60,
      }),
    });

    if (!r.ok) {
      const text = await r.text();
      logger.warn({ status: r.status, body: text }, "clerk sign_in_tokens failed");
      res.status(502).json({ error: "clerk_token_failed", detail: text });
      return;
    }

    const data = (await r.json()) as { token?: string };
    if (!data.token) {
      res.status(502).json({ error: "no_token_in_response" });
      return;
    }

    res.json({ ticket: data.token });
  } catch (err) {
    logger.error({ err }, "dev auto-signin-token error");
    res.status(500).json({ error: "internal" });
  }
});

export default router;
