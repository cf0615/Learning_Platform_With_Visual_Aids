"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.BubbleTooltip = void 0;
var _lodashEs = require("lodash-es");
var _emitter = _interopRequireDefault(require("../core/emitter"));
var _base = _interopRequireWildcard(require("./base"));
var _selection = require("../core/selection");
var _icons = _interopRequireDefault(require("../ui/icons"));
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && Object.prototype.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const TOOLBAR_CONFIG = [['bold', 'italic', 'link'], [{
  header: 1
}, {
  header: 2
}, 'blockquote']];
class BubbleTooltip extends _base.BaseTooltip {
  static TEMPLATE = ['<span class="ql-tooltip-arrow"></span>', '<div class="ql-tooltip-editor">', '<input type="text" data-formula="e=mc^2" data-link="https://quilljs.com" data-video="Embed URL">', '<a class="ql-close"></a>', '</div>'].join('');
  constructor(quill, bounds) {
    super(quill, bounds);
    this.quill.on(_emitter.default.events.EDITOR_CHANGE, (type, range, oldRange, source) => {
      if (type !== _emitter.default.events.SELECTION_CHANGE) return;
      if (range != null && range.length > 0 && source === _emitter.default.sources.USER) {
        this.show();
        // Lock our width so we will expand beyond our offsetParent boundaries
        this.root.style.left = '0px';
        this.root.style.width = '';
        this.root.style.width = `${this.root.offsetWidth}px`;
        const lines = this.quill.getLines(range.index, range.length);
        if (lines.length === 1) {
          const bounds = this.quill.getBounds(range);
          if (bounds != null) {
            this.position(bounds);
          }
        } else {
          const lastLine = lines[lines.length - 1];
          const index = this.quill.getIndex(lastLine);
          const length = Math.min(lastLine.length() - 1, range.index + range.length - index);
          const indexBounds = this.quill.getBounds(new _selection.Range(index, length));
          if (indexBounds != null) {
            this.position(indexBounds);
          }
        }
      } else if (document.activeElement !== this.textbox && this.quill.hasFocus()) {
        this.hide();
      }
    });
  }
  listen() {
    super.listen();
    // @ts-expect-error Fix me later
    this.root.querySelector('.ql-close').addEventListener('click', () => {
      this.root.classList.remove('ql-editing');
    });
    this.quill.on(_emitter.default.events.SCROLL_OPTIMIZE, () => {
      // Let selection be restored by toolbar handlers before repositioning
      setTimeout(() => {
        if (this.root.classList.contains('ql-hidden')) return;
        const range = this.quill.getSelection();
        if (range != null) {
          const bounds = this.quill.getBounds(range);
          if (bounds != null) {
            this.position(bounds);
          }
        }
      }, 1);
    });
  }
  cancel() {
    this.show();
  }
  position(reference) {
    const shift = super.position(reference);
    const arrow = this.root.querySelector('.ql-tooltip-arrow');
    // @ts-expect-error
    arrow.style.marginLeft = '';
    if (shift !== 0) {
      // @ts-expect-error
      arrow.style.marginLeft = `${-1 * shift - arrow.offsetWidth / 2}px`;
    }
    return shift;
  }
}
exports.BubbleTooltip = BubbleTooltip;
class BubbleTheme extends _base.default {
  constructor(quill, options) {
    if (options.modules.toolbar != null && options.modules.toolbar.container == null) {
      options.modules.toolbar.container = TOOLBAR_CONFIG;
    }
    super(quill, options);
    this.quill.container.classList.add('ql-bubble');
  }
  extendToolbar(toolbar) {
    // @ts-expect-error
    this.tooltip = new BubbleTooltip(this.quill, this.options.bounds);
    if (toolbar.container != null) {
      this.tooltip.root.appendChild(toolbar.container);
      this.buildButtons(toolbar.container.querySelectorAll('button'), _icons.default);
      this.buildPickers(toolbar.container.querySelectorAll('select'), _icons.default);
    }
  }
}
exports.default = BubbleTheme;
BubbleTheme.DEFAULTS = (0, _lodashEs.merge)({}, _base.default.DEFAULTS, {
  modules: {
    toolbar: {
      handlers: {
        link(value) {
          if (!value) {
            this.quill.format('link', false);
          } else {
            this.quill.theme.tooltip.edit();
          }
        }
      }
    }
  }
});
//# sourceMappingURL=bubble.js.map