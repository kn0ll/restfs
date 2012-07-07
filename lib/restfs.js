var http = require('http'),
  _ = require('underscore'),
  journey = require('journey'),
  async = require('async'),
  fs = require('fs'),
  qs = require('querystring'),
  router = new(journey.Router);

function build_path (dir, file) {
  return [dir, file].join('/');
}

function build_paths (dir, files) {
  return _.map(files, function (file) {
    return build_path(dir, file);
  });
}

function normalize_path (dir, file) {
  return file? build_path(dir, qs.unescape(file)): dir;
}

//
// get dir/file json helpers
//

function catch_read_err(cb, action) {
  return function(err, res) {
    if (err) {
      err.status = 404;
      cb(err);
    } else {
      action(res);
    }
  }
}

function stats_to_json (stats) {
  return _.extend(stats, {
    isDirectory: stats.isDirectory(),
    isFile: stats.isFile()
  })
}

function dir_json (path, cb) {
  fs.readdir(path, catch_read_err(cb, function(files) {
    async.map(build_paths(path, files), fs.stat, catch_read_err(cb, function (stats) {
      cb(null, _.reduce(_.zip(files, stats), function (ret, file) {
        ret[file[0]] = stats_to_json(file[1]);
        return ret;
      }, {}));
    }));
  }));
}

function file_json (path, cb) {
  fs.stat(path, catch_read_err(cb, function(stats) {
    cb(null, stats_to_json(stats));
  }));
}

function get_json (path, cb) {
  fs.stat(path, catch_read_err(cb, function(stats) {
    if (stats.isDirectory()) {
      dir_json(path, cb);
    } else {
      file_json(path, cb);
    }
  }));
}

// post dir/file helpers

function write_file(path, cb) {
  fs.stat(path, function(err, stats) {
    if (stats) {
      stats.status = 409;
      cb(stats);
    } else {
      fs.writeFile(path, '', function (err) {
        if (err) {
          err.status = 500;
          cb(err);
        } else {
          fs.stat(path, function(err, stats) {
            if (err) {
              err.status = 500;
              cb(err);
            } else {
              cb(null, stats);
            }
          });
        }
      });
    }
  });
}

// delete dir/file helpers

function delete_file(path, cb) {
  fs.stat(path, function(err, stats) {
    if (err) {
      err.status = 404;
      cb(err);
    } else {
      fs.unlink(path, function (err) {
        if (err) {
          err.status = 500;
          cb(err);
        } else {
          cb();
        }
      });
    }
  });
}

//
// misc http helpers
//

function send_favicon (req, res) {
  res.writeHead(200, { 'Content-Type': 'image/x-icon' });
  res.end();
}

module.exports = function(path, api_base) {

  path = path || '/'
  api_base = api_base || '/';

  router.map(function () {

    var route = new RegExp('^' + api_base + '(.+)?$');

    this.get(route).bind(function (req, res, file) {
      get_json(normalize_path(path, file), function (err, json) {
        if (err) {
          res.send(err.status, {}, err);
        } else {
          res.send(200, {}, json);
        }
      });
    });

    this.post(route).bind(function (req, res, file) {
      write_file(normalize_path(path, file), function(err, stats) {
        if (err) {
          res.send(err.status, {}, err);
        } else {
          res.send(201, {}, stats);
        }
      });
    });

    this.del(route).bind(function (req, res, file) {
      delete_file(normalize_path(path, file), function(err) {
        if (err) {
          res.send(err.status, {}, err);
        } else {
          res.send(200);
        }
      });
    });

  });

  return function(req, res) {
    var body = '';
    req.addListener('data', function (chunk) { body += chunk });
    req.addListener('end', function () {
      if (req.url == '/favicon.ico') {
        send_favicon(req, res);
      } else {
        router.handle(req, body, function (result) {
          res.writeHead(result.status, result.headers);
          res.end(result.body);
        });
      }
    });
  }

}