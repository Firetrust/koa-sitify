/**
 * Module dependencies.
 */

var debug = require('debug')('koa-sitify');
var fs = require('fs');
var path = require('path');
var render = require('co-render');
var _ = require('koa-route');

/**
 * Expose `sitify`.
 */

module.exports = sitify;

/**
 * Cached templates.
 */

sitify.CACHE = (process.env.NODE_ENV || 'development') !== 'development';

/**
 * Base directory `root`.
 */

sitify.BASE_DIR = __dirname;

/**
 * Load routes in `root` directory.
 *
 * @param {Application} app
 * @param {String} root
 * @api public
 */

function sitify(app, root) {
  sitify.BASE_DIR = root;
  step(app, root);
}

/**
 * Recurrsive stepping.
 *
 * @param {Application} app
 * @param {String} dir
 * @api private
 */

function step(app, dir) {
  fs.readdirSync(dir).forEach(function(x) {
    var file = path.resolve(dir, x);
    var stats = fs.lstatSync(file);

    if (stats.isDirectory())
      step(app, file);
    else if (path.basename(file) === 'router.json')
      route(app, path.dirname(file), require(file));
  });
}

/**
 * Define routes in `app`.
 *
 * @param {Application} app
 * @param {String} dir
 * @param {Object} routes
 * @api private
 */

function route(app, dir, routes) {
  var mod, rel = dir.substr(sitify.BASE_DIR.length) || '/';

  debug('routes: %s', rel);

  try {
    mod = require(dir);
  } catch (err) {
    mod = {};
  }

  for (var k in routes) {
    var prop = routes[k];
    var request = k.split(' ');
    var method = request[0];
    var path = request[1] === '/' ? rel : rel + request[1];

    debug('%s %s -> .%s', method, path, prop);

    var fn = mod[prop] || view(dir, prop);

    app.use(_[method.toLowerCase()](path, fn));
  }
}

/**
 * Default middleware
 *
 * @param {String} dir
 * @param {String} file
 * @api private
 */

function view(dir, file) {
  var template = path.resolve(dir, file + '.pug');
  if (!fs.existsSync(template)) throw new Error(dir + ': template' + file + ' does not exist.');

  return function *view() {
    this.body = yield render(template, {path: this.path, basedir: sitify.BASE_DIR, cache: sitify.CACHE});
  };
}
