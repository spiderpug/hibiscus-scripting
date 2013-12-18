`// *******************************************************************************
// * MoneYou Kontosynchronisation f. die Scripting-Funktionen von Jameica/Hibiscus
// *
// * Copyright (c) Robert Wachs / All rights reserved
// *
// * Version: 0.1.0 - 2013-12-18
// *******************************************************************************/`

importPackage(Packages.de.willuhn.logging)
importPackage(Packages.de.willuhn.jameica.system)
importPackage(Packages.de.willuhn.jameica.hbci)
importPackage(Packages.de.willuhn.jameica.hbci.rmi)
importPackage(Packages.com.gargoylesoftware.htmlunit)
importPackage(Packages.com.gargoylesoftware.htmlunit.html)
importPackage(Packages.com.gargoylesoftware.htmlunit.util)

events.add("hibiscus.konto.sync", "rowawebTestKontoSync")

rowawebTestKontoSync = (account, monitor) ->
  kontonr = account.getBLZ().toString()

  unless kontonr.equals "50324040"
    return

  rowaweb.entryPoint(account, monitor)

rowaweb = {}
rowaweb.entryPoint = (hiAccount, monitor) ->
  logger = rowaweb.logger.init monitor
  sync = new rowaweb.sync(hiAccount)

  try
    sync.synchronizeAccount()
  catch error
    logger.notice "Synchronisation fehlgeschlagen: #{error}"
  finally
    sync.finish()

  true