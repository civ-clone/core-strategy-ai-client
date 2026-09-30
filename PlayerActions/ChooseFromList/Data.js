"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Data = void 0;
class Data {
    constructor(meta) {
        this._chosen = false;
        this._meta = meta;
    }
    choose(value) {
        this._chosen = true;
        this._value = value;
    }
    /** Whether a `Strategy` has called `choose`. */
    chosen() {
        return this._chosen;
    }
    meta() {
        return this._meta;
    }
    /** Forgets any choice, so the next `Strategy` starts from nothing. */
    reset() {
        this._chosen = false;
        this._value = undefined;
    }
    value() {
        return this._value;
    }
}
exports.Data = Data;
exports.default = Data;
//# sourceMappingURL=Data.js.map