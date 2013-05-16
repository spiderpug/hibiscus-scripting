MoneYou Tagesgeld
==================

Dieses Skript erlaubt den Umsatzabruf von MoneYou-Tagesgeldkonten mit der Bankleitzahl 50324040.

Voraussetzung ist die Installation des [Scripting-Plugins](http://www.willuhn.de/wiki/doku.php?id=support:list:banken:scripting) inklusive HTMLUnit-Paket.
In Jameica/Hibiscus muss ein Offline-Konto mit folgenden Einstellungen angelegt werden:

* Kundennummer:  Online-Banking Login (nicht die Kontonummer)
* Kontonummer:   Die Kontonummer des Tagesgeldkontos
* Bankleitzahl:  50324040

Das Skript unterstützt das Laden folgender Informationen:

- laufender Saldo
- Umsätze

Changelog
==================

* 0.0.3
  * Bugfix: Empty CSV datasets no longer cause trouble

* 0.0.2
  * Bugfix: Zeiträume ohne Umsätze werden korrekt verarbeitet und werfen keinen Fehler mehr

* 0.0.1
  * Initiale Version zum Importieren von Umsätzen aus dem MoneYou Webinterface