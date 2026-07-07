# AGENTS.md

This repository is currently empty. Treat it as a bootstrap workspace until project files and tooling are added.

## Working Rules

- Check the current files before proposing architecture, commands, or dependencies.
- Do not assume a language, framework, package manager, or test runner unless the repository adds one.
- Keep early changes minimal and reversible. Prefer scaffolding and documentation over speculative implementation.
- When the repository is still empty, ask for or infer the intended stack only from explicit workspace files or the user's request.

## First-Session Checklist

- Look for project anchors first: README, package manifests, solution files, build scripts, or test configuration.
- If no anchors exist, treat setup as the primary task and keep changes limited to the requested bootstrap surface.
- Validate with the narrowest available check. If there is no build or test command yet, state that validation is not available.

## Change Boundaries

- Prefer updating this file over creating additional instruction files until the repository gains distinct areas with different conventions.
- Link to future project documentation instead of duplicating it here once README or docs are added.

## Suggested Next Customizations

- Add file-scoped instructions under .github/instructions/ after a concrete stack is introduced.
- Add prompts or skills only for repeated workflows that cannot be expressed clearly in this file.