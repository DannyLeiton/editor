var $, ChangeDistDirToast, Filesystem, Header, Navigation, NewApp, Promise, React, RouteHandler, Router, _, flatten, request;

React = require('react/addons');

flatten = require('flat');

_ = require('lodash');

$ = window.jQuery = window.$ = require('jquery');

request = require('request');

Promise = require('bluebird');

require('./materialize');

Router = require('react-router');

RouteHandler = Router.RouteHandler;

Navigation = Router.Navigation;

Header = require('./header');

Filesystem = require('./filesystem');

NewApp = require('./new_app');

ChangeDistDirToast = require('./change_dist_dir_toast');

module.exports = React.createClass({
  getInitialState: function() {
    this.bindKeys();
    track('loaded');
    return {
      clean_files: _.cloneDeep(Filesystem.ls()),
      action_in_progress: false,
      first_build_done: false,
      show_free_hosting: false,
      show_change_dist_dir: this.props.show_change_dist_dir,
      dist_dir: this.props.dist_dir
    };
  },
  showFreeHosting: function() {
    return this.setState({
      show_free_hosting: true
    });
  },
  hideFreeHosting: function() {
    return this.setState({
      show_free_hosting: false,
      free_hosting_shown: true
    });
  },
  bindKeys: function() {
    return $(window).bind('keydown', (function(_this) {
      return function(event) {
        if (!(event.ctrlKey || event.metaKey)) {
          return;
        }
        switch (String.fromCharCode(event.which).toLowerCase()) {
          case 's':
            event.preventDefault();
            return _this.previewClick();
          case 'e':
            event.preventDefault();
            return _this.codeClick();
        }
      };
    })(this));
  },
  mixins: [Navigation],
  editorChange: function(path, new_content) {
    return Filesystem.write(path, new_content);
  },
  codeClick: function() {
    track('code_clicked');
    return this.transitionWithCodeModeHistory('code', '/code/*?');
  },
  previewClick: function() {
    track('preview_clicked');
    if (!this.state.free_hosting_shown) {
      setTimeout(this.showFreeHosting, 9000);
    }
    if (this.state.action_in_progress) {
      return;
    }
    if (this.context.router.getCurrentPath().match(/^\/preview/)) {
      return this.buildOrRefresh();
    } else {
      return this.transitionWithCodeModeHistory('preview', 'preview-with-history');
    }
  },
  transitionWithCodeModeHistory: function(route, with_history_route) {
    track('transitioned_to', {
      route: route
    });
    if (_.isEmpty(this.context.router.getCurrentParams())) {
      return this.transitionTo(route);
    } else {
      return this.transitionTo(with_history_route, this.context.router.getCurrentParams());
    }
  },
  publishClick: function() {
    track('publish_clicked');
    if (this.state.action_in_progress) {
      return;
    }
    return this.transitionWithCodeModeHistory('publish', '/publish/*?');
  },
  handleError: function(msg) {
    track('error_happened', {
      message: msg
    });
    this.setState({
      error: msg
    });
    return this.transitionWithCodeModeHistory('error', '/error/*?');
  },
  changedFiles: function() {
    return _.reject(Filesystem.ls(), (function(_this) {
      return function(new_file) {
        var clean_file;
        clean_file = _.detect(_this.state.clean_files, function(file) {
          return file.path === new_file.path;
        });
        return clean_file.content === new_file.content;
      };
    })(this));
  },
  build: function() {
    return this.buildOrRefresh();
  },
  buildOrRefresh: function() {
    if (this.filesChanged() || !this.state.first_build_done) {
      return this.execBuild();
    } else {
      return this.refreshBrowser();
    }
  },
  refreshBrowser: function() {
    return new Promise((function(_this) {
      return function(resolve, reject) {
        var browser_ref, ref;
        browser_ref = (ref = _this.refs.appRouteHandler.refs.__routeHandler__) != null ? ref.refs.browser : void 0;
        if (!browser_ref) {
          return resolve();
        }
        browser_ref.refresh();
        return resolve();
      };
    })(this));
  },
  execBuild: function() {
    track('build_started');
    this.actionStarted();
    return new Promise((function(_this) {
      return function(resolve, reject) {
        return request.post({
          json: true,
          body: {
            files: _this.changedFiles()
          },
          url: window.location.origin + "/apps/" + APP_SLUG + "/live_edit/preview"
        }, function(err, status, resp) {
          if (err) {
            return reject(err);
          }
          if (!resp.success) {
            return reject(resp.error);
          }
          _this.setState({
            clean_files: _.cloneDeep(Filesystem.ls()),
            first_build_done: true
          });
          _this.actionStopped();
          track('build_finished');
          return resolve();
        });
      };
    })(this));
  },
  filesChanged: function() {
    return !_.isEmpty(this.changedFiles());
  },
  publishToGithub: function() {
    track('publish_started');
    if (this.filesChanged()) {
      return this.build().then(this.publishToGithub)["catch"]((function(_this) {
        return function(err) {
          return _this.handleError(err);
        };
      })(this));
    } else {
      this.actionStarted();
      return this.execPublish().then((function(_this) {
        return function(resp) {
          if (!resp.success) {
            return _this.handleError(resp.error);
          }
          return track('publish_to_github_finished');
        };
      })(this))["catch"]((function(_this) {
        return function(err) {
          return _this.handleError(err);
        };
      })(this));
    }
  },
  waitForPublishToServer: function() {
    return new Promise((function(_this) {
      return function(resolve, reject) {
        return pusher_user_channel.bind('app.build', function() {
          track('publish_to_server_finished');
          _this.actionStopped();
          return resolve();
        });
      };
    })(this));
  },
  execPublish: function() {
    return new Promise((function(_this) {
      return function(resolve, reject) {
        return request.post({
          json: true,
          url: window.location.origin + "/apps/" + APP_SLUG + "/live_edit/publish"
        }, function(err, status, resp) {
          if (err) {
            return reject(err);
          }
          return resolve(resp);
        });
      };
    })(this));
  },
  activeMode: function() {
    var routes;
    routes = this.context.router.getCurrentRoutes();
    return _.first(routes[1].name.split('-'));
  },
  actionStarted: function() {
    return this.setState({
      action_in_progress: true
    });
  },
  actionStopped: function() {
    return this.setState({
      action_in_progress: false
    });
  },
  openSettings: function() {
    this.hideChangeDistDirToast();
    return this.transitionWithCodeModeHistory('settings', '/settings/*?');
  },
  hideChangeDistDirToast: function() {
    return this.setState({
      show_change_dist_dir: false
    });
  },
  saveDistDir: function(dist_dir) {
    return new Promise((function(_this) {
      return function(resolve, reject) {
        return request.post({
          json: true,
          url: window.location.origin + "/apps/" + APP_SLUG + "/live_edit/change_dist_dir",
          body: {
            dist_dir: dist_dir
          }
        }, function(err, status, resp) {
          if (err) {
            return reject(err);
          }
          _this.setState({
            dist_dir: resp.dist_dir
          });
          return resolve(resp);
        });
      };
    })(this));
  },
  saveSlug: function(slug) {
    return new Promise((function(_this) {
      return function(resolve, reject) {
        return request.post({
          json: true,
          url: window.location.origin + "/apps/" + APP_SLUG + "/live_edit/change_slug",
          body: {
            slug: slug
          }
        }, function(err, status, resp) {
          if (err) {
            return reject(err);
          }
          window.location.origin = _this.newEditorUrl(resp.slug);
          return resolve(resp);
        });
      };
    })(this));
  },
  newEditorUrl: function(slug) {
    return window.location.href = window.location.origin + "/apps/" + slug + "/live_edit" + window.location.hash;
  },
  render: function() {
    return React.createElement("main", {
      "className": 'editor-wrapper'
    }, React.createElement(Header, {
      "action_in_progress": this.state.action_in_progress,
      "website_url": this.props.website_url,
      "active_mode": this.activeMode(),
      "onCodeClick": this.codeClick,
      "onPreviewClick": this.previewClick,
      "onPublishClick": this.publishClick,
      "avatar": this.props.avatar
    }), React.createElement(RouteHandler, {
      "browser_url": this.props.browser_url,
      "website_url": this.props.website_url,
      "slug": this.props.slug,
      "dist_dir": this.state.dist_dir,
      "editorChange": this.editorChange,
      "build": this.build,
      "handleError": this.handleError,
      "error": this.state.error,
      "transitionWithCodeModeHistory": this.transitionWithCodeModeHistory,
      "files_changed": this.filesChanged(),
      "publishToGithub": this.publishToGithub,
      "waitForPublishToServer": this.waitForPublishToServer,
      "actionStopped": this.actionStopped,
      "saveDistDir": this.saveDistDir,
      "saveSlug": this.saveSlug,
      "ref": 'appRouteHandler'
    }), React.createElement(NewApp, {
      "show": this.state.show_free_hosting,
      "close": this.hideFreeHosting
    }), React.createElement(ChangeDistDirToast, {
      "show": this.state.show_change_dist_dir,
      "dist_dir": this.state.dist_dir,
      "onClose": this.hideChangeDistDirToast,
      "onClick": this.openSettings
    }));
  }
});
