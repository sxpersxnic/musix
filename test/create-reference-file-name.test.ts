import assert from "node:assert/strict";
import { test } from "node:test";

import { createReferenceFileName } from "@/infrastructure/file-system/create-reference-file-name.js";

test("createReferenceFileName includes detected bpm and key", () => {
	const fileName = createReferenceFileName({
		artist: "Pashanim",
		title: "Superjung",
		bpm: 170,
		musicalKey: "Gm",
	});

	assert.equal(fileName, "170_gm_pashanim_superjung.mp3");
});
