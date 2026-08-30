import { describe, expect, test } from "bun:test";
import { Lexer, type LexerError } from "../lexer/index.js";
import type { Token, TokenType } from "../types/token.js";

const tokenize = (input: string): Token[] => {
  const result = new Lexer(input).tokenize();

  if (result.isErr()) {
    throw new Error(`Unexpected tokenizer error: ${result.error.msg}`);
  }

  return result.value;
};

const tokenizeError = (input: string): LexerError => {
  const result = new Lexer(input).tokenize();

  if (result.isOk()) {
    throw new Error("Expected the tokenizer to return an error");
  }

  return result.error;
};

const tokenTypes = (input: string): TokenType[] =>
  tokenize(input).map(({ type: token }) => token);

describe("Lexer", () => {
  test("tokenizes a complete expression and preserves positions and values", () => {
    expect(tokenize("(edad >= 18 AND nombre:'Ana')")).toEqual([
      { type: "OPEN PAREN", starts: 0, ends: 1, value: "(" },
      { type: "KEY", starts: 1, ends: 5, value: "edad" },
      { type: "GREATER EQUALS", starts: 6, ends: 8, value: ">=" },
      { type: "NUMBER", starts: 9, ends: 11, value: "18" },
      { type: "AND", starts: 12, ends: 15, value: "AND" },
      { type: "KEY", starts: 16, ends: 22, value: "nombre" },
      { type: "INCLUDES", starts: 22, ends: 23, value: ":" },
      { type: "STRING", starts: 23, ends: 28, value: "Ana" },
      { type: "CLOSE PAREN", starts: 28, ends: 29, value: ")" },
    ]);
  });

  test("recognizes symbolic operators and chooses the longest one first", () => {
    expect(tokenTypes("|| && ^ ! = == != < <= > >= : % $")).toEqual([
      "OR",
      "AND",
      "XOR",
      "NOT",
      "EQUALS",
      "EQUALS",
      "NOT EQUALS",
      "LESSER",
      "LESSER EQUALS",
      "GREATER",
      "GREATER EQUALS",
      "INCLUDES",
      "STARTS",
      "ENDS"
    ]);
  });

  test("recognizes word operators regardless of case", () => {
    expect(tokenTypes("or and XoR not eq neq lt le leq gt ge geq includes startS Ends")).toEqual([
      "OR",
      "AND",
      "XOR",
      "NOT",
      "EQUALS",
      "NOT EQUALS",
      "LESSER",
      "LESSER EQUALS",
      "LESSER EQUALS",
      "GREATER",
      "GREATER EQUALS",
      "GREATER EQUALS",
      "INCLUDES",
      "STARTS",
      "ENDS",
    ]);
  });

  test("does not treat an operator word inside a key as an operator", () => {
    expect(tokenize("android OR ordenador")).toEqual([
      { type: "KEY", starts: 0, ends: 7, value: "android" },
      { type: "OR", starts: 8, ends: 10, value: "OR" },
      { type: "KEY", starts: 11, ends: 20, value: "ordenador" },
    ]);
  });

  test("keeps reserved-word prefixes followed by key characters as keys", () => {
    expect(tokenize("ORx ORxy YEAR1 YEAR12")).toEqual([
      { type: "KEY", starts: 0, ends: 3, value: "ORx" },
      { type: "KEY", starts: 4, ends: 8, value: "ORxy" },
      { type: "KEY", starts: 9, ends: 14, value: "YEAR1" },
      { type: "KEY", starts: 15, ends: 21, value: "YEAR12" },
    ]);
  });

  test("recognizes reserved words followed by parentheses", () => {
    expect(tokenTypes("NOT(a) OR(foo) YEAR(1)")).toEqual([
      "NOT",
      "OPEN PAREN",
      "KEY",
      "CLOSE PAREN",
      "OR",
      "OPEN PAREN",
      "KEY",
      "CLOSE PAREN",
      "YEAR",
      "OPEN PAREN",
      "NUMBER",
      "CLOSE PAREN",
    ]);
  });

  test("recognizes date modifiers regardless of case and respects key boundaries", () => {
    expect(tokenize("year MONTH Day yearly monthly daytime")).toEqual([
      { type: "YEAR", starts: 0, ends: 4, value: "year" },
      { type: "MONTH", starts: 5, ends: 10, value: "MONTH" },
      { type: "DAY", starts: 11, ends: 14, value: "Day" },
      { type: "KEY", starts: 15, ends: 21, value: "yearly" },
      { type: "KEY", starts: 22, ends: 29, value: "monthly" },
      { type: "KEY", starts: 30, ends: 37, value: "daytime" },
    ]);
  });

  test("accepts keys with numbers, dots, hyphens, underscores, and Spanish characters", () => {
    expect(tokenize("usuario_ñ.área-2")).toEqual([
      { type: "KEY", starts: 0, ends: 16, value: "usuario_ñ.área-2" },
    ]);
  });

  test("separates leading numbers from keys and preserves leading zeros", () => {
    expect(tokenize("007bond 42")).toEqual([
      { type: "NUMBER", starts: 0, ends: 3, value: "007" },
      { type: "KEY", starts: 3, ends: 7, value: "bond" },
      { type: "NUMBER", starts: 8, ends: 10, value: "42" },
    ]);
  });

  test("reads strings delimited by single and double quotes", () => {
    expect(tokenize("'hola mundo' \"dos palabras\" ''")).toEqual([
      { type: "STRING", starts: 0, ends: 12, value: "hola mundo" },
      { type: "STRING", starts: 13, ends: 27, value: "dos palabras" },
      { type: "STRING", starts: 28, ends: 30, value: "" },
    ]);
  });

  test("ignores multiple spaces, including leading and trailing spaces", () => {
    expect(tokenize("   edad   =   21   ")).toEqual([
      { type: "KEY", starts: 3, ends: 7, value: "edad" },
      { type: "EQUALS", starts: 10, ends: 11, value: "=" },
      { type: "NUMBER", starts: 14, ends: 16, value: "21" },
    ]);
  });

  test("accepts nested and balanced parentheses", () => {
    expect(tokenTypes("((a=1) OR (b=2))")).toEqual([
      "OPEN PAREN",
      "OPEN PAREN",
      "KEY",
      "EQUALS",
      "NUMBER",
      "CLOSE PAREN",
      "OR",
      "OPEN PAREN",
      "KEY",
      "EQUALS",
      "NUMBER",
      "CLOSE PAREN",
      "CLOSE PAREN",
    ]);
  });

  test("returns an empty list for empty or whitespace-only input", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize("     ")).toEqual([]);
  });

  test("reports an unclosed quote at its opening position", () => {
    expect(tokenizeError("nombre='Ana")).toEqual({
      msg: "Expected closed",
      starts: 7,
      ends: 7,
    });
  });

  test("reports an unclosed opening parenthesis", () => {
    expect(tokenizeError("a AND (b=2")).toEqual({
      msg: "Expected closed",
      starts: 6,
      ends: 6,
    });
  });

  test("reports an unexpected closing parenthesis", () => {
    expect(tokenizeError("a=1)")).toEqual({
      msg: "Syntax error",
      starts: 3,
      ends: 3,
    });
  });

  test("reports unrecognized characters", () => {
    expect(tokenizeError("edad@18")).toEqual({
      msg: "Syntax error",
      starts: 4,
      ends: 4,
    });
  });

  test("setInput clears the state and allows the instance to be reused", () => {
    const tokenizer = new Lexer("(a=1)");
    const firstResult = tokenizer.tokenize();
    expect(firstResult.isOk()).toBe(true);

    tokenizer.setInput("b!=2");
    const secondResult = tokenizer.tokenize();

    expect(secondResult.isOk()).toBe(true);
    if (secondResult.isOk()) {
      expect(secondResult.value).toEqual([
        { type: "KEY", starts: 0, ends: 1, value: "b" },
        { type: "NOT EQUALS", starts: 1, ends: 3, value: "!=" },
        { type: "NUMBER", starts: 3, ends: 4, value: "2" },
      ]);
    }
  });
});
