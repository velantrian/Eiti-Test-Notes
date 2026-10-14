# EITI Currentness Registry

**Status:** OWNER-SIDE NAVIGATION RECORD  
**Scope:** EITI repository lineage/currentness only  
**Authority ceiling:** this file identifies which EITI repository is the current primary product repository. It does not create ecosystem architecture authority, Canon authority, or cross-project runtime authority.

## CURRENT_PRIMARY

- Repository: `velantrian/velantrim-eiti`
- Branch: `main`
- Product entrypoint: `https://velantrian.github.io/velantrim-eiti/`
- Repository role: current primary EITI product / assistant lineage repository

This designation is explicit. It must not be inferred from repository name, version number, push date, README plausibility, or recency alone.

## Other EITI-named repositories

All other EITI-named repositories are **NOT CURRENT_PRIMARY by this registry unless explicitly promoted here by an owner decision**.

They may be legacy generations, product evolution branches, specialized experiments, PWA/wizard/LLM variants, donors, or other adjacent implementations. Their local status must be read from their own owner-local documentation before making a more specific claim.

Therefore:

- `NAME ≠ CURRENTNESS`
- `VERSION NUMBER ≠ CURRENTNESS`
- `RECENCY ≠ CURRENTNESS`
- `README PLAUSIBILITY ≠ OWNER DECISION`
- `NOT CURRENT_PRIMARY ≠ ARCHIVED`
- `NOT CURRENT_PRIMARY ≠ USELESS`

## Known ambiguity example

`velantrian/Velantrim-Eiti-6` must not be treated as current merely because the repository name contains `6`.

At the time this registry was introduced, its README declared version `13.2.0` and linked its install/download paths to `Velan-Eiti-3`, while `velantrian/velantrim-eiti` declared version `13.7.4` and linked the live product/download paths to itself.

Those observations explain the historical ambiguity; **the authoritative currentness signal is this explicit owner-side registry, not the numbering comparison**.

## Reading rule for Human / AI

For an EITI implementation/currentness question:

`EITI QUESTION → THIS REGISTRY → CURRENT_PRIMARY → LIVE main / product source → ANSWER`

For a historical or donor question:

`EITI QUESTION → identify exact repository → read owner-local status/history → preserve LEGACY / EXPERIMENTAL / UNKNOWN qualifiers → ANSWER`

## Architecture boundary

`EITI CURRENT_PRIMARY ≠ CURRENT IN CRYSTAL / TITAN / SOUL / CONTINUUM`

`EITI IMPLEMENTATION OBSERVATION → OWNER-LOCAL CANDIDATE → REVIEW / BENCHMARK → TARGET-OWNER ADMISSION`

Currentness inside the EITI lineage does not transfer semantic ownership or adoption status to another Velantrim project.

## Change control

Change `CURRENT_PRIMARY` only through an explicit owner decision. When it changes, update this registry first (or atomically with the promotion), then update navigation surfaces that point to EITI.
