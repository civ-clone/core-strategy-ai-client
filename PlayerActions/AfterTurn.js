"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AfterTurn = void 0;
const PlayerAction_1 = require("@civ-clone/core-player/PlayerAction");
/**
 * Offered once at the end of each turn by `StrategyAIClient`, to every `Strategy` that handles it
 * (`StrategyRegistry.attemptAll`), after the player's actions. The value is the player.
 */
class AfterTurn extends PlayerAction_1.default {
}
exports.AfterTurn = AfterTurn;
exports.default = AfterTurn;
//# sourceMappingURL=AfterTurn.js.map