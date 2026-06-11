export function normalizeSpanishPrice(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (value === "" || value === undefined || value === null) return undefined;

  let input = String(value)
    .trim()
    .replace(/\s+/g, "")
    .replace(/[€]/g, "");

  if (!input) return undefined;
  if (!/^\d{1,3}([.,]?\d{3})*([,.]\d+)?$|^\d+([,.]\d+)?$/.test(input)) {
    return Number.NaN;
  }

  if (input.includes(",")) {
    const [integerPart, decimalPart = ""] = input.split(",");
    input = `${integerPart.replace(/\./g, "")}.${decimalPart}`;
  } else {
    const dotCount = (input.match(/\./g) || []).length;
    if (dotCount > 1) {
      input = input.replace(/\./g, "");
    } else if (dotCount === 1) {
      const [integerPart, decimalPart] = input.split(".");
      if (decimalPart?.length === 3) {
        input = `${integerPart}${decimalPart}`;
      }
    }
  }

  const normalized = Number(input);
  return Number.isFinite(normalized) ? normalized : Number.NaN;
}
