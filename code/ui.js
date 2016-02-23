const kTileWidth = 56;
const kTileHalfWidth = 28;
const kTileHeight = 80;
const kTileHalfHeight = 40;
const kLayerXOffset = -4;
const kLayerYOffset = -4;

const kUiHighlightLayerOffset = 2; // shadow layer for the layer above the tile

const ui = {
  _images: {},   // <html:img>s for drawing
  _contexts: [], // array of CanvasRenderingContext2D
  _dimensions: [0,0,0],  // width,height,depth last used

  init: function() {
    this._stack = document.getElementById("gamearea");
    this._contexts = []; // nsIDOMCanvasRenderingContext2D
    const images = document.getElementById("html_img_elements");
    // the |if| skips over the whitespace text nodes
    for(let el of images.childNodes) if(el.id) this._images[el.id] = el;
  },

  // pass a z-y-x indexed array of Tile objects and nulls
  show: function(grid) {
    this._select(null);
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
    // We use two <canvas>es per layer (one for tiles, one for their shadows).
    // Highlights for selected tiles are drawn into the shadow <canvas> for the
    // layer above, so an extra one is needed.
    // Since the offsets used to mimic 3D are both negative, the first canvas
    // (for the shadows of the bottom layer) gets the *most* offset.  We then
    // only reduce it between a layer's shadow canvas and its faces canvas.
    for(var z = 0, offset = d; z != d * 2 + 1; ++z, offset -= z % 2) {
      var canvas = document.createElement("canvas");
      canvas.style.position = "absolute";
      canvas.style.width = (canvas.width = pxwidth) +"px";
      canvas.style.height = (canvas.height = pxheight) + "px";
      canvas.style.top = (offset * -kLayerYOffset) + "px";
      canvas.style.left = (offset * -kLayerXOffset) + "px";
      this._stack.appendChild(canvas);
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
    // draw shadow
    this._rect(tile, 0, "rgba(128, 128, 128, 0.3)");
    // draw face
    var [x, y] = this._getTileVisualCoords(tile);
    const ctx2 = this._contexts[tile.z * 2 + 1];
    ctx2.clearRect(x, y, kTileWidth, kTileHeight);
    ctx2.drawImage(this._images["tile-" + tile.value], x, y);
    // draw an extra border, since the tiles lack left borders
    ctx2.fillStyle = "black";
    ctx2.strokeRect(x + 0.5, y + 0.5, kTileWidth - 1, kTileHeight - 1);
  },

  showHint: function(tiles) {
    this._rects(this._hintTiles, "");
    this._hintTiles = tiles;
    this._rects(tiles, "rgba(90%, 90%, 0%, 0.4)");
  },
  _rects: function(tiles, colour) {
    if(!tiles) return;
    for(let t of tiles) this._rect(t, kUiHighlightLayerOffset, colour);
  },
  _hintTiles: [],

  _select: function(tile) {
    // perhaps not optimal - clears the hint as you select the first tile
    this.showHint(null);
    this._rect(this._selected, kUiHighlightLayerOffset, "");
    this._rect(tile, kUiHighlightLayerOffset, "rgba(75%, 75%, 100%, 0.4)");
    this._selected = tile;
  },
  _selected: null, // a Tile, or null

  _rect: function(tile, zTweak, fillStyle) {
    if(!tile) return;
    const ctx = this._contexts[2 * tile.z + zTweak];
    const x = tile.x * kTileHalfWidth, y = tile.y * kTileHalfHeight;
    ctx.clearRect(x, y, kTileWidth, kTileHeight);
    if(!fillStyle) return
    ctx.fillStyle = fillStyle;
    ctx.fillRect(x, y, kTileWidth, kTileHeight);
  },

  _getTileVisualCoords: function(tile) {
    return [tile.x * kTileHalfWidth, tile.y * kTileHalfHeight];
  },

  onPairRemoved: function(tileA, tileB) {
    this._select(null);
    this._undrawTile(tileA);
    this._undrawTile(tileB);
  },

  _undrawTile: function(tile) {
    this._rect(tile, 1, ""); // clear face
    this._rect(tile, 0, ""); // clear shadow
  },

  onPairUnremoved: function(tileA, tileB) {
    this._select(null);
    this._drawTile(tileA);
    this._drawTile(tileB);
  },

  onclick: function(event) {
    const rect = this._stack.getBoundingClientRect();
    var pixelX = event.clientX - rect.left;
    var pixelY = event.clientY - rect.top;
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
