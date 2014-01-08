class Account
  _debug: false
  balance: 0

  constructor: (@hiAccount) ->
    @logger = rowaweb.logger.get()
    @site = new rowaweb.website()

  getSyncStartDate: ->
    oneDay = rowaweb.h.oneDay

    # letzte kontoaktualisierung
    lastBalanceDate = @hiAccount.getSaldoDatum()
    startDate = new Date()
    currentTime = new Date()

    if !lastBalanceDate || @_debug
      @logger.info 'Kein Saldendatum fuer das Konto gefunden, rufe die letzten 360 Tage ab.'
      startDate = new Date(currentTime.getTime() - 360 * oneDay)
    else
      @logger.debug "Letztes Abrufdatum: #{rowaweb.h.dateToString lastBalanceDate}"

      startDate = new Date(lastBalanceDate.getTime() - 14 * oneDay)

    startDate

  login: ->
    loginPassword = @_askPassword()

    return false unless loginPassword

    try
      @_tryLogin loginPassword
    catch error
      @logger.notice "Login fehlgeschlagen: #{error}"
      return false

    @logger.progress 15
    @logger.notice "MoneYou-Login erfolgreich."

    true

  close: ->
    @logger.notice "Ausloggen..."
    @site.logout()

  transactions: ->
    @_moveToDownloadSection()
    @balance = @_extractSaldoFromSelect()

    start = rowaweb.h.dateToString @getSyncStartDate()
    end = rowaweb.h.dateToString new Date()

    @logger.notice "Rufe Umsatzanzeige von #{start} bis #{end} auf."

    @site.fillIn 'minDate', with: start, form: 'DownloadMovementForm'
    @site.fillIn 'maxDate', with: end, form: 'DownloadMovementForm'
    @site.pressButton 'btnNext'

    selectedAccountNumber = @site.currentPage()
      .getFirstByXPath('//select[@name="accountNumber"]//option[@selected]')
      .getValueAttribute()

    unless selectedAccountNumber.equals "50324040#{@hiAccount.getKontonummer()}"
      throw 'Konnte Accountauswahl nicht uebernehmen. Abbruch.'

    totalTransactions = @site.currentPage().getFirstByXPath('//span[@id="totalMovements"]').asText()
    totalTransactions = Number(totalTransactions)

    @logger.notice "#{totalTransactions} Umsaetz(e) gefunden."

    if totalTransactions == 0
      return []

    csvContent = @_downloadTransactions()

    csv = new rowaweb.csv(csvContent, ';')

    @logger.debug csv.rows

    transactions = []
    for row in csv.rows
      transaction = new rowaweb.transaction(row)
      if transaction.isValid()
        transactions.push transaction

    transactions

  _askPassword: ->
    try
      loginPassword = Application.getCallback().askPassword "Bitte geben Sie das Passwort zum MoneYou-Konto " +
        @hiAccount.getKontonummer() + " ein:"
    catch error
      @logger.notice 'Synchronisation durch Benutzer abgebrochen.'
      undefined

  _tryLogin: (password) ->
    @site.get('/thc/policyenforcer/pages/loginB2C.jsf')

    @site.fillIn 'j_username_pwd', with: @hiAccount.getKundennummer(), form: 'loginForm'
    @site.fillIn 'j_password_pwd', with: password, form: 'loginForm'

    @site.pressButton 'btnNext'

    page = @site.currentPage()
    try
      page.getFormByName('arcidHeaderBlockForm')
    catch
      @logger.debug @site.currentPage().asXml()
      throw "Login fehlgeschlagen. MoneYou-Loginbestaetigung nicht erkannt."

  _downloadTransactions: ->
    @logger.notice 'Download startet...'

    @site.pressButton 'fileDownload:0:'

    content = @site.currentPage()
      .getWebResponse()
      .getContentAsString()

    @site.back()

    content

  _dropdownOptionValue: ->
    "50324040#{@hiAccount.getKontonummer()}"

  _extractSaldoFromSelect: ->
    optionSelector = "//select[@name=\"accountNumber\"]//option[@value=\"#{@_dropdownOptionValue()}\"]"

    selectedAccountDescription = @site.currentPage()
      .getFirstByXPath(optionSelector)?.asText()

    matches = selectedAccountDescription?.match /([0-9.,]+)\s*EUR$/

    if matches?.length
      amount = matches[1]
      parseFloat amount.replace(/\./g, "").replace(/,/, ".")
    else
      @logger.debug selectedAccountDescription
      throw 'Saldo kann nicht ermittelt werden.'
      false

  _moveToDownloadSection: ->
    @site.clickLeftNav 'MNU:0:0:1'  # Buchungen

    @site.pressButton 'btnNext' # Anzeigen

    @site.pressButton 'downloadStatementsLinkButton' # Buchungen herunterladen

    try
      @site.currentPage().getFormByName('DownloadMovementForm')
    catch error
      @logger.debug @site.currentPage().asXml()
      throw "Kontouebersicht kann nicht geladen werden. Formular nicht gefunden: #{error}"

    @site.selectOption 'accountNumber',
      form: 'DownloadMovementForm'
      value: @_dropdownOptionValue()

    @logger.progress 22

rowaweb.account = Account
