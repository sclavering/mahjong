var game = null;
var gLayoutId = null;

window.onload = function() {
  window.onload = null;
  layouts.init();
  initLayoutsMenu();
  ui.init();
  // need the timeout to make the later window.resizeTo call do something
  setTimeout(delayed_onload, 0);
}

function delayed_onload() {
  // triggers a new game
  document.getElementById("layoutbtn").selectedIndex = 0;
}

function initLayoutsMenu() {
  const popup = document.getElementById("layoutbtn").firstChild;
  for(var id in layouts._gridTemplates) {
    var mi = document.createElement("menuitem");
    mi.setAttribute("value", id);
    mi.setAttribute("label", id); // I hate XUL
    popup.appendChild(mi);
  }
}

function selectLayout(event) {
  gLayoutId = event.target.value;
  newGame();
}

function newGame() {
  game = new Game(layouts.get(gLayoutId));
  ui.show(game.grid);
}

