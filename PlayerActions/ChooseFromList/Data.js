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
var _Data_meta, _Data_value;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Data = void 0;
class Data {
    constructor(meta) {
        _Data_meta.set(this, void 0);
        _Data_value.set(this, void 0);
        __classPrivateFieldSet(this, _Data_meta, meta, "f");
    }
    choose(value) {
        __classPrivateFieldSet(this, _Data_value, value, "f");
    }
    meta() {
        return __classPrivateFieldGet(this, _Data_meta, "f");
    }
    value() {
        return __classPrivateFieldGet(this, _Data_value, "f");
    }
}
exports.Data = Data;
_Data_meta = new WeakMap(), _Data_value = new WeakMap();
exports.default = Data;
//# sourceMappingURL=Data.js.map