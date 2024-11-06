"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.tableHandler = exports.default = exports.composePosition = void 0;
var _quillDelta = _interopRequireWildcard(require("quill-delta"));
var _module = _interopRequireDefault(require("../core/module"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && Object.prototype.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
const parseCellIdentity = identity => {
  const parts = identity.split(':');
  return [Number(parts[0]) - 1, Number(parts[1]) - 1];
};
const stringifyCellIdentity = (row, column) => `${row + 1}:${column + 1}`;
const composePosition = (delta, index) => {
  let newIndex = index;
  const thisIter = new _quillDelta.OpIterator(delta.ops);
  let offset = 0;
  while (thisIter.hasNext() && offset <= newIndex) {
    const length = thisIter.peekLength();
    const nextType = thisIter.peekType();
    thisIter.next();
    switch (nextType) {
      case 'delete':
        if (length > newIndex - offset) {
          return null;
        }
        newIndex -= length;
        break;
      case 'insert':
        newIndex += length;
        offset += length;
        break;
      default:
        offset += length;
        break;
    }
  }
  return newIndex;
};
exports.composePosition = composePosition;
const compactCellData = _ref => {
  let {
    content,
    attributes
  } = _ref;
  const data = {};
  if (content.length() > 0) {
    data.content = content.ops;
  }
  if (attributes && Object.keys(attributes).length > 0) {
    data.attributes = attributes;
  }
  return Object.keys(data).length > 0 ? data : null;
};
const compactTableData = _ref2 => {
  let {
    rows,
    columns,
    cells
  } = _ref2;
  const data = {};
  if (rows.length() > 0) {
    data.rows = rows.ops;
  }
  if (columns.length() > 0) {
    data.columns = columns.ops;
  }
  if (Object.keys(cells).length) {
    data.cells = cells;
  }
  return data;
};
const reindexCellIdentities = (cells, _ref3) => {
  let {
    rows,
    columns
  } = _ref3;
  const reindexedCells = {};
  Object.keys(cells).forEach(identity => {
    let [row, column] = parseCellIdentity(identity);

    // @ts-expect-error Fix me later
    row = composePosition(rows, row);
    // @ts-expect-error Fix me later
    column = composePosition(columns, column);
    if (row !== null && column !== null) {
      const newPosition = stringifyCellIdentity(row, column);
      reindexedCells[newPosition] = cells[identity];
    }
  }, false);
  return reindexedCells;
};
const tableHandler = exports.tableHandler = {
  compose(a, b, keepNull) {
    const rows = new _quillDelta.default(a.rows || []).compose(new _quillDelta.default(b.rows || []));
    const columns = new _quillDelta.default(a.columns || []).compose(new _quillDelta.default(b.columns || []));
    const cells = reindexCellIdentities(a.cells || {}, {
      rows: new _quillDelta.default(b.rows || []),
      columns: new _quillDelta.default(b.columns || [])
    });
    Object.keys(b.cells || {}).forEach(identity => {
      const aCell = cells[identity] || {};
      // @ts-expect-error Fix me later
      const bCell = b.cells[identity];
      const content = new _quillDelta.default(aCell.content || []).compose(new _quillDelta.default(bCell.content || []));
      const attributes = _quillDelta.default.AttributeMap.compose(aCell.attributes, bCell.attributes, keepNull);
      const cell = compactCellData({
        content,
        attributes
      });
      if (cell) {
        cells[identity] = cell;
      } else {
        delete cells[identity];
      }
    });
    return compactTableData({
      rows,
      columns,
      cells
    });
  },
  transform(a, b, priority) {
    const aDeltas = {
      rows: new _quillDelta.default(a.rows || []),
      columns: new _quillDelta.default(a.columns || [])
    };
    const bDeltas = {
      rows: new _quillDelta.default(b.rows || []),
      columns: new _quillDelta.default(b.columns || [])
    };
    const rows = aDeltas.rows.transform(bDeltas.rows, priority);
    const columns = aDeltas.columns.transform(bDeltas.columns, priority);
    const cells = reindexCellIdentities(b.cells || {}, {
      rows: bDeltas.rows.transform(aDeltas.rows, !priority),
      columns: bDeltas.columns.transform(aDeltas.columns, !priority)
    });
    Object.keys(a.cells || {}).forEach(identity => {
      let [row, column] = parseCellIdentity(identity);
      // @ts-expect-error Fix me later
      row = composePosition(rows, row);
      // @ts-expect-error Fix me later
      column = composePosition(columns, column);
      if (row !== null && column !== null) {
        const newIdentity = stringifyCellIdentity(row, column);

        // @ts-expect-error Fix me later
        const aCell = a.cells[identity];
        const bCell = cells[newIdentity];
        if (bCell) {
          const content = new _quillDelta.default(aCell.content || []).transform(new _quillDelta.default(bCell.content || []), priority);
          const attributes = _quillDelta.default.AttributeMap.transform(aCell.attributes, bCell.attributes, priority);
          const cell = compactCellData({
            content,
            attributes
          });
          if (cell) {
            cells[newIdentity] = cell;
          } else {
            delete cells[newIdentity];
          }
        }
      }
    });
    return compactTableData({
      rows,
      columns,
      cells
    });
  },
  invert(change, base) {
    const rows = new _quillDelta.default(change.rows || []).invert(new _quillDelta.default(base.rows || []));
    const columns = new _quillDelta.default(change.columns || []).invert(new _quillDelta.default(base.columns || []));
    const cells = reindexCellIdentities(change.cells || {}, {
      rows,
      columns
    });
    Object.keys(cells).forEach(identity => {
      const changeCell = cells[identity] || {};
      const baseCell = (base.cells || {})[identity] || {};
      const content = new _quillDelta.default(changeCell.content || []).invert(new _quillDelta.default(baseCell.content || []));
      const attributes = _quillDelta.default.AttributeMap.invert(changeCell.attributes, baseCell.attributes);
      const cell = compactCellData({
        content,
        attributes
      });
      if (cell) {
        cells[identity] = cell;
      } else {
        delete cells[identity];
      }
    });

    // Cells may be removed when their row or column is removed
    // by row/column deltas. We should add them back.
    Object.keys(base.cells || {}).forEach(identity => {
      const [row, column] = parseCellIdentity(identity);
      if (composePosition(new _quillDelta.default(change.rows || []), row) === null || composePosition(new _quillDelta.default(change.columns || []), column) === null) {
        // @ts-expect-error Fix me later
        cells[identity] = base.cells[identity];
      }
    });
    return compactTableData({
      rows,
      columns,
      cells
    });
  }
};
class TableEmbed extends _module.default {
  static register() {
    _quillDelta.default.registerEmbed('table-embed', tableHandler);
  }
}
var _default = exports.default = TableEmbed;
//# sourceMappingURL=tableEmbed.js.map