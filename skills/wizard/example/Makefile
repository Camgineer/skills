.DEFAULT_GOAL := wizard
WIZARD_ENGINE := ../engine
COMMANDS := $(shell node $(WIZARD_ENGINE)/cli.ts list-commands)
.EXPORT_ALL_VARIABLES:
.PHONY: wizard check-commands $(COMMANDS)

wizard:
	@node $(WIZARD_ENGINE)/cli.ts wizard || test $$? -eq 130

%/wizard:
	@node $(WIZARD_ENGINE)/cli.ts wizard $* || test $$? -eq 130

$(COMMANDS): %: scripts/%/run.ts
	@node $<

check-commands:
	@node $(WIZARD_ENGINE)/cli.ts check-commands
