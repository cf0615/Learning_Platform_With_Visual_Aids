"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _quillDelta = _interopRequireDefault(require("quill-delta"));
var _module = _interopRequireDefault(require("../core/module"));
var _quill = _interopRequireDefault(require("../core/quill"));
var _keyboard = require("./keyboard");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const INSERT_TYPES = ['insertText', 'insertReplacementText'];
class Input extends _module.default {
  constructor(quill, options) {
    super(quill, options);
    quill.root.addEventListener('beforeinput', event => {
      this.handleBeforeInput(event);
    });

    // Gboard with English input on Android triggers `compositionstart` sometimes even
    // users are not going to type anything.
    if (!/Android/i.test(navigator.userAgent)) {
      quill.on(_quill.default.events.COMPOSITION_BEFORE_START, () => {
        this.handleCompositionStart();
      });
    }
  }
  deleteRange(range) {
    (0, _keyboard.deleteRange)({
      range,
      quill: this.quill
    });
  }
  replaceText(range) {
    let text = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
    if (range.length === 0) return false;
    if (text) {
      // Follow the native behavior that inherits the formats of the first character
      const formats = this.quill.getFormat(range.index, 1);
      this.deleteRange(range);
      this.quill.updateContents(new _quillDelta.default().retain(range.index).insert(text, formats), _quill.default.sources.USER);
    } else {
      this.deleteRange(range);
    }
    this.quill.setSelection(range.index + text.length, 0, _quill.default.sources.SILENT);
    return true;
  }
  handleBeforeInput(event) {
    if (this.quill.composition.isComposing || event.defaultPrevented || !INSERT_TYPES.includes(event.inputType)) {
      return;
    }
    const staticRange = event.getTargetRanges ? event.getTargetRanges()[0] : null;
    if (!staticRange || staticRange.collapsed === true) {
      return;
    }
    const text = getPlainTextFromInputEvent(event);
    if (text == null) {
      return;
    }
    const normalized = this.quill.selection.normalizeNative(staticRange);
    const range = normalized ? this.quill.selection.normalizedToRange(normalized) : null;
    if (range && this.replaceText(range, text)) {
      event.preventDefault();
    }
  }
  handleCompositionStart() {
    const range = this.quill.getSelection();
    if (range) {
      this.replaceText(range);
    }
  }
}
function getPlainTextFromInputEvent(event) {
  // When `inputType` is "insertText":
  // - `event.data` should be string (Safari uses `event.dataTransfer`).
  // - `event.dataTransfer` should be null.
  // When `inputType` is "insertReplacementText":
  // - `event.data` should be null.
  // - `event.dataTransfer` should contain "text/plain" data.

  if (typeof event.data === 'string') {
    return event.data;
  }
  if (event.dataTransfer?.types.includes('text/plain')) {
    return event.dataTransfer.getData('text/plain');
  }
  return null;
}
var _default = exports.default = Input;
//# sourceMappingURL=input.js.map