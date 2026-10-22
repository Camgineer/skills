# Swag

Swag shapes look and feel across web pages, terminal UIs and CLI output, diagrams, documents and Markdown, slides, emails, generated images, and charts. It also applies its principles to other surfaces with the relevant platform guidance. Agents can reach for it on look-and-feel work, and it can be invoked directly with `/swag`.

It keeps an existing palette and the host's theme unless color is open for exploration. When choosing a palette, swag uses the one named in the request or picks a soft palette, names it, and offers alternatives without waiting. Established and custom palettes are welcome when they fit the brief and preserve contrast and meaning.

The shared principles keep the main view calm, detail accessible, content readable, and data exact. Interactive work reveals detail through highlight or selection. Static work uses connected supporting material. Each medium has its own guidance and checks.

Web work follows frontend-design, impeccable, animate, then web-design-guidelines. Animate's limits still apply. Terminal work respects color preferences, terminal width, plain output, and clean cancellation. Documents, slides, emails, diagrams, images, and charts are checked in their delivery medium.

## Install

The web route requires these separately installed companions, which retain their own licenses:

- `frontend-design`
- `impeccable`
- `animate`
- `web-design-guidelines`

Other routes do not require the web stack. Charts use an installed `dataviz` companion when the host provides one, with chart guidance as the fallback. Format-specific authoring tools remain responsible for creating and exporting their files. Sources and license limits are in [CREDITS.md](CREDITS.md).

From the repository root, copy the skill into the harness directories in use:

```sh
mkdir -p ~/.claude/skills ~/.agents/skills
cp -R skills/swag ~/.claude/skills/
cp -R skills/swag ~/.agents/skills/
```

## Use

```text
/swag Redesign the workshop page in index.html. Keep the content and booking link.
/swag Make this command's output calm and readable in narrow terminals.
/swag Improve this document's hierarchy and page layout.
/swag Review the diagram, slide deck, and charts without changing them.
```

Swag chooses by purpose and medium. An HTML email uses the email route; a dashboard chart uses chart and web guidance together. A missing required companion stops only its route before edits. The final report names incomplete checks, including an unavailable renderer or current web guidelines.

## Sample

[The web sample](examples/README.md) includes a small workshop page, before and after screenshots, and the checks performed. It demonstrates the web workflow rather than every surface. Serve the example directory with any static server to inspect both versions.

[The terminal sample](examples/terminal/README.md) reformats real repository history for narrow and wide terminals, with before and after captures and plain-output checks.
