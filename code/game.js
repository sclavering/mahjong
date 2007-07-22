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
    this._selectedTile = null;
    ui.onPairRemoved(tileA, tileB);
    return true;
  },

  undo: function() {
    if(!this._undoHistoryIx) return;
    const pair = this._undoHistory[-- this._undoHistoryIx];
    this._unremoveTile(pair[0]);
    this._unremoveTile(pair[1]);
    this._selectedTile = null;
    ui.onPairUnremoved(pair[0], pair[1]);
  },

  redo: function() {
    if(this._undoHistoryIx == this._undoHistory.length) return;
    const pair = this._undoHistory[this._undoHistoryIx ++];
    this._removeTile(pair[0]);
    this._removeTile(pair[1]);
    this._selectedTile = null;
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

  getTileAt: function(x, y, z) {
    const g = this.grid;
    return (g[z] && g[z][y] && g[z][y][x]) || null;
  },

  // a Tile, or null
  _selectedTile: null,

  // returns true iff there is a (corner of a) tile at the coordinates
  onTileClicked: function(x, y, z) {
    // the provided coords may be for the right side or bottom half (or both) of the tile
    const tile = this.getTileAt(x, y, z) || this.getTileAt(x, y - 1, z)
        || this.getTileAt(x - 1, y, z) || this.getTileAt(x - 1, y - 1, z);
    if(tile) dump("found actual tile at ("+tile.x+","+tile.y+","+tile.z+")\n");
    if(!tile || !tile.isFree || tile == this._selectedTile) return false;
    if(!this.doRemovePair(tile, this._selectedTile)) {
      this._selectedTile = tile;
      ui.highlightTile(tile);
    }
    return true;
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

  // Needed when deciding which tiles are which at the start of the game to
  // ensure winnability. Values are "not fillable", "leftleaf"/"rightleaf"
  // (which means that the tile was marked as fillable when all its right/left
  // (respectively) blockers were already filled or could be filled from the
  // other side, and "base", for tiles which can be filled because they're not
  // on top of any others and no obstructions have yet been placed.  For tiles
  // that become fillable after all those underneath them are filled we use
  // "topleaf". Lastly, "filled" means the tile has already been given a value.
  this.fillableBecause = "not fillable";

  this.isFilled = false; // xxx could just do !isNaN(tile.value)
  // Used when "filling" the grid: assigning values to the Tile objects such
  // that the result is a winnable game.
  this.canFillFromRight = true; // true iff there are no filed tiles in a recursive trawl of .right
  this.canFillFromLeft = true;
  this.canFillNow = false;
  this.canFillInitially = false;
}
Tile.prototype = {
  get isFree() {
    return !this.numAboveBlockers && (!this.numLeftBlockers || !this.numRightBlockers);
  },
  toString: function() {
    return this.tileid + ":" + this.value;
  }
}


function irange(N) {
  for(var i = 0; i < N; ++i) yield i;
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
  dump("values.length:" +values.length+"\n")
  // Initially, only tiles which are not on top of another tile may be filled,
  // and the filling can happen from either side.
  for each(var t in alltiles) if(!t.below.length) t.canFillInitially = true;
  while(values.length) {
    var value = values.pop();
    placeTile(alltiles, value);
    placeTile(alltiles, value);
  dump("values.length:" +values.length+"\n")
  }
}

function placeTile(tiles, value) {
  // Regenerating this list all the time makes for simple code
  const fillable = [t for each(t in tiles) if(!t.isFilled && (t.canFillInitially || t.canFillNow))];
  dump("fillable: "+fillable+"\n")
  const tile = fillable[randomInt(fillable.length)];
  dump("set tile "+tile.tileid+" to value:"+value+"\n")
  tile.value = value;
  tile.isFilled = true;
  // Mark tiles in the same row/lattice as no longer fillable from one side.
  // Also, clear the .canFillInitially fields, since filling any of these tiles
  // immediately would leaves those between them and |tile| unfillable.
  markNotLeftFillable(tile);
  markNotRightFillable(tile);
  // Mark adjacent tiles which are now ready to be filled
  markAdjacentIfNewlyFillable(tile.tilesAbove, "below");
  markAdjacentIfNewlyFillable(tile.left, "right");
  markAdjacentIfNewlyFillable(tile.right, "left");
}

function markAdjacentIfNewlyFillable(tiles, setWhichMustAllBeFilledFieldName) {
  for each(var tile in tiles) {
    for each(var t in tile[setWhichMustAllBeFilledFieldName]) if(!t.isFilled) continue;
    tile.canFillNow = true;
  }
}

function markNotLeftFillable(tile) {
  if(!tile.canFillFromLeft) return;
  tile.canFillFromLeft = false;
  tile.canFillInitially = false;
  for each(var l in tile.left) markNotLeftFillable(l);
}

function markNotRightFillable(tile) {
  if(!tile.canFillFromRight) return;
  tile.canFillFromRight = false;
  tile.canFillInitially = false;
  for each(var r in tile.right) markNotRightFillable(r);
}


function getTileValues(num) {
  if(num % 4) throw "the number of tiles isn't a multiple of 4";
  var values = [i for each(i in irange(num / 4))];
  // double them up because we add tiles in pairs, not fours
  return shuffle(Array.concat(values, values));
}

function _shuffle(items) {
  // shuffle several times, because Math.random() appears to be rather bad.
  for(var i = 0; i != 5; i++) {
    // invariant: cards[0..n) unshuffled, cards[n..N) shuffled
    for(var n = items.length; n >= 0; --n) {
      var num = randomInt(n);
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

function shuffle(cards) {
  cards = cards.slice(0); // copy

  // shuffle several times, because Math.random() appears to be rather bad.
  for(var i = 0; i != 5; i++) {
    // invariant: cards[0..n) unshuffled, cards[n..N) shuffled
    var n = cards.length;
    while(n != 0) {
      // get num from range [0..n)
      var num = Math.random();
      while(num==1.0) num = Math.random();
      num = Math.floor(num * n);
      // swap
      n--;
      var temp = cards[n];
      cards[n] = cards[num];
      cards[num] = temp;
    }
  }

  return cards;
}
