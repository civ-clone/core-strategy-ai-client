import {
  LeaderRegistry,
  instance as leaderRegistryInstance,
} from '@civ-clone/core-civilization/LeaderRegistry';
import {
  StrategyRegistry,
  instance as strategyRegistryInstance,
} from '@civ-clone/core-strategy/StrategyRegistry';
import AIClient from '@civ-clone/core-ai-client/AIClient';
import Player from '@civ-clone/core-player/Player';
import PlayerAction from '@civ-clone/core-player/PlayerAction';
import UnhandledAction from './UnhandledAction';

const MAX_ACTIONS_PER_TURN = 3000;

export class StrategyAIClient extends AIClient {
  #strategyRegistry: StrategyRegistry;

  constructor(
    player: Player,
    leaderRegistry: LeaderRegistry = leaderRegistryInstance,
    strategyRegistry: StrategyRegistry = strategyRegistryInstance
  ) {
    super(player, leaderRegistry);

    this.#strategyRegistry = strategyRegistry;
  }

  attempt(action: PlayerAction): boolean {
    return this.#strategyRegistry.attempt(action);
  }

  async takeTurn(): Promise<void> {
    // TODO: check if we need this _and_ the `handled` check.
    let loopCheck = 0;

    while (this.player().hasMandatoryActions()) {
      const action = this.player().mandatoryAction();

      if (loopCheck++ > MAX_ACTIONS_PER_TURN) {
        throw new UnhandledAction(
          `Loop detected on '${Object.toString.call(
            action
          )}' (${Object.toString.call(action.value())})`
        );
      }

      if (!(await this.attempt(action))) {
        throw new UnhandledAction(
          `No handler succeeded for '${Object.toString.call(
            action
          )}' (${Object.toString.call(action.value())})`
        );
      }
    }
  }
}

export default StrategyAIClient;
