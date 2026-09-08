# TypeScript Architectural Guidelines

## Core Principles
- Strict typing: No `any`; use `unknown` with narrowing or schema validation.
- Discriminated unions: Model state machines and domain entities with explicit tag fields.
- Immutability: Prefer `readonly` modifiers and pure transformations over in-place mutation.
- Error handling: Use typed Result objects (`{ ok: true, data } | { ok: false, error }`) instead of raw unhandled throws.

## Code Style & Generation
- Exported functions must declare explicit return types; infer internal local variables.
- Show only the relevant diff or modified block rather than full file rewrites.

## Naming Conventions
- Use `kebab-case` for directories and filenames, such as `realtime-credentials/`, `realtime-credentials.ts`, and `google-gen-ai-provider.ts`.
- Use `camelCase` for functions, variables, and properties, such as `createGoogleGenAIProvider` and `newSessionExpireTime`.
- Use `PascalCase` for types, interfaces, classes, and enums, such as `RealtimeCredential` and `RealtimeCredentialProvider`.
- Use `UPPER_SNAKE_CASE` only for true compile-time constants or environment variable names; prefer `camelCase` for ordinary runtime constants.
- Preserve the repository's existing casing conventions when adding or renaming files and symbols.

## Git & Terminal Guardrails
- Read-only inspection commands allowed (`git status`, `git diff`, `git log`).
- Never stage, commit, push, reset, or alter credentials.