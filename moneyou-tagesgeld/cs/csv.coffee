class CSV
  constructor: (data, delimiter) ->
    @rows = @_parse(data, delimiter)

  _parse: (data, delimiter) ->
    # http://www.bennadel.com/blog/1504-Ask-Ben-Parsing-CSV-Strings-With-Javascript-Exec-Regular-Expression-Command.htm

    delimiter = (delimiter or ",")
    objPattern = new RegExp(
      "(\\" + delimiter + "|\\r?\\n|\\r|^)" + "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" + "([^\"\\" + delimiter + "\\r\\n]*))"
      , "gi")

    arrData = [[]]
    arrMatches = null

    while arrMatches = objPattern.exec(data)
      strMatchedDelimiter = arrMatches[1]

      if strMatchedDelimiter.length and (!strMatchedDelimiter.equals delimiter)
        arrData.push []

      strMatchedValue = if arrMatches[2]
        arrMatches[2].replace(new RegExp("\"\"", "g"), "\"")
      else
        arrMatches[3]

      arrData[arrData.length - 1].push strMatchedValue

    arrData

rowaweb.csv = CSV
