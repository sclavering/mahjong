var game = null;

window.onload = function() {
  window.onload = null;
  layouts.init();
  ui.init();
  game = new Game(layouts.get("simple"));
  ui.show(game.grid);
}
