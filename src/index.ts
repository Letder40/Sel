import { Err, Ok, Result } from "lrustlike/result";
import { Token } from "./types/token";

const stringTest = "not 10 and 20 or 30 and 10 or 2"

export type ParseError = {
  msg: string
  starts: number
  ends: number
}

const ParseError = (msg: string, starts: number, ends: number) => ({msg, starts, ends} as ParseError)

function tokenize(text: string): Result<Token[], ParseError> {
  const tokens = Array<Token>();
  let i = 0;

  const isEOF = () => i + i >= text.length
    ? Err(ParseError("EOF", i, i))
    : Ok(false)

  const expectWhiteSpace: () => Result<true, ParseError> = () =>
    text[i++] === " " ? Ok(true) : Err(ParseError("expected whitespace", i, i))

  const consumeUntilClosed: () => Result<Token, ParseError> = () =>  {
    let n = i;
    while (text[i++] !== "'" || '"') {
      const err = isEOF()
      if (err.isErr()) return err
    }
    return Ok(Token("STRING", n, i, text.slice(n, i)))
  }

  const consume = (token: Token["token"], value: string) => {
    const t = Token(token, i, i + value.length - 1, value)
    tokens.push(t)
  }

  const getValue = (length: number) => text.slice(i, i + length).toUpperCase()
  const compare = (symbols: string[], symbol: string) => symbols.includes(symbol)

  while (i < text.length) {
    if (getValue(1) === '"') {
      consumeUntilClosed()
      expectWhiteSpace()
    }

    if (compare(["||", "OR"], getValue(2))) {
      consume("OR", getValue(2))
      expectWhiteSpace()
    }

  }

  return Err("")
}
