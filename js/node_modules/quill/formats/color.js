"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ColorStyle = exports.ColorClass = exports.ColorAttributor = void 0;
var _parchment = require("parchment");
class ColorAttributor extends _parchment.StyleAttributor {
  value(domNode) {
    let value = super.value(domNode);
    if (!value.startsWith('rgb(')) return value;
    value = value.replace(/^[^\d]+/, '').replace(/[^\d]+$/, '');
    const hex = value.split(',').map(component => `00${parseInt(component, 10).toString(16)}`.slice(-2)).join('');
    return `#${hex}`;
  }
}
exports.ColorAttributor = ColorAttributor;
const ColorClass = exports.ColorClass = new _parchment.ClassAttributor('color', 'ql-color', {
  scope: _parchment.Scope.INLINE
});
const ColorStyle = exports.ColorStyle = new ColorAttributor('color', 'color', {
  scope: _parchment.Scope.INLINE
});
//# sourceMappingURL=color.js.map