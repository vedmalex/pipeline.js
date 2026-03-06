# Project-Level PRD: pipeline.js

**Project:** pipeline.js v2.0.33
**Description:** Modular async workflow framework for Node.js and browser
**Author:** Alex Vedmedenko (vedmalex@gmail.com)
**Repository:** https://github.com/vedmalex/pipeline.js
**Migrated to MB3:** 2026-03-06

---

## Vision

Pipeline.js is a TypeScript async workflow orchestration library. It allows composing complex async pipelines from discrete stages, supporting sequential, parallel, conditional, retry, timeout, and other execution patterns.

---

## Core Requirements

### Functional
- **R-001** — Composable stage-based pipeline execution
- **R-002** — ES5 compilation target for broad compatibility
- **R-003** — TypeScript type safety for all public APIs
- **R-004** — Full test coverage (Bun test framework)
- **R-005** — Zero breaking changes across minor versions
- **R-006** — Context object threading through pipeline stages
- **R-007** — Error handling with CleanError / ErrorList patterns

### Non-Functional
- **R-NF-001** — Bundle size: minimal overhead
- **R-NF-002** — Performance: early-exit patterns in type detection
- **R-NF-003** — Compatibility: Node.js + browser + Bun

---

## Technical Stack

- **Language:** TypeScript (target: ES5)
- **Runtime:** Node.js, browser, Bun
- **Package Manager:** Bun
- **Build:** TypeScript compiler + esbuild
- **Testing:** Bun test (246 tests, 17 files)
- **Version:** 2.0.33

---

## Future Tasks Queue (from legacy tasks.md)

1. **ZOD-INTEGRATION** — Modern schema validation with ZOD, replace existing validation system
2. **CONTEXT-API-MODERNIZATION** — All internal work through Context only, external parameters via Context
3. **FLUENT-API-DEVELOPMENT** — Chainable method API like tRPC, better TypeScript inference
4. **ES5-TARGET-REVIEW** — Evaluate upgrading ES5 target given TypeDetectors system now in place

---

## Completed Milestones

- **2025-06-10** ErrorList modernization (CleanError system)
- **2025-06-17** CyclicJSON validation and Context cycle protection
- **2025-06-17** Context simplification and cycle protection
- **2025-06-17** Console checks to automated tests conversion
- **2025-06-17** ES5 instanceof refactoring (TypeDetectors system) — **ARCHIVED**
