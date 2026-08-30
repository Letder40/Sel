import { None, Option, Some } from "lrustlike/option";
import { AstNode, BinaryOperation } from "../types/node.js";
import { Token } from "../types/token.js";
import { OPERATOR_INFO } from "./constants.js";

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

  private parsePrimitive(): Option<AstNode> {
    const token = this.peek()
    if (!token) return None()

    switch (token.type) {
      case "STRING":
        this.next()
        return Some({ token: token, type: "primitive", value: token.value })
      case "NUMBER":
        this.next()
        return Some({ token: token, type: "primitive", value: Number(token.value) })
    }

    return None()
  }

  private parseUnary(): Option<AstNode> {
    const token = this.peek()
    if (!token) return None()

    switch (token.type) {
      case "YEAR":
      case "MONTH":
      case "DAY":
        this.next()
        return Some({ token: token, type: "modifier", modifier: token.type, modifies: this.parsePrimitive().unwrapOr({ type: "expected", expected: "primitive" })})

      case "NOT":
        this.next()
        return Some({ token: token, type: "unary", value: this.parserExpr(OPERATOR_INFO.get(token.type)!.precedence! + 1)})

      case "KEY":
        this.next()
        return Some({ token: token, type: "key", value: token.value })

      case "OPEN PAREN":
        this.next()
        const expr = this.parserExpr(0)
        const found = this.consume()
        if (!found) {
          return Some({ type: "expected", expected: "closed paren", found: None() })
        }
        if (found.type !== "CLOSE PAREN") {
          return Some({ type: "expected", expected: "closed paren", found: Some(found) })
        }
        return Some(expr);

    }

    const primitive = this.parsePrimitive()
    if (primitive.isSome()) return primitive

    return None()
  }

  private isBinaryOperator(token?: Token): token is {type: BinaryOperation, starts: number, ends: number, value: string } {
    if (token === undefined) return false
    return OPERATOR_INFO.get(token.type)?.type === "binary"
  }

  private parserExpr(precedence: number): AstNode {
    let left: AstNode = this.parseUnary().unwrapOr({type: "expected", expected: "node"})

    for (let token = this.peek(); this.isBinaryOperator(token); token = this.peek()) {
      const operatorInfo = OPERATOR_INFO.get(token.type)!

      if (precedence > operatorInfo.precedence) break;

      this.next()
      left = { token: token, type: "binary", left: left, right: this.parserExpr(operatorInfo.precedence + 1)}
    }

    return left;
  }

  public parse(): AstNode {
    const ast = this.parserExpr(0);

    if (this.index !== this.tokens.length) {
      return { type: "expected", expected: "complete AST", ast }
    }

    return ast
  }
}
