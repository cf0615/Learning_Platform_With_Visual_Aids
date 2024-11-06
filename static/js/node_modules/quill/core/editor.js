"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _lodashEs = require("lodash-es");
var _parchment = require("parchment");
var _quillDelta = _interopRequireWildcard(require("quill-delta"));
var _block = _interopRequireWildcard(require("../blots/block"));
var _break = _interopRequireDefault(require("../blots/break"));
var _cursor = _interopRequireDefault(require("../blots/cursor"));
var _text = _interopRequireWildcard(require("../blots/text"));
var _selection = require("./selection");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && Object.prototype.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
const ASCII = /^[ -~]*$/;
class Editor {
  constructor(scroll) {
    this.scroll = scroll;
    this.delta = this.getDelta();
  }
  applyDelta(delta) {
    this.scroll.update();
    let scrollLength = this.scroll.length();
    this.scroll.batchStart();
    const normalizedDelta = normalizeDelta(delta);
    const deleteDelta = new _quillDelta.default();
    const normalizedOps = splitOpLines(normalizedDelta.ops.slice());
    normalizedOps.reduce((index, op) => {
      const length = _quillDelta.Op.length(op);
      let attributes = op.attributes || {};
      let isImplicitNewlinePrepended = false;
      let isImplicitNewlineAppended = false;
      if (op.insert != null) {
        deleteDelta.retain(length);
        if (typeof op.insert === 'string') {
          const text = op.insert;
          isImplicitNewlineAppended = !text.endsWith('\n') && (scrollLength <= index || !!this.scroll.descendant(_block.BlockEmbed, index)[0]);
          this.scroll.insertAt(index, text);
          const [line, offset] = this.scroll.line(index);
          let formats = (0, _lodashEs.merge)({}, (0, _block.bubbleFormats)(line));
          if (line instanceof _block.default) {
            const [leaf] = line.descendant(_parchment.LeafBlot, offset);
            if (leaf) {
              formats = (0, _lodashEs.merge)(formats, (0, _block.bubbleFormats)(leaf));
            }
          }
          attributes = _quillDelta.AttributeMap.diff(formats, attributes) || {};
        } else if (typeof op.insert === 'object') {
          const key = Object.keys(op.insert)[0]; // There should only be one key
          if (key == null) return index;
          const isInlineEmbed = this.scroll.query(key, _parchment.Scope.INLINE) != null;
          if (isInlineEmbed) {
            if (scrollLength <= index || !!this.scroll.descendant(_block.BlockEmbed, index)[0]) {
              isImplicitNewlineAppended = true;
            }
          } else if (index > 0) {
            const [leaf, offset] = this.scroll.descendant(_parchment.LeafBlot, index - 1);
            if (leaf instanceof _text.default) {
              const text = leaf.value();
              if (text[offset] !== '\n') {
                isImplicitNewlinePrepended = true;
              }
            } else if (leaf instanceof _parchment.EmbedBlot && leaf.statics.scope === _parchment.Scope.INLINE_BLOT) {
              isImplicitNewlinePrepended = true;
            }
          }
          this.scroll.insertAt(index, key, op.insert[key]);
          if (isInlineEmbed) {
            const [leaf] = this.scroll.descendant(_parchment.LeafBlot, index);
            if (leaf) {
              const formats = (0, _lodashEs.merge)({}, (0, _block.bubbleFormats)(leaf));
              attributes = _quillDelta.AttributeMap.diff(formats, attributes) || {};
            }
          }
        }
        scrollLength += length;
      } else {
        deleteDelta.push(op);
        if (op.retain !== null && typeof op.retain === 'object') {
          const key = Object.keys(op.retain)[0];
          if (key == null) return index;
          this.scroll.updateEmbedAt(index, key, op.retain[key]);
        }
      }
      Object.keys(attributes).forEach(name => {
        this.scroll.formatAt(index, length, name, attributes[name]);
      });
      const prependedLength = isImplicitNewlinePrepended ? 1 : 0;
      const addedLength = isImplicitNewlineAppended ? 1 : 0;
      scrollLength += prependedLength + addedLength;
      deleteDelta.retain(prependedLength);
      deleteDelta.delete(addedLength);
      return index + length + prependedLength + addedLength;
    }, 0);
    deleteDelta.reduce((index, op) => {
      if (typeof op.delete === 'number') {
        this.scroll.deleteAt(index, op.delete);
        return index;
      }
      return index + _quillDelta.Op.length(op);
    }, 0);
    this.scroll.batchEnd();
    this.scroll.optimize();
    return this.update(normalizedDelta);
  }
  deleteText(index, length) {
    this.scroll.deleteAt(index, length);
    return this.update(new _quillDelta.default().retain(index).delete(length));
  }
  formatLine(index, length) {
    let formats = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    this.scroll.update();
    Object.keys(formats).forEach(format => {
      this.scroll.lines(index, Math.max(length, 1)).forEach(line => {
        line.format(format, formats[format]);
      });
    });
    this.scroll.optimize();
    const delta = new _quillDelta.default().retain(index).retain(length, (0, _lodashEs.cloneDeep)(formats));
    return this.update(delta);
  }
  formatText(index, length) {
    let formats = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    Object.keys(formats).forEach(format => {
      this.scroll.formatAt(index, length, format, formats[format]);
    });
    const delta = new _quillDelta.default().retain(index).retain(length, (0, _lodashEs.cloneDeep)(formats));
    return this.update(delta);
  }
  getContents(index, length) {
    return this.delta.slice(index, index + length);
  }
  getDelta() {
    return this.scroll.lines().reduce((delta, line) => {
      return delta.concat(line.delta());
    }, new _quillDelta.default());
  }
  getFormat(index) {
    let length = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    let lines = [];
    let leaves = [];
    if (length === 0) {
      this.scroll.path(index).forEach(path => {
        const [blot] = path;
        if (blot instanceof _block.default) {
          lines.push(blot);
        } else if (blot instanceof _parchment.LeafBlot) {
          leaves.push(blot);
        }
      });
    } else {
      lines = this.scroll.lines(index, length);
      leaves = this.scroll.descendants(_parchment.LeafBlot, index, length);
    }
    const [lineFormats, leafFormats] = [lines, leaves].map(blots => {
      const blot = blots.shift();
      if (blot == null) return {};
      let formats = (0, _block.bubbleFormats)(blot);
      while (Object.keys(formats).length > 0) {
        const blot = blots.shift();
        if (blot == null) return formats;
        formats = combineFormats((0, _block.bubbleFormats)(blot), formats);
      }
      return formats;
    });
    return {
      ...lineFormats,
      ...leafFormats
    };
  }
  getHTML(index, length) {
    const [line, lineOffset] = this.scroll.line(index);
    if (line) {
      const lineLength = line.length();
      if (line.length() >= lineOffset + length) {
        const excludeOuterTag = !(lineOffset === 0 && length === lineLength);
        return convertHTML(line, lineOffset, length, excludeOuterTag);
      }
      return convertHTML(this.scroll, index, length, true);
    }
    return '';
  }
  getText(index, length) {
    return this.getContents(index, length).filter(op => typeof op.insert === 'string').map(op => op.insert).join('');
  }
  insertContents(index, contents) {
    const normalizedDelta = normalizeDelta(contents);
    const change = new _quillDelta.default().retain(index).concat(normalizedDelta);
    this.scroll.insertContents(index, normalizedDelta);
    return this.update(change);
  }
  insertEmbed(index, embed, value) {
    this.scroll.insertAt(index, embed, value);
    return this.update(new _quillDelta.default().retain(index).insert({
      [embed]: value
    }));
  }
  insertText(index, text) {
    let formats = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    this.scroll.insertAt(index, text);
    Object.keys(formats).forEach(format => {
      this.scroll.formatAt(index, text.length, format, formats[format]);
    });
    return this.update(new _quillDelta.default().retain(index).insert(text, (0, _lodashEs.cloneDeep)(formats)));
  }
  isBlank() {
    if (this.scroll.children.length === 0) return true;
    if (this.scroll.children.length > 1) return false;
    const blot = this.scroll.children.head;
    if (blot?.statics.blotName !== _block.default.blotName) return false;
    const block = blot;
    if (block.children.length > 1) return false;
    return block.children.head instanceof _break.default;
  }
  removeFormat(index, length) {
    const text = this.getText(index, length);
    const [line, offset] = this.scroll.line(index + length);
    let suffixLength = 0;
    let suffix = new _quillDelta.default();
    if (line != null) {
      suffixLength = line.length() - offset;
      suffix = line.delta().slice(offset, offset + suffixLength - 1).insert('\n');
    }
    const contents = this.getContents(index, length + suffixLength);
    const diff = contents.diff(new _quillDelta.default().insert(text).concat(suffix));
    const delta = new _quillDelta.default().retain(index).concat(diff);
    return this.applyDelta(delta);
  }
  update(change) {
    let mutations = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    let selectionInfo = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : undefined;
    const oldDelta = this.delta;
    if (mutations.length === 1 && mutations[0].type === 'characterData' &&
    // @ts-expect-error Fix me later
    mutations[0].target.data.match(ASCII) && this.scroll.find(mutations[0].target)) {
      // Optimization for character changes
      const textBlot = this.scroll.find(mutations[0].target);
      const formats = (0, _block.bubbleFormats)(textBlot);
      const index = textBlot.offset(this.scroll);
      // @ts-expect-error Fix me later
      const oldValue = mutations[0].oldValue.replace(_cursor.default.CONTENTS, '');
      const oldText = new _quillDelta.default().insert(oldValue);
      // @ts-expect-error
      const newText = new _quillDelta.default().insert(textBlot.value());
      const relativeSelectionInfo = selectionInfo && {
        oldRange: shiftRange(selectionInfo.oldRange, -index),
        newRange: shiftRange(selectionInfo.newRange, -index)
      };
      const diffDelta = new _quillDelta.default().retain(index).concat(oldText.diff(newText, relativeSelectionInfo));
      change = diffDelta.reduce((delta, op) => {
        if (op.insert) {
          return delta.insert(op.insert, formats);
        }
        return delta.push(op);
      }, new _quillDelta.default());
      this.delta = oldDelta.compose(change);
    } else {
      this.delta = this.getDelta();
      if (!change || !(0, _lodashEs.isEqual)(oldDelta.compose(change), this.delta)) {
        change = oldDelta.diff(this.delta, selectionInfo);
      }
    }
    return change;
  }
}
function convertListHTML(items, lastIndent, types) {
  if (items.length === 0) {
    const [endTag] = getListType(types.pop());
    if (lastIndent <= 0) {
      return `</li></${endTag}>`;
    }
    return `</li></${endTag}>${convertListHTML([], lastIndent - 1, types)}`;
  }
  const [{
    child,
    offset,
    length,
    indent,
    type
  }, ...rest] = items;
  const [tag, attribute] = getListType(type);
  if (indent > lastIndent) {
    types.push(type);
    if (indent === lastIndent + 1) {
      return `<${tag}><li${attribute}>${convertHTML(child, offset, length)}${convertListHTML(rest, indent, types)}`;
    }
    return `<${tag}><li>${convertListHTML(items, lastIndent + 1, types)}`;
  }
  const previousType = types[types.length - 1];
  if (indent === lastIndent && type === previousType) {
    return `</li><li${attribute}>${convertHTML(child, offset, length)}${convertListHTML(rest, indent, types)}`;
  }
  const [endTag] = getListType(types.pop());
  return `</li></${endTag}>${convertListHTML(items, lastIndent - 1, types)}`;
}
function convertHTML(blot, index, length) {
  let excludeOuterTag = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
  if ('html' in blot && typeof blot.html === 'function') {
    return blot.html(index, length);
  }
  if (blot instanceof _text.default) {
    return (0, _text.escapeText)(blot.value().slice(index, index + length));
  }
  if (blot instanceof _parchment.ParentBlot) {
    // TODO fix API
    if (blot.statics.blotName === 'list-container') {
      const items = [];
      blot.children.forEachAt(index, length, (child, offset, childLength) => {
        const formats = 'formats' in child && typeof child.formats === 'function' ? child.formats() : {};
        items.push({
          child,
          offset,
          length: childLength,
          indent: formats.indent || 0,
          type: formats.list
        });
      });
      return convertListHTML(items, -1, []);
    }
    const parts = [];
    blot.children.forEachAt(index, length, (child, offset, childLength) => {
      parts.push(convertHTML(child, offset, childLength));
    });
    if (excludeOuterTag || blot.statics.blotName === 'list') {
      return parts.join('');
    }
    const {
      outerHTML,
      innerHTML
    } = blot.domNode;
    const [start, end] = outerHTML.split(`>${innerHTML}<`);
    // TODO cleanup
    if (start === '<table') {
      return `<table style="border: 1px solid #000;">${parts.join('')}<${end}`;
    }
    return `${start}>${parts.join('')}<${end}`;
  }
  return blot.domNode instanceof Element ? blot.domNode.outerHTML : '';
}
function combineFormats(formats, combined) {
  return Object.keys(combined).reduce((merged, name) => {
    if (formats[name] == null) return merged;
    const combinedValue = combined[name];
    if (combinedValue === formats[name]) {
      merged[name] = combinedValue;
    } else if (Array.isArray(combinedValue)) {
      if (combinedValue.indexOf(formats[name]) < 0) {
        merged[name] = combinedValue.concat([formats[name]]);
      } else {
        // If style already exists, don't add to an array, but don't lose other styles
        merged[name] = combinedValue;
      }
    } else {
      merged[name] = [combinedValue, formats[name]];
    }
    return merged;
  }, {});
}
function getListType(type) {
  const tag = type === 'ordered' ? 'ol' : 'ul';
  switch (type) {
    case 'checked':
      return [tag, ' data-list="checked"'];
    case 'unchecked':
      return [tag, ' data-list="unchecked"'];
    default:
      return [tag, ''];
  }
}
function normalizeDelta(delta) {
  return delta.reduce((normalizedDelta, op) => {
    if (typeof op.insert === 'string') {
      const text = op.insert.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      return normalizedDelta.insert(text, op.attributes);
    }
    return normalizedDelta.push(op);
  }, new _quillDelta.default());
}
function shiftRange(_ref, amount) {
  let {
    index,
    length
  } = _ref;
  return new _selection.Range(index + amount, length);
}
function splitOpLines(ops) {
  const split = [];
  ops.forEach(op => {
    if (typeof op.insert === 'string') {
      const lines = op.insert.split('\n');
      lines.forEach((line, index) => {
        if (index) split.push({
          insert: '\n',
          attributes: op.attributes
        });
        if (line) split.push({
          insert: line,
          attributes: op.attributes
        });
      });
    } else {
      split.push(op);
    }
  });
  return split;
}
var _default = exports.default = Editor;
//# sourceMappingURL=editor.js.map