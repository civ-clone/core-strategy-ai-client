# core-strategy-ai-client

A simple[1] AI[2] client, that makes use of `Strategy`s to be an extensible opponent client.

The aims behind `core-strategy` are to continue to have a system that can be tweaked as needed, e.g. when adding
religion to the game, you'd need to handle those events, and instead of modifying the core with optional extensions,
embracing the plugin mechanism to add a plugin pack that includes the relevant `Strategy`s.

[1]: "Simple". It's not intended to be complex, but inevitably could end up so.
[2]: CPU player? It's not ML-based... Yet?
