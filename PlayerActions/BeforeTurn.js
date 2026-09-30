"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BeforeTurn = void 0;
const PlayerAction_1 = require("@civ-clone/core-player/PlayerAction");
/**
 * Offered once at the start of each turn by `StrategyAIClient`, to every `Strategy` that handles it
 * (`StrategyRegistry.attemptAll`), before any of the player's actions. The value is the player.
 */
class BeforeTurn extends PlayerAction_1.default {
}
exports.BeforeTurn = BeforeTurn;
exports.default = BeforeTurn;
//# sourceMappingURL=BeforeTurn.js.map