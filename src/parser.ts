import { LogicOperation, Operation } from "./types/token.js"

export type Associativity =
  | "LEFT"
  | "RIGHT"
  | "NONE"

export type OperatorInfo = {
  precedence: number
  associativity: Associativity
}

type AstOperator = LogicOperation | Operation

export const OPERATOR_INFO = new Map<AstOperator, OperatorInfo>([
  ["OR", {
    precedence: 0,
    associativity: "LEFT"
  }],

  ["XOR", {
    precedence: 1,
    associativity: "LEFT"
  }],

  ["AND", {
    precedence: 2,
    associativity: "LEFT"
  }],

  ["SEARCH", {
    precedence: 3,
    associativity: "NONE"
  }],

  ["EQUALS", {
    precedence: 3,
    associativity: "NONE"
  }],

  ["NOT EQUALS", {
    precedence: 3,
    associativity: "NONE"
  }],

  ["LESSER", {
    precedence: 3,
    associativity: "NONE"
  }],

  ["LESSER EQUALS", {
    precedence: 3,
    associativity: "NONE"
  }],

  ["GREATER", {
    precedence: 3,
    associativity: "NONE"
  }],

  ["GREATER EQUALS", {
    precedence: 3,
    associativity: "NONE"
  }],

  ["NOT", {
    precedence: 4,
    associativity: "RIGHT"
  }],
])
