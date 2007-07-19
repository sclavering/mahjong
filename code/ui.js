const gridui = {
  init: function() {
  },

  // pass a z-y-x indexed array of Tile objects and nulls
  show: function(grid) {
    for(var z in grid) {
      for(var y in grid[z]) {
        for(var x in grid[z][y]) {
          dump(grid[z][y][x] ? "#" : ".");
        }
        dump("\n");
      }
      dump("\n");
    }
  }
}
