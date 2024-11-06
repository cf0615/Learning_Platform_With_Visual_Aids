"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _quillDelta = _interopRequireDefault(require("quill-delta"));
var _emitter = _interopRequireDefault(require("../core/emitter"));
var _module = _interopRequireDefault(require("../core/module"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
class Uploader extends _module.default {
  constructor(quill, options) {
    super(quill, options);
    quill.root.addEventListener('drop', e => {
      e.preventDefault();
      let native = null;
      if (document.caretRangeFromPoint) {
        native = document.caretRangeFromPoint(e.clientX, e.clientY);
        // @ts-expect-error
      } else if (document.caretPositionFromPoint) {
        // @ts-expect-error
        const position = document.caretPositionFromPoint(e.clientX, e.clientY);
        native = document.createRange();
        native.setStart(position.offsetNode, position.offset);
        native.setEnd(position.offsetNode, position.offset);
      }
      const normalized = native && quill.selection.normalizeNative(native);
      if (normalized) {
        const range = quill.selection.normalizedToRange(normalized);
        if (e.dataTransfer?.files) {
          this.upload(range, e.dataTransfer.files);
        }
      }
    });
  }
  upload(range, files) {
    const uploads = [];
    Array.from(files).forEach(file => {
      if (file && this.options.mimetypes?.includes(file.type)) {
        uploads.push(file);
      }
    });
    if (uploads.length > 0) {
      // @ts-expect-error Fix me later
      this.options.handler.call(this, range, uploads);
    }
  }
}
Uploader.DEFAULTS = {
  mimetypes: ['image/png', 'image/jpeg'],
  handler(range, files) {
    const promises = files.map(file => {
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => {
          // @ts-expect-error Fix me later
          resolve(e.target.result);
        };
        reader.readAsDataURL(file);
      });
    });
    Promise.all(promises).then(images => {
      const update = images.reduce((delta, image) => {
        return delta.insert({
          image
        });
      }, new _quillDelta.default().retain(range.index).delete(range.length));
      this.quill.updateContents(update, _emitter.default.sources.USER);
      this.quill.setSelection(range.index + images.length, _emitter.default.sources.SILENT);
    });
  }
};
var _default = exports.default = Uploader;
//# sourceMappingURL=uploader.js.map