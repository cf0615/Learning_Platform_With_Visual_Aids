"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
exports.sanitize = sanitize;
var _inline = _interopRequireDefault(require("../blots/inline"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
class Link extends _inline.default {
  static blotName = 'link';
  static tagName = 'A';
  static SANITIZED_URL = 'about:blank';
  static PROTOCOL_WHITELIST = ['http', 'https', 'mailto', 'tel', 'sms'];
  static create(value) {
    const node = super.create(value);
    node.setAttribute('href', this.sanitize(value));
    node.setAttribute('rel', 'noopener noreferrer');
    node.setAttribute('target', '_blank');
    return node;
  }
  static formats(domNode) {
    return domNode.getAttribute('href');
  }
  static sanitize(url) {
    return sanitize(url, this.PROTOCOL_WHITELIST) ? url : this.SANITIZED_URL;
  }
  format(name, value) {
    if (name !== this.statics.blotName || !value) {
      super.format(name, value);
    } else {
      // @ts-expect-error
      this.domNode.setAttribute('href', this.constructor.sanitize(value));
    }
  }
}
exports.default = Link;
function sanitize(url, protocols) {
  const anchor = document.createElement('a');
  anchor.href = url;
  const protocol = anchor.href.slice(0, anchor.href.indexOf(':'));
  return protocols.indexOf(protocol) > -1;
}
//# sourceMappingURL=link.js.map