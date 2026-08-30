import { describe, expect, test } from "bun:test";
import { None, Some } from "lrustlike/option";
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

const parse = (input: string): AstNode => {
  const result = new Lexer(input).tokenize();

  if (result.isErr()) {
    throw new Error(`Unexpected lexer error: ${result.error.msg}`);
  }

  return new Parser(result.value).parse();
};

const parseTokens = (tokens: ConstructorParameters<typeof Parser>[0]): AstNode =>
  new Parser(tokens).parse();

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
        type: "binary",
        left: { token: token("KEY", 0, 4, "edad"), type: "key", value: "edad" },
        right: { token: token("NUMBER", 8, 10, "18"), type: "primitive", value: 18 },
      })
  });

  test("gives AND precedence over OR", () => {
    expect(parse("a OR b AND c")).toEqual({
      token: token("OR", 2, 4, "OR"),
      type: "binary",
      left: { token: token("KEY", 0, 1, "a"), type: "key", value: "a" },
      right: {
        token: token("AND", 7, 10, "AND"),
        type: "binary",
        left: { token: token("KEY", 5, 6, "b"), type: "key", value: "b" },
        right: { token: token("KEY", 11, 12, "c"), type: "key", value: "c" },
      },
    })
  });

  test("associates repeated left-associative operators to the left", () => {
    expect(parse("a OR b OR c")).toEqual({
      token: token("OR", 7, 9, "OR"),
      type: "binary",
      left: {
        token: token("OR", 2, 4, "OR"),
        type: "binary",
        left: { token: token("KEY", 0, 1, "a"), type: "key", value: "a" },
        right: { token: token("KEY", 5, 6, "b"), type: "key", value: "b" },
      },
      right: { token: token("KEY", 10, 11, "c"), type: "key", value: "c" },
    });
  });

  test("parses the unary NOT operator", () => {
    expect(parse("NOT active")).toEqual({
      token: token("NOT", 0, 3, "NOT"),
      type: "unary",
      value: { token: token("KEY", 4, 10, "active"), type: "key", value: "active" },
    })
  });

  test("binds NOT to comparisons before combining logical expressions", () => {
    expect(parse("NOT age >= 18 AND active")).toEqual({
      token: token("AND", 14, 17, "AND"),
      type: "binary",
      left: {
        token: token("NOT", 0, 3, "NOT"),
        type: "unary",
        value: {
          token: token("GREATER EQUALS", 8, 10, ">="),
          type: "binary",
          left: { token: token("KEY", 4, 7, "age"), type: "key", value: "age" },
          right: { token: token("NUMBER", 11, 13, "18"), type: "primitive", value: 18 },
        },
      },
      right: { token: token("KEY", 18, 24, "active"), type: "key", value: "active" },
    });
  });

  test("gives AND precedence over XOR and XOR precedence over OR", () => {
    expect(parse("a OR b XOR c AND d")).toMatchObject({
      type: "binary",
      token: { type: "OR" },
      right: {
        type: "binary",
        token: { type: "XOR" },
        right: { type: "binary", token: { type: "AND" } },
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

    expect(parse("MONTH name")).toEqual({
      type: "expected",
      expected: "complete AST",
      ast: {
        token: token("MONTH", 0, 5, "MONTH"),
        type: "modifier",
        modifier: "MONTH",
        modifies: { type: "expected", expected: "primitive" },
      },
    });
  });

  test("uses parentheses to override precedence", () => {
    expect(parse("(a OR b) AND c")).toEqual({
      token: token("AND", 9, 12, "AND"),
      type: "binary",
      left: {
        token: token("OR", 3, 5, "OR"),
        type: "binary",
        left: { token: token("KEY", 1, 2, "a"), type: "key", value: "a" },
        right: { token: token("KEY", 6, 7, "b"), type: "key", value: "b" },
      },
      right: { token: token("KEY", 13, 14, "c"), type: "key", value: "c" },
    });
  });

  test("detect incomplete AST", () => {
    expect(parse("a OR b UNKNOWN c")).toEqual({
      type: "expected",
      expected: "complete AST",
      ast: {
        token: token("OR", 2, 4, "OR"),
        type: "binary",
        left: { token: token("KEY", 0, 1, "a"), type: "key", value: "a" },
        right: { token: token("KEY", 5, 6, "b"), type: "key", value: "b" },
      }
    });
  });

  test("informs about missing nodes", () => {
    expect(parse("(a OR ) AND c")).toEqual({
      token: token("AND", 8, 11, "AND"),
      type: "binary",
      left: {
        token: token("OR", 3, 5, "OR"),
        type: "binary",
        left: { token: token("KEY", 1, 2, "a"), type: "key", value: "a" },
        right: { type: "expected", expected: "node" },
      },
      right: { token: token("KEY", 12, 13, "c"), type: "key", value: "c" },
    });

    expect(parse("AND c")).toEqual({
      token: token("AND", 0, 3, "AND"),
      type: "binary",
      left: { type: "expected", expected: "node" },
      right: { token: token("KEY", 4, 5, "c"), type: "key", value: "c" },
    });

    expect(parse("a AND ")).toEqual({
      token: token("AND", 2, 5, "AND"),
      type: "binary",
      left: { token: token("KEY", 0, 1, "a"), type: "key", value: "a" },
      right: { type: "expected", expected: "node" },
    });
  });

  test("reports missing and unexpected closing parentheses from token streams", () => {
    expect(parseTokens([
      token("OPEN PAREN", 0, 1, "("),
      token("KEY", 1, 2, "a"),
    ])).toEqual({
      type: "expected",
      expected: "complete AST",
      ast: {
        type: "expected",
        expected: "closed paren",
        found: None(),
      },
    });

    const unexpected = token("NUMBER", 2, 3, "1");
    expect(parseTokens([
      token("OPEN PAREN", 0, 1, "("),
      token("KEY", 1, 2, "a"),
      unexpected,
    ])).toEqual({
      type: "expected",
      expected: "closed paren",
      found: Some(unexpected),
    });
  });
});
