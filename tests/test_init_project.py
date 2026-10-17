import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "skills/coordinator/scripts/init_project.py"
spec = importlib.util.spec_from_file_location("init_project", SCRIPT)
initializer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(initializer)


class InitializeProjectTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="coordinator setup ")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "project"
        self.root.mkdir()
        self.git("init", "-q")

    def git(self, *args):
        return subprocess.run(
            ["git", "-C", str(self.root), *args],
            capture_output=True,
            check=True,
        ).stdout

    def test_setup_creates_state_and_keeps_it_untracked(self):
        result = initializer.initialize(self.root)
        for name in ("memory", "threads", "files"):
            self.assertTrue((self.root / ".coordinator" / name).is_dir())
        self.assertTrue((self.root / ".coordinator/PROJECT.md").is_file())
        self.assertTrue((self.root / ".coordinator/memory/MEMORY.md").is_file())
        self.assertEqual((self.root / ".gitignore").read_text(), ".coordinator/\n")
        self.assertTrue(result["ignored"])
        self.assertEqual(self.git("status", "--porcelain"), b"?? .gitignore\n")

    def test_cli_reports_the_verified_home(self):
        result = subprocess.run(
            [sys.executable, "-I", str(SCRIPT), str(self.root)],
            capture_output=True,
            text=True,
            check=True,
        )
        report = json.loads(result.stdout)
        self.assertEqual(report["project_home"], str(self.root.resolve() / ".coordinator"))
        self.assertTrue(report["ignored"])
        self.assertTrue((self.root / ".coordinator/PROJECT.md").is_file())

    def test_repeated_setup_preserves_state_and_ignore_bytes(self):
        (self.root / ".gitignore").write_bytes(b"build/")
        initializer.initialize(self.root)
        project = self.root / ".coordinator/PROJECT.md"
        index = self.root / ".coordinator/memory/MEMORY.md"
        project.write_text("Existing project decisions\n")
        index.write_text("Existing memory pointers\n")
        before = (self.root / ".gitignore").read_bytes()
        result = initializer.initialize(self.root)
        self.assertEqual(project.read_text(), "Existing project decisions\n")
        self.assertEqual(index.read_text(), "Existing memory pointers\n")
        self.assertEqual(before, b"build/\n.coordinator/\n")
        self.assertEqual((self.root / ".gitignore").read_bytes(), before)
        self.assertEqual(result["created"], [])
        self.assertFalse(result["ignore_updated"])

    def test_preserves_crlf_ignore_rules(self):
        (self.root / ".gitignore").write_bytes(b"build/\r\ncache/\r\n")
        initializer.initialize(self.root)
        self.assertEqual(
            (self.root / ".gitignore").read_bytes(),
            b"build/\r\ncache/\r\n.coordinator/\r\n",
        )

    def test_effective_existing_rule_is_not_duplicated(self):
        existing = b"# Local state\n.coordinator/\n"
        (self.root / ".gitignore").write_bytes(existing)
        result = initializer.initialize(self.root)
        self.assertFalse(result["ignore_updated"])
        self.assertEqual((self.root / ".gitignore").read_bytes(), existing)

    def test_repairs_a_negated_ignore_rule(self):
        existing = b".coordinator/\n!.coordinator/\n"
        (self.root / ".gitignore").write_bytes(existing)
        initializer.initialize(self.root)
        self.assertEqual((self.root / ".gitignore").read_bytes(), existing + b".coordinator/\n")
        self.git("check-ignore", "-q", ".coordinator/memory/MEMORY.md")

    def test_tracked_state_requires_a_decision_before_changes(self):
        state = self.root / ".coordinator"
        state.mkdir()
        note = state / "note.md"
        note.write_text("Existing tracked note\n")
        self.git("add", ".coordinator/note.md")
        with self.assertRaisesRegex(ValueError, "already tracked"):
            initializer.initialize(self.root)
        self.assertEqual(note.read_text(), "Existing tracked note\n")
        self.assertFalse((self.root / ".gitignore").exists())
        self.assertFalse((state / "memory").exists())

    def test_nested_directory_requires_repository_root(self):
        nested = self.root / "src"
        nested.mkdir()
        with self.assertRaisesRegex(ValueError, "Pass the repository root"):
            initializer.initialize(nested)
        self.assertFalse((nested / ".coordinator").exists())

    def test_linked_worktree_uses_the_explicit_checkout(self):
        (self.root / "README.md").write_text("Project\n")
        self.git("add", "README.md")
        self.git("-c", "user.name=Setup test", "-c", "user.email=setup@example.invalid", "commit", "-qm", "Initial")
        linked = Path(self.temp.name) / "linked checkout"
        self.git("worktree", "add", "-qb", "task", str(linked))
        result = initializer.initialize(linked)
        self.assertEqual(result["project_home"], str(linked.resolve() / ".coordinator"))
        self.assertTrue(result["ignored"])
        self.assertFalse((self.root / ".coordinator").exists())

    def test_non_git_project_creates_state_without_gitignore(self):
        folder = Path(self.temp.name) / "research"
        folder.mkdir()
        result = initializer.initialize(folder)
        self.assertFalse(result["repository"])
        self.assertIsNone(result["ignored"])
        self.assertTrue((folder / ".coordinator/memory/MEMORY.md").is_file())
        self.assertFalse((folder / ".gitignore").exists())

    def test_symlinked_ignore_is_preserved_without_setup(self):
        outside = Path(self.temp.name) / "outside-ignore"
        outside.write_text("keep\n")
        (self.root / ".gitignore").symlink_to(outside)
        with self.assertRaisesRegex(ValueError, "symlink"):
            initializer.initialize(self.root)
        self.assertEqual(outside.read_text(), "keep\n")
        self.assertFalse((self.root / ".coordinator").exists())

    def test_bare_repository_requires_a_checkout(self):
        bare = Path(self.temp.name) / "bare.git"
        subprocess.run(["git", "init", "--bare", "-q", str(bare)], check=True)
        with self.assertRaisesRegex(ValueError, "bare repository"):
            initializer.initialize(bare)
        self.assertFalse((bare / ".coordinator").exists())


if __name__ == "__main__":
    unittest.main()
