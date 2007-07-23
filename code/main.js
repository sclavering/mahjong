var game = null;

window.onload = function() {
  window.onload = null;
  layouts.init();
  ui.init();
  newGame();
}

function newGame() {
  game = new Game(layouts.get("test-minipyramid"));
  ui.show(game.grid);
}
