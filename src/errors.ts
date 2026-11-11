/**
 * Machine-readable error codes for ICU MessageFormat parsing and formatting.
 */
export type MessageFormatErrorCode =
  | "syntax"
  | "unclosed_brace"
  | "missing_other"
  | "duplicate_selector"
  | "unknown_type"
  | "unsupported_style"
  | "missing_value"
  | "invalid_value"
  | "input_too_large"
  | "too_deep";

/**
 * Base error class for ICU MessageFormat errors carrying machine-readable codes and UTF-16 input offsets.
 */
export class MessageFormatError extends Error {
  readonly code: MessageFormatErrorCode;
  readonly offset: number;

  constructor(message: string, code: MessageFormatErrorCode, offset: number) {
    const truncatedMessage = message.length > 200 ? `${message.slice(0, 197)}...` : message;
    super(truncatedMessage);
    this.name = "MessageFormatError";
    this.code = code;
    this.offset = offset;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
