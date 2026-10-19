import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

QueryExecutor openAppConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'trip_tracker.sqlite'));
    return NativeDatabase.createInBackground(file);
  });
}

QueryExecutor openMemoryConnection({bool logStatements = false}) => NativeDatabase.memory(logStatements: logStatements);
