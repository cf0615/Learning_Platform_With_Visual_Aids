"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _parchment = require("parchment");
class Break extends _parchment.EmbedBlot {
  static value() {
    return undefined;
  }
  optimize() {
    if (this.prev || this.next) {
      this.remove();
    }
  }
  length() {
    return 0;
  }
  value() {
    return '';
  }
}
Break.blotName = 'break';
Break.tagName = 'BR';
var _default = exports.default = Break;
//# sourceMappingURL=break.js.map