/**
 * Hand-written ICU MessageFormat parser and formatter.
 * Implements ICU ApostropheMode DOUBLE_OPTIONAL, exact plural options, plural offset,
 * selectordinal, select, and Intl number formatting with zero runtime dependencies.
 */

export { compile, format } from "./compiler.js";
export { MessageFormatError, type MessageFormatErrorCode } from "./errors.js";
export { parse } from "./parser.js";
export type {
  ArgumentNode,
  AstNode,
  LiteralNode,
  MessageAst,
  NumberNode,
  ParseOptions,
  PluralNode,
  PluralOption,
  PoundNode,
  SelectNode,
  SelectOption,
  SelectOrdinalNode,
} from "./types.js";
