import multipart from "@fastify/multipart";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const multipartPluginAsync: FastifyPluginAsync = async (fastify) => {
  await fastify.register(multipart, {
    limits: {
      fieldNameSize: 100,
      fieldSize: 1024 * 1024 * 5, // 5MB text fields
      fileSize: 1024 * 1024 * 25,  // 25MB audio files
      files: 1,
    },
    attachFieldsToBody: false, // We'll stream files or read with req.file()
  });
};

export const multipartPlugin = fp(multipartPluginAsync, {
  name: "multipart-plugin",
});
