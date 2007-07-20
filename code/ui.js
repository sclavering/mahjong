const HTMLns = "http://www.w3.org/1999/xhtml";

const kTileWidth = 30;
const kTileHalfWidth = 15;
const kTileHeight = 40;
const kTileHalfHeight = 20;
const kLayerXOffset = 2;
const kLayerYOffset = 3;

const ui = {
  init: function() {
    this._stack = document.getElementById("gamearea");
    this._contexts = []; // nsIDOMCanvasRenderingContext2D
  },

  _colours: ["red", "green", "blue", "yellow", "pink", "orange"],

  // pass a z-y-x indexed array of Tile objects and nulls
  show: function(grid) {
    const d = grid.length, h = grid[0].length, w = grid[0][0].length;
    const pxwidth = (w + 2) * kTileWidth;
    const pxheight = (h + 2) * kTileHeight;
    for(var z = 0; z != d; ++z) {
      var canvas = document.createElementNS(HTMLns, "canvas");
      this._stack.appendChild(canvas);
      canvas.width = pxwidth;
      canvas.height = pxheight;
      this._contexts[z] = canvas.getContext("2d");
    }
    for(z = 0; z != d; ++z)
      for(var y = 0; y != h; ++y)
        for(var x = 0; x != w; ++x)
          this._drawTile(grid[z][y][x]);
    this._stack.width = pxwidth;
    this._stack.height = pxheight;
    window.sizeToContent();
  },

  _drawTile: function(tile) {
    if(!tile) return;
    dump("tile: "+tile+"\n");
    dump("drawing ("+tile.x+","+tile.y+","+tile.z+"): "+tile.value+" at (");
    dump(((tile.x + 1) * kTileHalfWidth) +","+ ((tile.y + 1) * kTileHalfHeight)+","+ kTileWidth+","+ kTileHeight+")\n");
    const ctx = this._contexts[tile.z];
    // + 1 is for a border around the layout, and some space for layer offsets to use up
    const x = (tile.x + 1) * kTileHalfWidth - tile.z * kLayerXOffset;
    const y = (tile.y + 1) * kTileHalfHeight - tile.z * kLayerYOffset;
    // draw a shadow, badly
    ctx.fillStyle = "rgba(128, 128, 128, 0.5)";
    ctx.fillRect(x, y, kTileWidth, kTileHeight);
    // draw the tile
    ctx.fillStyle = this._colours[tile.value];
    ctx.fillRect(x - kLayerXOffset, y - kLayerYOffset, kTileWidth, kTileHeight);
  }
}
