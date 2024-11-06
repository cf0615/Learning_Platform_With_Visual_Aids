"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _embed = _interopRequireDefault(require("../blots/embed"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
class Formula extends _embed.default {
  static blotName = 'formula';
  static className = 'ql-formula';
  static tagName = 'SPAN';
  static create(value) {
    // @ts-expect-error
    if (window.katex == null) {
      throw new Error('Formula module requires KaTeX.');
    }
    const node = super.create(value);
    if (typeof value === 'string') {
      // @ts-expect-error
      window.katex.render(value, node, {
        throwOnError: false,
        errorColor: '#f00'
      });
      node.setAttribute('data-value', value);
    }
    return node;
  }
  static value(domNode) {
    return domNode.getAttribute('data-value');
  }
  html() {
    const {
      formula
    } = this.value();
    return `<span>${formula}</span>`;
  }
}
var _default = exports.default = Formula;
//# sourceMappingURL=formula.js.map