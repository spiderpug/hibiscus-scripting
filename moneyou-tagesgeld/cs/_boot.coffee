`// *******************************************************************************
// * MoneYou Kontosynchronisation f. die Scripting-Funktionen von Jameica/Hibiscus
// *
// * Copyright (c) Robert Wachs / All rights reserved
// *
// * Version: 0.1.1 - 2014-01-04
// *******************************************************************************/`

importPackage(Packages.de.willuhn.logging)
importPackage(Packages.de.willuhn.jameica.system)
importPackage(Packages.de.willuhn.jameica.hbci)
importPackage(Packages.de.willuhn.jameica.hbci.rmi)
importPackage(Packages.com.gargoylesoftware.htmlunit)
importPackage(Packages.com.gargoylesoftware.htmlunit.html)
importPackage(Packages.com.gargoylesoftware.htmlunit.util)

MONEYOU_BLZ = "50324040"
ROWAWEB_KONTO_SYNC = "rowawebMoneyouKontoSync"
ROWAWEB_KONTO_SYNC_JOB_KONTOAUSZUG = "rowawebMoneyouOverviewSyncJobKontoauszug"

events.add("hibiscus.konto.sync", ROWAWEB_KONTO_SYNC)

# provide JS hook for overview page
events.add("hibiscus.sync.function", "rowawebMoneyouOverviewSync");

rowawebMoneyouOverviewSync = (account, type) ->
  unless account.getBLZ().equals MONEYOU_BLZ
    return null

  if type.equals SynchronizeJobKontoauszug
    return ROWAWEB_KONTO_SYNC_JOB_KONTOAUSZUG

  return null

rowawebMoneyouOverviewSyncJobKontoauszug = (job, session) ->
  account = job.getKonto()
  monitor = session.getProgressMonitor()

  @[ROWAWEB_KONTO_SYNC](account, monitor)

rowawebMoneyouKontoSync = (account, monitor) ->
  kontonr = account.getBLZ().toString()

  unless kontonr.equals MONEYOU_BLZ
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
    try
      sync.finish()
    catch
      null

  true