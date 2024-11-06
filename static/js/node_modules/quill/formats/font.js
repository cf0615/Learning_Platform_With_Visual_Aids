"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FontStyle = exports.FontClass = void 0;
var _parchment = require("parchment");
const config = {
  scope: _parchment.Scope.INLINE,
  whitelist: ['serif', 'monospace']
};
const FontClass = exports.FontClass = new _parchment.ClassAttributor('font', 'ql-font', config);
class FontStyleAttributor extends _parchment.StyleAttributor {
  value(node) {
    return super.value(node).replace(/["']/g, '');
  }
}
const FontStyle = exports.FontStyle = new FontStyleAttributor('font', 'font-family', config);
//# sourceMappingURL=font.js.map