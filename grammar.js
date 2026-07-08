/**
 * Tree-sitter grammar for ASP Classic (VBScript embedded in HTML)
 *
 * This grammar is intentionally "flat" / token-oriented rather than a full
 * statement/expression AST. VBScript's syntax (implicit statement
 * termination by newline, case-insensitive keywords, optional `Call`,
 * `=` used both for assignment and comparison, etc.) makes a strict LR(1)
 * grammar produce many genuine ambiguities that aren't worth resolving for
 * the purpose of syntax highlighting. Instead we recognize:
 *   - ASP delimiters: <% %>, <%= %>, <%@ %>, <script runat="server">
 *   - #include directives
 *   - Comments, strings, numbers
 *   - Keywords / builtin functions / builtin objects / builtin properties /
 *     builtin constants as their OWN token types (not "identifier" +
 *     regex filtering in highlights.scm). This mirrors how TextMate
 *     grammars (e.g. the classic VS Code ASP extensions) work: keyword
 *     patterns are tried and win BEFORE the generic identifier pattern,
 *     so there's no query-ordering ambiguity in highlights.scm at all.
 *   - Everything else inside a code block as a stream of tokens/expressions
 *
 * This keeps the grammar conflict-free while still giving Zed enough
 * structure for injections (HTML) and highlighting.
 */

module.exports = grammar({
  name: "asp_classic",

  extras: ($) => [/\s/, $.comment],

  rules: {
    source_file: ($) =>
      repeat(
        choice(
          $.asp_directive,
          $.asp_expression,
          $.asp_block,
          $.server_script_block,
          $.include_directive,
          $.html_tag,
          $.html_content,
          $.html_lt,
        ),
      ),

    // <%@ Language="VBScript" %>
    asp_directive: ($) =>
      seq("<%@", repeat(choice($.string, $.identifier, "=", /[^%]/)), "%>"),

    // <%= expression %>
    asp_expression: ($) => seq("<%=", repeat($._code_token), "%>"),

    // <% code %>
    asp_block: ($) => seq("<%", repeat($._code_token), "%>"),

    // <script language="vbscript" runat="server"> ... </script>
    server_script_block: ($) =>
      seq(
        /<script[^>]*runat\s*=\s*["']?server["']?[^>]*>/i,
        repeat($._code_token),
        /<\/script>/i,
      ),

    // #include directive (HTML comment syntax)
    include_directive: ($) =>
      seq(
        "<!--",
        "#include",
        choice(/file/i, /virtual/i),
        "=",
        $.string,
        "-->",
      ),

    // === Code tokens ===
    // A permissive stream of recognizable VBScript tokens. We don't attempt
    // to enforce statement grammar (If/Then/End If pairing, etc.) at the
    // parse-tree level; that structure is instead conveyed by giving
    // keywords/builtins their own token types below, matched with higher
    // precedence than the generic `identifier` token. Tree-sitter's lexer
    // uses longest-match-wins, and breaks ties by rule precedence, so e.g.
    // the text "If" is lexed as `keyword` (not `identifier`) while "IfCount"
    // still correctly lexes as a single, longer `identifier` token.
    _code_token: ($) =>
      choice(
        $.comment,
        $.string,
        $.number,
        $.keyword,
        $.function_builtin,
        $.type_builtin,
        $.property_builtin,
        $.constant_builtin,
        $.identifier,
        $.operator,
        $.punctuation,
      ),

    comment: ($) =>
      token(choice(seq("'", /[^\r\n]*/), seq(/rem[ \t]/i, /[^\r\n]*/))),

    string: ($) => token(seq('"', /[^"]*/, '"')),

    number: ($) => token(choice(/\d+(\.\d+)?/, /&H[0-9A-Fa-f]+/, /&O[0-7]+/)),

    // === VBScript language keywords / control-flow / statements ===
    keyword: ($) =>
      token(
        prec(
          2,
          /Dim|Set|If|Then|Else|ElseIf|End|For|Each|In|To|Step|Next|While|Wend|Do|Loop|Until|Select|Case|Sub|Function|With|Exit|On|Error|Resume|GoTo|Call|New|Public|Private|Default|Const|ReDim|Preserve|ByVal|ByRef|Optional|ParamArray|Class|Property|Get|Let|TypeOf|Execute|ExecuteGlobal|Option|Explicit|Is|Like|Mod|Not|And|Or|Xor|Eqv|Imp|Randomize/i,
        ),
      ),

    // === VBScript built-in functions ===
    function_builtin: ($) =>
      token(
        prec(
          2,
          /Abs|Array|Asc|Atn|CBool|CByte|CCur|CDate|CDbl|Chr|CInt|CLng|Cos|CreateObject|CSng|CStr|Date|DateAdd|DateDiff|DatePart|DateSerial|DateValue|Day|Erase|Exp|Filter|Fix|FormatCurrency|FormatDateTime|FormatNumber|FormatPercent|GetObject|Hex|Hour|IIf|InStrRev|InStr|Int|IsArray|IsDate|IsEmpty|IsNull|IsNumeric|IsObject|Join|LBound|LCase|Left|Len|Log|LTrim|Mid|Minute|Month|MonthName|Now|Oct|Replace|Right|Rnd|Round|RTrim|Second|Sgn|Sin|Space|Split|Sqr|StrComp|StrReverse|String|Tan|Time|Timer|TimeSerial|TimeValue|Trim|TypeName|UBound|UCase|VarType|Weekday|WeekdayName|Year|CVar|Val|Write|Redirect|MapPath|HTMLEncode|URLEncode/i,
        ),
      ),

    // === ASP built-in intrinsic objects ===
    type_builtin: ($) =>
      token(
        prec(
          2,
          /Response|Request|Server|Session|Application|ObjectContext|ASPError/i,
        ),
      ),

    // === ASP collections / common object properties ===
    property_builtin: ($) =>
      token(
        prec(
          2,
          /Form|QueryString|Cookies|ServerVariables|Files|Contents|StaticObjects|Count|Item|Key/i,
        ),
      ),

    // === Boolean / special literals / vbXxx runtime constants ===
    constant_builtin: ($) =>
      token(
        prec(2, choice(/True|False|Null|Nothing|Empty/i, /vb[A-Z][a-zA-Z]*/)),
      ),

    identifier: ($) => token(/[a-zA-Z_][a-zA-Z0-9_]*/),

    operator: ($) =>
      token(
        choice(
          "=",
          "<>",
          "<=",
          ">=",
          "<",
          ">",
          "+",
          "-",
          "*",
          "/",
          "\\",
          "^",
          "&",
        ),
      ),

    punctuation: ($) => token(choice("(", ")", ",", ".", ":")),

    // A whole HTML tag, e.g. `<div class="x">`, `</div>`, `<input ... />`.
    // Captured as ONE node (not just the leading '<') so it can be handed
    // off wholesale to Zed's bundled HTML grammar via injections.scm.
    //
    // The character class after '<' deliberately excludes '%' and '!' so
    // this rule never competes with `<%`/`<%=`/`<%@` (asp_block /
    // asp_expression / asp_directive) or `<!--` (include_directive, and
    // plain HTML comments, which still fall through to html_content /
    // html_lt below — a known limitation, not specifically re-parsed as
    // HTML comments for now). Tree-sitter's lexer only breaks ties by
    // precedence when match lengths are EQUAL; excluding '%' and '!' here
    // means html_tag can never even start matching at those positions, so
    // there's no risk of it out-competing the ASP rules on length.
    html_tag: ($) => token(prec(-1, seq("<", /[^<>%!][^<>]*/, ">"))),

    // HTML content (everything outside ASP tags/HTML tags).
    // Tree-sitter's regex engine does not support look-around, so
    // html_content matches runs of non-'<' characters, and a lone '<' that
    // doesn't start any of the other explicit ASP/HTML rules falls through
    // to html_lt below. The other rules are tried first by the GLR parser
    // and win whenever they match, since html_content/html_lt use lower
    // precedence.
    html_content: ($) => token(prec(-1, repeat1(/[^<]/))),

    // Fallback: a single '<' that isn't the start of any ASP/HTML construct.
    html_lt: ($) => token(prec(-2, "<")),
  },
});
