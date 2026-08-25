import { None, Option } from "lrustlike/option"
import { Operation } from "./operation"

export type AstNode =
  | {
    token: "OR"
    precedency: 0
    left: Option<AstNode>
    right: Option<AstNode>
  } | {
    token: "XOR"
    precedency: 1
    left: Option<AstNode>
    right: Option<AstNode>
  } | {
    token: "AND"
    precedency: 2
    left: Option<AstNode>
    right: Option<AstNode>
  } | {
    token: Operation
    precedency: 3
    left: Option<AstNode>
    right: Option<AstNode>
  } | {
    token: "NOT"
    precedency: 4
    left: Option<AstNode>
    right: Option<AstNode>
  } | {
    token: "PRIMITIVE"
    precedency: 4
    left: None
    right: None
  }
