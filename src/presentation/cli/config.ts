import os from "node:os";
import path from "node:path";

export const referencePath = path.join(os.homedir(), "03_Music", "00_Ableton_User_Library", "References");
export const referencesInboxPath = path.join(referencePath, "00_Inbox");