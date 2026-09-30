import Player from '@civ-clone/core-player/Player';
import PlayerAction from '@civ-clone/core-player/PlayerAction';

/**
 * Offered once at the end of each turn by `StrategyAIClient`, to every `Strategy` that handles it
 * (`StrategyRegistry.attemptAll`), after the player's actions. The value is the player.
 */
export class AfterTurn extends PlayerAction<Player> {}

export default AfterTurn;
