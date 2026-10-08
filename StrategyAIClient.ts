import { AIClient, IAIClient } from '@civ-clone/core-ai-client/AIClient';
import {
  ChoiceMeta,
  DataForChoiceMeta,
} from '@civ-clone/core-client/ChoiceMeta';
import {
  StrategyRegistry,
  instance as strategyRegistryInstance,
} from '@civ-clone/core-strategy/StrategyRegistry';
import AfterTurn from './PlayerActions/AfterTurn';
import BeforeTurn from './PlayerActions/BeforeTurn';
import ChooseFromList from './PlayerActions/ChooseFromList';
import Data from './PlayerActions/ChooseFromList/Data';
import MandatoryPlayerAction from '@civ-clone/core-player/MandatoryPlayerAction';
import Player from '@civ-clone/core-player/Player';
import { instance as rngInstance } from '@civ-clone/core-random';

export interface IStrategyAIClient extends IAIClient {}

/**
 * A computer player that knows nothing about any ruleset: every decision is offered to the `Strategy`s in the
 * `StrategyRegistry`, which plugins fill.
 *
 * A turn is:
 *
 * 1. `BeforeTurn`, offered to every `Strategy` that handles it.
 * 2. Each mandatory action in turn, offered until one `Strategy` handles it. The turn ends at the first action that
 *    nothing handles. That is how a turn normally ends: the engine offers its end-turn action once nothing else is
 *    mandatory, and no `Strategy` handles it.
 * 3. `AfterTurn`, offered to every `Strategy` that handles it.
 *
 * Non-mandatory actions are not offered.
 */
export class StrategyAIClient extends AIClient implements IStrategyAIClient {
  private _strategyRegistry: StrategyRegistry;

  constructor(
    player: Player,
    strategyRegistry: StrategyRegistry = strategyRegistryInstance,
    randomNumberGenerator: () => number = rngInstance
  ) {
    super(player, randomNumberGenerator);

    this._strategyRegistry = strategyRegistry;
  }

  /**
   * Offers the choice to the `Strategy`s as a `ChooseFromList` action, one at a time in the registry's order. A
   * `Strategy` answers by calling `choose` on the action's value and returning `true`; the first to do both wins, and
   * later `Strategy`s are not tried. A choice made by a `Strategy` that then returns `false` is discarded. If none
   * answers, the choice falls back to `Client`'s, a random pick.
   */
  async chooseFromList<Name extends keyof ChoiceMetaDataMap>(
    meta: ChoiceMeta<Name>
  ): Promise<DataForChoiceMeta<ChoiceMeta<Name>>> {
    const data = new Data<Name>(meta),
      action = new ChooseFromList(this.player(), data);

    // Not `registry.attempt`, which only says that *some* `Strategy` returned `true`: the choice must come from that
    // same `Strategy`.
    for (const strategy of this._strategyRegistry.ordered(action)) {
      data.reset();

      if ((await strategy.attempt(action)) && data.chosen()) {
        return data.value() as DataForChoiceMeta<ChoiceMeta<Name>>;
      }
    }

    return super.chooseFromList(meta);
  }

  async takeTurn(): Promise<void> {
    try {
      const player = this.player();

      await this._strategyRegistry.attemptAll(new BeforeTurn(player, player));

      let actionCount = 0;

      // `mandatoryAction` builds the player's actions, at least up to the first mandatory one, which creates
      // `PlayerAction`s and so uses up `DataObject` ids. So it is called exactly once per action, and nothing else here
      // lists the player's actions. `undefined` means there's nothing left to do.
      for (
        let action = player.mandatoryAction();
        action !== undefined;
        action = player.mandatoryAction()
      ) {
        if (actionCount++ > this.actionLimit()) {
          await this.actionLimitReached(action);

          break;
        }

        let handled: boolean;

        // Only a `Strategy`'s failure goes to `actionFailed`. A throw from the hooks above and below fails the turn, so
        // an `actionFailed` that carries on can't also carry on past the action limit.
        try {
          handled = await this._strategyRegistry.attempt(action);
        } catch (error) {
          if (await this.actionFailed(action, error)) {
            continue;
          }

          break;
        }

        if (!handled) {
          await this.unhandledAction(action);

          break;
        }
      }

      await this._strategyRegistry.attemptAll(new AfterTurn(player, player));
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }

      throw new Error(
        typeof error === 'string'
          ? error
          : `An unknown error occurred: ${error}`
      );
    }
  }

  /**
   * Called when a `Strategy` throws while handling `action`. Return `true` to carry on with the next action, `false`
   * to end the turn (`AfterTurn` still runs), or throw to fail the turn. By default the error is rethrown.
   *
   * Only failures of the `Strategy`s come here: a throw from `actionLimit`, `actionLimitReached` or `unhandledAction`
   * fails the turn.
   */
  protected actionFailed(
    action: MandatoryPlayerAction,
    error: unknown
  ): boolean | Promise<boolean> {
    throw error;
  }

  /**
   * How many actions a turn may offer before `actionLimitReached`: it is called for the next action once more than
   * this many have been offered.
   */
  protected actionLimit(): number {
    return 1000;
  }

  /**
   * Called with the action that would have exceeded `actionLimit`, which usually means a `Strategy` keeps returning
   * `true` without dealing with it. The turn then ends (`AfterTurn` still runs).
   */
  protected actionLimitReached(
    action: MandatoryPlayerAction
  ): void | Promise<void> {
    console.warn(
      `StrategyAIClient: more than ${this.actionLimit()} actions this turn, ending it at '${action.id()}'.`
    );
  }

  protected strategyRegistry(): StrategyRegistry {
    return this._strategyRegistry;
  }

  /**
   * Called with the first mandatory action no `Strategy` handled, just before the turn ends. Normally that is the
   * engine's end-turn action. Does nothing by default.
   */
  protected unhandledAction(
    action: MandatoryPlayerAction
  ): void | Promise<void> {}
}

export default StrategyAIClient;
