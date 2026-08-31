import { TokenType } from "../types/token.js"

export type OperatorInfo = {
  precedence: number
  type: "logic unary" | "logic binary" | "operator"
}

export const OPERATOR_INFO = new Map<TokenType, OperatorInfo>([
  ["OR", {
    precedence: 0,
    type: "logic binary",
  }],

  ["XOR", {
    precedence: 1,
    type: "logic binary",
  }],

  ["AND", {
    precedence: 2,
    type: "logic binary",
  }],

  ["NOT", {
    precedence: 3,
    type: "logic unary",
  }],

  ["EQUALS", {
    precedence: 4,
    type: "operator",
  }],

  ["NOT EQUALS", {
    precedence: 4,
    type: "operator",
  }],

  ["LESSER", {
    precedence: 4,
    type: "operator",
  }],

  ["LESSER EQUALS", {
    precedence: 4,
    type: "operator",
  }],

  ["GREATER", {
    precedence: 4,
    type: "operator",
  }],

  ["GREATER EQUALS", {
    precedence: 4,
    type: "operator",
  }],

  ["INCLUDES", {
    precedence: 4,
    type: "operator",
  }],

  ["STARTS", {
    precedence: 4,
    type: "operator",
  }],

  ["ENDS", {
    precedence: 4,
    type: "operator",
  }],
])
