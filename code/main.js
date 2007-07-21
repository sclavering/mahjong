var game = null;

window.onload = function() {
  window.onload = null;
  layouts.init();
  ui.init();
  game = new Game(layouts.get("cloud"));
  ui.show(game.grid);
}
