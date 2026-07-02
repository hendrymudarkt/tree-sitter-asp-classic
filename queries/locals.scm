; Local variable scoping for ASP Classic

; Function and Sub definitions create scopes
(sub_declaration
  name: (identifier) @local.definition)

(function_declaration
  name: (identifier) @local.definition)

; Dim statements define variables
(dim_statement
  (identifier) @local.definition)

; Assignments reference variables
(assignment_statement
  (member_expression) @local.reference)

; All identifiers in expressions are references
(vbscript_expression
  (identifier) @local.reference)
