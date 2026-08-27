# AI agent tool sets

Every tool the assistant can call belongs to exactly one **tool set**, and
every AI agent endpoint requests exactly one tool set by name. There is no
"give me everything" option — see `tool-set.registry.ts`.

```
endpoint            --> ToolSetName ("marketplace-assistant", ...)
                             |
                             v
                    tool-set.registry.ts  --> resolveToolSet(name, deps)
                             |
                             v
              registered builder (e.g. marketplace.tools.ts)
                             |
                             v
              tools, checked against that set's ownedToolNames
```

## Why

`AiAgentService.chat` used to call `buildMarketplaceTools` unconditionally,
so any tool added to that file — or to a new tools file someone forgot to
gate — was implicitly reachable from every caller, including
`AiAgentController.chat`, a plain authenticated-user endpoint. As
write-capable or admin-only tool sets are added (creator co-pilot,
moderation, trading — see below), a mistake in that spot stops being "an
extra read-only NFT lookup" and starts being "a user-facing chat endpoint
that can flag content or draft a listing on someone else's behalf."

## How a tool set is declared

1. A tools file (e.g. `marketplace.tools.ts`) exports a builder function and
   the exact list of tool names it's allowed to return.
2. `tool-set.registry.ts` calls `registerToolSet(name, builder, ownedToolNames)`
   once, at module load, for that tools file.
3. Callers get tools only through `resolveToolSet(name, deps)`, which calls
   the registered builder and then verifies every tool it returned is in
   `ownedToolNames`. A builder that starts returning a tool it didn't
   declare — a rename, a copy-pasted tool from another set, anything —
   makes `resolveToolSet` throw instead of silently widening what that
   tool set exposes.

`AiAgentService.chat(userId, toolSet, message, history)` (and
`chatStream`) take `toolSet: ToolSetName` as a required parameter — there
is no default, so a new endpoint-specific method cannot forget to pick one.

## Tool set → endpoint mapping

| Tool set               | Endpoint(s)                              | Access      | Capability   | Status      |
| ----------------------- | ---------------------------------------- | ----------- | ------------ | ----------- |
| `marketplace-assistant` | `POST /ai/chat`, `POST /ai/chat/stream`  | Any authenticated user | Read-only    | Implemented (`marketplace.tools.ts`) |
| `creator-copilot`       | *Planned:* `POST /ai/copilot/draft-listing` | NFT creator/owner | Write-capable (drafts a listing on the caller's own NFT) | Not yet implemented |
| `moderation`            | *Planned:* moderation review endpoints   | Admin/moderator only | Write-capable (e.g. `flag_content`) | Not yet implemented |
| `trading`               | *Planned:* trading-proposal endpoints    | Any authenticated user, scoped to their own orders | Write-capable (proposes trades) | Not yet implemented |

`marketplace-assistant` is the only tool set with a registered builder
today; requesting any other name from `resolveToolSet` throws until its
tools file registers one. When one of the planned sets is implemented,
add its entry to this table in the same PR.

## Adding a new tool set

1. Create `<name>.tools.ts` next to `marketplace.tools.ts`, following the
   same shape: a `build<Name>Tools(deps)` function plus an exported
   `<NAME>_TOOL_NAMES` array kept in sync with the `name` on every tool it
   builds.
2. Register it in `tool-set.registry.ts`:
   `registerToolSet('your-set-name', buildYourTools, YOUR_TOOL_NAMES)`.
3. Add a row to the table above.
4. Have the new endpoint call `chat`/`chatStream` (or a new
   endpoint-specific method) with that exact `ToolSetName` — never reuse
   `'marketplace-assistant'` for a different endpoint's capability.
5. Add or extend the tests in `tool-set.registry.spec.ts` covering the new
   set's ownership boundary.
