"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _quillDelta = _interopRequireDefault(require("quill-delta"));
var _quill = _interopRequireDefault(require("../core/quill"));
var _module = _interopRequireDefault(require("../core/module"));
var _table = require("../formats/table");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
class Table extends _module.default {
  static register() {
    _quill.default.register(_table.TableCell);
    _quill.default.register(_table.TableRow);
    _quill.default.register(_table.TableBody);
    _quill.default.register(_table.TableContainer);
  }
  constructor() {
    super(...arguments);
    this.listenBalanceCells();
  }
  balanceTables() {
    this.quill.scroll.descendants(_table.TableContainer).forEach(table => {
      table.balanceCells();
    });
  }
  deleteColumn() {
    const [table,, cell] = this.getTable();
    if (cell == null) return;
    // @ts-expect-error
    table.deleteColumn(cell.cellOffset());
    this.quill.update(_quill.default.sources.USER);
  }
  deleteRow() {
    const [, row] = this.getTable();
    if (row == null) return;
    row.remove();
    this.quill.update(_quill.default.sources.USER);
  }
  deleteTable() {
    const [table] = this.getTable();
    if (table == null) return;
    // @ts-expect-error
    const offset = table.offset();
    // @ts-expect-error
    table.remove();
    this.quill.update(_quill.default.sources.USER);
    this.quill.setSelection(offset, _quill.default.sources.SILENT);
  }
  getTable() {
    let range = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.quill.getSelection();
    if (range == null) return [null, null, null, -1];
    const [cell, offset] = this.quill.getLine(range.index);
    if (cell == null || cell.statics.blotName !== _table.TableCell.blotName) {
      return [null, null, null, -1];
    }
    const row = cell.parent;
    const table = row.parent.parent;
    // @ts-expect-error
    return [table, row, cell, offset];
  }
  insertColumn(offset) {
    const range = this.quill.getSelection();
    if (!range) return;
    const [table, row, cell] = this.getTable(range);
    if (cell == null) return;
    const column = cell.cellOffset();
    table.insertColumn(column + offset);
    this.quill.update(_quill.default.sources.USER);
    let shift = row.rowOffset();
    if (offset === 0) {
      shift += 1;
    }
    this.quill.setSelection(range.index + shift, range.length, _quill.default.sources.SILENT);
  }
  insertColumnLeft() {
    this.insertColumn(0);
  }
  insertColumnRight() {
    this.insertColumn(1);
  }
  insertRow(offset) {
    const range = this.quill.getSelection();
    if (!range) return;
    const [table, row, cell] = this.getTable(range);
    if (cell == null) return;
    const index = row.rowOffset();
    table.insertRow(index + offset);
    this.quill.update(_quill.default.sources.USER);
    if (offset > 0) {
      this.quill.setSelection(range, _quill.default.sources.SILENT);
    } else {
      this.quill.setSelection(range.index + row.children.length, range.length, _quill.default.sources.SILENT);
    }
  }
  insertRowAbove() {
    this.insertRow(0);
  }
  insertRowBelow() {
    this.insertRow(1);
  }
  insertTable(rows, columns) {
    const range = this.quill.getSelection();
    if (range == null) return;
    const delta = new Array(rows).fill(0).reduce(memo => {
      const text = new Array(columns).fill('\n').join('');
      return memo.insert(text, {
        table: (0, _table.tableId)()
      });
    }, new _quillDelta.default().retain(range.index));
    this.quill.updateContents(delta, _quill.default.sources.USER);
    this.quill.setSelection(range.index, _quill.default.sources.SILENT);
    this.balanceTables();
  }
  listenBalanceCells() {
    this.quill.on(_quill.default.events.SCROLL_OPTIMIZE, mutations => {
      mutations.some(mutation => {
        if (['TD', 'TR', 'TBODY', 'TABLE'].includes(mutation.target.tagName)) {
          this.quill.once(_quill.default.events.TEXT_CHANGE, (delta, old, source) => {
            if (source !== _quill.default.sources.USER) return;
            this.balanceTables();
          });
          return true;
        }
        return false;
      });
    });
  }
}
var _default = exports.default = Table;
//# sourceMappingURL=table.js.map