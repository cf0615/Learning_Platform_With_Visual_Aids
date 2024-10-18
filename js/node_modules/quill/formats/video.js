"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _block = require("../blots/block");
var _link = _interopRequireDefault(require("./link"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const ATTRIBUTES = ['height', 'width'];
class Video extends _block.BlockEmbed {
  static blotName = 'video';
  static className = 'ql-video';
  static tagName = 'IFRAME';
  static create(value) {
    const node = super.create(value);
    node.setAttribute('frameborder', '0');
    node.setAttribute('allowfullscreen', 'true');
    node.setAttribute('src', this.sanitize(value));
    return node;
  }
  static formats(domNode) {
    return ATTRIBUTES.reduce((formats, attribute) => {
      if (domNode.hasAttribute(attribute)) {
        formats[attribute] = domNode.getAttribute(attribute);
      }
      return formats;
    }, {});
  }
  static sanitize(url) {
    return _link.default.sanitize(url);
  }
  static value(domNode) {
    return domNode.getAttribute('src');
  }
  format(name, value) {
    if (ATTRIBUTES.indexOf(name) > -1) {
      if (value) {
        this.domNode.setAttribute(name, value);
      } else {
        this.domNode.removeAttribute(name);
      }
    } else {
      super.format(name, value);
    }
  }
  html() {
    const {
      video
    } = this.value();
    return `<a href="${video}">${video}</a>`;
  }
}
var _default = exports.default = Video;
//# sourceMappingURL=video.js.map