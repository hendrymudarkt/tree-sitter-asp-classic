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
    // `html_close_tag` is a top-level sibling of `html`: `html` stops at any
    // `</`, so orphaned closing tags become their own `html_close_tag` nodes
    // (colored @tag) rather than raw text, while <style>/<script> closers stay
    // inside `html` thanks to the higher-precedence token alternatives there.
    source_file: ($) =>
      repeat(
        choice(
          $.asp_directive,
          $.asp_expression,
          $.asp_block,
          $.server_script_block,
          $.include_directive,
          $.html_close_tag,
          $.html,
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

    // Raw HTML — everything that is not an ASP construct. Captured as ONE
    // node and re-parsed whole by Zed's bundled HTML grammar (see
    // injections.scm). Because complete <style>…</style> and <script>…</script>
    // elements live inside a single `html` node, HTML sees them as whole
    // elements and injects CSS and JavaScript into them itself — exactly the
    // behavior of VS Code's text.html.basic that the jtjoo extension builds
    // on. We stop the run at ASP delimiters (<%, <%=, <%@) and at any `</`
    // (closing tag) so orphaned closing tags (separated from their openers by
    // <% %> blocks) are NOT swallowed as raw text but handed to the
    // `html_close_tag` rule below and colored directly as @tag. `/<[^%@=\/]/`
    // excludes `/` after `<`, so `</tag>` stops `html`. </style> and </script>
    // are EXCEPTIONS — they are given token precedence 1 so the lexer prefers
    // them over `html_close_tag` (which would otherwise capture them and
    // break the <style>/<script> element needed for CSS/JS injection).
    // The #include SSI directive is handled by its own rule below, so
    // it is deliberately excluded here and NOT treated as an HTML comment.
    html: ($) =>
      prec(-1, repeat1(choice(
        /[^<]/,
        // </style> and </script> are given token precedence 1 so the lexer
        // prefers them over the catch-all `html_close_tag` rule below (which
        // would otherwise capture them as a named node and break the
        // <style>/<script> element needed for CSS/JS injection).
        token(prec(1, /<\/style[^>]*>/i)),
        token(prec(1, /<\/script[^>]*>/i)),
        /<[^%@=\/]/,
      ))),

    // Closing HTML tag — captured as its OWN top-level node (a sibling of
    // `html`, never a child) so orphaned closing tags (separated from their
    // openers by <% %> blocks) are colored by our grammar as @tag. `html`
    // deliberately stops at any `</` (see above), so these tags are never
    // swallowed as raw text. `html_close_tag` does NOT match </script> or
    // </style> because the higher-precedence token alternatives in `html`
    // capture those first, keeping complete <style>/<script> elements whole
    // for the HTML grammar's CSS/JS injections. `token()` keeps the node range
    // tight (no absorbed leading whitespace).
    html_close_tag: ($) => token(/<\/[a-zA-Z][^>]*>/i),

    // #include directive (SSI, written as an HTML comment).
    // Starts with /<!--#include/i (NOT the bare literal "<!--") so that
    // ordinary HTML comments `<!-- ... -->` are NOT lexed as the start of
    // this rule. The bare `<!--` would otherwise win by longest-match over
    // the `html` rule's `<!` token, breaking every HTML comment on the page.
    include_directive: ($) =>
      seq(
        /<!--#include/i,
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
        $.keyword_modifier,
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
    // (Public/Private/Default live in `keyword_modifier` so they get a
    // distinct highlight group, mirroring TextMate's storage.modifier.asp.)
    keyword: ($) =>
      token(
        prec(
          2,
          /Dim|Set|If|Then|Else|ElseIf|End|For|Each|In|To|Step|Next|While|Wend|Do|Loop|Until|Select|Case|Sub|Function|With|Exit|On|Error|Resume|GoTo|Call|New|Const|ReDim|Preserve|ByVal|ByRef|Optional|ParamArray|Class|Property|Get|Let|TypeOf|Execute|ExecuteGlobal|Option|Explicit|Is|Like|Mod|Not|And|Or|Xor|Eqv|Imp|Randomize|Return|Continue/i,
        ),
      ),

    // === VBScript storage modifiers (storage.modifier.asp) ===
    keyword_modifier: ($) =>
      token(prec(2, /Public|Private|Default/i)),

    // === VBScript built-in functions + ASP object methods + events ===
    // Mirrors TextMate scopes: support.function.vb.asp (VB functions),
    // support.function.asp (object methods like Response.Write), and
    // support.function.event.asp (Application_OnStart, etc.).
    // NOTE: bare `End` is intentionally excluded — it is a keyword (End If,
    // End Sub, ...) and must not be colored as a function.
    function_builtin: ($) =>
      token(
        prec(
          2,
          /Abs|Array|Add|Asc|Atn|CBool|CByte|CCur|CDate|CDbl|Chr|CInt|CLng|Conversions|Cos|CreateObject|CSng|CStr|Date|DateAdd|DateDiff|DatePart|DateSerial|DateValue|Day|Derived|Math|Escape|Eval|Exists|Exp|Filter|Fix|FormatCurrency|FormatDateTime|FormatNumber|FormatPercent|GetLocale|GetObject|GetRef|Hex|Hour|IIf|InputBox|InStr|InStrRev|Int|IsArray|IsDate|IsEmpty|IsNull|IsNumeric|IsObject|Item|Items|Join|Keys|LBound|LCase|Left|Len|LoadPicture|Log|LTrim|RTrim|Trim|Maths|Mid|Minute|Month|MonthName|MsgBox|Now|Oct|Remove|RemoveAll|Replace|RGB|Right|Rnd|Round|ScriptEngine|ScriptEngineBuildVersion|ScriptEngineMajorVersion|ScriptEngineMinorVersion|Second|SetLocale|Sgn|Sin|Space|Split|Sqr|StrComp|String|StrReverse|Tan|Time|Timer|TimeSerial|TimeValue|TypeName|UBound|UCase|Unescape|VarType|Weekday|WeekdayName|Year|CVar|Val|Write|Redirect|MapPath|HTMLEncode|URLEncode|Lock|Unlock|SetAbort|SetComplete|AddHeader|AppendToLog|BinaryWrite|BinaryRead|Clear|Flush|Abandon|Application_OnEnd|Application_OnStart|OnTransactionAbort|OnTransactionCommit|Session_OnEnd|Session_OnStart|Class_Initialize|Class_Terminate/i,
        ),
      ),

    // === ASP built-in intrinsic objects (support.class.asp) ===
    type_builtin: ($) =>
      token(
        prec(
          2,
          /Response|Request|Server|Session|Application|ObjectContext|ASPError/i,
        ),
      ),

    // === ASP collections + object properties (support.class.collection.asp
    // and support.constant.asp, e.g. Response.Buffer, Request.Form) ===
    property_builtin: ($) =>
      token(
        prec(
          2,
          /Form|QueryString|Cookies|ServerVariables|Files|Contents|StaticObjects|Count|Item|Key|ClientCertificate|TotalBytes|Buffer|CacheControl|Charset|ContentType|Expires|ExpiresAbsolute|IsClientConnected|PICS|Status|ScriptTimeout|CodePage|LCID|SessionID|Timeout/i,
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
    // (Retained only as a comment for history; raw HTML is now handled by the
    // single `html` node above so that complete <style>/<script> elements are
    // visible to the HTML grammar's own CSS/JS injections.)
  },
});
