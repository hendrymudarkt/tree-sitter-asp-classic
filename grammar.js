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
 *   - Keywords (via regex match on identifiers in highlights.scm)
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
    // parse-tree level; that structure is instead conveyed through
    // highlighting queries matching keyword identifiers.
    _code_token: ($) =>
      choice(
        $.comment,
        $.string,
        $.number,
        $.identifier,
        $.operator,
        $.punctuation,
      ),

    comment: ($) =>
      token(choice(seq("'", /[^\r\n]*/), seq(/rem[ \t]/i, /[^\r\n]*/))),

    string: ($) => token(seq('"', /[^"]*/, '"')),

    number: ($) =>
      token(choice(/\d+(\.\d+)?/, /&H[0-9A-Fa-f]+/, /&O[0-7]+/)),

    identifier: ($) => token(/[a-zA-Z_][a-zA-Z0-9_]*/),

    operator: ($) =>
      token(
        choice(
          "=", "<>", "<=", ">=", "<", ">",
          "+", "-", "*", "/", "\\", "^", "&",
        ),
      ),

    punctuation: ($) => token(choice("(", ")", ",", ".", ":")),

    // HTML content (everything outside ASP tags).
    // Tree-sitter's regex engine does not support look-around, so
    // html_content matches runs of non-'<' characters, and a lone '<' that
    // doesn't start any of the other explicit ASP rules falls through to
    // html_lt below. The other rules are tried first by the GLR parser and
    // win whenever they match, since html_content/html_lt use lower
    // precedence.
    html_content: ($) => token(prec(-1, repeat1(/[^<]/))),

    // Fallback: a single '<' that isn't the start of any ASP construct.
    html_lt: ($) => token(prec(-2, "<")),
  },
});
