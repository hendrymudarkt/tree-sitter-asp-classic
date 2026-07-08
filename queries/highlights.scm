; ASP Classic syntax highlighting queries
;
; Keywords / builtin functions / builtin objects / builtin properties /
; builtin constants each have their OWN token type in the grammar (see
; grammar.js: `keyword`, `function_builtin`, `type_builtin`,
; `property_builtin`, `constant_builtin`), matched with higher lexer
; precedence than the generic `identifier` token. So this file just maps
; each node type straight to a capture -- no #match? regex needed anymore.

; === ASP Delimiters ===
"<%" @punctuation.special
"%>" @punctuation.special
"<%=" @punctuation.special
"<%@" @punctuation.special

; === Keywords / builtins (distinct node types from the grammar) ===
(keyword) @keyword
(function_builtin) @function
(type_builtin) @type
(property_builtin) @property
(constant_builtin) @constant

; === Strings / Numbers / Comments ===
(string) @string
(number) @number
(comment) @comment

; === Operators / Punctuation ===
(operator) @operator
(punctuation) @punctuation.delimiter

; === #include directive ===
(include_directive
  "#include" @keyword
  (string) @string)

; === Plain identifiers (variables, function/sub names, everything else) ===
(identifier) @variable

; === HTML (fallback in case the HTML injection doesn't apply for some reason) ===
(html_tag) @tag
(html_content) @none
(html_lt) @none
