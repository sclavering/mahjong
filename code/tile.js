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
  const g = templateArray;
  this._tiles = [];
  function t(x, y, z) { return g[z][y][x] ? new Tile(x, y, z) : null; }
  this._grid = [[[t(x, y, z) for(x in g[z][y])] for(y in g[z])] for(z in g)];
}

Grid.prototype = {
  removePair: function(tileA, tileB) {
    if(tileA.value != tileB.value) return false;
    tileA.remove();
    tileB.remove();
    return true;
  }
}
