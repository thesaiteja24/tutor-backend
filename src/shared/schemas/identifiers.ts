import { z } from "zod";

const UUID_V7_VERSION_INDEX = 14;
const UUID_VARIANT_INDEX = 19;

export const uuidv7Schema = z.uuid().refine(
  (value) => value[UUID_V7_VERSION_INDEX] === "7" && /^[89ab]$/i.test(value[UUID_VARIANT_INDEX] || ""),
  { message: "Expected a UUIDv7 identifier" },
);
