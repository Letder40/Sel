export type Operation =
  | "INCLUDES"
  | "STARTS"
  | "ENDS"
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

export type Modifier =
  | "YEAR"
  | "MONTH"
  | "DAY"

export type Syntax =
  | "KEY"
  | "OPEN PAREN"
  | "CLOSE PAREN"

export type TokenType =
  | Syntax
  | Primitive
  | Modifier
  | LogicOperation
  | Operation

export type TokenOf<T extends TokenType> = {
  type: T;
  starts: number;
  ends: number;
  value: string;
};

export type Token = {
  [T in TokenType]: TokenOf<T>
}[TokenType];

export const Token =
(token: Token["type"],
 starts: number,
 ends: number,
 value: string
) => ({
  type: token,
  starts,
  ends,
  value
} as Token)
