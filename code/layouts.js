const layouts = {
  // values of FOO for which chrome://mozjong/content/layouts/FOO is a layout file
  _layouts: [
    'test-simple',
    'test-towers',
    'test-brokentowers',
    'test-minipyramid',
    // real layouts
    'easy',
    'cloud',
  ],

  // layout-id -> template map.  templates are z-y-x-indexed arrays of booleans
  _gridTemplates: {},

  get: function(id) {
    return this._gridTemplates[id] || null;
  },

  init: function() {
    const req = new XMLHttpRequest();
    const texts = {};
    for each(var id in this._layouts) {
      req.open("GET", 'chrome://mozjong/content/layouts/' + id, false); //synchronous
      req.send(null);
      dump("loaded:\n==========\n"+req.responseText+"\n===========\n");
      texts[id] = req.responseText;
    }
    for(id in texts) this._gridTemplates[id] = this._parseLayout(texts[id]);
  },

  _parseLayout: function(txt) {
    const linelength = txt.indexOf("\n");
    const layerlength = txt.indexOf("\n\n") + 1;
    const layerheight = layerlength / (linelength + 1);
    if(layerheight != Math.floor(layerheight)) throw "layout very broken: non-integer number of rows";
    return [this._parseLayer(layer, linelength, layerheight) for each(layer in txt.split("\n\n"))];
  },

  _parseLayer: function(txt, layerWidth, layerHeight) {
    const lines = [this._parseLine(line, layerWidth) for each(line in txt.split("\n"))];
    if(lines.length != layerHeight) throw "layer in layout has wrong height";
    return lines;
  },

  _parseLine: function(str, expectedLength) {
    if(str.length != expectedLength) throw "bad line length in layout";
    return [ch != "." for each(ch in str)];
  }
}
