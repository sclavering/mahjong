var game = null;
var gLayoutId = null;

window.onload = function() {
  window.onload = null;
  layouts.init();
  buildLayoutPicker();
  ui.init();
  // need the timeout to make the later window.resizeTo call do something
  setTimeout(delayed_onload, 0);
}

function delayed_onload() {
  // triggers a new game
  document.getElementById("layoutbtn").selectedIndex = 0;
}

function buildLayoutPicker() {
  const block = document.getElementById("layoutpicker");
  const xhtml = "http://www.w3.org/1999/xhtml";
  // A temporary canvas used to draw previews of the layouts
  const canvas = document.createElementNS(xhtml, "canvas");
  const ctx = canvas.getContext("2d");
  for(var id in layouts._gridTemplates) {
    var template = layouts._gridTemplates[id];
    // using xhtml because xul:button has a XBL hbox that makes layout difficult
    var btn = document.createElementNS(xhtml, "button");
    btn.className = "layoutbutton";
    var img = document.createElementNS(xhtml, "img");
    img.src = _renderLayoutPreview(template, ctx);
    btn.layout_id = id;
    btn.appendChild(img);
    btn.appendChild(document.createTextNode(id));
    block.appendChild(btn);
  }
}


function _renderLayoutPreview(template, ctx) {
  // grid dimensions
  const d = template.length, h = template[0].length, w = template[0][0].length;
  // tile dimensions, tile half-dimensions, and layer offsets
  const tw = 6, thw = 3, th = 8, thh = 4, xo = 1, yo = 2;
  ctx.canvas.height = 0; // clears the image
  ctx.canvas.width = w * thw + (d - 1) * xo;
  ctx.canvas.height = h * thh + (d - 1) * yo;
  ctx.strokeStyle = "black";
  ctx.fillStyle = "white";
  for(var z = 0; z != d; ++z) {
    var offset = (d - z - 1);
    for(var y = 0; y != h; ++y) {
      for(var x = 0; x != w; ++x) {
        if(!template[z][y][x]) continue;
        var tx = xo * offset + x * thw;
        var ty = yo * offset + y * thh;
        ctx.fillRect(tx, ty, tw, th);
        ctx.strokeRect(tx + 0.5, ty + 0.5, tw - 1, th - 1);
      }
    }
  }
  return ctx.canvas.toDataURL();
}

function showLayoutPicker() {
  document.getElementById("gamearea").hidden = true;
  // display:box seems to break the xul hidden= attribute/property
  document.getElementById("layoutpicker").className = "";
}

function selectLayout(event) {
  if(event.target.localName != "button") return;
  document.getElementById("layoutpicker").className = "hidden";;
  document.getElementById("gamearea").hidden = false;
  gLayoutId = event.target.layout_id;
  newGame();
}

function newGame() {
  game = new Game(layouts.get(gLayoutId));
  ui.show(game.grid);
}

function hint() {
  ui.showHint(game.getHint());
}
