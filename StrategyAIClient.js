"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _StrategyAIClient_strategyRegistry;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StrategyAIClient = void 0;
const LeaderRegistry_1 = require("@civ-clone/core-civilization/LeaderRegistry");
const StrategyRegistry_1 = require("@civ-clone/core-strategy/StrategyRegistry");
const AIClient_1 = require("@civ-clone/core-ai-client/AIClient");
const UnhandledAction_1 = require("./UnhandledAction");
const MAX_ACTIONS_PER_TURN = 3000;
class StrategyAIClient extends AIClient_1.default {
    constructor(player, leaderRegistry = LeaderRegistry_1.instance, strategyRegistry = StrategyRegistry_1.instance) {
        super(player, leaderRegistry);
        _StrategyAIClient_strategyRegistry.set(this, void 0);
        __classPrivateFieldSet(this, _StrategyAIClient_strategyRegistry, strategyRegistry, "f");
    }
    attempt(action) {
        return __classPrivateFieldGet(this, _StrategyAIClient_strategyRegistry, "f").attempt(action);
    }
    async takeTurn() {
        // TODO: check if we need this _and_ the `handled` check.
        let loopCheck = 0;
        while (this.player().hasMandatoryActions()) {
            const action = this.player().mandatoryAction();
            if (loopCheck++ > MAX_ACTIONS_PER_TURN) {
                throw new UnhandledAction_1.default(`Loop detected on '${Object.toString.call(action)}' (${Object.toString.call(action.value())})`);
            }
            if (!(await this.attempt(action))) {
                throw new UnhandledAction_1.default(`No handler succeeded for '${Object.toString.call(action)}' (${Object.toString.call(action.value())})`);
            }
        }
    }
}
exports.StrategyAIClient = StrategyAIClient;
_StrategyAIClient_strategyRegistry = new WeakMap();
exports.default = StrategyAIClient;
//# sourceMappingURL=StrategyAIClient.js.map