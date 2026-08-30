import { LogicOperation, Modifier, Operation } from "../types/token.js"

type ReservedWordValue = {
  value: string
  whitespaced: boolean
}

type ReservedWordEntry = [
  ReservedWordValue["value"],
  {type: LogicOperation | Operation | Modifier, whitespaced: boolean}
]

const rervedWordEntry = (type: Operation | LogicOperation | Modifier, values: ReservedWordValue[]): ReservedWordEntry[] =>
  values.map(v => [v.value, {type, whitespaced: v.whitespaced}] as ReservedWordEntry)

const OPERATORS_ENTRIES = [
  rervedWordEntry(
    "OR",
    [
      { value: "||", whitespaced: false },
      { value: "OR", whitespaced: true },
    ],
  ),

  rervedWordEntry(
    "AND",
    [
      { value: "&&", whitespaced: false },
      { value: "AND", whitespaced: true },
    ],
  ),

  rervedWordEntry(
    "XOR",
    [
      { value: "^", whitespaced: false },
      { value: "XOR", whitespaced: true },
    ],
  ),

  rervedWordEntry(
    "NOT",
    [
      { value: "!", whitespaced: false },
      { value: "NOT", whitespaced: true },
    ],
  ),

  rervedWordEntry(
    "EQUALS",
    [
      { value: "=", whitespaced: false },
      { value: "==", whitespaced: false },
      { value: "EQ", whitespaced: true },
    ],
  ),

  rervedWordEntry(
    "NOT EQUALS",
    [
      { value: "!=", whitespaced: false },
      { value: "NEQ", whitespaced: true },
    ],
  ),

  rervedWordEntry(
    "LESSER",
    [
      { value: "<", whitespaced: false },
      { value: "LT", whitespaced: true },
    ],
  ),

  rervedWordEntry(
    "LESSER EQUALS",
    [
      { value: "<=", whitespaced: false },
      { value: "LE", whitespaced: true },
      { value: "LEQ", whitespaced: true },
    ],
  ),

  rervedWordEntry(
    "GREATER",
    [
      { value: ">", whitespaced: false },
      { value: "GT", whitespaced: true },
    ],
  ),

  rervedWordEntry(
    "GREATER EQUALS",
    [
      { value: ">=", whitespaced: false },
      { value: "GE", whitespaced: true },
      { value: "GEQ", whitespaced: true },
    ],
  ),

  rervedWordEntry(
    "INCLUDES",
    [
      { value: ":", whitespaced: false },
      { value: "INCLUDES", whitespaced: true },
    ],
  ),

  rervedWordEntry(
    "STARTS",
    [
      { value: "STARTS", whitespaced: true },
      { value: "%", whitespaced: false },
    ],
  ),

  rervedWordEntry(
    "ENDS",
    [
      { value: "ENDS", whitespaced: true },
      { value: "$", whitespaced: false },
    ],
  ),
].flat()

const MODIFIERS_ENTRIES = [
  rervedWordEntry(
    "YEAR",
    [
      { value: "YEAR", whitespaced: true },
    ],
  ),
  rervedWordEntry(
    "MONTH",
    [
      { value: "MONTH", whitespaced: true },
    ],
  ),
  rervedWordEntry(
    "DAY",
    [
      { value: "DAY", whitespaced: true },
    ],
  ),
].flat()

const RESERVED_WORD_ENTRIES = [...OPERATORS_ENTRIES, ...MODIFIERS_ENTRIES]

export const MAX_RESERVED_WORD_LENGTH = Math.max(
  ...RESERVED_WORD_ENTRIES.map(([value]) => value.length)
)

export const RESERVED_WORD_MAP: Map<ReservedWordEntry[0], ReservedWordEntry[1]> = new Map(RESERVED_WORD_ENTRIES)
