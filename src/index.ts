import "dotenv/config";
import { validateEnvironment } from "./infrastructure/environment/validate-environment.js";
import { createCli } from "./presentation/cli/create-cli.js";

validateEnvironment();

const program = createCli();
await program.parseAsync();
