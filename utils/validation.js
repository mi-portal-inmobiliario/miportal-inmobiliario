import { z } from "zod";

export const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "ObjectId inválido");

export const cleanString = (max = 500) =>
  z.preprocess(
    value => typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value,
    z.string().max(max)
  );

export const optionalCleanString = (max = 500) =>
  z.preprocess(
    value => value === undefined || value === null ? undefined : value,
    cleanString(max).optional()
  );

export const numberFromInput = z.preprocess(
  value => value === "" || value === undefined || value === null ? undefined : Number(value),
  z.number().finite()
);

export const optionalNumberFromInput = z.preprocess(
  value => value === "" || value === undefined || value === null ? undefined : Number(value),
  z.number().finite().optional()
);

export function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Datos inválidos" });
    }
    req.body = parsed.data;
    next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: "Parámetros inválidos" });
    }
    req.query = parsed.data;
    next();
  };
}

export function isObjectId(value) {
  return objectId.safeParse(value).success;
}

export { z };
