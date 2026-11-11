import { MessageFormatError } from "./errors.js";
import type { AstNode, MessageAst, ParseOptions, PluralOption, SelectOption } from "./types.js";

const DEFAULT_MAX_LENGTH = 10_000;
const DEFAULT_MAX_DEPTH = 10;

function isPatternWhiteSpace(ch: string): boolean {
  return ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\v" || ch === "\f";
}

function isAsciiLetterOrDigitOrUnderscore(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return (
    (code >= 65 && code <= 90) || // A-Z
    (code >= 97 && code <= 122) || // a-z
    (code >= 48 && code <= 57) || // 0-9
    code === 95 // _
  );
}

interface ParserContext {
  message: string;
  index: number;
  length: number;
  maxDepth: number;
}

function skipWhitespace(ctx: ParserContext): void {
  while (ctx.index < ctx.length && isPatternWhiteSpace(ctx.message[ctx.index] ?? "")) {
    ctx.index++;
  }
}

function parseId(ctx: ParserContext, errorOffset: number): string {
  skipWhitespace(ctx);
  const start = ctx.index;
  while (ctx.index < ctx.length && isAsciiLetterOrDigitOrUnderscore(ctx.message[ctx.index] ?? "")) {
    ctx.index++;
  }
  if (start === ctx.index) {
    throw new MessageFormatError("Expected an argument name", "syntax", errorOffset);
  }
  const id = ctx.message.slice(start, ctx.index);
  skipWhitespace(ctx);
  return id;
}

function parseInteger(ctx: ParserContext, errorOffset: number): number {
  skipWhitespace(ctx);
  const start = ctx.index;
  if (
    ctx.index < ctx.length &&
    (ctx.message[ctx.index] === "+" || ctx.message[ctx.index] === "-")
  ) {
    ctx.index++;
  }
  const digitStart = ctx.index;
  while (
    ctx.index < ctx.length &&
    (ctx.message[ctx.index] ?? "") >= "0" &&
    (ctx.message[ctx.index] ?? "") <= "9"
  ) {
    ctx.index++;
  }
  if (digitStart === ctx.index) {
    throw new MessageFormatError("Expected an integer", "syntax", errorOffset);
  }
  return parseInt(ctx.message.slice(start, ctx.index), 10);
}

function parseMessage(
  ctx: ParserContext,
  depth: number,
  inPlural: boolean,
  stopChar?: "}" | undefined,
): MessageAst {
  if (depth > ctx.maxDepth) {
    throw new MessageFormatError("Nesting level exceeded maxDepth limit", "too_deep", ctx.index);
  }

  const nodes: AstNode[] = [];
  let literalBuffer = "";

  function flushLiteral(): void {
    if (literalBuffer.length > 0) {
      nodes.push({ type: "literal", value: literalBuffer });
      literalBuffer = "";
    }
  }

  while (ctx.index < ctx.length) {
    const ch = ctx.message[ctx.index] ?? "";

    if (ch === "}") {
      if (stopChar === "}") {
        flushLiteral();
        return nodes;
      }
      throw new MessageFormatError("Unmatched closing brace", "syntax", ctx.index);
    }

    if (ch === "#") {
      if (inPlural) {
        flushLiteral();
        nodes.push({ type: "pound" });
        ctx.index++;
        continue;
      }
      literalBuffer += "#";
      ctx.index++;
      continue;
    }

    if (ch === "'") {
      // Check for '' -> literal '
      if (ctx.index + 1 < ctx.length && ctx.message[ctx.index + 1] === "'") {
        literalBuffer += "'";
        ctx.index += 2;
        continue;
      }

      // ApostropheMode DOUBLE_OPTIONAL: a single ' starts quoted literal text
      // only when followed by '{', '}', or '#' inside plural/selectordinal option.
      const nextChar = ctx.index + 1 < ctx.length ? ctx.message[ctx.index + 1] : undefined;
      const isSpecialNext = nextChar === "{" || nextChar === "}" || (inPlural && nextChar === "#");

      if (isSpecialNext) {
        ctx.index++; // skip opening '
        while (ctx.index < ctx.length) {
          const qch = ctx.message[ctx.index] ?? "";
          if (qch === "'") {
            if (ctx.index + 1 < ctx.length && ctx.message[ctx.index + 1] === "'") {
              literalBuffer += "'";
              ctx.index += 2;
              continue;
            }
            ctx.index++; // closing '
            break;
          }
          literalBuffer += qch;
          ctx.index++;
        }
        continue;
      }

      // Otherwise, ' is literal
      literalBuffer += "'";
      ctx.index++;
      continue;
    }

    if (ch === "{") {
      flushLiteral();
      const braceOffset = ctx.index;
      ctx.index++; // consume '{'
      nodes.push(parseArgument(ctx, depth + 1, inPlural, braceOffset));
      continue;
    }

    literalBuffer += ch;
    ctx.index++;
  }

  if (stopChar === "}") {
    throw new MessageFormatError("Unclosed brace", "unclosed_brace", ctx.length);
  }

  flushLiteral();
  return nodes;
}

function parseArgument(
  ctx: ParserContext,
  depth: number,
  inPlural: boolean,
  braceOffset: number,
): AstNode {
  const id = parseId(ctx, braceOffset);

  if (ctx.index >= ctx.length) {
    throw new MessageFormatError("Unclosed brace", "unclosed_brace", braceOffset);
  }

  if (ctx.message[ctx.index] === "}") {
    ctx.index++; // consume '}'
    return { type: "argument", id };
  }

  if (ctx.message[ctx.index] !== ",") {
    throw new MessageFormatError("Expected comma or closing brace", "syntax", ctx.index);
  }

  ctx.index++; // consume ','
  skipWhitespace(ctx);

  const typeOffset = ctx.index;
  let typeStr = "";
  while (ctx.index < ctx.length && isAsciiLetterOrDigitOrUnderscore(ctx.message[ctx.index] ?? "")) {
    typeStr += ctx.message[ctx.index];
    ctx.index++;
  }
  skipWhitespace(ctx);

  if (typeStr === "number") {
    let style: "integer" | "percent" | undefined;
    if (ctx.index < ctx.length && ctx.message[ctx.index] === ",") {
      ctx.index++; // consume ','
      skipWhitespace(ctx);
      const styleOffset = ctx.index;
      let styleStr = "";
      while (
        ctx.index < ctx.length &&
        isAsciiLetterOrDigitOrUnderscore(ctx.message[ctx.index] ?? "")
      ) {
        styleStr += ctx.message[ctx.index];
        ctx.index++;
      }
      skipWhitespace(ctx);
      if (styleStr === "integer" || styleStr === "percent") {
        style = styleStr;
      } else {
        throw new MessageFormatError(
          `Unsupported style "${styleStr}"`,
          "unsupported_style",
          styleOffset,
        );
      }
    }
    if (ctx.index >= ctx.length || ctx.message[ctx.index] !== "}") {
      throw new MessageFormatError(
        "Unclosed brace in number argument",
        "unclosed_brace",
        braceOffset,
      );
    }
    ctx.index++; // consume '}'
    return { type: "number", id, ...(style ? { style } : {}) };
  }

  if (typeStr === "plural" || typeStr === "selectordinal") {
    if (ctx.index >= ctx.length || ctx.message[ctx.index] !== ",") {
      throw new MessageFormatError(
        "Expected comma after plural/selectordinal",
        "syntax",
        ctx.index,
      );
    }
    ctx.index++; // consume ','
    skipWhitespace(ctx);

    let offset = 0;
    if (typeStr === "plural") {
      if (ctx.message.startsWith("offset:", ctx.index)) {
        const offsetStart = ctx.index;
        ctx.index += 7; // consume 'offset:'
        offset = parseInteger(ctx, offsetStart);
        skipWhitespace(ctx);
      }
    }

    const options: PluralOption[] = [];
    const seenSelectors = new Set<string>();

    while (ctx.index < ctx.length && ctx.message[ctx.index] !== "}") {
      skipWhitespace(ctx);
      if (ctx.index >= ctx.length || ctx.message[ctx.index] === "}") {
        break;
      }
      const selectorOffset = ctx.index;
      let selector = "";
      if (ctx.message[ctx.index] === "=") {
        ctx.index++;
        const intVal = parseInteger(ctx, selectorOffset);
        selector = `=${intVal}`;
      } else {
        while (
          ctx.index < ctx.length &&
          isAsciiLetterOrDigitOrUnderscore(ctx.message[ctx.index] ?? "")
        ) {
          selector += ctx.message[ctx.index];
          ctx.index++;
        }
        if (!["zero", "one", "two", "few", "many", "other"].includes(selector)) {
          throw new MessageFormatError(
            `Invalid plural selector "${selector}"`,
            "syntax",
            selectorOffset,
          );
        }
      }
      skipWhitespace(ctx);
      if (seenSelectors.has(selector)) {
        throw new MessageFormatError(
          `Duplicate selector "${selector}"`,
          "duplicate_selector",
          selectorOffset,
        );
      }
      seenSelectors.add(selector);

      if (ctx.index >= ctx.length || ctx.message[ctx.index] !== "{") {
        throw new MessageFormatError('Expected "{" before option body', "syntax", ctx.index);
      }
      const optionBraceOffset = ctx.index;
      ctx.index++; // consume '{'
      const optionAst = parseMessage(ctx, depth + 1, true, "}");
      if (ctx.index >= ctx.length || ctx.message[ctx.index] !== "}") {
        throw new MessageFormatError(
          "Unclosed brace in option",
          "unclosed_brace",
          optionBraceOffset,
        );
      }
      ctx.index++; // consume '}'
      options.push({ selector, value: optionAst });
      skipWhitespace(ctx);
    }

    if (ctx.index >= ctx.length || ctx.message[ctx.index] !== "}") {
      throw new MessageFormatError("Unclosed brace", "unclosed_brace", braceOffset);
    }
    ctx.index++; // consume '}'

    if (!seenSelectors.has("other")) {
      throw new MessageFormatError('Missing "other" selector', "missing_other", braceOffset);
    }

    if (typeStr === "plural") {
      return { type: "plural", id, offset, options };
    }
    return { type: "selectordinal", id, offset: 0, options };
  }

  if (typeStr === "select") {
    if (ctx.index >= ctx.length || ctx.message[ctx.index] !== ",") {
      throw new MessageFormatError("Expected comma after select", "syntax", ctx.index);
    }
    ctx.index++; // consume ','
    skipWhitespace(ctx);

    const options: SelectOption[] = [];
    const seenSelectors = new Set<string>();

    while (ctx.index < ctx.length && ctx.message[ctx.index] !== "}") {
      skipWhitespace(ctx);
      if (ctx.index >= ctx.length || ctx.message[ctx.index] === "}") {
        break;
      }
      const selectorOffset = ctx.index;
      let selector = "";
      while (
        ctx.index < ctx.length &&
        isAsciiLetterOrDigitOrUnderscore(ctx.message[ctx.index] ?? "")
      ) {
        selector += ctx.message[ctx.index];
        ctx.index++;
      }
      if (selector === "") {
        throw new MessageFormatError("Expected selector name", "syntax", selectorOffset);
      }
      skipWhitespace(ctx);
      if (seenSelectors.has(selector)) {
        throw new MessageFormatError(
          `Duplicate selector "${selector}"`,
          "duplicate_selector",
          selectorOffset,
        );
      }
      seenSelectors.add(selector);

      if (ctx.index >= ctx.length || ctx.message[ctx.index] !== "{") {
        throw new MessageFormatError('Expected "{" before option body', "syntax", ctx.index);
      }
      const optionBraceOffset = ctx.index;
      ctx.index++; // consume '{'
      const optionAst = parseMessage(ctx, depth + 1, inPlural, "}");
      if (ctx.index >= ctx.length || ctx.message[ctx.index] !== "}") {
        throw new MessageFormatError(
          "Unclosed brace in option",
          "unclosed_brace",
          optionBraceOffset,
        );
      }
      ctx.index++; // consume '}'
      options.push({ selector, value: optionAst });
      skipWhitespace(ctx);
    }

    if (ctx.index >= ctx.length || ctx.message[ctx.index] !== "}") {
      throw new MessageFormatError("Unclosed brace", "unclosed_brace", braceOffset);
    }
    ctx.index++; // consume '}'

    if (!seenSelectors.has("other")) {
      throw new MessageFormatError('Missing "other" selector', "missing_other", braceOffset);
    }

    return { type: "select", id, options };
  }

  throw new MessageFormatError(`Unknown argument type "${typeStr}"`, "unknown_type", typeOffset);
}

/**
 * Parses an ICU MessageFormat pattern into a typed AST.
 *
 * @param message - The input ICU MessageFormat string.
 * @param opts - Parser limits: maxLength (default 10,000) and maxDepth (default 10).
 * @returns The parsed AST.
 * @throws {MessageFormatError} On syntax, structural or resource limit errors.
 */
export function parse(message: string, opts?: ParseOptions): MessageAst {
  const maxLength = opts?.maxLength ?? DEFAULT_MAX_LENGTH;
  const maxDepth = opts?.maxDepth ?? DEFAULT_MAX_DEPTH;

  if (message.length > maxLength) {
    throw new MessageFormatError(
      `Input message exceeds maximum length of ${maxLength}`,
      "input_too_large",
      maxLength,
    );
  }

  const ctx: ParserContext = {
    message,
    index: 0,
    length: message.length,
    maxDepth,
  };

  return parseMessage(ctx, 0, false);
}
