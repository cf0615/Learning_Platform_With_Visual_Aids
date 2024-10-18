"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _block = _interopRequireDefault(require("../blots/block"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
class Header extends _block.default {
  static blotName = 'header';
  static tagName = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'];
  static formats(domNode) {
    return this.tagName.indexOf(domNode.tagName) + 1;
  }
}
var _default = exports.default = Header;
//# sourceMappingURL=header.js.map