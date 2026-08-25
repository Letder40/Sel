import { Operation } from "./operation"

export type Token =
  | {
    token: "OR"
    starts: number
    ends: number
    value: string
  } | {
    token: "XOR"
    starts: number
    ends: number
    value: string
  } | {
    token: "AND"
    starts: number
    ends: number
    value: string
  } | {
    token: "NOT"
    starts: number
    ends: number
    value: string
  } | {
    token: "OPEN BRACE"
    starts: number
    ends: number
    value: string
  } | {
    token: "CLOSE BRACE"
    starts: number
    ends: number
    value: string
  } | {
    token: "OPEN QUOTE"
    starts: number
    ends: number
    value: string
  } | {
    token: "CLOSE QUOTE"
    starts: number
    ends: number
    value: string
  } | {
    token: Operation
    starts: number
    ends: number
    value: string
  } | {
    token: "STRING"
    starts: number
    ends: number
    value: string
  } | {
    token: "NUMBER"
    starts: number
    ends: number
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
