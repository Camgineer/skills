# Repository commands

Terms for a repository's script entry points and their assisted terminal flow.

## Language

**Command**:
An operation with one script path, one declared set of inputs, and one result. Its raw target, wizard, and command skill run the same operation.

**Namespace**:
A group of commands or deeper namespaces under a shared path. A namespace can also contain a command at its own path.

**Input**:
A named value a command accepts, with a declared prompt, help line, kind, presence requirement, and secrecy.

**Human stage**:
A prerequisite that requires human action and explicit completion before a wizard gathers inputs and runs a command.

**Command skill**:
An agent's instructions for one command, named by replacing the slashes in its script path with hyphens.
