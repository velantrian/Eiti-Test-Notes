# EITI Current and Cross-Project Research Map

Status: documentation map only. GitHub main remains EITI implementation truth. This document does not change runtime authority.

## Rule

A mechanism that works in EITI is Current for EITI only. Reuse in another Velantrim project remains Research until that owning project implements, evaluates, and explicitly accepts it.

```text
EITI implementation != ecosystem-wide implementation
research != runtime
integration != authority transfer
retrieval signal != evidence
```

## Current in EITI

| Mechanism | Repository evidence | Current claim |
|---|---|---|
| MOSC | `data/mosc_default_v1.json` | EITI has a concrete MOSC data/index mechanism |
| Ranking and salience | `velantrim_core/tests_js/ranking.test.js`, `salience.test.js` | EITI has tested ranking/salience logic |
| DAAD / decay | `velantrim_core/tests_js/decay.test.js` | EITI has tested temporal decay/accessibility logic |
| Local learning analysis | `velantrim_core/tests_js/apply_analysis.test.js` | EITI can derive and apply local learning changes |
| Cross-provider context | `velantrim_core/e2e/cross_ai_context.spec.js` | EITI tests context continuity across provider changes |
| Full-context assembly | `velantrim_core/tests_js/full_ctx.test.js` | EITI can assemble bounded labelled context from local sources |
| KB validation tooling | `velantrim_core/validate.py`, `schema.json` | EITI has schema plus business-rule validation tooling |

These facts do not imply that the same mechanisms are production-ready or authoritative in other projects.

## Current correctness hardening

The KB validator previously ignored several JSON Schema error classes because manual checks were assumed to cover them. The manual checks did not cover every field.

The corrected rule is:

```text
JSON Schema failure => structural validation fails
manual checks may add constraints; they never remove schema failures
schema-valid != evidence-backed knowledge
```

Regression coverage includes invalid domain format, non-array tags, malformed prerequisite references, and non-string statements.

## Research ownership

### Titan

Research and benchmark:
- MOSC as bounded lexical/intent routing support;
- adaptive retrieval-policy proposals (EITI FL; not model-weight training);
- bounded intent-pattern helpers;
- PKG/Hebbian-style association signals mapped to existing relation-strength/Charge mechanics rather than a second uncontrolled graph;
- novelty/diversity pressure;
- decay-aware retrieval;
- shadow evaluation and LearningProposal-style adaptation before activation.

### Cognitive OS

Use EITI as a prototype reference for research into interaction-to-control handoff, provider/model routing, context strategy, attention/retrieval dynamics, assurance, and anti-degradation. Cognitive OS remains research architecture until concrete runtime evidence exists.

### Crystal

Relevant future compatibility is typed proposals, evidence references, provenance, target-controlled admission, bounded writes, and receipts. EITI association/ranking signals must not become trusted Crystal records automatically.

### Native Kernel

Only durable substrate-neutral invariants belong here, such as:
- association is not evidence;
- salience is not evidence quality;
- decay/accessibility is not epistemic revision;
- retrieval is not authority;
- model output is not Canon.

### Mentaury Soul

EITI memory and association mechanisms may be research inputs, but belief, identity, relationships, and commitments remain Soul-owned state.

### Mentaury Kernel

Only cross-domain composition and transport contracts belong here: typed envelopes, provenance preservation, declared loss, non-escalation, and conformance.

### Continuum

Research long-term decay/plasticity behavior, recovery after model/runtime replacement, and whether these mechanisms improve functional continuity under falsifiable experiments. Default remains research/shadow.

## Promotion path

1. Identify the owning project and human capability.
2. Define a measurable problem.
3. Record the mechanism as Research unless independently implemented there already.
4. Build a bounded shadow/prototype implementation in the owning project.
5. Compare against a simple baseline.
6. Pass correctness, security, authority, and conformance gates.
7. Only then mark it Current for that owning project.
