import { LeaderRegistry } from '@civ-clone/core-civilization/LeaderRegistry';
import { StrategyRegistry } from '@civ-clone/core-strategy/StrategyRegistry';
import AIClient from '@civ-clone/core-ai-client/AIClient';
import Player from '@civ-clone/core-player/Player';
import PlayerAction from '@civ-clone/core-player/PlayerAction';
export declare class StrategyAIClient extends AIClient {
  #private;
  constructor(
    player: Player,
    leaderRegistry?: LeaderRegistry,
    strategyRegistry?: StrategyRegistry
  );
  attempt(action: PlayerAction): boolean;
  takeTurn(): Promise<void>;
}
export default StrategyAIClient;
