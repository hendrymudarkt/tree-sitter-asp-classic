; Re-parse the raw HTML text (everything outside <% %> blocks), including
; whole tags like <div>, </table>, <input ...>, using Zed's bundled HTML
; grammar, so tags/attributes/entities get proper HTML highlighting instead
; of showing up as plain, uncolored text.
((html_tag) @injection.content
  (#set! injection.language "html"))

((html_content) @injection.content
  (#set! injection.language "html"))
