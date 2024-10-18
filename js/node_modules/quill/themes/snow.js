"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _lodashEs = require("lodash-es");
var _emitter = _interopRequireDefault(require("../core/emitter"));
var _base = _interopRequireWildcard(require("./base"));
var _link = _interopRequireDefault(require("../formats/link"));
var _selection = require("../core/selection");
var _icons = _interopRequireDefault(require("../ui/icons"));
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && Object.prototype.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const TOOLBAR_CONFIG = [[{
  header: ['1', '2', '3', false]
}], ['bold', 'italic', 'underline', 'link'], [{
  list: 'ordered'
}, {
  list: 'bullet'
}], ['clean']];
class SnowTooltip extends _base.BaseTooltip {
  static TEMPLATE = ['<a class="ql-preview" rel="noopener noreferrer" target="_blank" href="about:blank"></a>', '<input type="text" data-formula="e=mc^2" data-link="https://quilljs.com" data-video="Embed URL">', '<a class="ql-action"></a>', '<a class="ql-remove"></a>'].join('');
  preview = this.root.querySelector('a.ql-preview');
  listen() {
    super.listen();
    // @ts-expect-error Fix me later
    this.root.querySelector('a.ql-action').addEventListener('click', event => {
      if (this.root.classList.contains('ql-editing')) {
        this.save();
      } else {
        // @ts-expect-error Fix me later
        this.edit('link', this.preview.textContent);
      }
      event.preventDefault();
    });
    // @ts-expect-error Fix me later
    this.root.querySelector('a.ql-remove').addEventListener('click', event => {
      if (this.linkRange != null) {
        const range = this.linkRange;
        this.restoreFocus();
        this.quill.formatText(range, 'link', false, _emitter.default.sources.USER);
        delete this.linkRange;
      }
      event.preventDefault();
      this.hide();
    });
    this.quill.on(_emitter.default.events.SELECTION_CHANGE, (range, oldRange, source) => {
      if (range == null) return;
      if (range.length === 0 && source === _emitter.default.sources.USER) {
        const [link, offset] = this.quill.scroll.descendant(_link.default, range.index);
        if (link != null) {
          this.linkRange = new _selection.Range(range.index - offset, link.length());
          const preview = _link.default.formats(link.domNode);
          // @ts-expect-error Fix me later
          this.preview.textContent = preview;
          // @ts-expect-error Fix me later
          this.preview.setAttribute('href', preview);
          this.show();
          const bounds = this.quill.getBounds(this.linkRange);
          if (bounds != null) {
            this.position(bounds);
          }
          return;
        }
      } else {
        delete this.linkRange;
      }
      this.hide();
    });
  }
  show() {
    super.show();
    this.root.removeAttribute('data-mode');
  }
}
class SnowTheme extends _base.default {
  constructor(quill, options) {
    if (options.modules.toolbar != null && options.modules.toolbar.container == null) {
      options.modules.toolbar.container = TOOLBAR_CONFIG;
    }
    super(quill, options);
    this.quill.container.classList.add('ql-snow');
  }
  extendToolbar(toolbar) {
    if (toolbar.container != null) {
      toolbar.container.classList.add('ql-snow');
      this.buildButtons(toolbar.container.querySelectorAll('button'), _icons.default);
      this.buildPickers(toolbar.container.querySelectorAll('select'), _icons.default);
      // @ts-expect-error
      this.tooltip = new SnowTooltip(this.quill, this.options.bounds);
      if (toolbar.container.querySelector('.ql-link')) {
        this.quill.keyboard.addBinding({
          key: 'k',
          shortKey: true
        }, (_range, context) => {
          toolbar.handlers.link.call(toolbar, !context.format.link);
        });
      }
    }
  }
}
SnowTheme.DEFAULTS = (0, _lodashEs.merge)({}, _base.default.DEFAULTS, {
  modules: {
    toolbar: {
      handlers: {
        link(value) {
          if (value) {
            const range = this.quill.getSelection();
            if (range == null || range.length === 0) return;
            let preview = this.quill.getText(range);
            if (/^\S+@\S+\.\S+$/.test(preview) && preview.indexOf('mailto:') !== 0) {
              preview = `mailto:${preview}`;
            }
            const {
              tooltip
            } = this.quill.theme;
            tooltip.edit('link', preview);
          } else {
            this.quill.format('link', false);
          }
        }
      }
    }
  }
});
var _default = exports.default = SnowTheme;
//# sourceMappingURL=snow.js.map