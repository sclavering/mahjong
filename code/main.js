var game = null;

window.onload = function() {
  window.onload = null;
  layouts.init();
  ui.init();
  game = new Game(layouts.get("easy"));
  ui.show(game.grid);
}
