#!/usr/bin/env python3
"""Show recent repository history with readable terminal hierarchy."""

import os
import shutil
import subprocess
import sys
import textwrap


def main():
    result = subprocess.run(
        [
            "git", "log", "-3", "--no-decorate", "--color=never",
            "--abbrev=8", "--format=%h%x09%s",
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    width = max(1, shutil.get_terminal_size().columns)
    styled = (
        sys.stdout.isatty()
        and os.environ.get("TERM", "") not in ("", "dumb")
        and "NO_COLOR" not in os.environ
    )
    indent = "  " if width > 4 else ""

    def emit(value, emphasis="", prefix=""):
        for line in textwrap.wrap(
            value,
            width=width,
            initial_indent=prefix,
            subsequent_indent=prefix,
            break_on_hyphens=False,
        ):
            if styled and emphasis:
                print(f"\033[{emphasis}m{line}\033[0m")
            else:
                print(line)

    emit("Recent changes", "1")
    for row in result.stdout.splitlines():
        commit, subject = row.split("\t", 1)
        print()
        emit(subject, "1", indent)
        emit(commit, "2", indent)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nCancelled.", file=sys.stderr)
        sys.exit(130)
    except subprocess.CalledProcessError as error:
        print(error.stderr.strip(), file=sys.stderr)
        sys.exit(error.returncode)
