#!/usr/bin/env python3
"""Stage only EITI browser runtime assets for GitHub Pages.

The public repository can contain research materials, including folklore/.
Those files are not automatically authorized for application distribution.
This script creates a fresh, explicit Pages artifact without research folders.
"""

import argparse
import shutil
from pathlib import Path

REQUIRED_FILES = (
    '.nojekyll',
    'index.html',
    'manifest.json',
    'sw.js',
    'sql-wasm.js',
    'sql-wasm.wasm',
    'icon-192.png',
    'icon-192-maskable.png',
    'icon-512.png',
    'icon-512-maskable.png',
    'kb/eiti_kb.js',
    'kb/index.json',
    'offline/core.json',
    'local/eiti_typo_vocab.json',
    'local/eiti_frames.json',
    'local/eiti_tell.json',
    'offline_manifest.json',
)

# The explicit patterns reflect the currently documented browser runtime.
# Adding a new asset type requires a reviewed change to this allowlist.
REQUIRED_PATTERNS = (
    'data/*.json',
    'local/eiti_*.js',
    'kb/idx/*.json',
    'kb/packs/*.json',
    'offline/eiti_*.js',
    'offline/packs/*.json',
)


def stage_site(source_root: Path, output_root: Path) -> list[Path]:
    source_root = source_root.resolve()
    output_root = output_root.resolve()
    if output_root == source_root or output_root.is_relative_to(source_root):
        raise ValueError('Output must be outside the repository source tree')
    if not source_root.is_dir():
        raise FileNotFoundError(f'Missing source root: {source_root}')
    if output_root.exists() and any(output_root.iterdir()):
        raise ValueError('Output is not empty; refusing to publish stale files')

    relative_files = {Path(item) for item in REQUIRED_FILES}
    for pattern in REQUIRED_PATTERNS:
        matches = list(source_root.glob(pattern))
        if not matches:
            raise FileNotFoundError(f'Runtime asset pattern matched nothing: {pattern}')
        relative_files.update(match.relative_to(source_root) for match in matches)

    # Preflight everything before writing the first output file. Reject links:
    # following them could silently copy non-runtime research outside allowlist.
    for rel in sorted(relative_files):
        source = source_root / rel
        if not source.is_file():
            raise FileNotFoundError(f'Required runtime file missing: {rel}')
        for component in (source, *source.parents):
            if component == source_root.parent:
                break
            if component.is_symlink():
                raise ValueError(f'Symlink not allowed in Pages artifact: {rel}')
        if 'folklore' in rel.parts:
            raise ValueError(f'Research corpus may not be deployed: {rel}')

    for rel in sorted(relative_files):
        target = output_root / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_root / rel, target)
    return sorted(relative_files)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    files = stage_site(args.source, args.output)
    print(f'Pages artifact: {len(files)} runtime files; folklore/ excluded')


if __name__ == '__main__':
    main()
