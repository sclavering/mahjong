var grid = null;

window.onload = function() {
  window.onload = null;
  layouts.init();
  grid = new Grid(layouts.get("simple"));
}
