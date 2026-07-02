/**
 * Tree-sitter grammar for ASP Classic (VBScript embedded in HTML)
 * Supports: <% ... %>, <%= ... %>, <%@ ... %>, <script runat="server">, HTML, comments
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
          $.html_content,
        ),
      ),

    // <%@ Language="VBScript" %>
    asp_directive: ($) =>
      seq(
        "<%@",
        repeat(
          choice(
            $.directive_attribute,
            /[^%]+/,
          ),
        ),
        "%>",
      ),

    directive_attribute: ($) =>
      seq(
        $.identifier,
        "=",
        $.string,
      ),

    // <%= expression %>
    asp_expression: ($) =>
      seq(
        "<%=",
        optional($.vbscript_expression),
        "%>",
      ),

    // <% code %>
    asp_block: ($) =>
      seq(
        "<%",
        repeat($.vbscript_statement),
        "%>",
      ),

    // <script language="vbscript" runat="server"> ... </script>
    server_script_block: ($) =>
      seq(
        /<script[^>]*runat\s*=\s*["']?server["']?[^>]*>/i,
        repeat($.vbscript_statement),
        /<\/script>/i,
      ),

    // === VBScript Statements ===
    vbscript_statement: ($) =>
      choice(
        $.comment,
        $.dim_statement,
        $.set_statement,
        $.assignment_statement,
        $.if_statement,
        $.for_statement,
        $.for_each_statement,
        $.while_statement,
        $.do_loop_statement,
        $.select_case_statement,
        $.sub_declaration,
        $.function_declaration,
        $.call_statement,
        $.response_statement,
        $.request_expression,
        $.with_statement,
        $.exit_statement,
        $.on_error_statement,
        $.include_directive,
        $.vbscript_expression,
        /[^\n%<]+\n?/,
      ),

    // Comments
    comment: ($) =>
      token(
        choice(
          seq("'", /.*/),
          seq(/rem\s/i, /.*/),
        ),
      ),

    // Dim statement
    dim_statement: ($) =>
      seq(
        /dim\s/i,
        commaSep1(
          choice(
            seq($.identifier, "(", optional($.number), ")"),
            $.identifier,
          ),
        ),
        /\n/,
      ),

    // Set statement
    set_statement: ($) =>
      seq(
        /set\s/i,
        $.identifier,
        "=",
        choice(
          seq(/new\s/i, $.identifier),
          seq(/nothing/i),
          $.vbscript_expression,
        ),
        /\n/,
      ),

    // Assignment
    assignment_statement: ($) =>
      seq(
        $.member_expression,
        "=",
        $.vbscript_expression,
        /\n/,
      ),

    // If statement
    if_statement: ($) =>
      seq(
        /if\s/i,
        $.vbscript_expression,
        /\sthen/i,
        optional(/\n/),
        repeat($.vbscript_statement),
        optional(
          seq(
            /else\s?/i,
            optional(/\n/),
            repeat($.vbscript_statement),
          ),
        ),
        /end\s+if/i,
        optional(/\n/),
      ),

    // For loop
    for_statement: ($) =>
      seq(
        /for\s/i,
        $.identifier,
        "=",
        $.vbscript_expression,
        /\sto\s/i,
        $.vbscript_expression,
        optional(seq(/\sstep\s/i, $.vbscript_expression)),
        /\n/,
        repeat($.vbscript_statement),
        /next/i,
        optional(/\n/),
      ),

    // For Each loop
    for_each_statement: ($) =>
      seq(
        /for\s+each\s/i,
        $.identifier,
        /\sin\s/i,
        $.vbscript_expression,
        /\n/,
        repeat($.vbscript_statement),
        /next/i,
        optional(/\n/),
      ),

    // While loop
    while_statement: ($) =>
      seq(
        /while\s/i,
        $.vbscript_expression,
        /\n/,
        repeat($.vbscript_statement),
        /wend/i,
        optional(/\n/),
      ),

    // Do...Loop
    do_loop_statement: ($) =>
      seq(
        /do/i,
        optional(seq(/\s+(while|until)\s/i, $.vbscript_expression)),
        /\n/,
        repeat($.vbscript_statement),
        /loop/i,
        optional(seq(/\s+(while|until)\s/i, $.vbscript_expression)),
        optional(/\n/),
      ),

    // Select Case
    select_case_statement: ($) =>
      seq(
        /select\s+case\s/i,
        $.vbscript_expression,
        /\n/,
        repeat($.case_clause),
        /end\s+select/i,
        optional(/\n/),
      ),

    case_clause: ($) =>
      seq(
        /case\s/i,
        choice(/else/i, commaSep1($.vbscript_expression)),
        /\n/,
        repeat($.vbscript_statement),
      ),

    // Sub declaration
    sub_declaration: ($) =>
      seq(
        optional(/public\s+|private\s+/i),
        /sub\s/i,
        $.identifier,
        optional(seq("(", optional(commaSep1($.identifier)), ")")),
        /\n/,
        repeat($.vbscript_statement),
        /end\s+sub/i,
        optional(/\n/),
      ),

    // Function declaration
    function_declaration: ($) =>
      seq(
        optional(/public\s+|private\s+/i),
        /function\s/i,
        $.identifier,
        optional(seq("(", optional(commaSep1($.identifier)), ")")),
        /\n/,
        repeat($.vbscript_statement),
        /end\s+function/i,
        optional(/\n/),
      ),

    // Call statement
    call_statement: ($) =>
      seq(
        optional(/call\s/i),
        $.member_expression,
        optional(seq("(", optional(commaSep1($.vbscript_expression)), ")")),
        /\n/,
      ),

    // Response.Write, Response.Redirect, etc.
    response_statement: ($) =>
      seq(
        /response\./i,
        $.identifier,
        optional(seq("(", optional(commaSep1($.vbscript_expression)), ")")),
        optional(/\n/),
      ),

    request_expression: ($) =>
      seq(
        /request(\.(form|querystring|cookies|servervariables|files))?\s*\(/i,
        optional($.vbscript_expression),
        ")",
      ),

    // With block
    with_statement: ($) =>
      seq(
        /with\s/i,
        $.vbscript_expression,
        /\n/,
        repeat($.vbscript_statement),
        /end\s+with/i,
        optional(/\n/),
      ),

    // Exit statement
    exit_statement: ($) =>
      seq(
        /exit\s+(sub|function|for|do)/i,
        optional(/\n/),
      ),

    // On Error
    on_error_statement: ($) =>
      seq(
        /on\s+error\s+(resume\s+next|goto\s+0)/i,
        optional(/\n/),
      ),

    // #include
    include_directive: ($) =>
      seq(
        "<!--",
        "#include",
        choice(/file/i, /virtual/i),
        "=",
        $.string,
        "-->",
      ),

    // === Expressions ===
    vbscript_expression: ($) =>
      choice(
        $.binary_expression,
        $.unary_expression,
        $.member_expression,
        $.call_expression,
        $.string,
        $.number,
        $.boolean_literal,
        $.null_literal,
        $.nothing_literal,
        $.empty_literal,
        $.array_access,
      ),

    binary_expression: ($) =>
      prec.left(
        1,
        seq(
          $.vbscript_expression,
          choice(
            "+", "-", "*", "/", "\\", "^", "mod",
            "=", "<>", "<", ">", "<=", ">=",
            /and/i, /or/i, /not/i, /xor/i, /eqv/i, /imp/i,
            "&",
          ),
          $.vbscript_expression,
        ),
      ),

    unary_expression: ($) =>
      prec(
        2,
        seq(
          choice("-", /not\s/i),
          $.vbscript_expression,
        ),
      ),

    member_expression: ($) =>
      prec.left(
        3,
        seq(
          choice($.identifier, seq(".", $.identifier)),
          repeat(seq(".", $.identifier)),
        ),
      ),

    call_expression: ($) =>
      seq(
        $.member_expression,
        "(",
        optional(commaSep1($.vbscript_expression)),
        ")",
      ),

    array_access: ($) =>
      seq(
        $.identifier,
        "(",
        commaSep1($.vbscript_expression),
        ")",
      ),

    // === Primitives ===
    string: ($) =>
      token(
        choice(
          seq('"', /[^"]*/, '"'),
          seq("'", /[^']*/, "'"),
        ),
      ),

    number: ($) =>
      token(
        choice(
          /\d+(\.\d+)?/,
          /&H[0-9A-Fa-f]+/,
          /&O[0-7]+/,
        ),
      ),

    boolean_literal: ($) => token(/true|false/i),
    null_literal: ($) => token(/null/i),
    nothing_literal: ($) => token(/nothing/i),
    empty_literal: ($) => token(/empty/i),

    identifier: ($) =>
      token(/[a-zA-Z_][a-zA-Z0-9_]*/),

    // HTML content (everything outside ASP tags)
    html_content: ($) =>
      token(
        prec(
          -1,
          /([^<]|<(?!%|!--\s*#include|script[^>]*runat))+/,
        ),
      ),
  },
});

function commaSep1(rule) {
  return seq(rule, repeat(seq(",", rule)));
}
