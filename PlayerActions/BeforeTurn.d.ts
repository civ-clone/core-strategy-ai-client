import Player from '@civ-clone/core-player/Player';
import PlayerAction from '@civ-clone/core-player/PlayerAction';
/**
 * Offered once at the start of each turn by `StrategyAIClient`, to every `Strategy` that handles it
 * (`StrategyRegistry.attemptAll`), before any of the player's actions. The value is the player.
 */
export declare class BeforeTurn extends PlayerAction<Player> {}
export default BeforeTurn;
