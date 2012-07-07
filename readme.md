restfs
===

restfs exposes your file system as a rest api via nodejs. this is not a static file server, but instead lets you browse stats, and manipulate files through arbitrary paths.

installation
===

    $ npm install restfs

use
===

interface
---

you can create a restfs api using the standalone server or including it in your own. either method exposes a standard REST interface which currently implements the following methods:

- `GET /path/to/directory` - returns stats for a collection of files
- `GET /path/to/file` - returns stats for a specific file
- `POST /path/to/file` - create a specific file
- `DELETE /path/to/file` - removes a specific file

server
---

to start a simple server, simply run `restfs`. `dir` and `port` options are available, which default to `process.cwd()` and `8000` respectively. to browse a given directory from [http://localhost:8000/](http://localhost:8000/), simply run

    $ restfs

library
---

you can provide restfs as middleware to your http, connect, or express server. the `restfs` function accepts two arguments: `path`, and `api_base` which default to `/` and `/` respectively. for instance, to access the directory `foo` under my home directory `/home/catshirt`, via [http://localhost/foo](http://localhost/foo)

    var http = require('http'),
        restfs = require('../lib/restfs'),
        server = http.createServer();

    server.on('request', restfs('/home/catshirt'));
    server.listen(80);