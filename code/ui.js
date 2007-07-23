const HTMLns = "http://www.w3.org/1999/xhtml";

const kTileWidth = 56;
const kTileHalfWidth = 28;
const kTileHeight = 80;
const kTileHalfHeight = 40;
const kLayerXOffset = -4;
const kLayerYOffset = -4;

const ui = {
  _images: {},   // <html:img>s for drawing
  _contexts: [], // array of nsIDOMCanvasRenderingContext2D
  _dimensions: [0,0,0],  // width,height,depth last used

  init: function() {
    this._stack = document.getElementById("gamearea");
    this._contexts = []; // nsIDOMCanvasRenderingContext2D
    const images = document.getElementById("html_img_elements");
    // the |if| skips over the whitespace text nodes
    for each(var el in images.childNodes) if(el.id) this._images[el.id] = el;
  },

  // pass a z-y-x indexed array of Tile objects and nulls
  show: function(grid) {
    const d = grid.length, h = grid[0].length, w = grid[0][0].length;
    const dim = this._dimensions;
    if(!(dim[0] == w && dim[1] == h && dim[2] == d)) this._resize(w, h, d);
    this._draw(w, h, d, grid);
  },

  _resize: function(w, h, d) {
    while(this._stack.hasChildNodes()) this._stack.removeChild(this._stack.lastChild);
    this._dimensions = [w, h, d];
    const pxwidth = (w + 2) * kTileHalfWidth;
    const pxheight = (h + 2) * kTileHalfHeight;
    // two contexts per layer (one for tiles, one for their edges/shadows), and an extra for the selected tile
    for(var z = 0; z != d * 2 + 1; ++z) {
      var canvas = document.createElementNS(HTMLns, "canvas");
      this._stack.appendChild(canvas);
      canvas.width = pxwidth;
      canvas.height = pxheight;
      this._contexts[z] = canvas.getContext("2d");
    }
    this._highlightContext = this._contexts.pop();
    this._stack.width = pxwidth;
    this._stack.height = pxheight;
    window.resizeTo(pxwidth, pxheight);
  },

  _draw: function(w, h, d, grid) {
    for(var z = 0; z != d; ++z)
      for(var y = 0; y != h; ++y)
        for(var x = 0; x != w; ++x)
          this._drawTile(grid[z][y][x]);
    this._stack.onclick = function(e) { ui.onclick(e); };
  },

  _drawTile: function(tile) {
    if(!tile) return;
    dump("drawing ("+tile.x+","+tile.y+","+tile.z+"): "+tile.value+" at (");
    dump(((tile.x + 1) * kTileHalfWidth) +","+ ((tile.y + 1) * kTileHalfHeight)+","+ kTileWidth+","+ kTileHeight+")\n");
    const ctx1 = this._contexts[tile.z * 2], ctx2 = this._contexts[tile.z * 2 + 1];
    var [x, y] = this._getTileVisualCoords(tile);
    // draw a shadow, badly
    ctx1.fillStyle = "rgba(128, 128, 128, 0.3)";
    ctx1.fillRect(x - kLayerXOffset, y - kLayerYOffset, kTileWidth, kTileHeight);
    // draw the tile
    ctx2.drawImage(this._images["tile-" + tile.value], x, y);
    // draw an extra border, since the tiles lack left borders
    ctx2.fillStyle = "black";
    ctx2.strokeRect(x + 0.5, y + 0.5, kTileWidth - 1, kTileHeight - 1);
  },

  highlightTile: function(tile) {
    const ctx = this._highlightContext;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if(!tile) return;
    var [x, y] = this._getTileVisualCoords(tile);
    ctx.drawImage(this._images["selectedtile-" + tile.value], x, y)
  },

  _getTileVisualCoords: function(tile) {
    // +1 to x/y gives a visual border and space for the layer offsets to use up
    const x = (tile.x + 1) * kTileHalfWidth + (tile.z + 1) * kLayerXOffset;
    const y = (tile.y + 1) * kTileHalfHeight + (tile.z + 1) * kLayerYOffset;
    return [x, y];
  },

  onPairRemoved: function(tileA, tileB) {
    this._undrawTile(tileA);
    this._undrawTile(tileB);
    this.highlightTile(null);
  },

  _undrawTile: function(tile) {
    var [x, y] = this._getTileVisualCoords(tile);
    // clear tile face then clear shadow
    const ix = tile.z * 2, facectx = this._contexts[ix + 1], ectx = this._contexts[ix];
    facectx.clearRect(x, y, kTileWidth, kTileHeight);
    ectx.clearRect(x - kLayerXOffset, y - kLayerYOffset, kTileWidth, kTileHeight);
  },

  onPairUnremoved: function(tileA, tileB) {
    this._drawTile(tileA);
    this._drawTile(tileB);
    this.highlightTile(null);
  },

  onclick: function(event) {
    const pixelX = event.clientX - this._stack.boxObject.x;
    const pixelY = event.clientY - this._stack.boxObject.y;
    const g = game.grid, depth = g.length;
    for(var z = depth - 1; z >= 0; --z) {
      // reverse the layer tile-shadow offsets
      var layerPixelX = pixelX - z * kLayerXOffset;
      var layerPixelY = pixelY - z * kLayerYOffset;
      // conver to logical-tile coordinates.  -1 is to match the +1 in _drawTile()
      var x = Math.floor(layerPixelX / kTileHalfWidth) - 1;
      var y = Math.floor(layerPixelY / kTileHalfHeight) - 1;
      dump("click: ("+pixelX+","+pixelY+") == ("+layerPixelX+","+layerPixelY+") in layer "+z);
      dump(" -- logical tile ("+x+","+y+","+z+")\n");
      if(game.onTileClicked(x, y, z)) break;
    }
  }
}
