class Transaction
  id: undefined
  documentDate: undefined
  comment: undefined
  amount: undefined
  valutaDate: undefined

  contraAccountName: undefined
  contraAccountNumber: undefined
  contraAccountAccountNumber: undefined

  purpose1: undefined
  purpose2: undefined
  primanota: undefined

  # filled by Sync
  balance: undefined

  constructor: (@cols) ->
    @logger = rowaweb.logger.get()

    if @cols[0].equals('Kontonummer:') or @cols[0].equals('Operationsnummer') or @cols.length < 11
      @logger.debug "Ueberspringe Zeile: #{@cols}"
      return

    @id = @cols[0]
    @documentDate = rowaweb.h.parseDate @cols[1]
    # kommentar [2]
    @amount = rowaweb.h.parseCurrency @cols[3]
    # Währung [4]
    @valutaDate = rowaweb.h.parseDate @cols[5]
    # Gegenkonto (BLZ KtNr) [6]
    # Gegenkonto Name [7]
    # Verwendungszweck [8]
    # Verwendungszweck [9]
    @primanota = @cols[10]

    @contraAccountName = @cols[7]
    if @contraAccountName.length < 2
      @comment = @cols[2]

    @_assignContraAccount cols[6]

    @_splitPurpose [@cols[8], @cols[9]].join(' ')

  _assignContraAccount: (ref) ->
    if ref?.length
      parts = ref.split(' ')

      if parts.length == 2
        @contraAccountNumber = parts[1]
        @contraAccountAccountNumber = parts[0]

  _splitPurpose: (text) ->
    text ||= ''
    @purpose1 = text.substr 0, 35

    if text.length > 35
      @purpose2 = text.substr 35, 35

    true

  isValid: ->
    try
      (typeof @amount).equals('number') and
      @contraAccountNumber.length > 2 and
      @contraAccountAccountNumber.length > 2 and
      @documentDate?.getDay()
      @valutaDate?.getDay()
    catch
      false

  toString: ->
    "<Transaction documentDate=#{@documentDate} " +
    " amount=#{@amount} contra=#{@contraAccountName} balance=#{@balance}" +
    " primanota=#{@primanota} comment=#{@comment} @purpose1=#{@purpose1}" +
    ">"

  prepareHiTransaction: (dbTransaction) ->
    dbTransaction.setDatum @documentDate
    dbTransaction.setValuta @valutaDate
    dbTransaction.setBetrag @amount
    dbTransaction.setSaldo @balance
    dbTransaction.setPrimanota @primanota
    dbTransaction.setGegenkontoName @contraAccountName

    if @contraAccountNumber?.length
      dbTransaction.setGegenkontoNummer @contraAccountNumber
      dbTransaction.setGegenkontoBLZ @contraAccountAccountNumber

    dbTransaction.setKommentar @comment

    dbTransaction.setZweck @purpose1
    dbTransaction.setZweck2 @purpose2

    dbTransaction

rowaweb.transaction = Transaction
