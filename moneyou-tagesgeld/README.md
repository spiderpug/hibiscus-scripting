MoneYou Tagesgeld
==================

Dieses Skript erlaubt den Umsatzabruf von MoneYou-Tagesgeldkonten mit der Bankleitzahl 50324040.

Voraussetzung ist die Installation des [Scripting-Plungins](http://www.willuhn.de/wiki/doku.php?id=support:list:banken:scripting) und das Anlegen eines Offline-Kontos mit folgenden Einstellungen:

* Kundennummer:  Euer Online-Banking Login (nicht die Kontonummer)
* Kontonummer:   Die Kontonummer des Tagesgeldkontos
* Bankleitzahl:  50324040

Das Skript unterstützt das Laden folgender Informationen:

- laufender Saldo
- Umsätze

Changelog
==================

* 0.0.2
  * Bugfix: Zeiträume ohne Umsätze werden korrekt verarbeitet und werfen keinen Fehler mehr

* 0.0.1
  * Initiale Version zum Importieren von Umsätzen aus dem MoneYou Webinterface