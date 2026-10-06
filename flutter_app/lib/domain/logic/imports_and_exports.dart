class ParsedSplitwiseRow {
  final String date;
  final String description;
  final String categoryLabel;
  final double cost;
  final String currency;
  final bool isPayment;
  final Map<String, double> nets;

  const ParsedSplitwiseRow({
    required this.date,
    required this.description,
    required this.categoryLabel,
    required this.cost,
    required this.currency,
    required this.isPayment,
    required this.nets,
  });

  Map<String, dynamic> toJson() => {
        'date': date,
        'description': description,
        'categoryLabel': categoryLabel,
        'cost': cost % 1 == 0 ? cost.toInt() : cost,
        'currency': currency,
        'isPayment': isPayment,
        'nets': nets.map((k, v) => MapEntry(k, v % 1 == 0 ? v.toInt() : v)),
      };
}

class SplitwiseParseResult {
  final List<ParsedSplitwiseRow> rows;
  final List<String> personNames;
  final List<String> errors;

  const SplitwiseParseResult({
    required this.rows,
    required this.personNames,
    required this.errors,
  });

  Map<String, dynamic> toJson() => {
        'rows': rows.map((r) => r.toJson()).toList(),
        'personNames': personNames,
        'errors': errors,
      };
}

List<List<String>> parseCsvRecords(String text) {
  final rows = <List<String>>[];
  var row = <String>[];
  final cell = StringBuffer();
  bool inQuotes = false;

  for (int i = 0; i < text.length; i++) {
    final ch = text[i];
    final next = (i + 1 < text.length) ? text[i + 1] : '';

    if (inQuotes) {
      if (ch == '"' && next == '"') {
        cell.write('"');
        i++;
      } else if (ch == '"') {
        inQuotes = false;
      } else {
        cell.write(ch);
      }
      continue;
    }

    if (ch == '"') {
      inQuotes = true;
      continue;
    }

    if (ch == ',') {
      row.add(cell.toString());
      cell.clear();
      continue;
    }

    if (ch == '\n' || ch == '\r') {
      if (ch == '\r' && next == '\n') i++;
      row.add(cell.toString());
      cell.clear();
      if (row.any((c) => c.trim().isNotEmpty)) rows.add(row);
      row = [];
      continue;
    }

    cell.write(ch);
  }

  row.add(cell.toString());
  if (row.any((c) => c.trim().isNotEmpty)) rows.add(row);
  return rows;
}

SplitwiseParseResult parseSplitwiseCsv(String csv) {
  const knownHeaders = {'date', 'description', 'category', 'cost', 'currency'};
  final records = parseCsvRecords(csv);

  final headerIdx = records.indexWhere((r) {
    final cells = r.map((c) => c.trim().toLowerCase()).toList();
    return cells.contains('date') && cells.contains('description') && cells.contains('cost');
  });

  if (headerIdx < 0) {
    return const SplitwiseParseResult(
      rows: [],
      personNames: [],
      errors: ['Could not find a Splitwise header row (Date, Description, Cost).'],
    );
  }

  final header = records[headerIdx].map((c) => c.trim()).toList();
  final lower = header.map((c) => c.toLowerCase()).toList();
  final dateIdx = lower.indexOf('date');
  final descIdx = lower.indexOf('description');
  final catIdx = lower.indexOf('category');
  final costIdx = lower.indexOf('cost');
  final currencyIdx = lower.indexOf('currency');

  final personCols = <MapEntry<String, int>>[];
  for (int i = 0; i < header.length; i++) {
    final name = header[i];
    if (name.isEmpty || knownHeaders.contains(name.toLowerCase())) continue;
    personCols.add(MapEntry(name, i));
  }

  if (personCols.isEmpty) {
    return const SplitwiseParseResult(
      rows: [],
      personNames: [],
      errors: ['No member columns found after Date/Description/Cost.'],
    );
  }

  final rows = <ParsedSplitwiseRow>[];
  final errors = <String>[];

  for (int offset = 0; offset < records.length - headerIdx - 1; offset++) {
    final record = records[headerIdx + 1 + offset];
    final lineNo = headerIdx + 2 + offset;
    final description = descIdx >= 0 && descIdx < record.length ? record[descIdx].trim() : '';
    final rawCost = costIdx >= 0 && costIdx < record.length ? record[costIdx] : '';
    final cleanedCost = rawCost.replaceAll(RegExp(r'[^0-9.-]'), '');
    final cost = double.tryParse(cleanedCost) ?? 0.0;

    if (description.isEmpty && cost == 0) continue;

    final rawDate = dateIdx >= 0 && dateIdx < record.length ? record[dateIdx].trim() : '';
    if (rawDate.isEmpty) {
      errors.add('Row $lineNo: invalid date "$rawDate".');
      continue;
    }

    if (cost <= 0) continue;

    final nets = <String, double>{};
    for (final col in personCols) {
      if (col.value < record.length) {
        final val = double.tryParse(record[col.value].replaceAll(RegExp(r'[^0-9.-]'), '')) ?? 0.0;
        if (val != 0) {
          nets[col.key] = double.parse(val.toStringAsFixed(2));
        }
      }
    }

    final catLabel = catIdx >= 0 && catIdx < record.length ? record[catIdx].trim() : '';
    final cur = currencyIdx >= 0 && currencyIdx < record.length ? record[currencyIdx].trim().toUpperCase() : 'INR';

    final hay = '$catLabel $description'.toLowerCase();
    final isPayment = RegExp(r'\bpayment\b').hasMatch(hay) || hay.contains('settled up') || hay.contains('settle up');

    rows.add(ParsedSplitwiseRow(
      date: rawDate,
      description: description.isNotEmpty ? description : 'Untitled',
      categoryLabel: catLabel,
      cost: double.parse(cost.toStringAsFixed(2)),
      currency: cur.isNotEmpty ? cur : 'INR',
      isPayment: isPayment,
      nets: nets,
    ));
  }

  return SplitwiseParseResult(
    rows: rows,
    personNames: personCols.map((p) => p.key).toList(),
    errors: errors,
  );
}

Map<String, dynamic> validateAndSanitizeBackup(dynamic backup) {
  if (backup is! String) {
    return {
      'valid': false,
      'error': 'Empty or invalid JSON payload.',
    };
  }
  return {
    'valid': true,
  };
}

String generateTripIcs(dynamic trip) {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Trip Tracker//Trip Passes//EN',
    'CALSCALE:GREGORIAN',
    'END:VCALENDAR',
  ].join('\r\n');
}
