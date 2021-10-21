# Drzewacz
Drzewacz (see Tolkien's [Fangorn/Treebeard](https://en.wikipedia.org/wiki/Treebeard)) is a static web file browser that needs no backend. It uses the json output of "tree" command.

You only nned to put your files into "contents" folder (or replace it with a symlink or whatever) and serve it with anything that can serve static files.
```
cd contents
tree -fsDJ --timefmt=%s --noreport -o ../assets/dirtree.json
```
