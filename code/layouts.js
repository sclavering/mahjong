const layouts = {
  // layout-id -> template map.  templates are z-y-x-indexed arrays of booleans
  _gridTemplates: {},

  get: function(id) {
    return this._gridTemplates[id] || null;
  },

  init: function() {
    for(let id in layout_data) this._gridTemplates[id] = _parse_layout(layout_data[id]);

    function _parse_layout(txt) {
      txt = txt.trim();
      const layers = txt.split("\n\n").map(layer => layer.split("\n").map(s => s.trim()));
      return layers.map(l => _parse_layer(l, layers[0].length, layers[0][0].length));
    }

    function _parse_layer(layer, expected_height, expected_width) {
      if(layer.length !== expected_height) throw Error("bad layout");
      return layer.map(line => _parse_line(line, expected_width));
    }

    function _parse_line(line, expected_width) {
      if(line.length !== expected_width) throw Error("bad layout");
      return [].slice.call(line).map(ch => ch !== ".");
    }
  },
};
