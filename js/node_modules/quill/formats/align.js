"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AlignStyle = exports.AlignClass = exports.AlignAttribute = void 0;
var _parchment = require("parchment");
const config = {
  scope: _parchment.Scope.BLOCK,
  whitelist: ['right', 'center', 'justify']
};
const AlignAttribute = exports.AlignAttribute = new _parchment.Attributor('align', 'align', config);
const AlignClass = exports.AlignClass = new _parchment.ClassAttributor('align', 'ql-align', config);
const AlignStyle = exports.AlignStyle = new _parchment.StyleAttributor('align', 'text-align', config);
//# sourceMappingURL=align.js.map