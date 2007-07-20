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

function irange(N) {
  for(var i = 0; i < N; ++i) yield i;
}


// Template is a z-y-x indexed array of bools indicating tile positions
function Grid(templateArray) {
  const ta = templateArray;
  const all = []; // all tiles
  const d = ta.length, h = ta[0].length, w = ta[0][0].length;
  function maketile(x, y, z) { return ta[z][y][x] ? (all[all.length] = new Tile(x, y, z)) : null; }
  const g = this._grid = [[[maketile(x, y, z) for(x in irange(w))] for(y in irange(h))] for(z in irange(d))];
  // set up the tiles' .left etc. fields.  don't use for-in because it gives indices as strings
  for each(var t in all) {
    // a full tile's width to the left, and optionally up or down half a tile's height
    this._recordTileAsAdjacent(t, 'left', 'numRightBlockers', -2, -1, 0);
    this._recordTileAsAdjacent(t, 'left', 'numRightBlockers', -2,  0, 0);
    this._recordTileAsAdjacent(t, 'left', 'numRightBlockers', -2, +1, 0);
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

  // decide which tiles are which
  // xxx randomise, and ensure winnability
  for(var i in all) all[i].value = i;
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
  },

  getTileAt: function(x, y, z) {
    const g = this._grid;
    return (g[z] && g[z][y] && g[z][y][x]) || null;
  },

  onTileClicked: function(x, y, z) {
    alert("tile maybe clicked: ("+x+","+y+","+z+")");
    // the provided coords may be for the right side or bottom half (or both) of the tile
    const tile = this.getTileAt(x, y, z) || this.getTileAt(x, y - 1, z)
        || this.getTileAt(x - 1, y, z) || this.getTileAt(x - 1, y - 1, z);
    if(!tile) return false;
    alert(" value="+tile.value+" free?"+tile.isFree);
    return true;
  }
}
