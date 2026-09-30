# core-strategy-ai-client

A simple[1] AI[2] client, that makes use of `Strategy`s to be an extensible opponent client.

The aims behind `core-strategy` are to continue to have a system that can be tweaked as needed, e.g. when adding
religion to the game, you'd need to handle those events, and instead of modifying the core with optional extensions,
embracing the plugin mechanism to add a plugin pack that includes the relevant `Strategy`s.

`StrategyAIClient` knows nothing about any ruleset. Each turn it:

1. offers a `BeforeTurn` action to every `Strategy` that handles it (`StrategyRegistry.attemptAll`);
2. takes the player's mandatory actions one at a time (`player.hasMandatoryActions()`, then
   `player.mandatoryAction()`) and offers each to the `StrategyRegistry` until one `Strategy` handles it. The turn ends
   at the first action nothing handles, which is normally the engine's end-turn action;
3. offers an `AfterTurn` action to every `Strategy` that handles it.

Each is awaited before the next, so a turn is deterministic. Non-mandatory actions are not offered.

`chooseFromList` is offered to the `Strategy`s as a `ChooseFromList` action: a `Strategy` calls `choose()` on its value
and returns `true`. If none does, the client picks at random, as `Client` does.

A subclass can override these hooks:

- `unhandledAction(action)`: called with the action that ended the turn. Does nothing by default.
- `actionFailed(action, error)`: called when a `Strategy` throws. Return `true` to carry on with the next action, `false`
  to end the turn, or throw to fail it. Rethrows by default.
- `actionLimit()` and `actionLimitReached(action)`: a guard against a `Strategy` that keeps claiming an action without
  dealing with it. Once more than `actionLimit()` (1,000) actions have been offered, `actionLimitReached` is called
  and the turn ends.

See [core-strategy](https://github.com/civ-clone/core-strategy) for how to write a `Strategy`.

[1]: "Simple". It's not intended to be complex, but inevitably could end up so.
[2]: CPU player? It's not ML-based... Yet?
