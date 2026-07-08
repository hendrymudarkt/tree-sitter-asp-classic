; ASP Classic syntax highlighting queries
;
; Keywords / builtin functions / builtin objects / builtin properties /
; builtin constants each have their OWN token type in the grammar (see
; grammar.js), matched with higher lexer precedence than the generic
; `identifier` token. That means there's no query-ordering ambiguity here:
; each node type maps 1:1 to exactly one capture.

; === ASP Delimiters ===
(asp_directive) @tag
(asp_expression) @_asp_expr
(asp_block) @_asp_block

; === Strings / Numbers / Comments ===
(string) @string
(number) @number
(comment) @comment

; === Keywords / builtins (now distinct node types, not identifier+regex) ===
(keyword) @keyword
(function_builtin) @function.builtin
(type_builtin) @type.builtin
(property_builtin) @property
(constant_builtin) @constant.builtin

; === Operators / Punctuation ===
(operator) @operator
(punctuation) @punctuation.delimiter

; === #include directive ===
(include_directive
  "#include" @keyword.import
  (string) @string.special)

; === Plain identifiers (variables, function/sub names, everything else) ===
(identifier) @variable

; === HTML content ===
(html_content) @none
(html_lt) @none
