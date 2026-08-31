import { describe, expect, test } from "bun:test";
import { Lexer } from "../lexer/index.js";
import { Parser } from "../parser/parser.js";
import type { AstNode } from "../types/node.js";
import { Token } from "../types/token.js";
import { Validator, type ValidationError } from "../validator/validator.js";

const parse = (input: string): AstNode => {
  const tokens = new Lexer(input).tokenize();

  if (tokens.isErr()) {
    throw new Error(`Unexpected lexer error: ${tokens.error.msg}`);
  }

  const ast = new Parser(tokens.value).parse();
  if (ast.isErr()) {
    throw new Error(`Unexpected parser error: ${ast.error.message}`);
  }

  return ast.value;
};

const validate = (input: string) => new Validator(parse(input)).validate();

const errorsOf = (input: string): ValidationError[] => {
  const result = validate(input);

  if (result.isOk()) {
    throw new Error(`Expected validation to fail for: ${input}`);
  }

  return result.error;
};

describe("Validator", () => {
  test.each([
    "test >= 2",
    "test == 5 or test2 >= 3 and hola : 'texto'",
    "test != 3 and test2 %'hola'",
    "test != 3 and fecha == YEAR 4",
    "(test != 3 or fecha == YEAR 4) and fecha : DAY 4",
  ])("accepts a valid expression: %s", (input) => {
    const ast = parse(input);
    const result = new Validator(ast).validate();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value).toEqual(ast);
  });

  test("rejects a key used as the root expression", () => {
    expect(errorsOf("test")).toEqual([
      {
        type: "expected operation",
        message: "test expects a operator",
        context: { starts: 0, ends: 4 },
      },
    ]);
  });

  test.each(["5", "'text'"])(
    "accepts a primitive used as the root expression: %s",
    (input) => {
      const ast = parse(input);
      const result = new Validator(ast).validate();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) expect(result.value).toEqual(ast);
    },
  );

  test("accepts a modifier used as the root expression", () => {
    const ast = parse("YEAR 4");
    const result = new Validator(ast).validate();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value).toEqual(ast);
  });

  test("rejects primitives used as logical operands", () => {
    expect(errorsOf("5 or 2")).toEqual([
      {
        type: "syntax error",
        message: "or can only be used between operations or other logical operators; 5 cannot be an operand of or.",
        context: { starts: 0, ends: 4 },
      },
      {
        type: "syntax error",
        message: "or can only be used between operations or other logical operators; 2 cannot be an operand of or.",
        context: { starts: 2, ends: 6 },
      },
    ]);
  });

  test("requires a key on the left and a value on the right of comparisons", () => {
    expect(errorsOf("2 >= test")).toEqual([
      {
        type: "syntax error",
        message: "expected a key, but got 2",
        context: { starts: 0, ends: 9 },
      },
      {
        type: "syntax error",
        message: "expected a value, but got test",
        context: { starts: 0, ends: 9 },
      },
    ]);

    expect(errorsOf("10 == 5")).toEqual([
      {
        type: "syntax error",
        message: "expected a key, but got 10",
        context: { starts: 0, ends: 7 },
      },
    ]);
  });

  test("only allows NOT to negate operations or logical expressions", () => {
    expect(errorsOf("not active")).toEqual([
      {
        type: "syntax error",
        message: "not can only affect operations; active cannot be negated.",
        context: { starts: 0, ends: 10 },
      },
    ]);
  });

  test("validates malformed AST shapes that the parser normally prevents", () => {
    const modifier = {
      token: Token("YEAR", 0, 4, "YEAR"),
      type: "modifier",
      modifier: "YEAR",
      modifies: {
        token: Token("KEY", 5, 9, "date"),
        type: "key",
        value: "date",
      },
    } as AstNode;

    const result = new Validator(modifier).validate();
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toEqual([
        {
          type: "syntax error",
          message: "modifiers can only modify a value; date cannot be modified.",
          context: { starts: 0, ends: 9 },
        },
      ]);
    }
  });

  test("can validate the same instance repeatedly without accumulating errors", () => {
    const validator = new Validator(parse("5 or 2"));

    const first = validator.validate();
    const second = validator.validate();

    expect(first.isErr()).toBe(true);
    expect(second.isErr()).toBe(true);
    if (first.isErr() && second.isErr()) {
      expect(second.error).toEqual(first.error);
      expect(second.error).toHaveLength(2);
    }
  });
});
