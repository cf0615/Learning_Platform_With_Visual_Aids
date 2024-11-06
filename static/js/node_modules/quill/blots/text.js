"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
exports.escapeText = escapeText;
var _parchment = require("parchment");
class Text extends _parchment.TextBlot {}
exports.default = Text;
function escapeText(text) {
  return text.replace(/[&<>"']/g, s => {
    // https://lodash.com/docs#escape
    const entityMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return entityMap[s];
  });
}
//# sourceMappingURL=text.js.map