import { AIClient, IAIClient } from '@civ-clone/core-ai-client/AIClient';
import {
  ChoiceMeta,
  DataForChoiceMeta,
} from '@civ-clone/core-client/ChoiceMeta';
import { StrategyRegistry } from '@civ-clone/core-strategy/StrategyRegistry';
import MandatoryPlayerAction from '@civ-clone/core-player/MandatoryPlayerAction';
import Player from '@civ-clone/core-player/Player';
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
export declare class StrategyAIClient
  extends AIClient
  implements IStrategyAIClient
{
  private _strategyRegistry;
  constructor(
    player: Player,
    strategyRegistry?: StrategyRegistry,
    randomNumberGenerator?: () => number
  );
  /**
   * Offers the choice to the `Strategy`s as a `ChooseFromList` action, one at a time in the registry's order. A
   * `Strategy` answers by calling `choose` on the action's value and returning `true`; the first to do both wins, and
   * later `Strategy`s are not tried. A choice made by a `Strategy` that then returns `false` is discarded. If none
   * answers, the choice falls back to `Client`'s, a random pick.
   */
  chooseFromList<Name extends keyof ChoiceMetaDataMap>(
    meta: ChoiceMeta<Name>
  ): Promise<DataForChoiceMeta<ChoiceMeta<Name>>>;
  takeTurn(): Promise<void>;
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
  ): boolean | Promise<boolean>;
  /**
   * How many actions a turn may offer before `actionLimitReached`: it is called for the next action once more than
   * this many have been offered.
   */
  protected actionLimit(): number;
  /**
   * Called with the action that would have exceeded `actionLimit`, which usually means a `Strategy` keeps returning
   * `true` without dealing with it. The turn then ends (`AfterTurn` still runs).
   */
  protected actionLimitReached(
    action: MandatoryPlayerAction
  ): void | Promise<void>;
  protected strategyRegistry(): StrategyRegistry;
  /**
   * Called with the first mandatory action no `Strategy` handled, just before the turn ends. Normally that is the
   * engine's end-turn action. Does nothing by default.
   */
  protected unhandledAction(
    action: MandatoryPlayerAction
  ): void | Promise<void>;
}
export default StrategyAIClient;
