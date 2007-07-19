function Tile(x, y, z) {
  this.x = x;
  this.y = y;
  this.z = z;
  this.removed = false; // true after it's used to form a pair
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
}

Tile.prototype = {
  get isFree() {
    return !this.numAboveBlockers && (!this.numLeftBlockers || !this.numRightBlockers);
  },

  remove: function() {
    this.removed = true;
    for each(var t in this.left) --t.numRightBlockers;
    for each(t in this.right) --t.numLeftBlockers;
    for each(t in this.below) --t.numAboveBlockers;
  },

  unremove: function() {
    this.removed = false;
    for each(var t in this.left) ++t.numRightBlockers;
    for each(t in this.right) ++t.numLeftBlockers;
    for each(t in this.below) ++t.numAboveBlockers;
  }
}


// Template is a z-y-x indexed array of bools indicating tile positions
function Grid(templateArray) {
  const ta = templateArray;
  const all = []; // all tiles
  function maketile(x, y, z) { return ta[z][y][x] ? all.push(new Tile(x, y, z)) : null; }
  this._grid = [[[maketile(x, y, z) for(x in ta[z][y])] for(y in ta[z])] for(z in ta)];
  // set up the tiles' .left etc. fields.  don't use for-in because it gives indices as strings
  const g = this._grid, d = g.length, h = g[0].length, w = g[0][0].length;
  for each(var t in all) {
    // a full tile's width to the left, and optionally up or down half a tile's height
    this._recordTileAsAdjacent(t, 'left', 'numnumRightBlockers', -2, -1, 0);
    this._recordTileAsAdjacent(t, 'left', 'numnumRightBlockers', -2,  0, 0);
    this._recordTileAsAdjacent(t, 'left', 'numnumRightBlockers', -2, +1, 0);
    // as above, but to the right
    this._recordTileAsAdjacent(t, 'right', 'numLeftBlockers', +2, -1, 0);
    this._recordTileAsAdjacent(t, 'right', 'numLeftBlockers', +2,  0, 0);
    this._recordTileAsAdjacent(t, 'right', 'numLeftBlockers', +2, +1, 0);
    // either a quater covered, half covered, or directly underneath
    this._recordTileAsAdjacent(t, 'below', 'numAboveBlockers', -1, -1, -1);
    this._recordTileAsAdjacent(t, 'below', 'numAboveBlockers', -1,  0, -1);
    this._recordTileAsAdjacent(t, 'below', 'numAboveBlockers', -1, +1, -1);
    this._recordTileAsAdjacent(t, 'below', 'numAboveBlockers',  0, +1, -1);
    this._recordTileAsAdjacent(t, 'below', 'numAboveBlockers', +1, +1, -1);
    this._recordTileAsAdjacent(t, 'below', 'numAboveBlockers', +1,  0, -1);
    this._recordTileAsAdjacent(t, 'below', 'numAboveBlockers', +1, -1, -1);
    this._recordTileAsAdjacent(t, 'below', 'numAboveBlockers',  0, -1, -1);
    this._recordTileAsAdjacent(t, 'below', 'numAboveBlockers',  0,  0, -1);
  }
}

Grid.prototype = {
  // Used during grid setup. Adds a tile (if it exists) to one of another's adjacency lists
  _recordTileAsAdjacent: function(tile, listFieldName, countFieldName, dx, dy, dz) {
    const g = this._grid, x = tile.x + dx, y = tile.y + dy, z = tile.z + dz;
    const other = (g[z] && g[z][y] && g[z][y][x]) || null;
    if(!other) return;
    tile[listFieldName].push(other);
    other[countFieldName] += 1;
  },

  removePair: function(tileA, tileB) {
    if(tileA.value != tileB.value) return false;
    tileA.remove();
    tileB.remove();
    return true;
  }
}
