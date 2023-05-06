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
const AIClient_1 = require("@civ-clone/core-ai-client/AIClient");
const StrategyRegistry_1 = require("@civ-clone/core-strategy/StrategyRegistry");
const ChooseFromList_1 = require("./PlayerActions/ChooseFromList");
const Data_1 = require("./PlayerActions/ChooseFromList/Data");
const DataObject_1 = require("@civ-clone/core-data-object/DataObject");
const UnhandledAction_1 = require("./UnhandledAction");
const MAX_ACTIONS_PER_TURN = 10000;
class StrategyAIClient extends AIClient_1.AIClient {
    constructor(player, strategyRegistry = StrategyRegistry_1.instance, randomNumberGenerator = () => Math.random()) {
        super(player, randomNumberGenerator);
        _StrategyAIClient_strategyRegistry.set(this, void 0);
        __classPrivateFieldSet(this, _StrategyAIClient_strategyRegistry, strategyRegistry, "f");
    }
    attempt(action) {
        return __classPrivateFieldGet(this, _StrategyAIClient_strategyRegistry, "f").attempt(action);
    }
    async chooseFromList(meta) {
        const data = new Data_1.default(meta);
        try {
            if (this.attempt(new ChooseFromList_1.default(this.player(), data))) {
                return data.value();
            }
        }
        catch (e) {
            if (!(e instanceof UnhandledAction_1.default)) {
                throw e;
            }
            console.warn(e);
        }
        return super.chooseFromList(meta);
    }
    async takeTurn() {
        // TODO: check if we need this _and_ the `handled` check.
        let loopCheck = 0;
        while (this.player().hasMandatoryActions()) {
            const action = this.player().mandatoryAction();
            if (loopCheck++ > MAX_ACTIONS_PER_TURN) {
                throw new UnhandledAction_1.default(`Loop detected on '${action instanceof DataObject_1.default ? action.id() : action}' (${action.value() instanceof DataObject_1.default
                    ? action.value().id()
                    : action.value()})`);
            }
            if (!(await this.attempt(action))) {
                throw new UnhandledAction_1.default(`No handler succeeded for '${action instanceof DataObject_1.default ? action.id() : action}' (${action.value() instanceof DataObject_1.default
                    ? action.value().id()
                    : action.value()})`);
            }
        }
        // We don't need to worry about unhandled actions here as they won't be mandatory...
        await Promise.all(this.player()
            .actions()
            .map((action) => this.attempt(action)));
        // ...but they could result in some mandatory `Action`s, so lets check and re-run...
        if (this.player().hasMandatoryActions()) {
            await this.takeTurn();
        }
    }
}
exports.StrategyAIClient = StrategyAIClient;
_StrategyAIClient_strategyRegistry = new WeakMap();
exports.default = StrategyAIClient;
//# sourceMappingURL=StrategyAIClient.js.map