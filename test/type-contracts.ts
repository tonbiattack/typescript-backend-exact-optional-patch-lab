import type { ProfilePatch } from "../src/profile-patch.js";

// @ts-expect-error exactOptionalPropertyTypes有効時、optional propertyへのundefined代入は許可されない。
const invalidPatch: ProfilePatch = { nickname: undefined };

void invalidPatch;
