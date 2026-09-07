# TypeScript Architectural Guidelines

## Core Principles
- Strict typing: No `any`; use `unknown` with narrowing or schema validation.
- Discriminated unions: Model state machines and domain entities with explicit tag fields.
- Immutability: Prefer `readonly` modifiers and pure transformations over in-place mutation.
- Error handling: Use typed Result objects (`{ ok: true, data } | { ok: false, error }`) instead of raw unhandled throws.

## Code Style & Generation
- Exported functions must declare explicit return types; infer internal local variables.
- Show only the relevant diff or modified block rather than full file rewrites.
