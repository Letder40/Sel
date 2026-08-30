import { TokenType } from "../types/token.js"

export type OperatorInfo = {
  precedence: number
  type: "unary" | "binary"
}

export const OPERATOR_INFO = new Map<TokenType, OperatorInfo>([
  ["OR", {
    precedence: 0,
    type: "binary",
  }],

  ["XOR", {
    precedence: 1,
    type: "binary",
  }],

  ["AND", {
    precedence: 2,
    type: "binary",
  }],

  ["NOT", {
    precedence: 3,
    type: "unary",
  }],

  ["EQUALS", {
    precedence: 4,
    type: "binary",
  }],

  ["NOT EQUALS", {
    precedence: 4,
    type: "binary",
  }],

  ["LESSER", {
    precedence: 4,
    type: "binary",
  }],

  ["LESSER EQUALS", {
    precedence: 4,
    type: "binary",
  }],

  ["GREATER", {
    precedence: 4,
    type: "binary",
  }],

  ["GREATER EQUALS", {
    precedence: 4,
    type: "binary",
  }],

  ["INCLUDES", {
    precedence: 4,
    type: "binary",
  }],

  ["STARTS", {
    precedence: 4,
    type: "binary",
  }],

  ["ENDS", {
    precedence: 4,
    type: "binary",
  }],
])
