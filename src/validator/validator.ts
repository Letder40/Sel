import { AstNode } from "../types/node.js";
import { Err, Ok, Result } from "lrustlike/result";

export type ValidationError = {
  type: string
  message: string
  context?: {
    starts: number;
    ends: number;
  }
}

export class Validator  {
  private errors: ValidationError[] = []
  private ast: AstNode;

  constructor (ast: AstNode) {
    this.ast = ast;
  }

  private validateOperation(ast: AstNode & { type: "operation"}) {
    if (ast.left.type !== "key") this.errors.push({
      type: "syntax error",
      message: `expected a key, but got ${ast.left.token.value}`,
      context: {
        starts: ast.left.token.starts,
        ends: ast.right.token.ends,
      }
    })

    if (ast.right.type !== "primitive" && ast.right.type !== "modifier") this.errors.push({
      type: "syntax error",
      message: `expected a value, but got ${ast.right.token.value}`,
      context: {
        starts: ast.left.token.starts,
        ends: ast.right.token.ends,
      }
    })
  }

  private validateModifier(ast: AstNode & { type: "modifier"}) {
    if (ast.modifies.type !== "primitive") this.errors.push({
      type: "syntax error",
      message: `modifiers can only modify a value; ${ast.modifies.token.value} cannot be modified.`,
      context: {
        starts: ast.token.starts,
        ends: ast.modifies.token.ends,
      }
    })
  }

  private validateNot(ast: AstNode & { type: "logic unary"}) {
    if (
      ast.value.type === "key"
      || ast.value.type === "primitive"
      || ast.value.type === "modifier"
    ) this.errors.push({
      type: "syntax error",
      message: `not can only affect operations; ${ast.value.token.value} cannot be negated.`,
      context: {
        starts: ast.token.starts,
        ends: ast.value.token.ends,
      }
    });
  }

  private validateLogicOperation(ast: AstNode & { type: "logic binary"}) {
    if (
      ast.left.type === "key"
      || ast.left.type === "primitive"
      || ast.left.type === "modifier"
    ) this.errors.push({
      type: "syntax error",
      message: `${ast.token.value} can only be used between operations or other logical operators; ${ast.left.token.value} cannot be an operand of ${ast.token.value}.`,
      context: {
        starts: ast.left.token.starts,
        ends: ast.token.ends,
      }
    });

    if (
      ast.right.type === "key"
      || ast.right.type === "primitive"
      || ast.right.type === "modifier"
    ) this.errors.push({
      type: "syntax error",
      message: `${ast.token.value} can only be used between operations or other logical operators; ${ast.right.token.value} cannot be an operand of ${ast.token.value}.`,
      context: {
        starts: ast.token.starts,
        ends: ast.right.token.ends,
      }
    });
  }

  private validateBranch(ast: AstNode = this.ast) {
    if (ast.type === "primitive" || ast.type === "key") {
      return;
    }

    if ("left" in ast) {
      this.validateBranch(ast.left)
    }

    if ("right" in ast) {
      this.validateBranch(ast.right)
    }

    if (ast.type === "logic unary") {
      this.validateBranch(ast.value)
    }

    switch (ast.type) {
      case "operation":
        this.validateOperation(ast)
        break
      case "logic binary":
        this.validateLogicOperation(ast)
        break;
      case "logic unary":
        this.validateNot(ast)
        break;
      case "modifier":
        this.validateModifier(ast)
    }
  }

  public validate(): Result<AstNode, ValidationError[]> {
    this.errors = []

    if (this.ast.type === "key") return Err([{
      type: "expected operation",
      message: `${this.ast.token.value} expects a operator`,
      context: {
        starts: this.ast.token.starts,
        ends: this.ast.token.ends,
      }
    }])

    this.validateBranch(this.ast)

    if (this.errors.length > 0) return Err(this.errors)
    return Ok(this.ast)
  }
}
