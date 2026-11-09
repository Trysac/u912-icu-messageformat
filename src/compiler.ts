import { MessageFormatError } from "./errors.js";
import { parse } from "./parser.js";
import type {
  AstNode,
  MessageAst,
  NumberNode,
  PluralNode,
  SelectNode,
  SelectOrdinalNode,
} from "./types.js";

interface FormatContext {
  locale: string | string[];
  values: Record<string, unknown>;
  currentPluralValue: number | null;
  // Per-compile cached formatters
  defaultNumberFormat: Intl.NumberFormat;
  integerNumberFormat: Intl.NumberFormat;
  percentNumberFormat: Intl.NumberFormat;
  cardinalPluralRules: Intl.PluralRules;
  ordinalPluralRules: Intl.PluralRules;
}

function renderNodes(nodes: AstNode[], ctx: FormatContext): string {
  let result = "";
  for (const node of nodes) {
    switch (node.type) {
      case "literal":
        result += node.value;
        break;
      case "pound":
        if (ctx.currentPluralValue === null) {
          result += "#";
        } else {
          result += ctx.defaultNumberFormat.format(ctx.currentPluralValue);
        }
        break;
      case "argument": {
        if (!Object.hasOwn(ctx.values, node.id)) {
          throw new MessageFormatError(`Missing value for "${node.id}"`, "missing_value", -1);
        }
        const val = ctx.values[node.id];
        if (typeof val === "number") {
          result += ctx.defaultNumberFormat.format(val);
        } else {
          result += String(val);
        }
        break;
      }
      case "number":
        result += renderNumber(node, ctx);
        break;
      case "plural":
        result += renderPlural(node, ctx);
        break;
      case "selectordinal":
        result += renderSelectOrdinal(node, ctx);
        break;
      case "select":
        result += renderSelect(node, ctx);
        break;
    }
  }
  return result;
}

function renderNumber(node: NumberNode, ctx: FormatContext): string {
  if (!Object.hasOwn(ctx.values, node.id)) {
    throw new MessageFormatError(`Missing value for "${node.id}"`, "missing_value", -1);
  }
  const val = ctx.values[node.id];
  if (typeof val !== "number" || !Number.isFinite(val)) {
    throw new MessageFormatError(
      `Value for "${node.id}" must be a finite number`,
      "invalid_value",
      -1,
    );
  }
  if (node.style === "integer") {
    return ctx.integerNumberFormat.format(val);
  }
  if (node.style === "percent") {
    return ctx.percentNumberFormat.format(val);
  }
  return ctx.defaultNumberFormat.format(val);
}

function renderPlural(node: PluralNode, ctx: FormatContext): string {
  if (!Object.hasOwn(ctx.values, node.id)) {
    throw new MessageFormatError(`Missing value for "${node.id}"`, "missing_value", -1);
  }
  const rawVal = ctx.values[node.id];
  if (typeof rawVal !== "number" || !Number.isFinite(rawVal)) {
    throw new MessageFormatError(
      `Value for "${node.id}" must be a finite number`,
      "invalid_value",
      -1,
    );
  }

  // 1. Check exact match '=N' against raw value
  const exactKey = `=${rawVal}`;
  const exactOpt = node.options.find((opt) => opt.selector === exactKey);
  const savedPlural = ctx.currentPluralValue;
  ctx.currentPluralValue = rawVal - node.offset;
  try {
    if (exactOpt) {
      return renderNodes(exactOpt.value, ctx);
    }

    // 2. Select rule based on (rawVal - offset)
    const diff = rawVal - node.offset;
    const category = ctx.cardinalPluralRules.select(diff);
    const categoryOpt = node.options.find((opt) => opt.selector === category);
    if (categoryOpt) {
      return renderNodes(categoryOpt.value, ctx);
    }

    const otherOpt = node.options.find((opt) => opt.selector === "other");
    if (otherOpt) {
      return renderNodes(otherOpt.value, ctx);
    }
    throw new MessageFormatError('Missing "other" selector', "missing_other", -1);
  } finally {
    ctx.currentPluralValue = savedPlural;
  }
}

function renderSelectOrdinal(node: SelectOrdinalNode, ctx: FormatContext): string {
  if (!Object.hasOwn(ctx.values, node.id)) {
    throw new MessageFormatError(`Missing value for "${node.id}"`, "missing_value", -1);
  }
  const rawVal = ctx.values[node.id];
  if (typeof rawVal !== "number" || !Number.isFinite(rawVal)) {
    throw new MessageFormatError(
      `Value for "${node.id}" must be a finite number`,
      "invalid_value",
      -1,
    );
  }

  const exactKey = `=${rawVal}`;
  const exactOpt = node.options.find((opt) => opt.selector === exactKey);
  const savedPlural = ctx.currentPluralValue;
  ctx.currentPluralValue = rawVal;
  try {
    if (exactOpt) {
      return renderNodes(exactOpt.value, ctx);
    }

    const category = ctx.ordinalPluralRules.select(rawVal);
    const categoryOpt = node.options.find((opt) => opt.selector === category);
    if (categoryOpt) {
      return renderNodes(categoryOpt.value, ctx);
    }

    const otherOpt = node.options.find((opt) => opt.selector === "other");
    if (otherOpt) {
      return renderNodes(otherOpt.value, ctx);
    }
    throw new MessageFormatError('Missing "other" selector', "missing_other", -1);
  } finally {
    ctx.currentPluralValue = savedPlural;
  }
}

function renderSelect(node: SelectNode, ctx: FormatContext): string {
  if (!Object.hasOwn(ctx.values, node.id)) {
    throw new MessageFormatError(`Missing value for "${node.id}"`, "missing_value", -1);
  }
  const val = String(ctx.values[node.id]);
  const matched = node.options.find((opt) => opt.selector === val);
  if (matched) {
    return renderNodes(matched.value, ctx);
  }
  const otherOpt = node.options.find((opt) => opt.selector === "other");
  if (otherOpt) {
    return renderNodes(otherOpt.value, ctx);
  }
  throw new MessageFormatError('Missing "other" selector', "missing_other", -1);
}

/**
 * Compiles an ICU MessageFormat string or AST into an efficient formatter function.
 *
 * Intl instances are cached per compile call; no global cache is maintained.
 *
 * @param message - An ICU MessageFormat pattern string or parsed AST.
 * @param locale - BCP 47 locale tag or list of tags.
 * @returns A formatter function taking parameter values.
 */
export function compile(
  message: string | MessageAst,
  locale: string | string[],
): (values?: Record<string, unknown>) => string {
  const ast = typeof message === "string" ? parse(message) : message;

  // Cache Intl objects per compile call
  const defaultNumberFormat = new Intl.NumberFormat(locale);
  const integerNumberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const percentNumberFormat = new Intl.NumberFormat(locale, { style: "percent" });
  const cardinalPluralRules = new Intl.PluralRules(locale, { type: "cardinal" });
  const ordinalPluralRules = new Intl.PluralRules(locale, { type: "ordinal" });

  return (values: Record<string, unknown> = {}): string => {
    const ctx: FormatContext = {
      locale,
      values,
      currentPluralValue: null,
      defaultNumberFormat,
      integerNumberFormat,
      percentNumberFormat,
      cardinalPluralRules,
      ordinalPluralRules,
    };
    return renderNodes(ast, ctx);
  };
}

/**
 * Convenience function to parse, compile and format an ICU message in one step.
 *
 * @param message - The ICU MessageFormat pattern.
 * @param locale - BCP 47 locale tag or list of tags.
 * @param values - Values to interpolate.
 * @returns The formatted string.
 */
export function format(
  message: string,
  locale: string | string[],
  values?: Record<string, unknown>,
): string {
  const compiled = compile(message, locale);
  return compiled(values);
}
