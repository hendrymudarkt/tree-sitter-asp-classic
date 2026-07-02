; ASP Classic syntax highlighting queries
; Compatible with Zed's highlight scope names

; === ASP Tags ===
(asp_directive) @tag
(asp_expression 
  "<%=" @tag.delimiter
  "%>" @tag.delimiter)
(asp_block
  "<%" @tag.delimiter
  "%>" @tag.delimiter)

; === Keywords ===
[
  (dim_statement "Dim")
  (set_statement "Set")
  (if_statement "If" "Then" "Else" "ElseIf" "End" "If")
  (for_statement "For" "To" "Step" "Next")
  (for_each_statement "For" "Each" "In" "Next")
  (while_statement "While" "Wend")
  (do_loop_statement "Do" "Loop" "While" "Until")
  (select_case_statement "Select" "Case" "End" "Select")
  (case_clause "Case")
  (sub_declaration "Sub" "End" "Sub")
  (function_declaration "Function" "End" "Function")
  (with_statement "With" "End" "With")
  (exit_statement "Exit")
  (on_error_statement "On" "Error")
] @keyword

; Case insensitive keywords via regex patterns
((identifier) @keyword
  (#match? @keyword "^(?i)(dim|set|if|then|else|elseif|end|for|each|in|to|step|next|while|wend|do|loop|until|select|case|sub|function|with|exit|on|error|resume|goto|call|new|nothing|null|empty|true|false|not|and|or|xor|eqv|imp|mod|is|like|public|private|const|redim|preserve|byval|byref|optional|paramarray|class|property|get|let|typeof|execute|executeglobal|option|explicit|rem)$"))

; === Built-in Objects ===
((identifier) @support.type
  (#match? @support.type "^(?i)(Response|Request|Server|Session|Application|ObjectContext|ASPError)$"))

; === Built-in Object Methods/Properties (after dot) ===
(member_expression
  "." @punctuation.delimiter
  (identifier) @support.function)

; Response methods
((identifier) @support.function
  (#match? @support.function "^(?i)(Write|Redirect|End|Flush|Clear|AddHeader|AppendToLog|BinaryWrite|PICS|Status|ContentType|Expires|ExpiresAbsolute|Buffer|CacheControl|Charset|CodePage|LCID|IsClientConnected|CookieType)$"))

; Request collections
((identifier) @support.type
  (#match? @support.type "^(?i)(Form|QueryString|Cookies|ServerVariables|Files|TotalBytes|BinaryRead)$"))

; Server methods
((identifier) @support.function
  (#match? @support.function "^(?i)(CreateObject|Execute|GetLastError|HTMLEncode|MapPath|Transfer|URLEncode|URLPathEncode|ScriptTimeout|FSO)$"))

; Session / Application methods
((identifier) @support.function
  (#match? @support.function "^(?i)(Abandon|Contents|StaticObjects|Timeout|SessionID|CodePage|LCID|Lock|Unlock|Remove|RemoveAll)$"))

; === VBScript Built-in Functions ===
((identifier) @support.function
  (#match? @support.function "^(?i)(Abs|Array|Asc|Atn|CBool|CByte|CCur|CDate|CDbl|Chr|CInt|CLng|Cos|CreateObject|CSng|CStr|Date|DateAdd|DateDiff|DatePart|DateSerial|DateValue|Day|Erase|Exp|Filter|Fix|FormatCurrency|FormatDateTime|FormatNumber|FormatPercent|GetObject|Hex|Hour|InputBox|InStr|InStrRev|Int|IsArray|IsDate|IsEmpty|IsNull|IsNumeric|IsObject|Join|LBound|LCase|Left|Len|LoadPicture|Log|LTrim|Mid|Minute|Month|MonthName|MsgBox|Now|Oct|Replace|Right|Rnd|Round|RTrim|Second|Sgn|Sin|Space|Split|Sqr|StrComp|StrReverse|String|Tan|Time|Timer|TimeSerial|TimeValue|Trim|TypeName|UBound|UCase|VarType|Weekday|WeekdayName|Year|CVar|CVErr|Environ|EOF|Error|FileLen|FreeFile|GetAttr|Input|InputB|LOF|Open|Seek|SetAttr|Spc|Tab|Val|VarType)$"))

; === Strings ===
(string) @string

; === Numbers ===
(number) @number

; === Boolean / Special literals ===
(boolean_literal) @constant.builtin
(null_literal) @constant.builtin
(nothing_literal) @constant.builtin
(empty_literal) @constant.builtin

; === Comments ===
(comment) @comment

; === Operators ===
[
  "=" "<>" "<" ">" "<=" ">="
  "+" "-" "*" "/" "\\" "^"
  "&"
] @operator

; === Punctuation ===
["(" ")"] @punctuation.bracket
["," "."] @punctuation.delimiter

; === #include directive ===
(include_directive
  "#include" @keyword.import
  (string) @string.special.path)

; === Variables (identifiers) ===
(identifier) @variable

; === HTML content ===
(html_content) @none
