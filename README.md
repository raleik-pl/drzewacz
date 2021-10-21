# Drzewacz
Drzewacz (see Tolkien's [Fangorn/Treebeard](https://en.wikipedia.org/wiki/Treebeard)) is a static web file browser that needs no backend. It uses the json output of "tree" command.

```
cd contents
tree -fhJ --noreport --dirsfirst --sort=name -o ../assets/dirtree.json
```
