#!/usr/bin/env python3
"""Create missing coordinator state and preserve existing project files."""

import argparse
import json
import subprocess
from pathlib import Path


PROJECT = """# Project

## Goal

## Success criteria

## Priorities

## Constraints

## Participants

## Decisions and resources
"""


def git(root, *args):
    return subprocess.run(
        ["git", "-C", str(root), *args],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )


def initialize(root):
    root = root.resolve(strict=True)
    if not root.is_dir():
        raise ValueError("Project root must be an existing directory.")
    probe = git(root, "rev-parse", "--show-toplevel")
    repository = probe.returncode == 0
    if repository:
        actual = Path(probe.stdout.decode().strip()).resolve()
        if actual != root:
            raise ValueError(f"Pass the repository root: {actual}")
        tracked = git(root, "ls-files", "-z", "--", ".coordinator")
        if tracked.returncode:
            raise ValueError(tracked.stderr.decode().strip())
        if tracked.stdout:
            raise ValueError("Coordination state is already tracked; resolve it before setup.")
    else:
        bare = git(root, "rev-parse", "--is-bare-repository")
        if bare.returncode == 0 and bare.stdout.strip() == b"true":
            raise ValueError("Use a working checkout rather than a bare repository.")
        if (root / ".git").exists():
            raise ValueError(probe.stderr.decode().strip())

    home = root / ".coordinator"
    directories = [home, home / "memory", home / "threads", home / "files"]
    seeds = {home / "PROJECT.md": PROJECT, home / "memory" / "MEMORY.md": "# Memory\n"}
    ignore = root / ".gitignore"
    for path in directories + list(seeds) + ([ignore] if repository else []):
        if path.is_symlink():
            raise ValueError(f"Resolve the symlink before setup: {path}")
        if path.exists() and path.is_dir() != (path in directories):
            raise ValueError(f"Unexpected file type: {path}")

    ignore_updated = False
    if repository:
        content = ignore.read_bytes() if ignore.exists() else b""
        ignored = git(root, "check-ignore", "--no-index", "-q", ".coordinator/")
        if ignored.returncode not in (0, 1):
            raise ValueError(ignored.stderr.decode().strip())
        if b".coordinator/" not in content.splitlines() or ignored.returncode != 0:
            newline = b"\r\n" if b"\r\n" in content else b"\n"
            prefix = newline if content and not content.endswith(b"\n") else b""
            with ignore.open("ab") as stream:
                stream.write(prefix + b".coordinator/" + newline)
            ignore_updated = True
        for target in (".coordinator/", ".coordinator/PROJECT.md", ".coordinator/memory/MEMORY.md"):
            result = git(root, "check-ignore", "--no-index", "-q", target)
            if result.returncode != 0:
                raise ValueError(f"Ignore verification failed: {target}")

    created = []
    for directory in directories:
        if not directory.exists():
            directory.mkdir()
            created.append(str(directory.relative_to(root)))
    for path, content in seeds.items():
        try:
            with path.open("x", encoding="utf-8") as stream:
                stream.write(content)
            created.append(str(path.relative_to(root)))
        except FileExistsError:
            pass
    return {
        "project_root": str(root),
        "project_home": str(home),
        "repository": repository,
        "ignored": True if repository else None,
        "ignore_updated": ignore_updated,
        "created": created,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project_root", type=Path, help="Agreed repository root or non-git working folder")
    args = parser.parse_args()
    try:
        result = initialize(args.project_root)
    except (OSError, ValueError) as error:
        parser.exit(1, f"Setup failed: {error}\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
