md = require 'marked'
$ = require 'jquery'
React = require 'react'

Router = require 'react-router'
Route = Router.Route
DefaultRoute = Router.DefaultRoute

InitialLoader = require './initial_loader'
App = require './app'
CodeMode = require './code_mode'
PreviewMode = require './preview_mode'
TabManager = require './tab_manager'
Publish = require './publish'

module.exports =
class Core
  constructor: (@base, @server) ->
    @initial_loader = new InitialLoader()

  load: ->
    @initial_loader.loadFilesAndData().then (data) =>
      @data = data
      @data.website_url = 'http://demo-312312.closeheatapp.com'

      Router.run @routes(), (Handler) =>
        React.render(<Handler website_url={@data.website_url} browser_url={@data.browser_url} />, document.body)

  routes: ->
    <Route handler={App} path='/'>
      <Route name='code' path='/code' handler={CodeMode}>
        <Route name='file' path='*?' handler={TabManager} />
        <DefaultRoute name='file-manager' handler={TabManager}/>

      </Route>
      <Route name='preview' path='/preview' handler={PreviewMode} />
      <Route name='preview-with-history' path='/preview/*?' handler={PreviewMode} />

      <Route name='publish' path='/publish' handler={Publish} />
      <Route name='publish-with-history' path='/publish/*?' handler={Publish} />
      <DefaultRoute handler={CodeMode} />
    </Route>
    # <DefaultRoute handler={Home} />
    # <Route name="about" handler={About} />
    # <Route name="users" handler={Users}>
    #   <Route name="recent-users" path="recent" handler={RecentUsers} />
    #   <Route name="user" path="/user/:userId" handler={User} />
    #   <NotFoundRoute handler={UserRouteNotFound}/>
    # </Route>
    # <NotFoundRoute handler={NotFound}/>
    # <Redirect from="company" to="about" />

$ ->
  new Core(APP_DOMAIN).load()
