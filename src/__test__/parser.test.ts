import { describe, expect, test } from "bun:test";
import type { AstNode } from "../types/node.js";
import { Lexer } from "../lexer/index.js";
import { Token, type TokenOf, type TokenType } from "../types/token.js";
import { Parser } from "../parser/parser.js";

const token = <T extends TokenType>(
  type: T,
  starts: number,
  ends: number,
  value: string,
): TokenOf<T> =>
  Token(type, starts, ends, value) as TokenOf<T>;

const parseResult = (input: string) => {
  const result = new Lexer(input).tokenize();

  if (result.isErr()) {
    throw new Error(`Unexpected lexer error: ${result.error.msg}`);
  }

  return new Parser(result.value).parse();
};

const parse = (input: string): AstNode => {
  const result = parseResult(input);
  if (result.isErr()) throw new Error(`Unexpected parser error: ${result.error.message}`);
  return result.value;
};

const parseTokens = (tokens: ConstructorParameters<typeof Parser>[0]) =>
  new Parser(tokens).parse();

const parseError = (input: string) => {
  const result = parseResult(input);
  if (result.isOk()) throw new Error(`Expected parsing to fail for: ${input}`);
  return result.error;
};

describe("Parser", () => {
  test("parses atomic values", () => {
    expect(parse("edad")).toEqual({
      token: token("KEY", 0, 4, "edad"),
      type: "key",
      value: "edad",
    });
    expect(parse("'Ana'")).toEqual({
      token: token("STRING", 0, 5, "Ana"),
      type: "primitive",
      value: "Ana",
    });
    expect(parse("18")).toEqual({
      token: token("NUMBER", 0, 2, "18"),
      type: "primitive",
      value: 18,
    });
  });

  test("parses a comparison", () => {
    expect(parse("edad >= 18"))
      .toEqual({
        token: token("GREATER EQUALS", 5, 7, ">="),
        type: "operation",
        left: { token: token("KEY", 0, 4, "edad"), type: "key", value: "edad" },
        right: { token: token("NUMBER", 8, 10, "18"), type: "primitive", value: 18 },
      })
  });

  test("gives AND precedence over OR", () => {
    expect(parse("a OR b AND c")).toEqual({
      token: token("OR", 2, 4, "OR"),
      type: "logic binary",
      left: { token: token("KEY", 0, 1, "a"), type: "key", value: "a" },
      right: {
        token: token("AND", 7, 10, "AND"),
        type: "logic binary",
        left: { token: token("KEY", 5, 6, "b"), type: "key", value: "b" },
        right: { token: token("KEY", 11, 12, "c"), type: "key", value: "c" },
      },
    })
  });

  test("associates repeated left-associative operators to the left", () => {
    expect(parse("a OR b OR c")).toEqual({
      token: token("OR", 7, 9, "OR"),
      type: "logic binary",
      left: {
        token: token("OR", 2, 4, "OR"),
        type: "logic binary",
        left: { token: token("KEY", 0, 1, "a"), type: "key", value: "a" },
        right: { token: token("KEY", 5, 6, "b"), type: "key", value: "b" },
      },
      right: { token: token("KEY", 10, 11, "c"), type: "key", value: "c" },
    });
  });

  test("parses the logic unary NOT operator", () => {
    expect(parse("NOT active")).toEqual({
      token: token("NOT", 0, 3, "NOT"),
      type: "logic unary",
      value: { token: token("KEY", 4, 10, "active"), type: "key", value: "active" },
    })
  });

  test("binds NOT to comparisons before combining logical expressions", () => {
    expect(parse("NOT age >= 18 AND active")).toEqual({
      token: token("AND", 14, 17, "AND"),
      type: "logic binary",
      left: {
        token: token("NOT", 0, 3, "NOT"),
        type: "logic unary",
        value: {
          token: token("GREATER EQUALS", 8, 10, ">="),
          type: "operation",
          left: { token: token("KEY", 4, 7, "age"), type: "key", value: "age" },
          right: { token: token("NUMBER", 11, 13, "18"), type: "primitive", value: 18 },
        },
      },
      right: { token: token("KEY", 18, 24, "active"), type: "key", value: "active" },
    });
  });

  test("gives AND precedence over XOR and XOR precedence over OR", () => {
    expect(parse("a OR b XOR c AND d")).toMatchObject({
      type: "logic binary",
      token: { type: "OR" },
      right: {
        type: "logic binary",
        token: { type: "XOR" },
        right: { type: "logic binary", token: { type: "AND" } },
      },
    });
  });

  test("parses date modifiers and reports a missing primitive", () => {
    expect(parse("YEAR 2024")).toEqual({
      token: token("YEAR", 0, 4, "YEAR"),
      type: "modifier",
      modifier: "YEAR",
      modifies: { token: token("NUMBER", 5, 9, "2024"), type: "primitive", value: 2024 },
    });

    expect(parseError("MONTH name")).toEqual({
      type: "expected value",
      message: "expected primitive value",
      context: { starts: 0, ends: 5 },
    });
  });

  test("uses parentheses to override precedence", () => {
    expect(parse("(a OR b) AND c")).toEqual({
      token: token("AND", 9, 12, "AND"),
      type: "logic binary",
      left: {
        token: token("OR", 3, 5, "OR"),
        type: "logic binary",
        left: { token: token("KEY", 1, 2, "a"), type: "key", value: "a" },
        right: { token: token("KEY", 6, 7, "b"), type: "key", value: "b" },
      },
      right: { token: token("KEY", 13, 14, "c"), type: "key", value: "c" },
    });
  });

  test("reports tokens left after a complete expression", () => {
    expect(parseError("a OR b UNKNOWN c")).toEqual({
      type: "syntax error",
      message: "unexpected token: UNKNOWN",
      context: { starts: 7, ends: 14 },
    });
  });

  test.each([
    ["(a OR ) AND c", { starts: 3, ends: 5 }],
    ["AND c", { starts: 0, ends: 3 }],
    ["a AND ", { starts: 2, ends: 5 }],
  ])("reports a missing node in %s", (input, context) => {
    expect(parseError(input)).toEqual({
      type: "expected value",
      message: "expected another operand",
      context,
    });
  });

  test("reports missing and unexpected closing parentheses", () => {
    expect(parseTokens([
      token("OPEN PAREN", 0, 1, "("),
      token("KEY", 1, 2, "a"),
    ])).toEqual({
      error: {
        type: "expected value",
        message: "expected closing parenthesis",
        context: { starts: 0, ends: 1 },
      },
    });

    const unexpected = token("NUMBER", 2, 3, "1");
    expect(parseTokens([
      token("OPEN PAREN", 0, 1, "("),
      token("KEY", 1, 2, "a"),
      unexpected,
    ])).toEqual({
      error: {
        type: "expected value",
        message: "expected closing parenthesis, but found: 1",
        context: { starts: 2, ends: 3 },
      },
    });

    expect(parseError("a=1)")).toEqual({
      type: "syntax error",
      message: "unexpected closing parenthesis",
      context: { starts: 3, ends: 4 },
    });

    expect(parseError(")")).toEqual({
      type: "syntax error",
      message: "unexpected closing parenthesis",
      context: { starts: 0, ends: 1 },
    });
  });
});
