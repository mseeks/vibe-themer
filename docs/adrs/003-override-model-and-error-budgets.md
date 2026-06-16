# ADR-003: Settings overrides as the theme medium, and dual streaming error budgets

## Status
**Accepted** (June 2026)

Records two decisions the v2 code embodies but never wrote down, so a new maintainer
doesn't have to reverse-engineer the "why" from the code.

## Decision 1: a generated theme is settings overrides, not an installable theme file

Vibe Themer applies a theme by writing VS Code **color overrides** —
`workbench.colorCustomizations` and `editor.tokenColorCustomizations` in user (or
workspace) settings (`src/adapters/vscode/config.ts`). It does **not** generate,
package, or install a theme extension (`.vsix`) or a theme contributed via
`contributes.themes`.

### Why
- **Live streaming is the product.** Each setting is applied the instant the model
  emits it, so the user watches the theme paint in. A contributed theme file only
  takes effect as a whole, after generation finishes, and would need a packaging +
  install + window-reload cycle — there is no way to stream it on.
- **Zero install friction.** An override write takes effect immediately, in the
  running window, with no extension lifecycle.
- **Iteration is cheap.** "Make it warmer" reads the current overrides back
  (`readCurrentTheme`), sends them as context, and streams only the deltas (including
  `REMOVE`), editing in place rather than regenerating a whole file.
- **Reset is trivial.** Undoing a theme is clearing two settings keys (`reset` in the
  config adapter), not uninstalling anything.

### Consequence (the trade-off)
Overrides sit *on top of* whatever base theme is active and persist across theme
switches — so changing your VS Code theme does not clear a Vibe Themer theme. That is
the "reset, don't switch" behavior the README calls out, and the reason the **Reset
Theme Customizations** command exists. A generated theme is also not a portable
artifact you can share or publish; it lives in your settings.

## Decision 2: tolerate bounded streaming failures, on two separate budgets

The streaming consume loop (`consumeStream` in `src/application/generateTheme.ts`)
does not abort on the first failure. It tolerates up to **5 malformed model lines**
(`MAX_RECOVERABLE_ERRORS`) and, *separately*, up to **5 settings-write failures**
(`MAX_WRITE_ERRORS`) before stopping.

### Why tolerate at all
A long model stream occasionally emits one stray unparseable line. Aborting on the
first would throw away a nearly complete theme over a single hiccup. A small tolerance
rides out the glitch; a *bounded* one still fails fast when the stream is genuinely
garbage. While the budget is being spent the progress notification says so
("Recovering from a glitch (N/5)"), so an abort is never a surprise.

### Why two budgets, not one
A malformed line and a failed write are different problems with different causes:
- a **parse** failure means the *model* produced a bad line — skip it, keep going,
  and if there are too many, report it as bad model output (`Aborted`);
- a **write** failure means the *editor* refused a write — an environment/permissions
  problem — reported distinctly (`WriteAborted`) with its own message.

Sharing one budget would let an unwritable `settings.json` burn the malformed-output
allowance and get misreported as "the AI produced bad output." Separate budgets keep
each diagnosis honest. (This is exactly the bug fixed when the budgets were split.)

### Why 5
Small enough to fail fast on a broken stream, large enough to absorb the occasional
model slip. It is a deliberately conservative constant, **not** a user setting — an
exposed knob would be a support surface for a value almost no one should change.

## References
- [ADR-001: Theme Iteration Feature](./001-theme-iteration-feature.md)
- `docs/ARCHITECTURE.md` — the functional-core / imperative-shell design
