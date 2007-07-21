const HTMLns = "http://www.w3.org/1999/xhtml";

const kTileWidth = 56;
const kTileHalfWidth = 28;
const kTileHeight = 80;
const kTileHalfHeight = 40;
const kLayerXOffset = 4;
const kLayerYOffset = 4;

const ui = {
  // <html:img>s for drawing
  _images: {},

  init: function() {
    this._stack = document.getElementById("gamearea");
    this._contexts = []; // nsIDOMCanvasRenderingContext2D
    const images = document.getElementById("html_img_elements");
    for each(var el in images.childNodes) this._images[el.id] = el;
  },

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
    this._stack.onclick = function(e) { ui.onclick(e); };
  },

  _drawTile: function(tile) {
    if(!tile) return;
    dump("drawing ("+tile.x+","+tile.y+","+tile.z+"): "+tile.value+" at (");
    dump(((tile.x + 1) * kTileHalfWidth) +","+ ((tile.y + 1) * kTileHalfHeight)+","+ kTileWidth+","+ kTileHeight+")\n");
    const ctx = this._contexts[tile.z];
    // + 1 is for a border around the layout, and some space for layer offsets to use up
    const x = (tile.x + 1) * kTileHalfWidth - tile.z * kLayerXOffset;
    const y = (tile.y + 1) * kTileHalfHeight - tile.z * kLayerYOffset;
    // draw a shadow, badly
    ctx.fillStyle = "rgba(128, 128, 128, 0.3)";
    ctx.fillRect(x, y, kTileWidth, kTileHeight);
    // draw the tile
    ctx.drawImage(this._images["tile-" + tile.value], x - kLayerXOffset, y - kLayerYOffset);
  },


  onclick: function(event) {
    const pixelX = event.clientX - this._stack.boxObject.x;
    const pixelY = event.clientY - this._stack.boxObject.y;
    const g = grid._grid, depth = g.length;
    for(var z = depth - 1; z >= 0; --z) {
      // reverse the layer tile-shadow offsets
      var layerPixelX = pixelX + z * kLayerXOffset;
      var layerPixelY = pixelY + z * kLayerYOffset;
      // conver to logical-tile coordinates.  -1 is to match the +1 in _drawTile()
      var x = Math.floor(layerPixelX / kTileHalfWidth) - 1;
      var y = Math.floor(layerPixelY / kTileHalfHeight) - 1;
      dump("click: ("+pixelX+","+pixelY+") == ("+layerPixelX+","+layerPixelY+") in layer "+z);
      dump(" -- logical tile ("+x+","+y+","+z+")\n");
      if(grid.onTileClicked(x, y, z)) return;
    }
  }
}
