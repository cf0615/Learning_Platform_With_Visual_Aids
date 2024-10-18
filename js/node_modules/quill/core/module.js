"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
class Module {
  static DEFAULTS = {};
  constructor(quill) {
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    this.quill = quill;
    this.options = options;
  }
}
var _default = exports.default = Module;
//# sourceMappingURL=module.js.map