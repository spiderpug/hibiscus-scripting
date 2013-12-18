class Sync
  constructor: (@hiAccount) ->
    @account = new rowaweb.account(hiAccount)
    @logger = rowaweb.logger.get()

  synchronizeAccount: () ->
    @logger.progress 5

    unless @account.login()
      @logger.progress 100
      return

    validTransactions = @account.transactions()

    if validTransactions.length and @account.balance
      @hiAccount.setSaldo @account.balance
      @hiAccount.store()

    @logger.progress 30

    validTransactions = @_storeBalancesInTransactions(validTransactions)

    newTransactions = @_storeTransactions(validTransactions)

    true

  finish: () ->
    @account?.close()
    true

  # removes transactions that are already present in the account
  # and returns hiTransactions that are new
  _storeTransactions: (transactions) ->
    db = Application.getServiceFactory().lookup(HBCI, 'database')
    knownTransactions = @_storedTransactions()

    for transaction, i in transactions
      @logger.progress 30 + (69 / transactions.length) * i

      hiTransaction = db.createObject(Umsatz, null);
      hiTransaction.setKonto(@hiAccount)

      hiTransaction = transaction.prepareHiTransaction(hiTransaction)

      unless knownTransactions?.contains(hiTransaction)
        @logger.info "Speichere Transaktion #{transaction}."
        hiTransaction.store()
      else
        @logger.info "Transaktion bereits vorhanden: #{transaction}."

    true

  # reverse loop transactions (newest -> oldest) and apply balances
  _storeBalancesInTransactions: (transactions) ->
    balance = @hiAccount.getSaldo()

    for transaction in transactions.slice(0).reverse()
      transaction.balance = balance

      balance -= transaction.amount
      balance = Math.round(balance * 100) / 100

    transactions

  _storedTransactions: ->
    lastSync = @account.getSyncStartDate()
    daysAgo = (new Date() - lastSync) / rowaweb.h.oneDay

    # Add one week tolerance
    @hiAccount.getUmsaetze(daysAgo + 7)


rowaweb.sync = Sync
