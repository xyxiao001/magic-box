---
name: "new-tool-workflow"
description: "Creates new tool workflow guidance for Magic Box. Invoke when adding a new tool, planning a tool batch, or when the user asks to follow the project new-tool flow."
---

# New Tool Workflow

Use this skill when the task is about adding one or more new tools to Magic Box, extending the tool matrix, or explicitly following the project's new-tool process.

This skill is project-specific. It assumes the repository uses:

- `docs/specs/` for feature specs
- `src/lib/` for core logic
- `src/views/tools/` for tool pages
- `src/tools/registry/` for tool registration and search
- `README.md` and `docs/roadmap.md` as required sync targets

## When To Invoke

Invoke this skill when:

- the user asks to add a new tool
- the user asks to implement multiple tools in a batch
- the user asks to follow the project's tool creation workflow
- a planned tool from `docs/roadmap.md` is being turned into a real implementation

Do not invoke this skill for:

- small fixes inside an existing tool unless the user is effectively turning it into a new tool scope
- pure documentation edits with no new tool work
- simple refactors unrelated to tool creation

## Core Rule

For Magic Box, new tools must follow this order:

1. write spec
2. confirm scope
3. implement core logic
4. implement tool page
5. register tool
6. update docs
7. validate
8. commit

Never jump directly to implementation before the spec is in place unless the user explicitly overrides the project rule.

## Step 1: Spec First

Before coding, check whether a spec already exists in `docs/specs/`.

If no suitable spec exists:

- create a new numbered spec file
- follow `docs/specs/templates/feature-spec-template.md`
- cover at least:
  - background
  - user story
  - scope
  - non-goals
  - interaction and page structure
  - data and state
  - acceptance criteria
  - risks and open questions

If the user asks to "start implementation now" but the tool is net new, first create the spec unless they explicitly say to skip it.

## Step 2: Scope The Tool

Clarify the first version before coding.

Focus on:

- who uses the tool
- what the most common input is
- what the output should look like
- what is intentionally excluded from v1
- whether the tool is local-first or network-required
- whether the tool should link to adjacent tools

When in doubt, prefer a small and coherent first version over a broad one.

## Step 3: Implement Core Logic

Default location: `src/lib/`

Rules:

- put parsing, formatting, diffing, conversion, and calculation logic in `src/lib/`
- keep page components thin
- prefer pure functions
- add focused tests for the new core logic when it meaningfully reduces regression risk

Typical file pattern:

- `src/lib/<tool-name>.ts`
- `src/lib/<tool-name>.spec.ts`

## Step 4: Implement Tool Page

Default location: `src/views/tools/`

Rules:

- reuse existing project UI patterns such as:
  - `ToolPageLayout`
  - `ToolPanel`
  - `ToolActionBar`
  - `ResultCard`
- keep defaults practical and product-oriented
- use templates and sample inputs that reflect real usage
- prefer user-facing labels and value-oriented wording over internal engineering terms

Typical file pattern:

- `src/views/tools/<ToolName>View.vue`

## Step 5: Register The Tool

After the tool exists, wire it into the registry.

Required checks:

- add definition in `src/tools/registry/definitions.ts`
- choose the right category in `src/tools/registry/categories.ts`
- add search keywords or alias support in `src/tools/registry/search.ts` when needed
- update related registry tests if search ordering or counts are affected

The tool is not considered complete until it is discoverable in the app.

## Step 6: Sync Docs

Before finishing, always inspect whether these files need updates:

- `README.md`
- `docs/roadmap.md`
- the spec file created for this tool

### README Rules

Update `README.md` when:

- tool count changes
- tool list changes
- capabilities change
- commands or project structure descriptions become stale

### Roadmap Rules

Update `docs/roadmap.md` when:

- a planned tool has now been implemented
- completed tool lists are out of date
- next-batch suggestions should be adjusted

## Step 7: Validate

Use minimum sufficient validation.

Preferred checks:

- diagnostics for edited files
- targeted tests for new logic
- `pnpm typecheck` when page and lib changes are involved

Avoid by default:

- `pnpm dev`
- `pnpm build`
- broad, expensive checks that do not materially increase confidence

## Step 8: Commit Checklist

Before commit, confirm:

- spec exists
- core logic and UI are separated appropriately
- registry wiring is complete
- `README.md` has been checked
- `docs/roadmap.md` has been checked
- validation is sufficient
- unrelated changes are not mixed in

Commit message should reflect user-visible impact:

- `feat` for new tools or user-visible new capabilities
- `fix` for behavior or presentation corrections
- `docs` for doc-only updates

## Preferred Behavior

When running this workflow, prefer the following sequence in conversation:

1. inspect existing adjacent tools
2. inspect or create spec
3. present a brief implementation plan
4. implement logic
5. implement UI
6. wire registry and docs
7. validate
8. if asked, commit and push

## Examples

### Example 1

User asks: "新增一个 Password Generator"

Expected flow:

1. create or update spec in `docs/specs/`
2. implement password generation logic in `src/lib/`
3. create `PasswordGeneratorView.vue`
4. register tool
5. update `README.md` and `docs/roadmap.md`
6. run targeted validation

### Example 2

User asks: "把 roadmap 里的 3 个工具做掉"

Expected flow:

1. inspect roadmap entries
2. create missing specs first
3. implement one coherent batch
4. sync registry and docs
5. validate and hand off
