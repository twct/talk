import { Config } from "coral-server/config";
import { ReadOnlyError } from "coral-server/errors";
import { RequestHandler } from "coral-server/types/express";

const readOnlyModeEnabled: RequestHandler = (req, res, next) => {
  next(new ReadOnlyError());
};

const readOnlyModeDisabled: RequestHandler = (req, res, next) => {
  next();
};

export const readOnlyAware = (config: Config): RequestHandler =>
  config.get("read_only") ? readOnlyModeEnabled : readOnlyModeDisabled;
