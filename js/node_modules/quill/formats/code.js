"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.CodeBlockContainer = exports.Code = void 0;
var _block = _interopRequireDefault(require("../blots/block"));
var _break = _interopRequireDefault(require("../blots/break"));
var _cursor = _interopRequireDefault(require("../blots/cursor"));
var _inline = _interopRequireDefault(require("../blots/inline"));
var _text = _interopRequireWildcard(require("../blots/text"));
var _container = _interopRequireDefault(require("../blots/container"));
var _quill = _interopRequireDefault(require("../core/quill"));
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && Object.prototype.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
class CodeBlockContainer extends _container.default {
  static create(value) {
    const domNode = super.create(value);
    domNode.setAttribute('spellcheck', 'false');
    return domNode;
  }
  code(index, length) {
    return this.children
    // @ts-expect-error
    .map(child => child.length() <= 1 ? '' : child.domNode.innerText).join('\n').slice(index, index + length);
  }
  html(index, length) {
    // `\n`s are needed in order to support empty lines at the beginning and the end.
    // https://html.spec.whatwg.org/multipage/syntax.html#element-restrictions
    return `<pre>\n${(0, _text.escapeText)(this.code(index, length))}\n</pre>`;
  }
}
exports.CodeBlockContainer = CodeBlockContainer;
class CodeBlock extends _block.default {
  static TAB = '  ';
  static register() {
    _quill.default.register(CodeBlockContainer);
  }
}
exports.default = CodeBlock;
class Code extends _inline.default {}
exports.Code = Code;
Code.blotName = 'code';
Code.tagName = 'CODE';
CodeBlock.blotName = 'code-block';
CodeBlock.className = 'ql-code-block';
CodeBlock.tagName = 'DIV';
CodeBlockContainer.blotName = 'code-block-container';
CodeBlockContainer.className = 'ql-code-block-container';
CodeBlockContainer.tagName = 'DIV';
CodeBlockContainer.allowedChildren = [CodeBlock];
CodeBlock.allowedChildren = [_text.default, _break.default, _cursor.default];
CodeBlock.requiredContainer = CodeBlockContainer;
//# sourceMappingURL=code.js.map