function Game(templateGrid) {
  this._history = [];
  [this.grid, this.alltiles] = createGrid(templateGrid);
  GridFiller.run(this.alltiles);
}

Game.prototype = {
  // The Undo history is an array of [tile, tile] pairs, in order of removal.
  // From _undoHistoryIx onward, it's actually the Redo "history".
  _undoHistory: [],
  _undoHistoryIx: 0,

  doRemovePair: function(tileA, tileB) {
    if(!tileA || !tileB || tileA == tileB || tileA.value != tileB.value) return false;
    this._undoHistory.splice(this._undoHistoryIx); // discard anything undone
    this._undoHistory.push([tileA, tileB]);
    this._undoHistoryIx = this._undoHistory.length;
    this._removeTile(tileA);
    this._removeTile(tileB);
    ui.onPairRemoved(tileA, tileB);
    return true;
  },

  undo: function() {
    if(!this._undoHistoryIx) return;
    const pair = this._undoHistory[-- this._undoHistoryIx];
    this._unremoveTile(pair[0]);
    this._unremoveTile(pair[1]);
    ui.onPairUnremoved(pair[0], pair[1]);
  },

  redo: function() {
    if(this._undoHistoryIx == this._undoHistory.length) return;
    const pair = this._undoHistory[this._undoHistoryIx ++];
    this._removeTile(pair[0]);
    this._removeTile(pair[1]);
    ui.onPairRemoved(pair[0], pair[1]);
  },

  _removeTile: function(tile) {
    this._clearHints();
    this.grid[tile.z][tile.y][tile.x] = null;
    for(let t of tile.left) --t.numRightBlockers;
    for(let t of tile.right) --t.numLeftBlockers;
    for(let t of tile.below) --t.numAboveBlockers;
  },

  _unremoveTile: function(tile) {
    this._clearHints();
    this.grid[tile.z][tile.y][tile.x] = tile;
    for(let t of tile.left) ++t.numRightBlockers;
    for(let t of tile.right) ++t.numLeftBlockers;
    for(let t of tile.below) ++t.numAboveBlockers;
  },

  // Returns the tile with (x,y,z) as its top-left corner
  _getTileAt: function(x, y, z) {
    const g = this.grid;
    return (g[z] && g[z][y] && g[z][y][x]) || null;
  },

  // Returns a tile given the grid coords of any of its corners
  getTileAt: function(x, y, z) {
    return this._getTileAt(x, y, z) || this._getTileAt(x, y - 1, z)
        || this._getTileAt(x - 1, y, z) || this._getTileAt(x - 1, y - 1, z);
  },


  // returns an array of two or more pairable tiles
  getHint: function() {
    if(!this._hints) this._hints = this._computeHints();
    if(!this._hints.length) return null;
    this._hintIndex %= this._hints.length;
    return this._hints[this._hintIndex++];
  },

  _clearHints: function() {
    this._hintIndex = 0;
    this._hints = null;
  },

  _hintIndex: 0,
  _hints: null,

  _computeHints: function() {
    const tiles = this.alltiles.filter(t => t.isFree);
    const sets = [];
    for(let t of tiles) {
      if(sets[t.value]) sets[t.value].push(t);
      else sets[t.value] = [t];
    }
    return sets.filter(s => s.length > 1);
  }
}


function Tile(x, y, z) {
  this.x = x;
  this.y = y;
  this.z = z;
  this.tileid = x + "-" + y + "-" + z; // e.g. 3-5-2.  used as a fieldname when modelling a set
  // the numbers of tiles to the left/right/above that prevent this tile being paired
  this.numLeftBlockers = 0;
  this.numRightBlockers = 0;
  this.numAboveBlockers = 0;
  // .face controls the tile's appearance, while .value affects pairing
  // They are initialised to NaN merely because NaN != NaN, and the true values
  // are set later (when filling in a board).
  this.value = NaN;
  this.face = NaN;
  // Arrays of tiles that may be exposed when pairing this tile
  this.left = [];
  this.right = [];
  this.below = [];
  // Only used when filling the grid.  List of Tile objects overlapping |this|
  // in the layer immediately above.
  this.tilesAbove = [];

  // Used when setting the tiles' values to give a winnable grid ("filling" it)
  this.isFilled = false; // xxx could just do !isNaN(tile.value)
  // true iff any of a recursive traversal of .right have .isFilled set true.
  // Implies that this tile can now only be filled when all its .right tiles
  // have all been filled.
  this.tilesFilledToRight = false;
  this.tilesFilledToLeft = false;
}
Tile.prototype = {
  get isFree() {
    return !this.numAboveBlockers && (!this.numLeftBlockers || !this.numRightBlockers);
  },
  toString: function() { return this.tileid; },
  reset: function() {
    this.tilesFilledToRight = this.tilesFilledToLeft = this.isFilled = false;
  }
}


function range(N) {
  const rv = Array(N);
  for(let i = 0; i < N; ++i) rv[i] = i;
  return rv;
}

// Template is a z-y-x indexed array of bools indicating tile positions
function createGrid(templateArray) {
  const ta = templateArray;
  const all = []; // all tiles
  const d = ta.length, h = ta[0].length, w = ta[0][0].length;
  function maketile(x, y, z) { return ta[z][y][x] ? (all[all.length] = new Tile(x, y, z)) : null; }
  const grid = range(d).map(z => range(h).map(y => range(w).map(x => maketile(x, y, z))));
  // set up the tiles' .left etc. fields.  don't use for-in because it gives indices as strings
  for(let t of all) {
    // a full tile's width to the left, and optionally up or down half a tile's height
    _recordTileAsAdjacent(grid, t, 'left', 'numRightBlockers', -2, -1, 0);
    _recordTileAsAdjacent(grid, t, 'left', 'numRightBlockers', -2,  0, 0);
    _recordTileAsAdjacent(grid, t, 'left', 'numRightBlockers', -2, +1, 0);
    // as above, but to the right
    _recordTileAsAdjacent(grid, t, 'right', 'numLeftBlockers', +2, -1, 0);
    _recordTileAsAdjacent(grid, t, 'right', 'numLeftBlockers', +2,  0, 0);
    _recordTileAsAdjacent(grid, t, 'right', 'numLeftBlockers', +2, +1, 0);
    // either a quater covered, half covered, or directly underneath
    _recordTileAsAdjacent(grid, t, 'below', 'numAboveBlockers', -1, -1, -1);
    _recordTileAsAdjacent(grid, t, 'below', 'numAboveBlockers', -1,  0, -1);
    _recordTileAsAdjacent(grid, t, 'below', 'numAboveBlockers', -1, +1, -1);
    _recordTileAsAdjacent(grid, t, 'below', 'numAboveBlockers',  0, +1, -1);
    _recordTileAsAdjacent(grid, t, 'below', 'numAboveBlockers', +1, +1, -1);
    _recordTileAsAdjacent(grid, t, 'below', 'numAboveBlockers', +1,  0, -1);
    _recordTileAsAdjacent(grid, t, 'below', 'numAboveBlockers', +1, -1, -1);
    _recordTileAsAdjacent(grid, t, 'below', 'numAboveBlockers',  0, -1, -1);
    _recordTileAsAdjacent(grid, t, 'below', 'numAboveBlockers',  0,  0, -1);
  }
  return [grid, all];
}

// Used during grid setup. Adds a tile (if it exists) to one of another's adjacency lists
function _recordTileAsAdjacent(grid, tile, listFieldName, countFieldName, dx, dy, dz) {
    const g = grid, x = tile.x + dx, y = tile.y + dy, z = tile.z + dz;
    const other = (g[z] && g[z][y] && g[z][y][x]) || null;
    if(!other) return;
    tile[listFieldName].push(other);
    other[countFieldName] += 1;
    if(listFieldName == "below") other.tilesAbove.push(tile); // ew
}


const GridFiller = {
  // Creates a game that is winnable (in at least one way).  The tiles are actually in a grid already, and this function just assigns them values.
  run: function(alltiles) {
    // ._run_once() can fail, e.g. if it gets to the point where the only two unfilled tiles are one on top of the other
    while(!this._run_once(alltiles)) for(let t of alltiles) t.reset();
  },

  _run_once: function(alltiles) {
    const values = getTileValues(alltiles.length);
    // Initially, only tiles which are not on top of another tile may be filled, and the filling can happen from either side.
    while(values.length) {
      let value = values.pop();
      let fillable = alltiles.filter(t => this._is_tile_fillable(t));
      if(!fillable.length) return false;
      let tile1 = fillable[randomInt(fillable.length)];
      this._fill_tile(tile1, value);
      // Remove no-longer-fillable tiles (often most members of tile1's lattice).
      // Don't regenerate the list from scratch, because that could include tiles which can be filled, but not with tile1's pair (eg. those on top of it).
      fillable = fillable.filter(t => this._is_tile_fillable(t));
      if(!fillable.length) return null;
      // If the tile is the first in its lattice to be filled, it can legally be paired with one of its adjacents
      if(!tile1.tilesFilledToLeft && !tile1.tilesFilledToRight) fillable = Array.concat(fillable, tile1.left, tile1.right);
      // Select a second tile, and actually fill them both.
      let tile2 = fillable[randomInt(fillable.length)];
      this._fill_tile(tile2, value);
    }
    return true;
  },

  _fill_tile: function(tile, value) {
    tile.value = value;
    tile.isFilled = true;
    this._mark_not_left_fillable(tile);
    this._mark_not_right_fillable(tile);
    return tile;
  },

  _mark_not_left_fillable: function(tile) {
    if(tile.tilesFilledToLeft) return;
    tile.tilesFilledToLeft = true;
    for(let l of tile.left) this._mark_not_left_fillable(l);
  },

  _mark_not_right_fillable: function(tile) {
    if(tile.tilesFilledToRight) return;
    tile.tilesFilledToRight = true;
    for(let r of tile.right) this._mark_not_right_fillable(r);
  },

  _is_tile_fillable: function(tile) {
    return !tile.isFilled && this._all_filled(tile.below) && (
      // either this is the first tile in its lattice to be filled
      (!tile.tilesFilledToRight && !tile.tilesFilledToLeft)
      // or if the lattice has been partly filled:
      || this._all_filled(tile.left)
      || this._all_filled(tile.right)
    );
  },

  _all_filled: function(tiles) {
    for(let t of tiles) if(!t.isFilled) return false;
    return true;
  },
};



function getTileValues(num) {
  if(num % 4) throw "the number of tiles isn't a multiple of 4";
  const values = range(num / 4);
  // double them up because we add tiles in pairs, not fours
  return shuffle(Array.concat(values, values));
}

function shuffle(items) {
  // shuffle several times, because Math.random() appears to be rather bad.
  for(var i = 0; i != 5; ++i) {
    // invariant: items[0..n) unshuffled, items[n..N) shuffled
    for(var n = items.length; n > 0; ) {
      var num = randomInt(n);
      --n;
      [items[n], items[num]] = [items[num], items[n]];
    }
  }
  return items;
}

// return a random integer in the range [0, 1, .., N)
function randomInt(N) {
  // Math.random() gives a float from 0.0 to 1.0 inclusive.
  do { var num = Math.random(); } while(num >= 1.0);
  return Math.floor(num * N);
}


const layouts = {
  // layout-id -> template map.  templates are z-y-x-indexed arrays of booleans
  _gridTemplates: {},

  get: function(id) {
    return this._gridTemplates[id] || null;
  },

  init: function() {
    for(let id in layout_data) this._gridTemplates[id] = _parse_layout(layout_data[id]);

    function _parse_layout(txt) {
      txt = txt.trim();
      const layers = txt.split("\n\n").map(layer => layer.split("\n").map(s => s.trim()));
      return layers.map(l => _parse_layer(l, layers[0].length, layers[0][0].length));
    }

    function _parse_layer(layer, expected_height, expected_width) {
      if(layer.length !== expected_height) throw Error("bad layout");
      return layer.map(line => _parse_line(line, expected_width));
    }

    function _parse_line(line, expected_width) {
      if(line.length !== expected_width) throw Error("bad layout");
      return [].slice.call(line).map(ch => ch !== ".");
    }
  },
};
