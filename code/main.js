var grid = null;

window.onload = function() {
  window.onload = null;
  layouts.init();
  ui.init();
  grid = new Grid(layouts.get("simple"));
  ui.show(grid._grid);
}
