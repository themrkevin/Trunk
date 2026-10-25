# scripts/secrets.zsh — Trunk dev secrets loader
#
# Reads dev secrets from ONE macOS login Keychain item (Trunk.secret) holding
# a JSON object, and exports each key into the CURRENT shell's environment.
# This file is secrets-free and safe to commit: it only lists env var names.
#
# USAGE — must be SOURCED, not executed (exports die with a subshell):
#   source scripts/secrets.zsh
#
# PREFERRED — subshell-scoped so secrets never touch your interactive shell:
#   ( source scripts/secrets.zsh && npm run dev )
#   (source scripts/secrets.zsh && exec "$@") -- npm run dev   # from a zshrc fn
# Secrets then live only inside the command's process tree and vanish with it.
#
# PREREQUISITES — once per machine (requires jq: brew install jq):
#   keychain-set-json Trunk.secret        # helper from ~/.zshrc; paste minified JSON
#   {"GEMINI_API_KEY":"...","S3_ACCESS_KEY":"...","S3_SECRET":"..."}
# Rotate one key later with:  keychain-rotate Trunk.secret S3_ACCESS_KEY
#
# The item must live in the LOGIN keychain (the security CLI cannot read the
# iCloud keychain) and use account "$USER" (must match keychain-set-json).
#
# ADDING A SECRET — append one row to the table below, then:
#   keychain-rotate Trunk.secret NEW_ENV_VAR
# Table format: "ENV_VAR_NAME  json-key-in-blob" (names may differ — the env
# var name is what api/src/core/config.ts reads; the blob key is whatever you
# stored in the Trunk.secret JSON object).

if [[ "$ZSH_EVAL_CONTEXT" != *file* ]]; then
  print -u2 "error: this file must be sourced, not executed:  source scripts/secrets.zsh"
  return 1 2>/dev/null || exit 1
fi

() {
  emulate -L zsh

  local -r item="Trunk.secrets"
  local -ra secrets=(
    "GEMINI_API_KEY GEMINI_API_KEY"
    "S3_ACCESS_KEY  S3_ACCESS_KEY"
    "S3_SECRET      S3_SECRET"
  )

  local blob pair var jkey value
  local -a loaded=()

  blob="$(security find-generic-password -s "$item" -a "$USER" -w 2>/dev/null)" || {
    print -u2 "missing keychain item: $item  (fix: keychain-set-json $item)"
    return 1
  }

  for pair in "${secrets[@]}"; do
    var="${pair%% *}"
    jkey="${pair##* }"
    value="$(print -r -- "$blob" | jq -r --arg k "$jkey" '.[$k] // empty' 2>/dev/null)"
    if [[ -n "$value" ]]; then
      export "$var=$value"
      loaded+=("$var")
    else
      print -u2 "$item: key missing/empty: $jkey  (fix: keychain-rotate $item $jkey)"
      return 1
    fi
  done

  print "trunk secrets loaded: ${loaded[*]}"
}
