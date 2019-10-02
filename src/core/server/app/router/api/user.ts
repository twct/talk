import express from "express";

import { AppOptions } from "coral-server/app";
import { userDownloadHandler } from "coral-server/app/handlers";
import { readOnlyAware } from "coral-server/app/middleware/readOnlyAware";

export function createNewUserRouter(app: AppOptions) {
  const router = express.Router();

  // Add the read only aware middleware to the stack.
  router.use(readOnlyAware(app.config));

  router.get("/download", userDownloadHandler(app));

  return router;
}
