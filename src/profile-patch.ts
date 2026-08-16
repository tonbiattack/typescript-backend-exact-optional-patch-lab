export interface ProfilePatch {
  nickname?: string;
}

export function mapFormToPatch(form: { nickname?: string }): ProfilePatch {
  return form.nickname === undefined ? {} : { nickname: form.nickname };
}

export function applyPatch(patch: ProfilePatch): "NO_CHANGE" | "CLEARED" | `SET:${string}` {
  if ("nickname" in patch) {
    return patch.nickname === undefined ? "CLEARED" : `SET:${patch.nickname}`;
  }

  return "NO_CHANGE";
}

