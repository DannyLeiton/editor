var Filesystem, Link, React, Router, _;

React = require('react/addons');

_ = require('lodash');

Router = require('react-router');

Link = Router.Link;

Filesystem = require('./filesystem');

module.exports = React.createClass({
  folderFiles: function() {
    return _.map(this.props.dir.files, (function(_this) {
      return function(file) {
        file.href = _this.props.reuseTabHref(file.path);
        file.name = file.path;
        return file;
      };
    })(this));
  },
  render: function() {
    return React.createElement("div", null, React.createElement("div", {
      "className": 'row'
    }, React.createElement("div", {
      "className": 'col editor-col full m12'
    }, React.createElement("div", {
      "className": 'editor'
    }, React.createElement("ul", null, _.map(this.folderFiles(), (function(_this) {
      return function(file) {
        return React.createElement("li", null, React.createElement(Link, {
          "to": 'file',
          "params": {
            splat: file.href
          }
        }, file.type, " - ", file.name));
      };
    })(this)))))));
  }
});
