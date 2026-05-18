import { Command } from "commander";
import { referencesInboxPath } from "./config.js";
import { createImportReferenceCommand, createDefaultImportReferenceCommandDependencies } from "../../application/commands/import-reference.command.js";

export function createCli(): Command {
  const program = new Command();

  program
    .name("musix")
    .description("Producer workflow CLI");
	program.addCommand(createImportReferenceCommand(createDefaultImportReferenceCommandDependencies(referencesInboxPath)));

  return program;
}
