"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DirectionStyle = exports.DirectionClass = exports.DirectionAttribute = void 0;
var _parchment = require("parchment");
const config = {
  scope: _parchment.Scope.BLOCK,
  whitelist: ['rtl']
};
const DirectionAttribute = exports.DirectionAttribute = new _parchment.Attributor('direction', 'dir', config);
const DirectionClass = exports.DirectionClass = new _parchment.ClassAttributor('direction', 'ql-direction', config);
const DirectionStyle = exports.DirectionStyle = new _parchment.StyleAttributor('direction', 'direction', config);
//# sourceMappingURL=direction.js.map