function Game(templateGrid) {
  this._history = [];
  [this.grid, this.alltiles] = createGrid(templateGrid);
  fillGrid(this.alltiles);
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
    this.grid[tile.z][tile.y][tile.x] = null;
    for each(var t in tile.left) --t.numRightBlockers;
    for each(t in tile.right) --t.numLeftBlockers;
    for each(t in tile.below) --t.numAboveBlockers;
  },

  _unremoveTile: function(tile) {
    this.grid[tile.z][tile.y][tile.x] = tile;
    for each(var t in tile.left) ++t.numRightBlockers;
    for each(t in tile.right) ++t.numLeftBlockers;
    for each(t in tile.below) ++t.numAboveBlockers;
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
  get isFillable() {
    return !this.isFilled && allFilled(this.below) && (
      // either this is the first tile in its lattice to be filled
      (!this.tilesFilledToRight && !this.tilesFilledToLeft)
      // or if the lattice has been partly filled:
      || allFilled(this.left)
      || allFilled(this.right)
    );
  }
}


function irange(N) {
  for(var i = 0; i < N; ++i) yield i;
}

function allFilled(tiles) {
  for each(var t in tiles) if(!t.isFilled) return false;
  return true;
}

// Template is a z-y-x indexed array of bools indicating tile positions
function createGrid(templateArray) {
  const ta = templateArray;
  const all = []; // all tiles
  const d = ta.length, h = ta[0].length, w = ta[0][0].length;
  function maketile(x, y, z) { return ta[z][y][x] ? (all[all.length] = new Tile(x, y, z)) : null; }
  const grid = [[[maketile(x, y, z) for(x in irange(w))] for(y in irange(h))] for(z in irange(d))];
  // set up the tiles' .left etc. fields.  don't use for-in because it gives indices as strings
  for each(var t in all) {
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


// Creates a game that is winnable (in at least one way) by repeatedly adding
// pairs to the empty grid.  The tiles are actually in a grid already, and this
// function just assigns them values.
function fillGrid(alltiles) {
  const values = getTileValues(alltiles.length);
  // Initially, only tiles which are not on top of another tile may be filled,
  // and the filling can happen from either side.
  while(values.length) {
    var value = values.pop();
    var fillable = [t for each(t in alltiles) if(t.isFillable)];
    // select and remove a single tile
    var tile1 = fillable.splice(randomInt(fillable.length), 1)[0];
    dump("chose tile1 "+tile1+" leaving "+fillable+"\n");
    // if the tile is the first in its lattice to be filled, it can legally be
    // paired with one of its adjacents
    if(!tile1.tilesFilledToLeft && !tile1.tilesFilledToRight)
      fillable = Array.concat(fillable, tile1.left, tile1.right);
    // select a second tile, and actually fill them both
    var tile2 = fillable[randomInt(fillable.length)];
    dump("chose tile2 "+tile2+" from "+fillable+"\n");
    fillTile(tile1, value);
    fillTile(tile2, value);
  }
}

function fillTile(tile, value) {
  tile.value = value;
  tile.isFilled = true;
  markNotLeftFillable(tile);
  markNotRightFillable(tile);
  return tile;
}

function markNotLeftFillable(tile) {
  if(tile.tilesFilledToLeft) return;
  tile.tilesFilledToLeft = true;
  for each(var l in tile.left) markNotLeftFillable(l);
}

function markNotRightFillable(tile) {
  if(tile.tilesFilledToRight) return;
  tile.tilesFilledToRight = true;
  for each(var r in tile.right) markNotRightFillable(r);
}


function getTileValues(num) {
  if(num % 4) throw "the number of tiles isn't a multiple of 4";
  var values = [i for each(i in irange(num / 4))];
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
