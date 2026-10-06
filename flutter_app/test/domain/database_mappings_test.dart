import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/data/dto/trip_dto.dart';
import 'package:trip_tracker/data/dto/expense_dto.dart';
import 'package:trip_tracker/data/dto/member_dto.dart';

void main() {
  group('Database Mappings Golden Fixture Tests', () {
    late Map<String, dynamic> fixtures;

    setUpAll(() {
      final file = File('../docs/flutter-migration/fixtures/database_mappings.json');
      expect(file.existsSync(), isTrue, reason: 'database_mappings.json fixture must exist');
      fixtures = jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
    });

    test('Trips mapping matches golden fixture', () {
      final tripFixture = fixtures['trips'] as Map<String, dynamic>;
      final dbRow = tripFixture['dbRow'] as Map<String, dynamic>;
      final appObject = tripFixture['appObject'] as Map<String, dynamic>;

      final dto = TripDto.fromPostgresJson(dbRow);
      expect(dto.id, appObject['id']);
      expect(dto.name, appObject['name']);
      expect(dto.startDate, appObject['startDate']);
      expect(dto.endDate, appObject['endDate']);
      expect(dto.baseCurrency, appObject['baseCurrency']);
      expect(dto.ownerId, appObject['ownerId']);
      expect(dto.joinCode, appObject['joinCode']);
      expect(dto.archived, appObject['archived']);
      expect(dto.destination, appObject['destination']);

      final domain = dto.toDomain();
      expect(domain.id, appObject['id']);
      expect(domain.name, appObject['name']);
      expect(domain.startDate, appObject['startDate']);
      expect(domain.endDate, appObject['endDate']);
    });

    test('Expenses mapping matches golden fixture', () {
      final expenseFixture = fixtures['expenses'] as Map<String, dynamic>;
      final dbRow = expenseFixture['dbRow'] as Map<String, dynamic>;
      final appObject = expenseFixture['appObject'] as Map<String, dynamic>;

      final dto = ExpenseDto.fromPostgresJson(dbRow);
      expect(dto.id, appObject['id']);
      expect(dto.tripId, appObject['tripId']);
      expect(dto.title, appObject['title']);
      expect(dto.amount, appObject['amount']);
      expect(dto.currency, appObject['currency']);
      expect(dto.categoryId, appObject['categoryId']);
      expect(dto.paidByMemberId, appObject['paidByMemberId']);
      expect(dto.splitMode, appObject['splitMode']);
      expect(dto.date, appObject['date']);
      expect(dto.receiptUrl, appObject['receiptUrl']);
      expect(dto.notes, appObject['notes']);
      expect(dto.isReimbursement, appObject['isReimbursement']);
      expect(dto.exchangeRate, appObject['exchangeRate']);

      final domain = dto.toDomain();
      expect(domain.id, appObject['id']);
      expect(domain.title, appObject['title']);
      expect(domain.amount, appObject['amount']);
    });

    test('Members mapping matches golden fixture', () {
      final memberFixture = fixtures['members'] as Map<String, dynamic>;
      final dbRow = memberFixture['dbRow'] as Map<String, dynamic>;
      final appObject = memberFixture['appObject'] as Map<String, dynamic>;

      final dto = MemberDto.fromPostgresJson(dbRow);
      expect(dto.id, appObject['id']);
      expect(dto.tripId, appObject['tripId']);
      expect(dto.name, appObject['name']);
      expect(dto.linkedUserId, appObject['linkedUserId']);
      expect(dto.archived, appObject['archived']);
      expect(dto.joinDate, appObject['joinDate']);

      final domain = dto.toDomain();
      expect(domain.id, appObject['id']);
      expect(domain.name, appObject['name']);
    });
  });
}
