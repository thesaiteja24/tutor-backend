import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import websocket from "@fastify/websocket";
import path from "node:path";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { databasePlugin } from "./database.plugin.ts";
import { docsPlugin } from "./docs.plugin.ts";
import { multipartPlugin } from "./multipart.plugin.ts";
import { rateLimitPlugin } from "./rate-limit.plugin.ts";

const pluginsAsync: FastifyPluginAsync = async (fastify) => {
  // CORS
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  // WebSockets Gateway
  await fastify.register(websocket);

  // Static File Serving (Avatars & Signature Audio Previews)
  await fastify.register(fastifyStatic, {
    root: path.resolve(process.cwd(), "public"),
    prefix: "/static/",
  });

  // Docs
  await fastify.register(docsPlugin);

  // Rate Limiting
  await fastify.register(rateLimitPlugin);

  // Multipart Audio
  await fastify.register(multipartPlugin);

  // Database Client Decorator
  await fastify.register(databasePlugin);
};

export const appPlugins = fp(pluginsAsync, {
  name: "app-plugins",
});
