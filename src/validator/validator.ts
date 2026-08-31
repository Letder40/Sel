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

  private handleExpectedChild(
    parent: AstNode & { type: "operation" | "logic binary" | "logic unary" | "modifier"},
    child: AstNode & { type: "expected" }
  ) {

    let message: string;
    switch (child.expected) {
      case "primitive":
        message = `expected primitive value`
        break;

      case "closed paren":
        if (child.found.isSome()) {
          message = `expected closing parenthesis, but found: ${child.found.value.value}`
        } else {
          message = `expected closing parenthesis`
        }
        break;

      case "node":
        message = `expected another operand`
        break;

      case "complete AST":
        throw new Error("An uncomplete AST marker cannot be used as a child node");
    }

    this.errors.push({
      type: "expected value",
      message: message,
      context: {
        starts: parent.token.starts,
        ends: parent.token.ends,
      }
    })
  }

  private validateOperation(ast: AstNode & { type: "operation"}) {
    if (ast.left.type === "expected") {
      this.handleExpectedChild(ast, ast.left)
      return
    }

    if (ast.right.type === "expected") {
      this.handleExpectedChild(ast, ast.right)
      return
    }

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
    if (ast.modifies.type === "expected") {
      this.handleExpectedChild(ast, ast.modifies)
      return
    }

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
    if (ast.value.type === "expected") {
      this.handleExpectedChild(ast, ast.value)
      return
    }

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
    if (ast.left.type === "expected") {
      this.handleExpectedChild(ast, ast.left)
      return
    }
    if (ast.right.type === "expected") {
      this.handleExpectedChild(ast, ast.right)
      return
    }

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
    if (ast.type === "primitive" || ast.type === "key" || ast.type === "expected") {
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
    let ast = this.ast

    if (ast.type === "expected" && ast.expected === "complete AST") {
      this.errors.push({
        type: "syntax error",
        message: `Unknown syntax error; check the syntax`,
      })
      ast = ast.ast;
    }

    this.validateBranch(ast)

    if (this.errors.length > 0) return Err(this.errors)
    return Ok(ast)
  }
}
