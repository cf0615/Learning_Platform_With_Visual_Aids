"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _inline = _interopRequireDefault(require("../blots/inline"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
class Script extends _inline.default {
  static blotName = 'script';
  static tagName = ['SUB', 'SUP'];
  static create(value) {
    if (value === 'super') {
      return document.createElement('sup');
    }
    if (value === 'sub') {
      return document.createElement('sub');
    }
    return super.create(value);
  }
  static formats(domNode) {
    if (domNode.tagName === 'SUB') return 'sub';
    if (domNode.tagName === 'SUP') return 'super';
    return undefined;
  }
}
var _default = exports.default = Script;
//# sourceMappingURL=script.js.map