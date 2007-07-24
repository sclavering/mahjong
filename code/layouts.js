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
    'confoundingcross',
    'pyramidswalls',
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
    const layerstrs = txt.split("\n\n");
    return [this._parseLayer(i, layerstrs[i], linelength, layerheight) for(i in layerstrs)];
  },

  _parseLayer: function(index, txt, layerWidth, layerHeight) {
    const lines = [this._parseLine(line, layerWidth) for each(line in txt.split("\n"))];
    if(lines.length != layerHeight)
      throw "layer "+index+" in layout has height "+lines.length+" (should be "+layerHeight+")";
    return lines;
  },

  _parseLine: function(str, expectedLength) {
    if(str.length != expectedLength) throw "bad line length in layout";
    return [ch != "." for each(ch in str)];
  }
}
