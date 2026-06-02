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

function getIssueField(issue) {
  return issue.path?.length ? issue.path.join(".") : "datos";
}

function getSafeIssueMessage(issue) {
  const field = getIssueField(issue);
  if (field === "descripcion" && issue.code === "too_big") {
    return "La descripción no puede superar los 5000 caracteres.";
  }
  return `Revisa el campo ${field}.`;
}

export function validateBody(schema, options = {}) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const fields = [...new Set(parsed.error.issues.map(getIssueField))];
      const details = parsed.error.issues.map(issue => ({
        field: getIssueField(issue),
        code: issue.code,
        message: issue.message
      }));

      if (options.logLabel) {
        console.warn(`[VALIDATION:${options.logLabel}]`, { fields, details });
      }

      const response = {
        error: fields.length
          ? `Revisa estos campos: ${fields.join(", ")}`
          : "Datos inválidos"
      };

      const safeMessages = parsed.error.issues
        .map(getSafeIssueMessage)
        .filter((message, index, arr) => arr.indexOf(message) === index);

      if (safeMessages.length) response.message = safeMessages.join(" ");
      if (process.env.NODE_ENV === "development") response.details = parsed.error.issues;

      return res.status(400).json(response);
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
