import { createCli } from "./presentation/cli/create-cli.js";

console.log("~~~ Musix ~~~");

const program = createCli();
await program.parseAsync();