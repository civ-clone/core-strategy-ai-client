import { AIClient, IAIClient } from '@civ-clone/core-ai-client/AIClient';
import {
  ChoiceMeta,
  DataForChoiceMeta,
} from '@civ-clone/core-client/ChoiceMeta';
import { StrategyRegistry } from '@civ-clone/core-strategy/StrategyRegistry';
import Player from '@civ-clone/core-player/Player';
import PlayerAction from '@civ-clone/core-player/PlayerAction';
export interface IStrategyAIClient extends IAIClient {
  attempt(action: PlayerAction): boolean;
}
export declare class StrategyAIClient
  extends AIClient
  implements IStrategyAIClient
{
  #private;
  constructor(
    player: Player,
    strategyRegistry?: StrategyRegistry,
    randomNumberGenerator?: () => number
  );
  attempt(action: PlayerAction): boolean;
  chooseFromList<Name extends keyof ChoiceMetaDataMap>(
    meta: ChoiceMeta<Name>
  ): Promise<DataForChoiceMeta<ChoiceMeta<Name>>>;
  takeTurn(): Promise<void>;
}
export default StrategyAIClient;
