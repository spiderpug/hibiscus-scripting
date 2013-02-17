/*******************************************************************************
 * MoneYou Kontosynchronisation f. die Scripting-Funktionen von Jameica/Hibiscus
 *
 * Basierend auf der DKB Kreditkarten-Synchronisation von Ben Wiedenhoeft
 *
 * Copyright (c) Robert Wachs / All rights reserved
 *
 * Version: 0.0.1 - 2013-02-17
/*******************************************************************************/

importPackage(Packages.de.willuhn.logging);
importPackage(Packages.de.willuhn.jameica.system);
importPackage(Packages.de.willuhn.jameica.hbci);
importPackage(Packages.de.willuhn.jameica.hbci.rmi);
importPackage(Packages.com.gargoylesoftware.htmlunit);
importPackage(Packages.com.gargoylesoftware.htmlunit.html);
importPackage(Packages.com.gargoylesoftware.htmlunit.util);

// Cache fuer bekannte Umsaetze
var rowawebDe_moneYouDe_Js_hibiscusUmsaetze = [];

// Cache fuer Passwort
var rowawebDe_moneYouDe_Js_lPass = [];

/*******************************************************************************
 * Initialisierung
 *******************************************************************************/

// Registrierung auf Konto-Sync-Event
events.add("hibiscus.konto.sync", "rowawebDe_moneYouDe_Js_kontoSync");

/**
 * Wird dann aufgerufen, wenn der Button "via Scripting synchronisieren"
 * im Konto angeklickt wurde. Der Button wird nur bei Offline-Konten
 * angezeigt. Und auch nur dann, wenn das Plugin "jameica.scripting"
 * installiert ist.
 * @param konto das betreffende Konto.
 */
function rowawebDe_moneYouDe_Js_kontoSync(konto, monitor)
{
  /*******************************************************************************
  * MoneYou Kontosynchronisation
  *******************************************************************************/
  // MoneYou hat die BLZ 50324040. Die Logindaten sollten in der KdNr gespeichert
  // werden. Die Kontonummer steht im Feld Kontonummer.
  if (konto.getBLZ() != "50324040") return;

  var loginUser = konto.getKundennummer();

  monitor.setPercentComplete(4);
  monitor.log("MoneYou-Login fuer Konto " + konto.getKontonummer());

  var webClient = new WebClient();
  webClient.setJavaScriptEnabled(false);
	webClient.setCssEnabled(false);

  monitor.setPercentComplete(6);

  // Login, inkl Passwortabfrage beim User
  var page = "";
  do {
    Logger.info("MoneYou-Password f. Kontonummer "+konto.getKontonummer()+" wird abgefragt.");
    monitor.setPercentComplete(8);
    var loginPasswd = rowawebDe_moneYouDe_Js_lPass[loginUser];

    if (!loginPasswd) loginPasswd = Application.getCallback().askPassword("Bitte geben Sie das Passwort zum MoneYou-Konto " + konto.getKontonummer() + " ein:");
    page = rowawebDe_moneYouDe_Js_HttpLogin(loginUser, loginPasswd, webClient);

    if (!page || page.asXml().contains("Geben Sie Ihre Nutzerdaten ein") || page.asXml().contains("Sie wurden abgemeldet") ){
    	page = ""; rowawebDe_moneYouDe_Js_lPass[loginUser] = "";
    }else{
    	rowawebDe_moneYouDe_Js_lPass[loginUser] = loginPasswd;
    }
  } while(!page);

  monitor.setPercentComplete(10);
  Logger.info("MoneYou-Login war erfolgreich. Rufe Umsatzanzeige auf und starte CSV-Download.");
  monitor.log("MoneYou-Login war erfolgreich. Rufe Umsatzanzeige auf und starte CSV-Download.");

  var csv = rowawebDe_moneYouDe_Js_HttpGetData(konto, webClient);
  monitor.setPercentComplete(15);

  var saldo = rowawebDe_moneYouDe_Js_getSaldo(konto, webClient);
  monitor.setPercentComplete(30);

  Logger.info("Saldobestimmtung und CSV-Download erfolgreich. Importiere Umsaetze.");
  monitor.log("Saldobestimmtung und CSV-Download erfolgreich. Importiere Umsaetze.");

  var data = rowawebDe_moneYouDe_Js_csv2Array(csv, ";");

  // Datenbank-Verbindung holen
  var db = Application.getServiceFactory().lookup(HBCI,"database");

  Logger.info("Setze Saldo des Kontos auf "+saldo+".");
  konto.setSaldo(saldo);
  konto.store();
  monitor.log("Saldo aktualisiert von Konto: " + konto.getKontonummer());

  var c = 0;
  for (var i = 0; i < data.length; ++i)
  {
    if (data[i][0] == "Kontonummer"){
      // Ignorieren
      data[i][0] = undefined;
    } else {
      eur = data[i][3];

      if (!eur) continue;

      eur = parseFloat(data[i][3].replace(/\./g,"").replace(/\,/, "."));

      data[i][3] = eur;
      data[i][0] = saldo;
      saldo = saldo - eur; saldo = Math.round(saldo * 100) / 100;

      c++;
    }
  }

  // Daten jetzt nochmal andersrum durchlaufen, damit die aeltesten Daten
  // zuerst in der DB landen. Diesmal haben wir auch den Saldo nach Buchung
  for(var i=(data.length - 1); i>0; i-- )
  {
    if (!data[i][0]) continue;

    // Fortschrittsanzeige auf 30% (Stand nach Kontoabruf) bis max. 99%
    monitor.setPercentComplete(parseInt((30 + ((69/c)*((data.length - 1) - i)))));

    var umsatz = db.createObject(Umsatz,null);
    umsatz.setKonto(konto);
    var belegdatum = data[i][1].split(".");
    var valutadatum = data[i][5].split(".");
    var gegenKonto = data[i][6];

    umsatz.setDatum(new Date(belegdatum[2], (belegdatum[1] - 1), belegdatum[0]));
    umsatz.setValuta(new Date(valutadatum[2], (valutadatum[1] - 1),valutadatum[0]));
    umsatz.setBetrag(data[i][3]);
    umsatz.setSaldo(data[i][0]);
    umsatz.setPrimanota(data[i][10]);

    if (gegenKonto) {
      gegenKonto = gegenKonto.split("-");

      if (gegenKonto.length == 2) {
        umsatz.setGegenkontoNummer(gegenKonto[1]);
        umsatz.setGegenkontoBLZ(gegenKonto[0]);
      } else {
        umsatz.setKommentar(data[i][2]);
      }
    }
    umsatz.setGegenkontoName(data[i][7]);

    var verwendungszweck = String("" + data[i][8] + " " + data[i][9]);
    umsatz.setZweck(verwendungszweck.substr(0,35));
    if (verwendungszweck.length > 35) umsatz.setZweck2(String(verwendungszweck.substr(35,35)));

    if (rowawebDe_moneYouDe_Js_hibiscusUmsaetze && rowawebDe_moneYouDe_Js_hibiscusUmsaetze.contains(umsatz) != null){
    	Logger.debug("Umsatz aus der "+i+". Zeile des CSV-Kontoauszuges ist bereits gepeichert.");
    	continue;
    }

    Logger.info("Speichere Umsatz aus der "+i+". Zeile des CSV-Kontoauszuges.");

    umsatz.store();
  }

	// Logout
  Logger.info("MoneYou-Logout.");
  monitor.log("MoneYou-Logout.");
  webClient.getPage("https://secure.moneyou.de/exp/jsp/entrypoint.jsp?service=BWY2&state=000001");
  monitor.addPercentComplete(100);
}

function rowawebDe_moneYouDe_Js_getSaldo(konto, webClient) {
  Logger.info("Hole Saldo");

  url = 'https://secure.moneyou.de/exp/jsp/entrypoint.jsp?service=BIS0&state=000001'
  p = webClient.getPage(url);

  regex = new RegExp('<tr[\\s\\S]+' + konto.getKontonummer() +
    '[\\s\\S]+?<td[^>]+>[^<]+<\/td>\\s+<td[^>]+>[^<]+<\/td>\\s+<td[^>]+>[^<]+<\/td>\\s+<td[^>]+>[^<]+<\/td>\\s+<td[^>]+>\\s*([0-9.,]+)\\s+EUR',
    'i');
  var saldo = p.asXml().match(regex);

  if (!saldo) {
    throw("Konnte Saldo nicht abrufen.")
  }

  saldo = saldo[1];
  saldo = saldo.replace(/\./g, "").replace(/,/, ".");

  return saldo;
}

function rowawebDe_moneYouDe_Js_HttpLogin(loginKtonr, loginPasswd, webClient)
{
  /*******************************************************************************
  * Login DKB, liefert die Ergebnisseite zurueck
  *******************************************************************************/
  var url = 'https://secure.moneyou.de/exp/jsp/authenticationDE.jsp';

  Logger.info("MoneYou-Login aufrufen: " + url);

  var pageLogin = webClient.getPage(url);

  var formLogin = pageLogin.getFormByName("form1");
  formLogin.getInputByName("id").setValueAttribute(loginKtonr);;
  formLogin.getInputByName("password").setValueAttribute(loginPasswd);

  Logger.info("MoneYou-Login, Form wird abgesendet.");

  var cookieExpires = new Date();
  cookieExpires.setMinutes(cookieExpires.getMinutes() + 1);

  var cookie = new Cookie('secure.moneyou.de', 'nomabt', loginKtonr, '/', cookieExpires, true);
  webClient.getCookieManager().addCookie(cookie);

  cookie = new Cookie('secure.moneyou.de', 'loginabt', loginKtonr, '/', cookieExpires, true);
  webClient.getCookieManager().addCookie(cookie);

  webClient.setThrowExceptionOnFailingStatusCode(false);
  var p = pageLogin.getElementByName("Subm01").click();

  webClient.setThrowExceptionOnFailingStatusCode(true);

  return p;
}

function rowawebDe_moneYouDe_Js_HttpGetData (k, webClient)
{
  var url = 'https://secure.moneyou.de/exp/jsp/entrypoint.jsp?service=BIC8&state=000001';
  var p = webClient.getPage(url);

  var form = p.getFormByName("form1");
  var kk = form.getSelectByName("Cb01F");

  var kknr = String(k.getKontonummer());
  var regex = new RegExp(kknr);
  var ktSelected = false;

  // Kreditkarte auswaehlen...
	var list = kk.getOptions();
	for (i=0; i < list.size(); i++) {
	        var d = list.get(i);
	        if (String(d.asText()).match(regex))
	        {
	        	Logger.info("Kontoauswahl auf "+d);
	        	d.setSelected( true );
            ktSelected = true;
	        }
	}

	if (!ktSelected) throw("Konto " + kknr + " nicht gefunden.");

  // Seite mit Datumsauswahl aufrufen
  p = form.getInputByName("Subm20").click();

  var form = p.getFormByName("form1");

  var lka = k.getSaldoDatum(); // letzte kontoaktualisierung
  var ad = new Date();         // Abrufdatum
  var n  = new Date();         // Aktuelles Datum

  if (!lka){
    // Noch kein Kontenabruf, 360 Tage in die Vergangenheit
    Logger.info("Kein Saldendatum f. das Konto gefunden, rufe die letzten 360 Tage ab.");
    ad = new Date((n.getTime()-31104000000));
  }else{
    Logger.debug("Letztes Abrufdatum: " + lka.getDate()+"."+(lka.getMonth() + 1)+"."+(lka.getYear()+1900));

    ad = new Date((lka.getTime()-1209600000)) // 14 Tage mehr abrufen, Ueberschneidungen findet der Doppel-Check
  }

  // Umsatz-Cache aktualisieren fuer den spaeteren Abgleich, zur Sicherheit ein paar Tage mehr als noetig...
  rowawebDe_moneYouDe_Js_refreshHibiscusUmsaetze(k, (parseInt(((n - ad) / 86400000)) + 10));

  // Tag und Monat muss 2stellig sein
  var addd = String (ad.getDate()); addd = ((addd < 10) ? "0" + addd : addd);
  var admm = String ((ad.getMonth() + 1)); admm = ((admm < 10) ? "0" + admm : admm);
  var ndd  = String (n.getDate()); ndd = ((ndd < 10) ? "0" + ndd : ndd);
  var nmm  = String ((n.getMonth() + 1)); nmm = ((nmm < 10) ? "0" + nmm : nmm);

  Logger.debug("Rufe Umsaetze vom "+addd+"."+admm+"."+(ad.getYear()+1900)+" bis "+ndd+"."+nmm+"."+(n.getYear()+1900)+" ab.");
  form.getInputByName("Ed02D").setValueAttribute(addd+"."+admm+"."+(ad.getYear()+1900));
  form.getInputByName("Ed01DF").setValueAttribute(ndd+"."+nmm+"."+(n.getYear()+1900));

  p = form.getInputByName("Subm20").click();

  var downloadButton = p.getFirstByXPath("//input[@class='bstan']");
  var linkMatch = downloadButton.asXml().match(/window\.open\(([^\)]+)\)/);

  if (!linkMatch) {
    throw('CSV-Download-Button konnte nicht gefunden werden.');
  }
  linkMatch = linkMatch[1];
  linkMatch = 'https://secure.moneyou.de/exp/jsp/' + linkMatch.replace(/&apos;/g, '');

  // CSV-Export holen
  csv = webClient.getPage(linkMatch);
  csv = csv.getWebResponse().getContentAsString()

  return csv;
}


function rowawebDe_moneYouDe_Js_refreshHibiscusUmsaetze( konto, d )
{
  /*******************************************************************************
  * Aktualisiert den Cache der bekannten Umsaetze
  *******************************************************************************/
  Logger.debug("Umsaetze der letzten "+d+" Tage von Hibiscus f. Doppelbuchung-Checks holen.");
  rowawebDe_moneYouDe_Js_hibiscusUmsaetze = konto.getUmsaetze(d);
}


function rowawebDe_moneYouDe_Js_csv2Array( strData, strDelimiter )
{
  /*******************************************************************************
  * http://www.bennadel.com/blog/1504-Ask-Ben-Parsing-CSV-Strings-With-Javascript-Exec-Regular-Expression-Command.htm
  *******************************************************************************/
  strDelimiter = (strDelimiter || ",");
  var objPattern = new RegExp(
  (
    "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
    "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
    "([^\"\\" + strDelimiter + "\\r\\n]*))"
  ), "gi");
  var arrData = [[]];
  var arrMatches = null;
  while (arrMatches = objPattern.exec( strData )){
    var strMatchedDelimiter = arrMatches[ 1 ];
    if (strMatchedDelimiter.length && (strMatchedDelimiter != strDelimiter) ){
      arrData.push( [] );
    }
    if (arrMatches[ 2 ]){
      var strMatchedValue = arrMatches[ 2 ].replace( new RegExp( "\"\"", "g" ), "\"" );
    } else {
      var strMatchedValue = arrMatches[ 3 ];
    }
    arrData[ arrData.length - 1 ].push( strMatchedValue );
  }
  return( arrData );
}
