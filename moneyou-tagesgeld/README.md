MoneYou Tagesgeld
==================

# Dieses Projekt wird nicht länger aktualisiert.

Bitte benutzt die aufgeführten Alternativen unter [https://www.willuhn.de/wiki](https://www.willuhn.de/wiki/doku.php?id=support:list:banken:scripting)

-------------------------------------

Dieses Skript erlaubt den Umsatzabruf von MoneYou-Tagesgeldkonten mit der Bankleitzahl 50324040.

### Voraussetzungen:


- [Scripting-Plugins](http://www.willuhn.de/wiki/doku.php?id=support:list:banken:scripting)
- [HTMLUnit-Plugin](http://hibiscus-scripting.derrichter.de/documents) v2.13+

### Installation:

Speichern Sie das Script (`moneyou-x.x.x.min.js`) an einem beliebigen Ort und fügen Sie es in den Einstellungen unter "Scripting" hinzu:

![Scriptkonfiguration](https://raw.github.com/spiderpug/hibiscus-scripting/master/moneyou-tagesgeld/doc/script-setup.gif "MoneYou Tagesgeld Scriptkonfiguration")

In Jameica/Hibiscus muss ein Offline-Konto mit folgenden Einstellungen angelegt werden:

* Kundennummer:  Online-Banking Login (nicht die Kontonummer)
* Kontonummer:   Die Kontonummer des Tagesgeldkontos
* Bankleitzahl:  50324040

![Kontokonfiguration](https://raw.github.com/spiderpug/hibiscus-scripting/master/moneyou-tagesgeld/doc/account-config.gif "MoneYou Tagesgeld Kontokonfiguration")

Das Skript unterstützt das Laden folgender Informationen über das Übersichtsfenster oder den Button "via Scripting synchronisieren":

- laufender Saldo
- Umsätze

![Kontosynchronisation](https://raw.github.com/spiderpug/hibiscus-scripting/master/moneyou-tagesgeld/doc/account-sync.gif "Kontosynchronisation")

![Kontosynchronisation](https://raw.github.com/spiderpug/hibiscus-scripting/master/moneyou-tagesgeld/doc/sync-success.gif "Synchronisation erfolgreich")

### Probleme

Sie können Probleme melden oder Ideen einbringen, indem Sie ein [Issue](https://github.com/spiderpug/hibiscus-scripting/issues) erstellen und eine möglichst genaue Fehler- oder Funktionsbeschreibung hinterlassen.

### Entwickler

Die Generierung des Scripts erfolgt in mehreren Stufen und erfordert eine Ruby-Umgebung inklusive [bundler](http://bundler.io/)-Gem.

1. Quelltextanpassung in [CoffeeScript](http://coffeescript.org/)
2. Generierung der Javascript-Dateien
3. Minification zu `moneyou.min.js`

Die erzeugten Javascript-Dateien dürfen nicht direkt verändert werden, da diese Dateien durch Änderungen an CoffeeScript-Dateien unterhalb von `cs` neu erstellt bzw. überschrieben werden.

Während der Entwicklung ist das Ruby-Gem [Guard](https://github.com/guard/guard) für die Schritt eingerichtet und führt diese bei Änderungen am Quelltext automatisch aus: `bundle exec guard`.

### Changelog

* 0.1.3
  * Bugfix: Updating saldo does not take place if no transaction are found

* 0.1.2
  * Bugfix: Fix selection of subaccounts (#8)

* 0.1.1
  * Enhancement: Allow synchronization using Jameica's account overview window

* 0.1.0
  * Rewrite for new MoneYou website
  * Requires HTMLUnit 2.13+

* 0.0.4
  * Bugfix: HTMLUnit 2.9+ parses CSV download link correctly

* 0.0.3
  * Bugfix: Empty CSV datasets no longer cause trouble

* 0.0.2
  * Bugfix: Zeiträume ohne Umsätze werden korrekt verarbeitet und werfen keinen Fehler mehr

* 0.0.1
  * Initiale Version zum Importieren von Umsätzen aus dem MoneYou Webinterface
