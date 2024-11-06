"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BackgroundStyle = exports.BackgroundClass = void 0;
var _parchment = require("parchment");
var _color = require("./color");
const BackgroundClass = exports.BackgroundClass = new _parchment.ClassAttributor('background', 'ql-bg', {
  scope: _parchment.Scope.INLINE
});
const BackgroundStyle = exports.BackgroundStyle = new _color.ColorAttributor('background', 'background-color', {
  scope: _parchment.Scope.INLINE
});
//# sourceMappingURL=background.js.map