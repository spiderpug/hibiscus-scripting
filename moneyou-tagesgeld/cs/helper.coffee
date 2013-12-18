class Helper
  constructor: ->

  accountNumberToMYFormat: (number) ->
    str = number.toString()
    matches = str.match /(\d{4})(\d{4})(\d{2})/

    # drop full match
    matches.splice(0, 1)

    matches.join ' '

  dateToString: (date) ->
    day = String (date.getDate())
    day = if (day < 10) then "0" + day else day

    month = String ((date.getMonth() + 1))
    month = if (month < 10) then "0" + month else month

    year = date.getYear() + 1900

    "#{day}.#{month}.#{year}"

  oneDay: 24 * 60 * 60 * 1000

  parseDate: (string) ->
    components = string.split '.'

    new Date(components[2], components[1] - 1, components[0])

  parseCurrency: (string) ->
    parseFloat string.replace(/\./g, "").replace(/\,/, ".")

  trim: (string) ->
    string.replace /^\s+|\s+$/g, ""

rowaweb.h = new Helper()
