import { Err, Ok, Result } from "lrustlike/result";
import { Token, TokenType } from "./types/token.js";

export type ParseError = {
  msg: string
  starts: number
  ends: number
}

type Operator = {
  type: TokenType,
  word: boolean
}

type OperatorValue = {
  value: string
  word: boolean
}

const operatorMapEntry = (type: TokenType, values: OperatorValue[]): [string, Operator][] =>
  values.map(v => [v.value, {type, word: v.word}] as [string, Operator])

const OPERATOR_ENTRIES = [
  operatorMapEntry(
    "OR",
    [
      { value: "||", word: false },
      { value: "OR", word: true },
    ],
  ),

  operatorMapEntry(
    "AND",
    [
      { value: "&&", word: false },
      { value: "AND", word: true },
    ],
  ),

  operatorMapEntry(
    "XOR",
    [
      { value: "^", word: false },
      { value: "XOR", word: true },
    ],
  ),

  operatorMapEntry(
    "NOT",
    [
      { value: "!", word: false },
      { value: "NOT", word: true },
    ],
  ),

  operatorMapEntry(
    "EQUALS",
    [
      { value: "=", word: false },
      { value: "==", word: false },
      { value: "EQ", word: true },
    ],
  ),

  operatorMapEntry(
    "NOT EQUALS",
    [
      { value: "!=", word: false },
      { value: "NEQ", word: true },
    ],
  ),

  operatorMapEntry(
    "LESSER",
    [
      { value: "<", word: false },
      { value: "LT", word: true },
    ],
  ),

  operatorMapEntry(
    "LESSER EQUALS",
    [
      { value: "<=", word: false },
      { value: "LE", word: true },
      { value: "LEQ", word: true },
    ],
  ),

  operatorMapEntry(
    "GREATER",
    [
      { value: ">", word: false },
      { value: "GT", word: true },
    ],
  ),

  operatorMapEntry(
    "GREATER EQUALS",
    [
      { value: ">=", word: false },
      { value: "GE", word: true },
      { value: "GEQ", word: true },
    ],
  ),

  operatorMapEntry(
    "SEARCH",
    [
      { value: ":", word: false },
    ],
  ),
].flat()

const validKeyChars = new Set(
  'abcdefghijklmnñopqrstuvwxyz' +
  'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ' +
  'áéíóúüÁÉÍÓÚÜ' +
  '0123456789_.-'
);

const MAX_OPERATOR_LENGTH = Math.max(
  ...OPERATOR_ENTRIES.map(([value]) => value.length)
)

const OPERATORS_MAP: Map<string, Operator> = new Map(OPERATOR_ENTRIES)

export class Tokenizer {
  private index = 0;
  private input: string;
  private bracesStack: Array<number> = new Array()
  private tokens: Token[] = new Array()

  constructor(input: string) { this.input = input;
  }

  private error(errType: "EOF" | "SYNTAX" | "WHITESPACE" | "UNCLOSED", starts: number, ends: number) {
    switch (errType) {
      case "EOF": return { msg: "Unexpected EOF", starts, ends }
      case "SYNTAX": return { msg: "Syntax error", starts, ends }
      case "WHITESPACE": return { msg: "Expected whitespace", starts, ends }
      case "UNCLOSED": return { msg: "Expected closed", starts, ends }
    }
  }

  private pushToken(token: Token["token"], size: number) {
    this.tokens.push(Token(token, this.index, this.index + size, this.consume(size)))
  }

  private peek(size: number = 1, offset = 0) {
    return this.input.slice(this.index + offset, this.index + offset + size).toString()
  }

  private peekNumber() {
    return this.peek().charCodeAt(0)
  }

  private consume(offset: number = 1) {
    const consumed = this.peek(offset)
    this.index += offset;
    return consumed;
  }

  private readNumber () {
    const numbers: string[] = [];
    let codeChar = this.peekNumber()

    while (codeChar >= 48 && codeChar <= 57) {
      numbers.push(this.consume())
      codeChar = this.peekNumber()
    }

    if (numbers.length > 0) {
      const number = numbers.join("")
      this.tokens.push(Token("NUMBER", this.index - numbers.length, this.index, number))
    }
  }

  private readString(): Result<string, ParseError> {
    const shouldBeClosed = this.index;
    const closedBy = this.consume()

    const chars: string[] = []
    let closed = false

    while (this.index < this.input.length) {
      const readed = this.consume()
      if (readed === closedBy) {
        closed = true
        break
      }
      chars.push(readed);
    }

    if (!closed) return Err(this.error("UNCLOSED", shouldBeClosed, shouldBeClosed))
    return Ok(chars.join(""))
  }

  private readKey(): string {
    const chars: string[] = []

    while (this.index < this.input.length) {
      if (!validKeyChars.has(this.peek())) {
        break
      }
      chars.push(this.consume());
    }

    return chars.join("")
  }

  private consumeWhiteSpaces(): boolean {
    let consumed = false
    while (this.peek() === " ") {
      this.consume();
      consumed = true;
    }

    return consumed
  }

  public clear() {
    this.index = 0
    this.tokens = []
    this.bracesStack = []
  }

  public setInput(input: string) {
    this.input = input
    this.clear()
  }

  tokenize(): Result<Token[], ParseError> {
    main_loop:
    while (this.index < this.input.length) {

      for (let i = MAX_OPERATOR_LENGTH; i != 0; i--) {
        const peeked = this.peek(i).toUpperCase()
        const operator = OPERATORS_MAP.get(peeked)
        if (!operator) continue;

        if (operator.word && validKeyChars.has(this.peek(1, i))) {
          break;
        }

        this.pushToken(operator.type, i)
        continue main_loop;
      }

      if (this.peek() === '(') {
        this.bracesStack.push(this.index);
        this.pushToken("OPEN BRACE", 1)
        continue;
      }
      else if (this.peek() === ')') {
        if (this.bracesStack.length === 0) {
          return Err(this.error("SYNTAX", this.index, this.index))
        }

        this.pushToken("CLOSE BRACE", 1)
        this.bracesStack.pop();
        continue;
      }
      else if (this.peek() === "'" || this.peek() === '"') {
        const start = this.index;
        const result = this.readString()
        if (result.isErr()) return Err(result.error)
        this.tokens.push(Token("STRING", start, this.index, result.value))
        continue;
      }
      else if (this.peekNumber() >= 48 && this.peekNumber() <= 57) {
        this.readNumber()
        continue;
      }
      else if (validKeyChars.has(this.peek())) {
        const key = this.readKey()
        this.tokens.push(Token("KEY", this.index - key.length, this.index, key))
      }
      else if (this.peek() === ' ') {
        this.consumeWhiteSpaces()
        continue;
      }
      else {
        return Err(this.error("SYNTAX", this.index, this.index))
      }
    }

    if (this.bracesStack.length !== 0) {
      const expectedClosed = this.bracesStack[this.bracesStack.length - 1];
      return Err(this.error("UNCLOSED", expectedClosed, expectedClosed))
    }

    return Ok(this.tokens);
  }
}
