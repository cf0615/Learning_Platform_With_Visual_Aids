"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _picker = _interopRequireDefault(require("./picker"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
class IconPicker extends _picker.default {
  constructor(select, icons) {
    super(select);
    this.container.classList.add('ql-icon-picker');
    Array.from(this.container.querySelectorAll('.ql-picker-item')).forEach(item => {
      item.innerHTML = icons[item.getAttribute('data-value') || ''];
    });
    this.defaultItem = this.container.querySelector('.ql-selected');
    this.selectItem(this.defaultItem);
  }
  selectItem(target, trigger) {
    super.selectItem(target, trigger);
    const item = target || this.defaultItem;
    if (item != null) {
      if (this.label.innerHTML === item.innerHTML) return;
      this.label.innerHTML = item.innerHTML;
    }
  }
}
var _default = exports.default = IconPicker;
//# sourceMappingURL=icon-picker.js.map