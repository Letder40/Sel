import { Err, Ok, Result } from "lrustlike/result";
import { AstNode, BinaryLogicOperation } from "../types/node.js";
import { Operation, Token } from "../types/token.js";
import { OPERATOR_INFO, OperatorInfo } from "./constants.js";

export type ParserError = {
  type: "expected value" | "syntax error";
  message: string;
  context: {
    starts: number;
    ends: number;
  };
}

export class Parser {
  private index: number = 0;
  private tokens: Token[];

  constructor (tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token | undefined {
    return this.tokens[this.index]
  }

  private next() {
    this.index++
  }

  private consume(): Token | undefined {
    return this.tokens[this.index++]
  }

  private error(
    type: ParserError["type"],
    message: string,
    token?: Token,
  ): ParserError {
    return {
      type,
      message,
      context: token
        ? { starts: token.starts, ends: token.ends }
        : { starts: 0, ends: 0 },
    }
  }

  private parsePrimitive(): AstNode | undefined {
    const token = this.peek()
    if (!token) return undefined

    switch (token.type) {
      case "STRING":
        this.next()
        return { token: token, type: "primitive", value: token.value }
      case "NUMBER":
        this.next()
        return { token: token, type: "primitive", value: Number(token.value) }
    }

    return undefined
  }

  private parseUnary(expectedAt?: Token): Result<AstNode, ParserError> {
    const token = this.peek()
    if (!token) {
      return Err(this.error("expected value", "expected another operand", expectedAt))
    }
    if (token.type === "CLOSE PAREN" && !expectedAt) {
      return Err(this.error("syntax error", "unexpected closing parenthesis", token))
    }

    switch (token.type) {
      case "YEAR":
      case "MONTH":
      case "DAY":
        this.next()
        const primitive = this.parsePrimitive()
        if (!primitive) {
          return Err(this.error("expected value", "expected primitive value", token))
        }
        return Ok({ token: token, type: "modifier", modifier: token.type, modifies: primitive })

      case "NOT":
        this.next()
        const value = this.parserExpr(OPERATOR_INFO.get(token.type)!.precedence! + 1, token)
        if (value.isErr()) return value
        return Ok({ token: token, type: "logic unary", value: value.value })

      case "KEY":
        this.next()
        return Ok({ token: token, type: "key", value: token.value })

      case "OPEN PAREN":
        this.next()
        const expr = this.parserExpr(0, token)
        if (expr.isErr()) return expr
        const found = this.consume()
        if (!found) {
          return Err(this.error("expected value", "expected closing parenthesis", token))
        }
        if (found.type !== "CLOSE PAREN") {
          return Err(this.error(
            "expected value",
            `expected closing parenthesis, but found: ${found.value}`,
            found,
          ))
        }
        return Ok(expr.value);

    }

    const primitive = this.parsePrimitive()
    if (primitive) return Ok(primitive)

    return Err(this.error("expected value", "expected another operand", expectedAt ?? token))
  }

  private isBinary(token?: Token): token is {type: Operation | BinaryLogicOperation, starts: number, ends: number, value: string } {
    if (token === undefined) return false
    const op = OPERATOR_INFO.get(token.type)
    if (!op) return false
    return op.type === "logic binary" || op.type === "operator"
  }

  private isLogicBinary(token: Token, operatorInfo: OperatorInfo): token is {type: BinaryLogicOperation, starts: number, ends: number, value: string } {
    return operatorInfo.type === "logic binary"
  }

  private isOperator(token: Token, operatorInfo: OperatorInfo): token is {type: Operation, starts: number, ends: number, value: string } {
    return operatorInfo.type === "operator"
  }

  private parserExpr(precedence: number, expectedAt?: Token): Result<AstNode, ParserError> {
    const parsedLeft = this.parseUnary(expectedAt)
    if (parsedLeft.isErr()) return parsedLeft
    let left = parsedLeft.value

    for (let token = this.peek(); this.isBinary(token); token = this.peek()) {
      const operatorInfo = OPERATOR_INFO.get(token.type)!

      if (precedence > operatorInfo.precedence) break;

      this.next()

      const right = this.parserExpr(operatorInfo.precedence + 1, token)
      if (right.isErr()) return right

      if (this.isLogicBinary(token, operatorInfo)) {
        left = { token: token, type: "logic binary", left: left, right: right.value }
      }
      else if (this.isOperator(token, operatorInfo)) {
        left = { token: token, type: "operation", left: left, right: right.value }
      }
    }

    return Ok(left);
  }

  public parse(): Result<AstNode, ParserError> {
    this.index = 0
    const ast = this.parserExpr(0);
    if (ast.isErr()) return ast

    if (this.index !== this.tokens.length) {
      const token = this.peek()!
      const message = token.type === "CLOSE PAREN"
        ? "unexpected closing parenthesis"
        : `unexpected token: ${token.value}`

      return Err(this.error("syntax error", message, token))
    }

    return ast
  }
}
