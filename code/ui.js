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
    this._selected = null;
    const d = grid.length, h = grid[0].length, w = grid[0][0].length;
    const dim = this._dimensions;
    if(!(dim[0] == w && dim[1] == h && dim[2] == d)) this._resize(w, h, d);
    this._draw(w, h, d, grid);
  },

  _resize: function(w, h, d) {
    const stack = this._stack;
    while(this._stack.hasChildNodes()) this._stack.removeChild(this._stack.lastChild);
    this._dimensions = [w, h, d];
    const pxwidth = w * kTileHalfWidth;
    const pxheight = h * kTileHalfHeight;
    // two contexts per layer (one for tiles, one for their edges/shadows)
    // Since the offsets used to mimic 3D are both negative, the first canvas
    // (for the shadows of the bottom layer) gets the *most* offset.  We then
    // only reduce it between a layer's shadow canvas and its faces canvas.
    for(var z = 0, offset = d; z != d * 2; ++z, offset -= z % 2) {
      // positioning <html:canvas>es in a <stack> doesn't work well, so..
      var box = document.createElement("box");
      box.top = offset * -kLayerYOffset;
      box.left = offset * -kLayerXOffset;
      this._stack.appendChild(box);
      // and the <canvas> external (.style.*) dimensions are 0 in XUL unless set
      var canvas = document.createElementNS(HTMLns, "canvas");
      box.appendChild(canvas);
      canvas.style.width = (canvas.width = pxwidth) +"px";
      canvas.style.height = (canvas.height = pxheight) + "px";
      this._contexts[z] = canvas.getContext("2d");
    }
    window.sizeToContent();
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
    var [x, y] = this._drawTileFace(tile);
    // draw a shadow, badly
    const ctx1 = this._contexts[tile.z * 2];
    ctx1.fillStyle = "rgba(128, 128, 128, 0.3)";
    ctx1.fillRect(x, y, kTileWidth, kTileHeight);
  },

  _drawTileFace: function(tile) {
    if(!tile) return null;
    var [x, y] = this._getTileVisualCoords(tile);
    const ctx2 = this._contexts[tile.z * 2 + 1];
    ctx2.clearRect(x, y, kTileWidth, kTileHeight);
    ctx2.drawImage(this._images["tile-" + tile.value], x, y);
    // draw an extra border, since the tiles lack left borders
    ctx2.fillStyle = "black";
    ctx2.strokeRect(x + 0.5, y + 0.5, kTileWidth - 1, kTileHeight - 1);
    return [x, y];
  },

  _select: function(tile) {
    this._drawTileFace(this._selected);
    this._selected = tile;
    if(!tile) return;
    var [x, y] = this._getTileVisualCoords(tile);
    const ctx = this._contexts[tile.z * 2 + 1];
    ctx.fillStyle = "rgba(10%, 10%, 100%, 0.3)"
    ctx.fillRect(x, y, kTileWidth, kTileHeight);
  },
  _selected: null, // a Tile, or null

  _getTileVisualCoords: function(tile) {
    return [tile.x * kTileHalfWidth, tile.y * kTileHalfHeight];
  },

  onPairRemoved: function(tileA, tileB) {
    this._select(null);
    this._undrawTile(tileA);
    this._undrawTile(tileB);
  },

  _undrawTile: function(tile) {
    var [x, y] = this._getTileVisualCoords(tile);
    // clear tile face then clear shadow
    const ix = tile.z * 2, facectx = this._contexts[ix + 1], ectx = this._contexts[ix];
    facectx.clearRect(x, y, kTileWidth, kTileHeight);
    ectx.clearRect(x, y, kTileWidth, kTileHeight);
  },

  onPairUnremoved: function(tileA, tileB) {
    this._select(null);
    this._drawTile(tileA);
    this._drawTile(tileB);
  },

  onclick: function(event) {
    var pixelX = event.clientX - this._stack.boxObject.x;
    var pixelY = event.clientY - this._stack.boxObject.y;
    const depth = game.grid.length;
    for(var z = depth - 1; z >= 0; --z, pixelX += kLayerXOffset, pixelY += kLayerYOffset) {
      var x = Math.floor(pixelX / kTileHalfWidth);
      var y = Math.floor(pixelY / kTileHalfHeight);
      var tile = game.getTileAt(x, y, z);
      if(!tile) continue;
      if(tile.isFree) {
        if(tile == this._selected) this._select(null);
        else if(!game.doRemovePair(tile, this._selected)) this._select(tile);
      }
      return; // bail out once a tile is found
    }
    // clicking in empty space clears the selection
    this._select(null);
  }
}
