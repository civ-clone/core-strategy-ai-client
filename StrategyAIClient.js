"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StrategyAIClient = void 0;
const AIClient_1 = require("@civ-clone/core-ai-client/AIClient");
const StrategyRegistry_1 = require("@civ-clone/core-strategy/StrategyRegistry");
const AfterTurn_1 = require("./PlayerActions/AfterTurn");
const BeforeTurn_1 = require("./PlayerActions/BeforeTurn");
const ChooseFromList_1 = require("./PlayerActions/ChooseFromList");
const Data_1 = require("./PlayerActions/ChooseFromList/Data");
const core_random_1 = require("@civ-clone/core-random");
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
class StrategyAIClient extends AIClient_1.AIClient {
    constructor(player, strategyRegistry = StrategyRegistry_1.instance, randomNumberGenerator = core_random_1.instance) {
        super(player, randomNumberGenerator);
        this._strategyRegistry = strategyRegistry;
    }
    /**
     * Offers the choice to the `Strategy`s as a `ChooseFromList` action, one at a time in the registry's order. A
     * `Strategy` answers by calling `choose` on the action's value and returning `true`; the first to do both wins, and
     * later `Strategy`s are not tried. A choice made by a `Strategy` that then returns `false` is discarded. If none
     * answers, the choice falls back to `Client`'s, a random pick.
     */
    async chooseFromList(meta) {
        const data = new Data_1.default(meta), action = new ChooseFromList_1.default(this.player(), data);
        // Not `registry.attempt`, which only says that *some* `Strategy` returned `true`: the choice must come from that
        // same `Strategy`.
        for (const strategy of this._strategyRegistry.ordered(action)) {
            data.reset();
            if ((await strategy.attempt(action)) && data.chosen()) {
                return data.value();
            }
        }
        return super.chooseFromList(meta);
    }
    async takeTurn() {
        try {
            const player = this.player();
            await this._strategyRegistry.attemptAll(new BeforeTurn_1.default(player, player));
            let actionCount = 0;
            // Each of `hasMandatoryActions` and `mandatoryAction` builds the player's actions afresh, which creates
            // `PlayerAction`s and so uses up `DataObject` ids. So each is called exactly once per action, and nothing else
            // here lists the player's actions.
            while (player.hasMandatoryActions()) {
                const action = player.mandatoryAction();
                if (actionCount++ > this.actionLimit()) {
                    await this.actionLimitReached(action);
                    break;
                }
                let handled;
                // Only a `Strategy`'s failure goes to `actionFailed`. A throw from the hooks above and below fails the turn, so
                // an `actionFailed` that carries on can't also carry on past the action limit.
                try {
                    handled = await this._strategyRegistry.attempt(action);
                }
                catch (error) {
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
            await this._strategyRegistry.attemptAll(new AfterTurn_1.default(player, player));
        }
        catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error(typeof error === 'string'
                ? error
                : `An unknown error occurred: ${error}`);
        }
    }
    /**
     * Called when a `Strategy` throws while handling `action`. Return `true` to carry on with the next action, `false`
     * to end the turn (`AfterTurn` still runs), or throw to fail the turn. By default the error is rethrown.
     *
     * Only failures of the `Strategy`s come here: a throw from `actionLimit`, `actionLimitReached` or `unhandledAction`
     * fails the turn.
     */
    actionFailed(action, error) {
        throw error;
    }
    /**
     * How many actions a turn may offer before `actionLimitReached`: it is called for the next action once more than
     * this many have been offered.
     */
    actionLimit() {
        return 1000;
    }
    /**
     * Called with the action that would have exceeded `actionLimit`, which usually means a `Strategy` keeps returning
     * `true` without dealing with it. The turn then ends (`AfterTurn` still runs).
     */
    actionLimitReached(action) {
        console.warn(`StrategyAIClient: more than ${this.actionLimit()} actions this turn, ending it at '${action.id()}'.`);
    }
    strategyRegistry() {
        return this._strategyRegistry;
    }
    /**
     * Called with the first mandatory action no `Strategy` handled, just before the turn ends. Normally that is the
     * engine's end-turn action. Does nothing by default.
     */
    unhandledAction(action) { }
}
exports.StrategyAIClient = StrategyAIClient;
exports.default = StrategyAIClient;
//# sourceMappingURL=StrategyAIClient.js.map