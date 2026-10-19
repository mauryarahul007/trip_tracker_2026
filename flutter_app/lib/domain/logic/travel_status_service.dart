import '../models/travel_pass.dart';

sealed class TravelStatusInfo {
  const TravelStatusInfo();
  String get type;
}

class FlightStatusInfo extends TravelStatusInfo {
  const FlightStatusInfo({
    required this.carrierCode,
    required this.flightNumber,
    required this.airlineName,
    required this.fullFlightCode,
    this.icaoCode,
    required this.googleStatusUrl,
    required this.flightradar24Url,
    required this.flightAwareUrl,
    this.flightStatsUrl,
    this.formattedFlightDate,
    this.flightTime,
    this.origin,
    this.destination,
    this.departureTime,
  });

  @override
  String get type => 'flight';

  final String carrierCode;
  final String flightNumber;
  final String airlineName;
  final String fullFlightCode;
  final String? icaoCode;
  final String googleStatusUrl;
  final String flightradar24Url;
  final String flightAwareUrl;
  final String? flightStatsUrl;
  final String? formattedFlightDate;
  final String? flightTime;
  final String? origin;
  final String? destination;
  final String? departureTime;
}

class TrainStatusInfo extends TravelStatusInfo {
  const TrainStatusInfo({
    this.pnr,
    this.trainNumber,
    this.trainName,
    this.confirmTktUrl,
    this.railYatriUrl,
    this.googleLiveTrainUrl,
    this.origin,
    this.destination,
    this.departureTime,
  });

  @override
  String get type => 'train';

  final String? pnr;
  final String? trainNumber;
  final String? trainName;
  final String? confirmTktUrl;
  final String? railYatriUrl;
  final String? googleLiveTrainUrl;
  final String? origin;
  final String? destination;
  final String? departureTime;
}

const Map<String, String> knownAirlines = {
  '6E': 'IndiGo',
  'AI': 'Air India',
  'UK': 'Vistara',
  'QP': 'Akasa Air',
  'SG': 'SpiceJet',
  'IX': 'Air India Express',
  'G8': 'Go First',
  'BA': 'British Airways',
  'EK': 'Emirates',
  'QR': 'Qatar Airways',
  'SQ': 'Singapore Airlines',
  'LH': 'Lufthansa',
  'UA': 'United Airlines',
  'AA': 'American Airlines',
  'DL': 'Delta Air Lines',
  'AF': 'Air France',
  'KL': 'KLM',
  'EY': 'Etihad Airways',
  'CX': 'Cathay Pacific',
  'TK': 'Turkish Airlines',
  'TG': 'Thai Airways',
  'VN': 'Vietnam Airlines',
  'MH': 'Malaysia Airlines',
  'FZ': 'Flydubai',
  'WY': 'Oman Air',
  'GF': 'Gulf Air',
  'KU': 'Kuwait Airways',
  'SV': 'Saudia',
  'JL': 'Japan Airlines',
  'NH': 'All Nippon Airways',
  'KE': 'Korean Air',
  'OZ': 'Asiana Airlines',
  'QF': 'Qantas',
  'VA': 'Virgin Australia',
  'AC': 'Air Canada',
};

const Map<String, String> icaoToIata = {
  'IGO': '6E',
  'AIC': 'AI',
  'VTI': 'UK',
  'AKJ': 'QP',
  'SEJ': 'SG',
  'AXB': 'IX',
  'BAW': 'BA',
  'UAE': 'EK',
  'QTR': 'QR',
  'SIA': 'SQ',
  'DLH': 'LH',
  'UAL': 'UA',
  'AAL': 'AA',
  'DAL': 'DL',
  'AFR': 'AF',
  'KLM': 'KL',
  'ETD': 'EY',
  'CPA': 'CX',
  'THY': 'TK',
  'THA': 'TG',
};

const Map<String, String> iataToIcao = {
  '6E': 'IGO',
  'AI': 'AIC',
  'UK': 'VTI',
  'QP': 'AKJ',
  'SG': 'SEJ',
  'IX': 'AXB',
  'BA': 'BAW',
  'EK': 'UAE',
  'QR': 'QTR',
  'SQ': 'SIA',
  'LH': 'DLH',
  'UA': 'UAL',
  'AA': 'AAL',
  'DL': 'DAL',
  'AF': 'AFR',
  'KL': 'KLM',
  'EY': 'ETD',
  'CX': 'CPA',
  'TK': 'THY',
  'TG': 'THA',
  'G8': 'GOW',
};

const Map<String, String> airlineNameToIata = {
  'indigo': '6E',
  'air india': 'AI',
  'airindia': 'AI',
  'vistara': 'UK',
  'akasa': 'QP',
  'akasa air': 'QP',
  'spicejet': 'SG',
  'air india express': 'IX',
  'airindia express': 'IX',
  'go first': 'G8',
  'gofirst': 'G8',
  'british airways': 'BA',
  'emirates': 'EK',
  'qatar airways': 'QR',
  'singapore airlines': 'SQ',
  'lufthansa': 'LH',
  'united': 'UA',
  'united airlines': 'UA',
  'american': 'AA',
  'american airlines': 'AA',
  'delta': 'DL',
  'delta air lines': 'DL',
  'air france': 'AF',
  'klm': 'KL',
  'etihad': 'EY',
  'cathay pacific': 'CX',
};

class ParsedFlightDate {
  const ParsedFlightDate({this.year, this.month, this.day, this.formattedDateString, this.timeString});

  final int? year;
  final int? month;
  final int? day;
  final String? formattedDateString;
  final String? timeString;
}

ParsedFlightDate? parseFlightDate(String? dateStr) {
  if (dateStr == null || dateStr.trim().isEmpty) {
    return null;
  }
  final raw = dateStr.trim();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // 1. ISO format YYYY-MM-DD
  final isoMatch = RegExp(r'^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2}):(\d{2}))?').firstMatch(raw);
  if (isoMatch != null) {
    final year = int.parse(isoMatch.group(1)!);
    final month = int.parse(isoMatch.group(2)!);
    final day = int.parse(isoMatch.group(3)!);
    final hoursStr = isoMatch.group(4);
    final minutesStr = isoMatch.group(5);
    final formattedDateString = '$day ${monthNames[month - 1]} $year';
    String? timeString;
    if (hoursStr != null && minutesStr != null) {
      final hours = int.parse(hoursStr);
      final minutes = int.parse(minutesStr);
      final period = hours >= 12 ? 'PM' : 'AM';
      final h12 = hours % 12 == 0 ? 12 : hours % 12;
      final mStr = minutes < 10 ? '0$minutes' : '$minutes';
      timeString = '$h12:$mStr $period';
    }
    return ParsedFlightDate(
      year: year,
      month: month,
      day: day,
      formattedDateString: formattedDateString,
      timeString: timeString,
    );
  }

  // 2. Natural text formats: e.g. "15 Sep 2026", "15 Oct at 08:30 AM"
  const monthMap = {
    'jan': 1,
    'january': 1,
    'feb': 2,
    'february': 2,
    'mar': 3,
    'march': 3,
    'apr': 4,
    'april': 4,
    'may': 5,
    'june': 6,
    'jun': 6,
    'july': 7,
    'jul': 7,
    'aug': 8,
    'august': 8,
    'sep': 9,
    'september': 9,
    'oct': 10,
    'october': 10,
    'nov': 11,
    'november': 11,
    'dec': 12,
    'december': 12,
  };
  final textMatch = RegExp(
    r'(\d{1,2})\s+([A-Za-z]{3,9})(?:\s+(\d{4}))?(?:\s+(?:at\s+)?(\d{1,2}:\d{2}(?:\s*[AaPp][Mm])?))?',
  ).firstMatch(raw);
  if (textMatch != null) {
    final day = int.parse(textMatch.group(1)!);
    final mStr = textMatch.group(2)!.toLowerCase();
    final month = monthMap[mStr];
    if (month != null) {
      final yStr = textMatch.group(3);
      final year = yStr != null ? int.parse(yStr) : DateTime.now().year;
      final formattedDateString = '$day ${monthNames[month - 1]} $year';
      final timeString = textMatch.group(4)?.trim();
      return ParsedFlightDate(
        year: year,
        month: month,
        day: day,
        formattedDateString: formattedDateString,
        timeString: timeString,
      );
    }
  }

  // 3. Fallback: DateTime.tryParse
  final parsed = DateTime.tryParse(raw);
  if (parsed != null) {
    final year = parsed.year;
    final month = parsed.month;
    final day = parsed.day;
    final formattedDateString = '$day ${monthNames[month - 1]} $year';
    final hours = parsed.hour;
    final minutes = parsed.minute;
    final period = hours >= 12 ? 'PM' : 'AM';
    final h12 = hours % 12 == 0 ? 12 : hours % 12;
    final mStr = minutes < 10 ? '0$minutes' : '$minutes';
    final timeString = '$h12:$mStr $period';
    return ParsedFlightDate(
      year: year,
      month: month,
      day: day,
      formattedDateString: formattedDateString,
      timeString: timeString,
    );
  }

  return null;
}

class BuiltFlightUrls {
  const BuiltFlightUrls({
    required this.fullFlightCode,
    required this.icaoCode,
    required this.googleStatusUrl,
    required this.flightradar24Url,
    required this.flightAwareUrl,
    this.flightStatsUrl,
    this.formattedFlightDate,
    this.flightTime,
  });

  final String fullFlightCode;
  final String icaoCode;
  final String googleStatusUrl;
  final String flightradar24Url;
  final String flightAwareUrl;
  final String? flightStatsUrl;
  final String? formattedFlightDate;
  final String? flightTime;
}

BuiltFlightUrls buildFlightUrls(String carrierCode, String flightNumber, [String? dateString]) {
  final cleanCarrier = carrierCode.trim().toUpperCase();
  final trimmedNum = flightNumber.trim();
  final cleanFlightNum = trimmedNum.replaceFirst(RegExp(r'^0+'), '').isEmpty
      ? trimmedNum
      : trimmedNum.replaceFirst(RegExp(r'^0+'), '');
  final fullFlightCode = '$cleanCarrier-$cleanFlightNum';
  final icaoCode = iataToIcao[cleanCarrier] ?? cleanCarrier;

  final parsedDate = parseFlightDate(dateString);

  final googleQuery = parsedDate?.formattedDateString != null
      ? '$cleanCarrier-$cleanFlightNum flight status ${parsedDate!.formattedDateString}'
      : '$cleanCarrier-$cleanFlightNum flight status';
  final googleStatusUrl = 'https://www.google.com/search?q=${Uri.encodeComponent(googleQuery)}';

  final flightradar24Url = 'https://www.flightradar24.com/data/flights/${cleanCarrier.toLowerCase()}$cleanFlightNum';

  final flightAwareUrl = 'https://www.flightaware.com/live/flight/$icaoCode$cleanFlightNum';

  final date = parsedDate;
  final dateParams = date != null && date.year != null && date.month != null && date.day != null
      ? '?year=${date.year}&month=${date.month}&date=${date.day}'
      : '';
  final flightStatsUrl = 'https://www.flightstats.com/v2/flight-tracker/$cleanCarrier/$cleanFlightNum$dateParams';

  return BuiltFlightUrls(
    fullFlightCode: fullFlightCode,
    icaoCode: icaoCode,
    googleStatusUrl: googleStatusUrl,
    flightradar24Url: flightradar24Url,
    flightAwareUrl: flightAwareUrl,
    flightStatsUrl: flightStatsUrl,
    formattedFlightDate: parsedDate?.formattedDateString,
    flightTime: parsedDate?.timeString,
  );
}

class ParsedFlightCode {
  const ParsedFlightCode({required this.carrierCode, required this.flightNumber, required this.airlineName});

  final String carrierCode;
  final String flightNumber;
  final String airlineName;
}

ParsedFlightCode? parseFlightCode(String text, [String? providerHint]) {
  if (text.isEmpty && (providerHint == null || providerHint.isEmpty)) {
    return null;
  }

  // 1. Check for standard legIdentifier format: e.g. 6E537_BLR_HYD or 6E-537_BLR_HYD
  final legMatch = RegExp(
    r'^([A-Za-z][A-Za-z0-9]|[A-Za-z0-9][A-Za-z])[\s\-_]*([0-9]{1,4})(?:_([A-Za-z]{3})_([A-Za-z]{3}))?',
  ).firstMatch(text);
  if (legMatch != null) {
    final carrierCode = legMatch.group(1)!.toUpperCase();
    final rawNum = legMatch.group(2)!;
    final flightNumber = rawNum.replaceFirst(RegExp(r'^0+'), '').isEmpty
        ? rawNum
        : rawNum.replaceFirst(RegExp(r'^0+'), '');
    final airlineName = knownAirlines[carrierCode] ?? providerHint ?? 'Airline ($carrierCode)';
    return ParsedFlightCode(carrierCode: carrierCode, flightNumber: flightNumber, airlineName: airlineName);
  }

  // 2. Known 2-letter airline codes
  final knownKeys = knownAirlines.keys.toList();
  final knownRegex = RegExp(
    '(?:^|[^A-Za-z0-9])(${knownKeys.join('|')})[\\s\\-_]*([0-9]{1,4})(?=[^A-Za-z0-9]|\$)',
    caseSensitive: false,
  );
  final knownMatch = knownRegex.firstMatch(text);
  if (knownMatch != null) {
    final carrierCode = knownMatch.group(1)!.toUpperCase();
    final rawNum = knownMatch.group(2)!;
    final flightNumber = rawNum.replaceFirst(RegExp(r'^0+'), '').isEmpty
        ? rawNum
        : rawNum.replaceFirst(RegExp(r'^0+'), '');
    final airlineName = knownAirlines[carrierCode] ?? providerHint ?? 'Airline ($carrierCode)';
    return ParsedFlightCode(carrierCode: carrierCode, flightNumber: flightNumber, airlineName: airlineName);
  }

  // 3. Known 3-letter ICAO codes
  final icaoKeys = icaoToIata.keys.toList();
  final icaoRegex = RegExp(
    '(?:^|[^A-Za-z0-9])(${icaoKeys.join('|')})[\\s\\-_]*([0-9]{1,4})(?=[^A-Za-z0-9]|\$)',
    caseSensitive: false,
  );
  final icaoMatch = icaoRegex.firstMatch(text);
  if (icaoMatch != null) {
    final icaoCode = icaoMatch.group(1)!.toUpperCase();
    final carrierCode = icaoToIata[icaoCode] ?? icaoCode;
    final rawNum = icaoMatch.group(2)!;
    final flightNumber = rawNum.replaceFirst(RegExp(r'^0+'), '').isEmpty
        ? rawNum
        : rawNum.replaceFirst(RegExp(r'^0+'), '');
    final airlineName = knownAirlines[carrierCode] ?? providerHint ?? 'Airline ($carrierCode)';
    return ParsedFlightCode(carrierCode: carrierCode, flightNumber: flightNumber, airlineName: airlineName);
  }

  // 4. General IATA code
  final generalIataRegex = RegExp(
    r'(?:^|[^A-Za-z0-9])([A-Za-z][A-Za-z0-9]|[A-Za-z0-9][A-Za-z])[\s\-_]*([0-9]{1,4})(?=[^A-Za-z0-9]|$)',
  );
  final generalMatch = generalIataRegex.firstMatch(text);
  if (generalMatch != null) {
    final carrierCode = generalMatch.group(1)!.toUpperCase();
    final rawNum = generalMatch.group(2)!;
    final flightNumber = rawNum.replaceFirst(RegExp(r'^0+'), '').isEmpty
        ? rawNum
        : rawNum.replaceFirst(RegExp(r'^0+'), '');
    final airlineName = knownAirlines[carrierCode] ?? providerHint ?? 'Airline ($carrierCode)';
    return ParsedFlightCode(carrierCode: carrierCode, flightNumber: flightNumber, airlineName: airlineName);
  }

  // 5. Provider name fallback
  final combinedContext = '${providerHint ?? ''} $text'.toLowerCase();
  for (final entry in airlineNameToIata.entries) {
    if (combinedContext.contains(entry.key)) {
      final flightNumMatch = RegExp(r'(?:flight|flt|no\.?|#)?\s*([0-9]{1,4})(?=[^A-Za-z0-9]|$)').firstMatch(text);
      if (flightNumMatch != null && flightNumMatch.group(1) != null) {
        final rawNum = flightNumMatch.group(1)!;
        final flightNumber = rawNum.replaceFirst(RegExp(r'^0+'), '').isEmpty
            ? rawNum
            : rawNum.replaceFirst(RegExp(r'^0+'), '');
        final airlineName = knownAirlines[entry.value] ?? providerHint ?? entry.key;
        return ParsedFlightCode(carrierCode: entry.value, flightNumber: flightNumber, airlineName: airlineName);
      }
    }
  }

  return null;
}

FlightStatusInfo? extractFlightStatus(TravelPass pass) {
  final combinedText = [
    pass.legIdentifier,
    pass.title,
    pass.referenceCode,
    pass.notes,
    pass.bookingId,
  ].where((s) => s != null && s.isNotEmpty).join(' ');

  final parsed = parseFlightCode(combinedText, pass.provider);
  if (parsed == null) {
    return null;
  }

  final urls = buildFlightUrls(parsed.carrierCode, parsed.flightNumber, pass.startDateTime);

  return FlightStatusInfo(
    carrierCode: parsed.carrierCode,
    flightNumber: parsed.flightNumber,
    airlineName: parsed.airlineName,
    fullFlightCode: urls.fullFlightCode,
    icaoCode: urls.icaoCode,
    googleStatusUrl: urls.googleStatusUrl,
    flightradar24Url: urls.flightradar24Url,
    flightAwareUrl: urls.flightAwareUrl,
    flightStatsUrl: urls.flightStatsUrl,
    formattedFlightDate: urls.formattedFlightDate,
    flightTime: urls.flightTime,
    origin: pass.origin,
    destination: pass.destination,
    departureTime: pass.startDateTime,
  );
}

TrainStatusInfo? extractTrainStatus(TravelPass pass) {
  final combinedText = [
    pass.bookingId,
    pass.referenceCode,
    pass.legIdentifier,
    pass.title,
    pass.notes,
  ].where((s) => s != null && s.isNotEmpty).join(' ');

  // 10-digit PNR
  final pnrRegex = RegExp(r'\b([0-9]{3}[-\s]?[0-9]{3}[-\s]?[0-9]{4}|[0-9]{10})\b');
  final pnrMatch = pnrRegex.firstMatch(combinedText);
  final pnr = pnrMatch?.group(0)?.replaceAll(RegExp(r'[-\s]'), '');

  // 5-digit Indian Railways train number
  final trainNumRegex = RegExp(r'\b([0-9]{5})\b');
  final trainNumMatch = trainNumRegex.firstMatch(combinedText);
  final trainNumber = trainNumMatch?.group(1);

  if (pnr == null && trainNumber == null) {
    return null;
  }

  final confirmTktUrl = pnr != null ? 'https://www.confirmtkt.com/pnr-status/$pnr' : null;
  final railYatriUrl = pnr != null ? 'https://www.railyatri.in/pnr-status/$pnr' : null;
  final googleLiveTrainUrl = trainNumber != null
      ? 'https://www.google.com/search?q=${Uri.encodeComponent('$trainNumber live train status')}'
      : null;

  return TrainStatusInfo(
    pnr: pnr,
    trainNumber: trainNumber,
    trainName: pass.title.isNotEmpty ? pass.title : (pass.provider ?? 'Express Train'),
    confirmTktUrl: confirmTktUrl,
    railYatriUrl: railYatriUrl,
    googleLiveTrainUrl: googleLiveTrainUrl,
    origin: pass.origin,
    destination: pass.destination,
    departureTime: pass.startDateTime,
  );
}

TravelStatusInfo? getTravelStatusInfo(TravelPass pass) {
  if (pass.type == 'flight') {
    return extractFlightStatus(pass);
  }
  if (pass.type == 'train') {
    return extractTrainStatus(pass);
  }
  return null;
}
