import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { Request, Response, NextFunction } from "express";
import { emailQueue } from "../queues/email.queue.js";
import { config } from "./index.js";

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter
});

/**
 * Basic Auth middleware for protecting Bull Board UI
 */
export function bullBoardAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Bull Board Access"');
    res.status(401).send("Authentication required for Queue Dashboard");
    return;
  }

  const credentials = Buffer.from(authHeader.substring(6), "base64").toString("utf8");
  const [user, pass] = credentials.split(":");

  if (user === config.bullBoard.username && pass === config.bullBoard.password) {
    next();
  } else {
    res.setHeader("WWW-Authenticate", 'Basic realm="Bull Board Access"');
    res.status(401).send("Invalid credentials");
  }
}

export const bullBoardRouter = serverAdapter.getRouter();
