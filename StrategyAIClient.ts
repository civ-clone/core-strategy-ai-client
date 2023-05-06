import { AIClient, IAIClient } from '@civ-clone/core-ai-client/AIClient';
import {
  ChoiceMeta,
  DataForChoiceMeta,
} from '@civ-clone/core-client/ChoiceMeta';
import {
  StrategyRegistry,
  instance as strategyRegistryInstance,
} from '@civ-clone/core-strategy/StrategyRegistry';
import ChooseFromList from './PlayerActions/ChooseFromList';
import Data from './PlayerActions/ChooseFromList/Data';
import DataObject from '@civ-clone/core-data-object/DataObject';
import Player from '@civ-clone/core-player/Player';
import PlayerAction from '@civ-clone/core-player/PlayerAction';
import UnhandledAction from './UnhandledAction';

const MAX_ACTIONS_PER_TURN = 10_000;

export interface IStrategyAIClient extends IAIClient {
  attempt(action: PlayerAction): boolean;
}

export class StrategyAIClient extends AIClient implements IStrategyAIClient {
  #strategyRegistry: StrategyRegistry;

  constructor(
    player: Player,
    strategyRegistry: StrategyRegistry = strategyRegistryInstance,
    randomNumberGenerator: () => number = () => Math.random()
  ) {
    super(player, randomNumberGenerator);

    this.#strategyRegistry = strategyRegistry;
  }

  attempt(action: PlayerAction): boolean {
    return this.#strategyRegistry.attempt(action);
  }

  async chooseFromList<Name extends keyof ChoiceMetaDataMap>(
    meta: ChoiceMeta<Name>
  ): Promise<DataForChoiceMeta<ChoiceMeta<Name>>> {
    const data = new Data<Name>(meta);

    try {
      if (this.attempt(new ChooseFromList(this.player(), data))) {
        return data.value()!;
      }
    } catch (e) {
      if (!(e instanceof UnhandledAction)) {
        throw e;
      }

      console.warn(e);
    }

    return super.chooseFromList(meta);
  }

  async takeTurn(): Promise<void> {
    // TODO: check if we need this _and_ the `handled` check.
    let loopCheck = 0;

    while (this.player().hasMandatoryActions()) {
      const action = this.player().mandatoryAction();

      if (loopCheck++ > MAX_ACTIONS_PER_TURN) {
        throw new UnhandledAction(
          `Loop detected on '${
            action instanceof DataObject ? action.id() : action
          }' (${
            action.value() instanceof DataObject
              ? action.value().id()
              : action.value()
          })`
        );
      }

      if (!(await this.attempt(action))) {
        throw new UnhandledAction(
          `No handler succeeded for '${
            action instanceof DataObject ? action.id() : action
          }' (${
            action.value() instanceof DataObject
              ? action.value().id()
              : action.value()
          })`
        );
      }
    }

    // We don't need to worry about unhandled actions here as they won't be mandatory...
    await Promise.all(
      this.player()
        .actions()
        .map((action) => this.attempt(action))
    );

    // ...but they could result in some mandatory `Action`s, so lets check and re-run...
    if (this.player().hasMandatoryActions()) {
      await this.takeTurn();
    }
  }
}

export default StrategyAIClient;
