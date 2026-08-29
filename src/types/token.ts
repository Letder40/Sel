export type Operation =
  | "SEARCH"
  | "EQUALS"
  | "NOT EQUALS"
  | "LESSER EQUALS"
  | "LESSER"
  | "GREATER"
  | "GREATER EQUALS"

export type LogicOperation =
  | "OR"
  | "XOR"
  | "AND"
  | "NOT"

export type Primitive =
  | "STRING"
  | "NUMBER"

export type Syntax =
  | "OPEN PAREN"
  | "CLOSE PAREN"
  | "KEY"

export type TokenType =
  | Syntax
  | Primitive
  | LogicOperation
  | Operation

export type Token = {
  token: TokenType,
  starts: number,
  ends: number,
  value: string
}

export const Token =
(token: Token["token"],
 starts: number,
 ends: number,
 value: string
) => ({
  token,
  starts,
  ends,
  value
} as Token)
