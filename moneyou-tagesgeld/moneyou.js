// *******************************************************************************
// * MoneYou Kontosynchronisation f. die Scripting-Funktionen von Jameica/Hibiscus
// *
// * Copyright (c) Robert Wachs / All rights reserved
// *
// * Version: 0.1.2 - 2014-01-09
// *******************************************************************************/;
var MONEYOU_BLZ, ROWAWEB_KONTO_SYNC, ROWAWEB_KONTO_SYNC_JOB_KONTOAUSZUG, rowaweb, rowawebMoneyouKontoSync, rowawebMoneyouOverviewSync, rowawebMoneyouOverviewSyncJobKontoauszug;

importPackage(Packages.de.willuhn.logging);

importPackage(Packages.de.willuhn.jameica.system);

importPackage(Packages.de.willuhn.jameica.hbci);

importPackage(Packages.de.willuhn.jameica.hbci.rmi);

importPackage(Packages.com.gargoylesoftware.htmlunit);

importPackage(Packages.com.gargoylesoftware.htmlunit.html);

importPackage(Packages.com.gargoylesoftware.htmlunit.util);

MONEYOU_BLZ = "50324040";

ROWAWEB_KONTO_SYNC = "rowawebMoneyouKontoSync";

ROWAWEB_KONTO_SYNC_JOB_KONTOAUSZUG = "rowawebMoneyouOverviewSyncJobKontoauszug";

events.add("hibiscus.konto.sync", ROWAWEB_KONTO_SYNC);

events.add("hibiscus.sync.function", "rowawebMoneyouOverviewSync");

rowawebMoneyouOverviewSync = function(account, type) {
  if (!account.getBLZ().equals(MONEYOU_BLZ)) {
    return null;
  }
  if (type.equals(SynchronizeJobKontoauszug)) {
    return ROWAWEB_KONTO_SYNC_JOB_KONTOAUSZUG;
  }
  return null;
};

rowawebMoneyouOverviewSyncJobKontoauszug = function(job, session) {
  var account, monitor;
  account = job.getKonto();
  monitor = session.getProgressMonitor();
  return this[ROWAWEB_KONTO_SYNC](account, monitor);
};

rowawebMoneyouKontoSync = function(account, monitor) {
  var kontonr;
  kontonr = account.getBLZ().toString();
  if (!kontonr.equals(MONEYOU_BLZ)) {
    return;
  }
  return rowaweb.entryPoint(account, monitor);
};

rowaweb = {};

rowaweb.entryPoint = function(hiAccount, monitor) {
  var error, logger, sync, _ref, _ref1, _ref2;
  logger = rowaweb.logger.init(monitor);
  sync = new rowaweb.sync(hiAccount);
  try {
    sync.synchronizeAccount();
  } catch (_error) {
    error = _error;
    logger.notice("Synchronisation fehlgeschlagen: " + error);
    logger.debug(error);
    logger.debug((_ref = sync.account) != null ? (_ref1 = _ref.site) != null ? (_ref2 = _ref1.currentPage()) != null ? _ref2.asXml() : void 0 : void 0 : void 0);
  } finally {
    try {
      sync.finish();
    } catch (_error) {
      null;
    }
  }
  return true;
};
(function() {
  var Account;

  Account = (function() {
    Account.prototype._debug = false;

    Account.prototype.balance = 0;

    function Account(hiAccount) {
      this.hiAccount = hiAccount;
      this.logger = rowaweb.logger.get();
      this.site = new rowaweb.website();
    }

    Account.prototype.getSyncStartDate = function() {
      var currentTime, lastBalanceDate, oneDay, startDate;
      oneDay = rowaweb.h.oneDay;
      lastBalanceDate = this.hiAccount.getSaldoDatum();
      startDate = new Date();
      currentTime = new Date();
      if (!lastBalanceDate || this._debug) {
        this.logger.info('Kein Saldendatum fuer das Konto gefunden, rufe die letzten 360 Tage ab.');
        startDate = new Date(currentTime.getTime() - 360 * oneDay);
      } else {
        this.logger.debug("Letztes Abrufdatum: " + (rowaweb.h.dateToString(lastBalanceDate)));
        startDate = new Date(lastBalanceDate.getTime() - 14 * oneDay);
      }
      return startDate;
    };

    Account.prototype.login = function() {
      var error, loginPassword;
      loginPassword = this._askPassword();
      if (!loginPassword) {
        return false;
      }
      try {
        this._tryLogin(loginPassword);
      } catch (_error) {
        error = _error;
        this.logger.notice("Login fehlgeschlagen: " + error);
        return false;
      }
      this.logger.progress(15);
      this.logger.notice("MoneYou-Login erfolgreich.");
      return true;
    };

    Account.prototype.close = function() {
      this.logger.notice("Ausloggen...");
      return this.site.logout();
    };

    Account.prototype.transactions = function() {
      var csv, csvContent, end, row, selectedAccountNumber, start, totalTransactions, transaction, transactions, _i, _len, _ref;
      this._moveToDownloadSection();
      this.balance = this._extractSaldoFromSelect();
      start = rowaweb.h.dateToString(this.getSyncStartDate());
      end = rowaweb.h.dateToString(new Date());
      this.logger.notice("Rufe Umsatzanzeige von " + start + " bis " + end + " auf.");
      this.site.fillIn('minDate', {
        "with": start,
        form: 'DownloadMovementForm'
      });
      this.site.fillIn('maxDate', {
        "with": end,
        form: 'DownloadMovementForm'
      });
      this.site.pressButton('btnNext');
      selectedAccountNumber = this.site.currentPage().getFirstByXPath('//select[@name="accountNumber"]//option[@selected]').getValueAttribute();
      if (!selectedAccountNumber.equals("50324040" + (this.hiAccount.getKontonummer()))) {
        throw 'Konnte Accountauswahl nicht uebernehmen. Abbruch.';
      }
      totalTransactions = this.site.currentPage().getFirstByXPath('//span[@id="totalMovements"]').asText();
      totalTransactions = Number(totalTransactions);
      this.logger.notice("" + totalTransactions + " Umsaetz(e) gefunden.");
      if (totalTransactions === 0) {
        return [];
      }
      csvContent = this._downloadTransactions();
      csv = new rowaweb.csv(csvContent, ';');
      this.logger.debug(csv.rows);
      transactions = [];
      _ref = csv.rows;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        row = _ref[_i];
        transaction = new rowaweb.transaction(row);
        if (transaction.isValid()) {
          transactions.push(transaction);
        }
      }
      return transactions;
    };

    Account.prototype._askPassword = function() {
      var error, loginPassword;
      try {
        return loginPassword = Application.getCallback().askPassword("Bitte geben Sie das Passwort zum MoneYou-Konto " + this.hiAccount.getKontonummer() + " ein:");
      } catch (_error) {
        error = _error;
        this.logger.notice('Synchronisation durch Benutzer abgebrochen.');
        return void 0;
      }
    };

    Account.prototype._tryLogin = function(password) {
      var page;
      this.site.get('/thc/policyenforcer/pages/loginB2C.jsf');
      this.site.fillIn('j_username_pwd', {
        "with": this.hiAccount.getKundennummer(),
        form: 'loginForm'
      });
      this.site.fillIn('j_password_pwd', {
        "with": password,
        form: 'loginForm'
      });
      this.site.pressButton('btnNext');
      page = this.site.currentPage();
      try {
        return page.getFormByName('arcidHeaderBlockForm');
      } catch (_error) {
        this.logger.debug(this.site.currentPage().asXml());
        throw "Login fehlgeschlagen. MoneYou-Loginbestaetigung nicht erkannt.";
      }
    };

    Account.prototype._downloadTransactions = function() {
      var content;
      this.logger.notice('Download startet...');
      this.site.pressButton('fileDownload:0:');
      content = this.site.currentPage().getWebResponse().getContentAsString();
      this.site.back();
      return content;
    };

    Account.prototype._dropdownOptionValue = function() {
      return "50324040" + (this.hiAccount.getKontonummer());
    };

    Account.prototype._extractSaldoFromSelect = function() {
      var amount, matches, optionSelector, selectedAccountDescription, _ref;
      optionSelector = "//select[@name=\"accountNumber\"]//option[@value=\"" + (this._dropdownOptionValue()) + "\"]";
      selectedAccountDescription = (_ref = this.site.currentPage().getFirstByXPath(optionSelector)) != null ? _ref.asText() : void 0;
      matches = selectedAccountDescription != null ? selectedAccountDescription.match(/([0-9.,]+)\s*EUR$/) : void 0;
      if (matches != null ? matches.length : void 0) {
        amount = matches[1];
        return parseFloat(amount.replace(/\./g, "").replace(/,/, "."));
      } else {
        this.logger.debug(selectedAccountDescription);
        throw 'Saldo kann nicht ermittelt werden.';
        return false;
      }
    };

    Account.prototype._moveToDownloadSection = function() {
      var error;
      this.site.clickLeftNav('MNU:0:0:1');
      this.site.pressButton('btnNext');
      this.site.pressButton('downloadStatementsLinkButton');
      try {
        this.site.currentPage().getFormByName('DownloadMovementForm');
      } catch (_error) {
        error = _error;
        this.logger.debug(this.site.currentPage().asXml());
        throw "Kontouebersicht kann nicht geladen werden. Formular nicht gefunden: " + error;
      }
      this.site.selectOption('accountNumber', {
        form: 'DownloadMovementForm',
        value: this._dropdownOptionValue()
      });
      return this.logger.progress(22);
    };

    return Account;

  })();

  rowaweb.account = Account;

}).call(this);
(function() {
  var CSV;

  CSV = (function() {
    function CSV(data, delimiter) {
      this.rows = this._parse(data, delimiter);
    }

    CSV.prototype._parse = function(data, delimiter) {
      var arrData, arrMatches, objPattern, strMatchedDelimiter, strMatchedValue;
      delimiter = delimiter || ",";
      objPattern = new RegExp("(\\" + delimiter + "|\\r?\\n|\\r|^)" + "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" + "([^\"\\" + delimiter + "\\r\\n]*))", "gi");
      arrData = [[]];
      arrMatches = null;
      while (arrMatches = objPattern.exec(data)) {
        strMatchedDelimiter = arrMatches[1];
        if (strMatchedDelimiter.length && (!strMatchedDelimiter.equals(delimiter))) {
          arrData.push([]);
        }
        strMatchedValue = arrMatches[2] ? arrMatches[2].replace(new RegExp("\"\"", "g"), "\"") : arrMatches[3];
        arrData[arrData.length - 1].push(strMatchedValue);
      }
      return arrData;
    };

    return CSV;

  })();

  rowaweb.csv = CSV;

}).call(this);
(function() {
  var Helper;

  Helper = (function() {
    function Helper() {}

    Helper.prototype.accountNumberToMYFormat = function(number) {
      var matches, str;
      str = number.toString();
      matches = str.match(/(\d{4})(\d{4})(\d{2})/);
      matches.splice(0, 1);
      return matches.join(' ');
    };

    Helper.prototype.dateToString = function(date) {
      var day, month, year;
      day = String(date.getDate());
      day = day < 10 ? "0" + day : day;
      month = String(date.getMonth() + 1);
      month = month < 10 ? "0" + month : month;
      year = date.getYear() + 1900;
      return "" + day + "." + month + "." + year;
    };

    Helper.prototype.oneDay = 24 * 60 * 60 * 1000;

    Helper.prototype.parseDate = function(string) {
      var components;
      components = string.split('.');
      return new Date(components[2], components[1] - 1, components[0]);
    };

    Helper.prototype.parseCurrency = function(string) {
      return parseFloat(string.replace(/\./g, "").replace(/\,/, "."));
    };

    Helper.prototype.trim = function(string) {
      return string.replace(/^\s+|\s+$/g, "");
    };

    return Helper;

  })();

  rowaweb.h = new Helper();

}).call(this);
(function() {
  var RowawebLogger, _Logger;

  _Logger = (function() {
    function _Logger(monitor) {
      this.monitor = monitor;
    }

    _Logger.prototype.progress = function(percent) {
      return this.monitor.setPercentComplete(percent);
    };

    _Logger.prototype.notice = function(msg) {
      this.monitor.log(msg);
      return Logger.info(msg);
    };

    _Logger.prototype.info = function(msg) {
      return Logger.info(msg);
    };

    _Logger.prototype.debug = function(msg) {
      return Logger.debug(msg);
    };

    return _Logger;

  })();

  RowawebLogger = (function() {
    var instance;

    function RowawebLogger() {}

    instance = null;

    RowawebLogger.init = function(monitor) {
      instance = new _Logger(monitor);
      return instance;
    };

    RowawebLogger.get = function() {
      return instance;
    };

    return RowawebLogger;

  })();

  rowaweb.logger = RowawebLogger;

}).call(this);
(function() {
  var Sync;

  Sync = (function() {
    function Sync(hiAccount) {
      this.hiAccount = hiAccount;
      this.account = new rowaweb.account(hiAccount);
      this.logger = rowaweb.logger.get();
    }

    Sync.prototype.synchronizeAccount = function() {
      var newTransactions, validTransactions;
      this.logger.progress(5);
      if (!this.account.login()) {
        this.logger.progress(100);
        return;
      }
      validTransactions = this.account.transactions();
      if (validTransactions.length && this.account.balance) {
        this.hiAccount.setSaldo(this.account.balance);
        this.hiAccount.store();
      }
      this.logger.progress(30);
      validTransactions = this._storeBalancesInTransactions(validTransactions);
      newTransactions = this._storeTransactions(validTransactions);
      return true;
    };

    Sync.prototype.finish = function() {
      var _ref;
      if ((_ref = this.account) != null) {
        _ref.close();
      }
      return true;
    };

    Sync.prototype._storeTransactions = function(transactions) {
      var db, hiTransaction, i, knownTransactions, transaction, _i, _len;
      db = Application.getServiceFactory().lookup(HBCI, 'database');
      knownTransactions = this._storedTransactions();
      for (i = _i = 0, _len = transactions.length; _i < _len; i = ++_i) {
        transaction = transactions[i];
        this.logger.progress(30 + (69 / transactions.length) * i);
        hiTransaction = db.createObject(Umsatz, null);
        hiTransaction.setKonto(this.hiAccount);
        hiTransaction = transaction.prepareHiTransaction(hiTransaction);
        if (!(knownTransactions != null ? knownTransactions.contains(hiTransaction) : void 0)) {
          this.logger.info("Speichere Transaktion " + transaction + ".");
          hiTransaction.store();
        } else {
          this.logger.info("Transaktion bereits vorhanden: " + transaction + ".");
        }
      }
      return true;
    };

    Sync.prototype._storeBalancesInTransactions = function(transactions) {
      var balance, transaction, _i, _len, _ref;
      balance = this.hiAccount.getSaldo();
      _ref = transactions.slice(0).reverse();
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        transaction = _ref[_i];
        transaction.balance = balance;
        balance -= transaction.amount;
        balance = Math.round(balance * 100) / 100;
      }
      return transactions;
    };

    Sync.prototype._storedTransactions = function() {
      var daysAgo, lastSync;
      lastSync = this.account.getSyncStartDate();
      daysAgo = (new Date() - lastSync) / rowaweb.h.oneDay;
      return this.hiAccount.getUmsaetze(daysAgo + 7);
    };

    return Sync;

  })();

  rowaweb.sync = Sync;

}).call(this);
(function() {
  var Transaction;

  Transaction = (function() {
    Transaction.prototype.id = void 0;

    Transaction.prototype.documentDate = void 0;

    Transaction.prototype.comment = void 0;

    Transaction.prototype.amount = void 0;

    Transaction.prototype.valutaDate = void 0;

    Transaction.prototype.contraAccountName = void 0;

    Transaction.prototype.contraAccountNumber = void 0;

    Transaction.prototype.contraAccountAccountNumber = void 0;

    Transaction.prototype.purpose1 = void 0;

    Transaction.prototype.purpose2 = void 0;

    Transaction.prototype.primanota = void 0;

    Transaction.prototype.balance = void 0;

    function Transaction(cols) {
      this.cols = cols;
      this.logger = rowaweb.logger.get();
      if (this.cols[0].equals('Kontonummer:') || this.cols[0].equals('Operationsnummer') || this.cols.length < 11) {
        this.logger.debug("Ueberspringe Zeile: " + this.cols);
        return;
      }
      this.id = this.cols[0];
      this.documentDate = rowaweb.h.parseDate(this.cols[1]);
      this.amount = rowaweb.h.parseCurrency(this.cols[3]);
      this.valutaDate = rowaweb.h.parseDate(this.cols[5]);
      this.primanota = this.cols[10];
      this.contraAccountName = this.cols[7];
      if (this.contraAccountName.length < 2) {
        this.comment = this.cols[2];
      }
      this._assignContraAccount(cols[6]);
      this._splitPurpose([this.cols[8], this.cols[9]].join(' '));
    }

    Transaction.prototype._assignContraAccount = function(ref) {
      var parts;
      if (ref != null ? ref.length : void 0) {
        parts = ref.split(' ');
        if (parts.length === 2) {
          this.contraAccountNumber = parts[1];
          return this.contraAccountAccountNumber = parts[0];
        }
      }
    };

    Transaction.prototype._splitPurpose = function(text) {
      text || (text = '');
      this.purpose1 = text.substr(0, 35);
      if (text.length > 35) {
        this.purpose2 = text.substr(35, 35);
      }
      return true;
    };

    Transaction.prototype.isValid = function() {
      var _ref, _ref1;
      try {
        (typeof this.amount).equals('number') && this.contraAccountNumber.length > 2 && this.contraAccountAccountNumber.length > 2 && ((_ref = this.documentDate) != null ? _ref.getDay() : void 0);
        return (_ref1 = this.valutaDate) != null ? _ref1.getDay() : void 0;
      } catch (_error) {
        return false;
      }
    };

    Transaction.prototype.toString = function() {
      return ("<Transaction documentDate=" + this.documentDate + " ") + (" amount=" + this.amount + " contra=" + this.contraAccountName + " balance=" + this.balance) + (" primanota=" + this.primanota + " comment=" + this.comment + " @purpose1=" + this.purpose1) + ">";
    };

    Transaction.prototype.prepareHiTransaction = function(dbTransaction) {
      var _ref;
      dbTransaction.setDatum(this.documentDate);
      dbTransaction.setValuta(this.valutaDate);
      dbTransaction.setBetrag(this.amount);
      dbTransaction.setSaldo(this.balance);
      dbTransaction.setPrimanota(this.primanota);
      dbTransaction.setGegenkontoName(this.contraAccountName);
      if ((_ref = this.contraAccountNumber) != null ? _ref.length : void 0) {
        dbTransaction.setGegenkontoNummer(this.contraAccountNumber);
        dbTransaction.setGegenkontoBLZ(this.contraAccountAccountNumber);
      }
      dbTransaction.setKommentar(this.comment);
      dbTransaction.setZweck(this.purpose1);
      dbTransaction.setZweck2(this.purpose2);
      return dbTransaction;
    };

    return Transaction;

  })();

  rowaweb.transaction = Transaction;

}).call(this);
(function() {
  var Website;

  Website = (function() {
    Website.prototype.baseUrl = 'https://secure.moneyou.de';

    Website.prototype.page = void 0;

    function Website() {
      this.logger = rowaweb.logger.get();
      this._setupClient();
    }

    Website.prototype._setupClient = function() {
      var options;
      this.client = new WebClient();
      options = this.client.getOptions();
      options.setUseInsecureSSL(false);
      options.setRedirectEnabled(true);
      options.setJavaScriptEnabled(true);
      options.setThrowExceptionOnScriptError(false);
      options.setThrowExceptionOnFailingStatusCode(false);
      options.setCssEnabled(false);
      return this.client;
    };

    Website.prototype.hasText = function(text) {
      var html;
      html = this.page.asXml().toString();
      return html.match(new RegExp(text, 'g'));
    };

    Website.prototype.back = function() {
      this.client.getWebWindows().get(0).getHistory().back();
      return this.page = this.client.getWebWindows().get(0).getEnclosedPage();
    };

    Website.prototype.logout = function() {
      var element;
      element = this.page.getFirstByXPath("//a[@class='logOff']");
      this.page = element.click();
      return this.hasText("erfolgreich abgemeldet");
    };

    Website.prototype.get = function(url) {
      var _url;
      _url = "" + this.baseUrl + url;
      return this.page = this.client.getPage(_url);
    };

    Website.prototype._formForOptions = function(options) {
      var form;
      form = options.form;
      if ((typeof form).equals("string")) {
        form = this.page.getFormByName(form);
      }
      return form;
    };

    Website.prototype.fillIn = function(field, options) {
      var form, value;
      value = options["with"];
      form = this._formForOptions(options);
      return form.getInputByName(field).setValueAttribute(value);
    };

    Website.prototype.selectOption = function(field, options) {
      var didSelect, element, form, i, length, option, selectByValue, selectOptions, _i;
      didSelect = false;
      form = this._formForOptions(options);
      selectByValue = options.value != null;
      element = form.getSelectByName(field);
      selectOptions = element.getOptions();
      length = selectOptions.size() - 1;
      for (i = _i = 0; 0 <= length ? _i <= length : _i >= length; i = 0 <= length ? ++_i : --_i) {
        option = selectOptions.get(i);
        if (selectByValue) {
          if (option.getValueAttribute().equals(options.value)) {
            option.setSelected(true);
            didSelect = true;
          }
        } else {
          throw 'No implemented';
        }
      }
      if (!didSelect) {
        this.logger.debug(this.page.asXml());
        throw "Option '" + options.value + "' in Feld '" + field + "'' nicht gefunden.";
      }
      return true;
    };

    Website.prototype.pressButton = function(name) {
      return this.page = this.page.getElementByName(name).click();
    };

    Website.prototype.clickLeftNav = function(id) {
      var element;
      element = this.page.getFirstByXPath("//a[@id='" + id + "']");
      return this.page = element.click();
    };

    Website.prototype.currentPage = function() {
      return this.page;
    };

    return Website;

  })();

  rowaweb.website = Website;

}).call(this);
