<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Load Topology Lab architecture rules
- Keep the simulation, contextual pruning, benchmark, and serial protocol in pure, independently unit-tested browser-safe modules so their results remain verifiable without hardware.
- Keep user project state in browser storage and never introduce a backend unless the user requests it, because the specification requires an offline-capable browser-only laboratory.
- Keep the full working laboratory available at `/`, and define section navigation as views of the same experiment so shared simulation, safety, and evidence state stays consistent.
- Include hardware-derived results in exports only when they come from the real serial pipeline; always label synthetic measurements and benchmarks as simulated to preserve evidence provenance.
