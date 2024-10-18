"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _picker = _interopRequireDefault(require("./picker"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
class ColorPicker extends _picker.default {
  constructor(select, label) {
    super(select);
    this.label.innerHTML = label;
    this.container.classList.add('ql-color-picker');
    Array.from(this.container.querySelectorAll('.ql-picker-item')).slice(0, 7).forEach(item => {
      item.classList.add('ql-primary');
    });
  }
  buildItem(option) {
    const item = super.buildItem(option);
    item.style.backgroundColor = option.getAttribute('value') || '';
    return item;
  }
  selectItem(item, trigger) {
    super.selectItem(item, trigger);
    const colorLabel = this.label.querySelector('.ql-color-label');
    const value = item ? item.getAttribute('data-value') || '' : '';
    if (colorLabel) {
      if (colorLabel.tagName === 'line') {
        colorLabel.style.stroke = value;
      } else {
        colorLabel.style.fill = value;
      }
    }
  }
}
var _default = exports.default = ColorPicker;
//# sourceMappingURL=color-picker.js.map