class Website
  baseUrl: 'https://secure.moneyou.de'
  page: undefined

  constructor: ->
    @logger = rowaweb.logger.get()
    @_setupClient()

  _setupClient: ->
    @client  = new WebClient()

    options = @client.getOptions()
    options.setUseInsecureSSL false
    options.setRedirectEnabled true
    options.setJavaScriptEnabled true
    options.setThrowExceptionOnScriptError false
    options.setThrowExceptionOnFailingStatusCode false
    options.setCssEnabled false

    @client

  hasText: (text) ->
    html = @page.asXml().toString()

    html.match new RegExp(text, 'g')

  back: ->
    @client.getWebWindows().get(0).getHistory().back()
    @page = @client.getWebWindows().get(0).getEnclosedPage()

  logout: ->
    element = @page.getFirstByXPath("//a[@class='logOff']")
    @page = element.click()

    @hasText "erfolgreich abgemeldet"

  get: (url) ->
    _url = "#{@baseUrl}#{url}"
    @page = @client.getPage(_url)

  _formForOptions: (options) ->
    form = options.form

    if (typeof form).equals "string"
      form = @page.getFormByName(form)

    form

  fillIn: (field, options) ->
    value = options.with
    form = @_formForOptions(options)
    form.getInputByName(field).setValueAttribute(value)

  selectOption: (field, options) ->
    didSelect = false
    form = @_formForOptions(options)
    selectByValue = options.value?

    element = form.getSelectByName(field)

    selectOptions = element.getOptions()
    length = selectOptions.size() - 1

    for i in [0..length]
      option = selectOptions.get(i)

      if selectByValue
        if option.getValueAttribute().equals options.value
          option.setSelected(true)
          didSelect = true
      else
        throw 'No implemented'

    unless didSelect
      @logger.debug @page.asXml()
      throw "Option '#{options.value}' in Feld '#{field}'' nicht gefunden."

    true

  pressButton: (name) ->
    @page = @page.getElementByName(name).click()

  clickLeftNav: (id) ->
    element = @page.getFirstByXPath("//a[@id='#{id}']")
    @page = element.click()

  currentPage: ->
    @page

rowaweb.website = Website
