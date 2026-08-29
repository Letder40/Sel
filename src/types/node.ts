import { LogicOperation, Operation } from "./token.js"

type BinaryOperation =
  | Exclude<LogicOperation, "NOT">
  | Operation

export type AstNode =
  | {
    token: BinaryOperation
    left: AstNode
    right: AstNode
  }
  | {
    token: "NOT"
    value: AstNode
  }
  | {
    token: "KEY"
    value: string
  }
  | {
    token: "STRING"
    value: string
  }
  | {
    token: "NUMBER"
    value: number
  }
