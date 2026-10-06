import 'dart:async';
import 'dart:io';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../../domain/models/expense_io.dart';

/// Server-rule actions that the web only performs online (the RPCs enforce who
/// may do what), plus chat-card inserts. Faked in tests.
abstract class ExpenseOnlineApi {
  Future<void> flagDispute(String expenseId, String? note);
  Future<void> resolveDispute(String expenseId);
  Future<void> confirmSettlement(String expenseId);
  Future<void> approve(String expenseId);
  Future<void> sendChat(Map<String, dynamic> row);
}

class SupabaseExpenseOnlineApi implements ExpenseOnlineApi {
  SupabaseExpenseOnlineApi(this._client);
  final SupabaseClient _client;

  Future<void> _rpc(String fn, Map<String, dynamic> params) async {
    try {
      await _client.rpc<dynamic>(fn, params: params);
    } on PostgrestException catch (e) {
      throw ExpenseActionException(e.message);
    } on SocketException {
      throw const ExpenseActionException('You are offline.', offline: true);
    } on TimeoutException {
      throw const ExpenseActionException('You are offline.', offline: true);
    } on AuthRetryableFetchException {
      throw const ExpenseActionException('You are offline.', offline: true);
    } catch (e) {
      // http ClientException (socket wrapped) and anything else transport-level.
      throw ExpenseActionException('$e', offline: true);
    }
  }

  @override
  Future<void> flagDispute(String id, String? note) => _rpc('flag_expense_dispute', {'p_expense_id': id, 'p_note': note});

  @override
  Future<void> resolveDispute(String id) => _rpc('resolve_expense_dispute', {'p_expense_id': id});

  @override
  Future<void> confirmSettlement(String id) => _rpc('confirm_settlement', {'p_expense_id': id});

  @override
  Future<void> approve(String id) => _rpc('approve_expense', {'p_expense_id': id});

  @override
  Future<void> sendChat(Map<String, dynamic> row) async {
    await _client.from('trip_messages').upsert(row);
  }
}
