"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "AttributeMap", {
  enumerable: true,
  get: function () {
    return _quillDelta.AttributeMap;
  }
});
Object.defineProperty(exports, "Delta", {
  enumerable: true,
  get: function () {
    return _quillDelta.default;
  }
});
Object.defineProperty(exports, "Op", {
  enumerable: true,
  get: function () {
    return _quillDelta.Op;
  }
});
Object.defineProperty(exports, "OpIterator", {
  enumerable: true,
  get: function () {
    return _quillDelta.OpIterator;
  }
});
exports.default = void 0;
var _quill = _interopRequireDefault(require("./core/quill"));
var _block = _interopRequireWildcard(require("./blots/block"));
var _break = _interopRequireDefault(require("./blots/break"));
var _container = _interopRequireDefault(require("./blots/container"));
var _cursor = _interopRequireDefault(require("./blots/cursor"));
var _embed = _interopRequireDefault(require("./blots/embed"));
var _inline = _interopRequireDefault(require("./blots/inline"));
var _scroll = _interopRequireDefault(require("./blots/scroll"));
var _text = _interopRequireDefault(require("./blots/text"));
var _clipboard = _interopRequireDefault(require("./modules/clipboard"));
var _history = _interopRequireDefault(require("./modules/history"));
var _keyboard = _interopRequireDefault(require("./modules/keyboard"));
var _uploader = _interopRequireDefault(require("./modules/uploader"));
var _quillDelta = _interopRequireWildcard(require("quill-delta"));
var _input = _interopRequireDefault(require("./modules/input"));
var _uiNode = _interopRequireDefault(require("./modules/uiNode"));
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && Object.prototype.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
_quill.default.register({
  'blots/block': _block.default,
  'blots/block/embed': _block.BlockEmbed,
  'blots/break': _break.default,
  'blots/container': _container.default,
  'blots/cursor': _cursor.default,
  'blots/embed': _embed.default,
  'blots/inline': _inline.default,
  'blots/scroll': _scroll.default,
  'blots/text': _text.default,
  'modules/clipboard': _clipboard.default,
  'modules/history': _history.default,
  'modules/keyboard': _keyboard.default,
  'modules/uploader': _uploader.default,
  'modules/input': _input.default,
  'modules/uiNode': _uiNode.default
});
var _default = exports.default = _quill.default;
//# sourceMappingURL=core.js.map