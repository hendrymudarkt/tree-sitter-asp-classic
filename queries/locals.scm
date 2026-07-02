; The grammar is intentionally flat (token-stream based) rather than a full
; statement AST, so we don't have distinct definition/reference node types
; to build precise scoping from. Leaving this file present (even if mostly
; empty) keeps Zed's language config happy since it's referenced in
; tree-sitter.json / package.json.
