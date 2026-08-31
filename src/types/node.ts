import { Option } from "lrustlike/option"
import { LogicOperation, Modifier, Operation, Token } from "./token.js"

export type UnaryLogicOperation = "NOT"
export type BinaryLogicOperation = Exclude<LogicOperation, UnaryLogicOperation>

export type AstNode =
  | {
    token: Token & { type: BinaryLogicOperation }
    type: "logic binary"
    left: AstNode
    right: AstNode
  }
  | {
    token: Token & { type: UnaryLogicOperation }
    type: "logic unary"
    value: AstNode
  }
  | {
    token: Token & { type: Operation }
    type: "operation"
    left: AstNode
    right: AstNode
  }
  | {
    token: Token & { type: "KEY" }
    type: "key"
    value: string
  }
  | {
    token: Token & { type: Modifier }
    type: "modifier"
    modifier: Modifier
    modifies: AstNode
  }
  | {
    token: Token & { type: "STRING" }
    type: "primitive"
    value: string
  }
  | {
    token: Token & { type: "NUMBER" }
    type: "primitive"
    value: number
  }
  | {
    type: "expected"
    expected: "complete AST";
    ast: AstNode
  }
  | {
    type: "expected"
    expected: "closed paren";
    found: Option<Token>
  }
  | {
    type: "expected"
    expected: "primitive";
  }
  | {
    type: "expected"
    expected: "node";
  }
