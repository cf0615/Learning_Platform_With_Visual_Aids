"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SizeStyle = exports.SizeClass = void 0;
var _parchment = require("parchment");
const SizeClass = exports.SizeClass = new _parchment.ClassAttributor('size', 'ql-size', {
  scope: _parchment.Scope.INLINE,
  whitelist: ['small', 'large', 'huge']
});
const SizeStyle = exports.SizeStyle = new _parchment.StyleAttributor('size', 'font-size', {
  scope: _parchment.Scope.INLINE,
  whitelist: ['10px', '18px', '32px']
});
//# sourceMappingURL=size.js.map