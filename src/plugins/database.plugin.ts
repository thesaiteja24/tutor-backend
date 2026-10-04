import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { db, type Database } from "@/database/index.ts";

declare module "fastify" {
  interface FastifyInstance {
    db: Database;
  }
}

const databasePluginAsync: FastifyPluginAsync = async (fastify) => {
  fastify.decorate("db", db);
};

export const databasePlugin = fp(databasePluginAsync, {
  name: "database-plugin",
});
