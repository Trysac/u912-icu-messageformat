/**
 * AST Node types representing parsed ICU MessagePattern elements.
 */

export interface LiteralNode {
  type: "literal";
  value: string;
}

export interface ArgumentNode {
  type: "argument";
  id: string;
}

export interface NumberNode {
  type: "number";
  id: string;
  style?: "integer" | "percent" | undefined;
}

export interface PluralOption {
  selector: string;
  value: MessageAst;
}

export interface PluralNode {
  type: "plural";
  id: string;
  offset: number;
  options: PluralOption[];
}

export interface SelectOrdinalNode {
  type: "selectordinal";
  id: string;
  offset: 0;
  options: PluralOption[];
}

export interface SelectOption {
  selector: string;
  value: MessageAst;
}

export interface SelectNode {
  type: "select";
  id: string;
  options: SelectOption[];
}

export interface PoundNode {
  type: "pound";
}

export type AstNode =
  | LiteralNode
  | ArgumentNode
  | NumberNode
  | PluralNode
  | SelectOrdinalNode
  | SelectNode
  | PoundNode;

export type MessageAst = AstNode[];

export interface ParseOptions {
  maxLength?: number | undefined;
  maxDepth?: number | undefined;
}
