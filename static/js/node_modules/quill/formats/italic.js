"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _bold = _interopRequireDefault(require("./bold"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
class Italic extends _bold.default {
  static blotName = 'italic';
  static tagName = ['EM', 'I'];
}
var _default = exports.default = Italic;
//# sourceMappingURL=italic.js.map