class _Logger
  constructor: (@monitor) ->

  progress: (percent) ->
    @monitor.setPercentComplete percent

  notice: (msg) ->
    @monitor.log(msg)
    Logger.info(msg)

  info: (msg) ->
    Logger.info(msg)

  debug: (msg) ->
    Logger.debug(msg)

class RowawebLogger
  instance = null

  @init: (monitor) ->
    instance = new _Logger(monitor)
    instance

  @get: -> instance

rowaweb.logger = RowawebLogger