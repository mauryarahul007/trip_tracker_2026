// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'app_database.dart';

// ignore_for_file: type=lint
class $TripsTableTable extends TripsTable with TableInfo<$TripsTableTable, TripEntry> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $TripsTableTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
    'name',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _startDateMeta = const VerificationMeta('startDate');
  @override
  late final GeneratedColumn<String> startDate = GeneratedColumn<String>(
    'start_date',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _endDateMeta = const VerificationMeta('endDate');
  @override
  late final GeneratedColumn<String> endDate = GeneratedColumn<String>(
    'end_date',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _baseCurrencyMeta = const VerificationMeta('baseCurrency');
  @override
  late final GeneratedColumn<String> baseCurrency = GeneratedColumn<String>(
    'base_currency',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _ownerIdMeta = const VerificationMeta('ownerId');
  @override
  late final GeneratedColumn<String> ownerId = GeneratedColumn<String>(
    'owner_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _joinCodeMeta = const VerificationMeta('joinCode');
  @override
  late final GeneratedColumn<String> joinCode = GeneratedColumn<String>(
    'join_code',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _destinationMeta = const VerificationMeta('destination');
  @override
  late final GeneratedColumn<String> destination = GeneratedColumn<String>(
    'destination',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _stopsJsonMeta = const VerificationMeta('stopsJson');
  @override
  late final GeneratedColumn<String> stopsJson = GeneratedColumn<String>(
    'stops_json',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _checklistJsonMeta = const VerificationMeta('checklistJson');
  @override
  late final GeneratedColumn<String> checklistJson = GeneratedColumn<String>(
    'checklist_json',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _notesJsonMeta = const VerificationMeta('notesJson');
  @override
  late final GeneratedColumn<String> notesJson = GeneratedColumn<String>(
    'notes_json',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _passesJsonMeta = const VerificationMeta('passesJson');
  @override
  late final GeneratedColumn<String> passesJson = GeneratedColumn<String>(
    'passes_json',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _fxConfigJsonMeta = const VerificationMeta('fxConfigJson');
  @override
  late final GeneratedColumn<String> fxConfigJson = GeneratedColumn<String>(
    'fx_config_json',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _memberRolesJsonMeta = const VerificationMeta('memberRolesJson');
  @override
  late final GeneratedColumn<String> memberRolesJson = GeneratedColumn<String>(
    'member_roles_json',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _simplifyDebtsMeta = const VerificationMeta('simplifyDebts');
  @override
  late final GeneratedColumn<bool> simplifyDebts = GeneratedColumn<bool>(
    'simplify_debts',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways('CHECK ("simplify_debts" IN (0, 1))'),
    defaultValue: const Constant(true),
  );
  static const VerificationMeta _archivedMeta = const VerificationMeta('archived');
  @override
  late final GeneratedColumn<bool> archived = GeneratedColumn<bool>(
    'archived',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways('CHECK ("archived" IN (0, 1))'),
    defaultValue: const Constant(false),
  );
  static const VerificationMeta _frozenMeta = const VerificationMeta('frozen');
  @override
  late final GeneratedColumn<bool> frozen = GeneratedColumn<bool>(
    'frozen',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways('CHECK ("frozen" IN (0, 1))'),
    defaultValue: const Constant(false),
  );
  static const VerificationMeta _closedMeta = const VerificationMeta('closed');
  @override
  late final GeneratedColumn<bool> closed = GeneratedColumn<bool>(
    'closed',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways('CHECK ("closed" IN (0, 1))'),
    defaultValue: const Constant(false),
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<String> createdAt = GeneratedColumn<String>(
    'created_at',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _updatedAtMeta = const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<String> updatedAt = GeneratedColumn<String>(
    'updated_at',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _domainJsonMeta = const VerificationMeta('domainJson');
  @override
  late final GeneratedColumn<String> domainJson = GeneratedColumn<String>(
    'domain_json',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    name,
    startDate,
    endDate,
    baseCurrency,
    ownerId,
    joinCode,
    destination,
    stopsJson,
    checklistJson,
    notesJson,
    passesJson,
    fxConfigJson,
    memberRolesJson,
    simplifyDebts,
    archived,
    frozen,
    closed,
    createdAt,
    updatedAt,
    domainJson,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'trips';
  @override
  VerificationContext validateIntegrity(Insertable<TripEntry> instance, {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('name')) {
      context.handle(_nameMeta, name.isAcceptableOrUnknown(data['name']!, _nameMeta));
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('start_date')) {
      context.handle(_startDateMeta, startDate.isAcceptableOrUnknown(data['start_date']!, _startDateMeta));
    } else if (isInserting) {
      context.missing(_startDateMeta);
    }
    if (data.containsKey('end_date')) {
      context.handle(_endDateMeta, endDate.isAcceptableOrUnknown(data['end_date']!, _endDateMeta));
    } else if (isInserting) {
      context.missing(_endDateMeta);
    }
    if (data.containsKey('base_currency')) {
      context.handle(_baseCurrencyMeta, baseCurrency.isAcceptableOrUnknown(data['base_currency']!, _baseCurrencyMeta));
    } else if (isInserting) {
      context.missing(_baseCurrencyMeta);
    }
    if (data.containsKey('owner_id')) {
      context.handle(_ownerIdMeta, ownerId.isAcceptableOrUnknown(data['owner_id']!, _ownerIdMeta));
    } else if (isInserting) {
      context.missing(_ownerIdMeta);
    }
    if (data.containsKey('join_code')) {
      context.handle(_joinCodeMeta, joinCode.isAcceptableOrUnknown(data['join_code']!, _joinCodeMeta));
    }
    if (data.containsKey('destination')) {
      context.handle(_destinationMeta, destination.isAcceptableOrUnknown(data['destination']!, _destinationMeta));
    }
    if (data.containsKey('stops_json')) {
      context.handle(_stopsJsonMeta, stopsJson.isAcceptableOrUnknown(data['stops_json']!, _stopsJsonMeta));
    }
    if (data.containsKey('checklist_json')) {
      context.handle(
        _checklistJsonMeta,
        checklistJson.isAcceptableOrUnknown(data['checklist_json']!, _checklistJsonMeta),
      );
    }
    if (data.containsKey('notes_json')) {
      context.handle(_notesJsonMeta, notesJson.isAcceptableOrUnknown(data['notes_json']!, _notesJsonMeta));
    }
    if (data.containsKey('passes_json')) {
      context.handle(_passesJsonMeta, passesJson.isAcceptableOrUnknown(data['passes_json']!, _passesJsonMeta));
    }
    if (data.containsKey('fx_config_json')) {
      context.handle(_fxConfigJsonMeta, fxConfigJson.isAcceptableOrUnknown(data['fx_config_json']!, _fxConfigJsonMeta));
    }
    if (data.containsKey('member_roles_json')) {
      context.handle(
        _memberRolesJsonMeta,
        memberRolesJson.isAcceptableOrUnknown(data['member_roles_json']!, _memberRolesJsonMeta),
      );
    }
    if (data.containsKey('simplify_debts')) {
      context.handle(
        _simplifyDebtsMeta,
        simplifyDebts.isAcceptableOrUnknown(data['simplify_debts']!, _simplifyDebtsMeta),
      );
    }
    if (data.containsKey('archived')) {
      context.handle(_archivedMeta, archived.isAcceptableOrUnknown(data['archived']!, _archivedMeta));
    }
    if (data.containsKey('frozen')) {
      context.handle(_frozenMeta, frozen.isAcceptableOrUnknown(data['frozen']!, _frozenMeta));
    }
    if (data.containsKey('closed')) {
      context.handle(_closedMeta, closed.isAcceptableOrUnknown(data['closed']!, _closedMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta, createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta, updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    }
    if (data.containsKey('domain_json')) {
      context.handle(_domainJsonMeta, domainJson.isAcceptableOrUnknown(data['domain_json']!, _domainJsonMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  TripEntry map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return TripEntry(
      id: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      name: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}name'])!,
      startDate: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}start_date'])!,
      endDate: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}end_date'])!,
      baseCurrency: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}base_currency'])!,
      ownerId: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}owner_id'])!,
      joinCode: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}join_code']),
      destination: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}destination']),
      stopsJson: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}stops_json']),
      checklistJson: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}checklist_json']),
      notesJson: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}notes_json']),
      passesJson: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}passes_json']),
      fxConfigJson: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}fx_config_json']),
      memberRolesJson: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}member_roles_json'],
      ),
      simplifyDebts: attachedDatabase.typeMapping.read(DriftSqlType.bool, data['${effectivePrefix}simplify_debts'])!,
      archived: attachedDatabase.typeMapping.read(DriftSqlType.bool, data['${effectivePrefix}archived'])!,
      frozen: attachedDatabase.typeMapping.read(DriftSqlType.bool, data['${effectivePrefix}frozen'])!,
      closed: attachedDatabase.typeMapping.read(DriftSqlType.bool, data['${effectivePrefix}closed'])!,
      createdAt: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}created_at']),
      updatedAt: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}updated_at']),
      domainJson: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}domain_json']),
    );
  }

  @override
  $TripsTableTable createAlias(String alias) {
    return $TripsTableTable(attachedDatabase, alias);
  }
}

class TripEntry extends DataClass implements Insertable<TripEntry> {
  final String id;
  final String name;
  final String startDate;
  final String endDate;
  final String baseCurrency;
  final String ownerId;
  final String? joinCode;
  final String? destination;
  final String? stopsJson;
  final String? checklistJson;
  final String? notesJson;
  final String? passesJson;
  final String? fxConfigJson;
  final String? memberRolesJson;
  final bool simplifyDebts;
  final bool archived;
  final bool frozen;
  final bool closed;
  final String? createdAt;
  final String? updatedAt;

  /// Full-fidelity domain `Trip.toJson()` (schema v2); columns above are for querying.
  final String? domainJson;
  const TripEntry({
    required this.id,
    required this.name,
    required this.startDate,
    required this.endDate,
    required this.baseCurrency,
    required this.ownerId,
    this.joinCode,
    this.destination,
    this.stopsJson,
    this.checklistJson,
    this.notesJson,
    this.passesJson,
    this.fxConfigJson,
    this.memberRolesJson,
    required this.simplifyDebts,
    required this.archived,
    required this.frozen,
    required this.closed,
    this.createdAt,
    this.updatedAt,
    this.domainJson,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['name'] = Variable<String>(name);
    map['start_date'] = Variable<String>(startDate);
    map['end_date'] = Variable<String>(endDate);
    map['base_currency'] = Variable<String>(baseCurrency);
    map['owner_id'] = Variable<String>(ownerId);
    if (!nullToAbsent || joinCode != null) {
      map['join_code'] = Variable<String>(joinCode);
    }
    if (!nullToAbsent || destination != null) {
      map['destination'] = Variable<String>(destination);
    }
    if (!nullToAbsent || stopsJson != null) {
      map['stops_json'] = Variable<String>(stopsJson);
    }
    if (!nullToAbsent || checklistJson != null) {
      map['checklist_json'] = Variable<String>(checklistJson);
    }
    if (!nullToAbsent || notesJson != null) {
      map['notes_json'] = Variable<String>(notesJson);
    }
    if (!nullToAbsent || passesJson != null) {
      map['passes_json'] = Variable<String>(passesJson);
    }
    if (!nullToAbsent || fxConfigJson != null) {
      map['fx_config_json'] = Variable<String>(fxConfigJson);
    }
    if (!nullToAbsent || memberRolesJson != null) {
      map['member_roles_json'] = Variable<String>(memberRolesJson);
    }
    map['simplify_debts'] = Variable<bool>(simplifyDebts);
    map['archived'] = Variable<bool>(archived);
    map['frozen'] = Variable<bool>(frozen);
    map['closed'] = Variable<bool>(closed);
    if (!nullToAbsent || createdAt != null) {
      map['created_at'] = Variable<String>(createdAt);
    }
    if (!nullToAbsent || updatedAt != null) {
      map['updated_at'] = Variable<String>(updatedAt);
    }
    if (!nullToAbsent || domainJson != null) {
      map['domain_json'] = Variable<String>(domainJson);
    }
    return map;
  }

  TripsTableCompanion toCompanion(bool nullToAbsent) {
    return TripsTableCompanion(
      id: Value(id),
      name: Value(name),
      startDate: Value(startDate),
      endDate: Value(endDate),
      baseCurrency: Value(baseCurrency),
      ownerId: Value(ownerId),
      joinCode: joinCode == null && nullToAbsent ? const Value.absent() : Value(joinCode),
      destination: destination == null && nullToAbsent ? const Value.absent() : Value(destination),
      stopsJson: stopsJson == null && nullToAbsent ? const Value.absent() : Value(stopsJson),
      checklistJson: checklistJson == null && nullToAbsent ? const Value.absent() : Value(checklistJson),
      notesJson: notesJson == null && nullToAbsent ? const Value.absent() : Value(notesJson),
      passesJson: passesJson == null && nullToAbsent ? const Value.absent() : Value(passesJson),
      fxConfigJson: fxConfigJson == null && nullToAbsent ? const Value.absent() : Value(fxConfigJson),
      memberRolesJson: memberRolesJson == null && nullToAbsent ? const Value.absent() : Value(memberRolesJson),
      simplifyDebts: Value(simplifyDebts),
      archived: Value(archived),
      frozen: Value(frozen),
      closed: Value(closed),
      createdAt: createdAt == null && nullToAbsent ? const Value.absent() : Value(createdAt),
      updatedAt: updatedAt == null && nullToAbsent ? const Value.absent() : Value(updatedAt),
      domainJson: domainJson == null && nullToAbsent ? const Value.absent() : Value(domainJson),
    );
  }

  factory TripEntry.fromJson(Map<String, dynamic> json, {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return TripEntry(
      id: serializer.fromJson<String>(json['id']),
      name: serializer.fromJson<String>(json['name']),
      startDate: serializer.fromJson<String>(json['startDate']),
      endDate: serializer.fromJson<String>(json['endDate']),
      baseCurrency: serializer.fromJson<String>(json['baseCurrency']),
      ownerId: serializer.fromJson<String>(json['ownerId']),
      joinCode: serializer.fromJson<String?>(json['joinCode']),
      destination: serializer.fromJson<String?>(json['destination']),
      stopsJson: serializer.fromJson<String?>(json['stopsJson']),
      checklistJson: serializer.fromJson<String?>(json['checklistJson']),
      notesJson: serializer.fromJson<String?>(json['notesJson']),
      passesJson: serializer.fromJson<String?>(json['passesJson']),
      fxConfigJson: serializer.fromJson<String?>(json['fxConfigJson']),
      memberRolesJson: serializer.fromJson<String?>(json['memberRolesJson']),
      simplifyDebts: serializer.fromJson<bool>(json['simplifyDebts']),
      archived: serializer.fromJson<bool>(json['archived']),
      frozen: serializer.fromJson<bool>(json['frozen']),
      closed: serializer.fromJson<bool>(json['closed']),
      createdAt: serializer.fromJson<String?>(json['createdAt']),
      updatedAt: serializer.fromJson<String?>(json['updatedAt']),
      domainJson: serializer.fromJson<String?>(json['domainJson']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'name': serializer.toJson<String>(name),
      'startDate': serializer.toJson<String>(startDate),
      'endDate': serializer.toJson<String>(endDate),
      'baseCurrency': serializer.toJson<String>(baseCurrency),
      'ownerId': serializer.toJson<String>(ownerId),
      'joinCode': serializer.toJson<String?>(joinCode),
      'destination': serializer.toJson<String?>(destination),
      'stopsJson': serializer.toJson<String?>(stopsJson),
      'checklistJson': serializer.toJson<String?>(checklistJson),
      'notesJson': serializer.toJson<String?>(notesJson),
      'passesJson': serializer.toJson<String?>(passesJson),
      'fxConfigJson': serializer.toJson<String?>(fxConfigJson),
      'memberRolesJson': serializer.toJson<String?>(memberRolesJson),
      'simplifyDebts': serializer.toJson<bool>(simplifyDebts),
      'archived': serializer.toJson<bool>(archived),
      'frozen': serializer.toJson<bool>(frozen),
      'closed': serializer.toJson<bool>(closed),
      'createdAt': serializer.toJson<String?>(createdAt),
      'updatedAt': serializer.toJson<String?>(updatedAt),
      'domainJson': serializer.toJson<String?>(domainJson),
    };
  }

  TripEntry copyWith({
    String? id,
    String? name,
    String? startDate,
    String? endDate,
    String? baseCurrency,
    String? ownerId,
    Value<String?> joinCode = const Value.absent(),
    Value<String?> destination = const Value.absent(),
    Value<String?> stopsJson = const Value.absent(),
    Value<String?> checklistJson = const Value.absent(),
    Value<String?> notesJson = const Value.absent(),
    Value<String?> passesJson = const Value.absent(),
    Value<String?> fxConfigJson = const Value.absent(),
    Value<String?> memberRolesJson = const Value.absent(),
    bool? simplifyDebts,
    bool? archived,
    bool? frozen,
    bool? closed,
    Value<String?> createdAt = const Value.absent(),
    Value<String?> updatedAt = const Value.absent(),
    Value<String?> domainJson = const Value.absent(),
  }) => TripEntry(
    id: id ?? this.id,
    name: name ?? this.name,
    startDate: startDate ?? this.startDate,
    endDate: endDate ?? this.endDate,
    baseCurrency: baseCurrency ?? this.baseCurrency,
    ownerId: ownerId ?? this.ownerId,
    joinCode: joinCode.present ? joinCode.value : this.joinCode,
    destination: destination.present ? destination.value : this.destination,
    stopsJson: stopsJson.present ? stopsJson.value : this.stopsJson,
    checklistJson: checklistJson.present ? checklistJson.value : this.checklistJson,
    notesJson: notesJson.present ? notesJson.value : this.notesJson,
    passesJson: passesJson.present ? passesJson.value : this.passesJson,
    fxConfigJson: fxConfigJson.present ? fxConfigJson.value : this.fxConfigJson,
    memberRolesJson: memberRolesJson.present ? memberRolesJson.value : this.memberRolesJson,
    simplifyDebts: simplifyDebts ?? this.simplifyDebts,
    archived: archived ?? this.archived,
    frozen: frozen ?? this.frozen,
    closed: closed ?? this.closed,
    createdAt: createdAt.present ? createdAt.value : this.createdAt,
    updatedAt: updatedAt.present ? updatedAt.value : this.updatedAt,
    domainJson: domainJson.present ? domainJson.value : this.domainJson,
  );
  TripEntry copyWithCompanion(TripsTableCompanion data) {
    return TripEntry(
      id: data.id.present ? data.id.value : this.id,
      name: data.name.present ? data.name.value : this.name,
      startDate: data.startDate.present ? data.startDate.value : this.startDate,
      endDate: data.endDate.present ? data.endDate.value : this.endDate,
      baseCurrency: data.baseCurrency.present ? data.baseCurrency.value : this.baseCurrency,
      ownerId: data.ownerId.present ? data.ownerId.value : this.ownerId,
      joinCode: data.joinCode.present ? data.joinCode.value : this.joinCode,
      destination: data.destination.present ? data.destination.value : this.destination,
      stopsJson: data.stopsJson.present ? data.stopsJson.value : this.stopsJson,
      checklistJson: data.checklistJson.present ? data.checklistJson.value : this.checklistJson,
      notesJson: data.notesJson.present ? data.notesJson.value : this.notesJson,
      passesJson: data.passesJson.present ? data.passesJson.value : this.passesJson,
      fxConfigJson: data.fxConfigJson.present ? data.fxConfigJson.value : this.fxConfigJson,
      memberRolesJson: data.memberRolesJson.present ? data.memberRolesJson.value : this.memberRolesJson,
      simplifyDebts: data.simplifyDebts.present ? data.simplifyDebts.value : this.simplifyDebts,
      archived: data.archived.present ? data.archived.value : this.archived,
      frozen: data.frozen.present ? data.frozen.value : this.frozen,
      closed: data.closed.present ? data.closed.value : this.closed,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      domainJson: data.domainJson.present ? data.domainJson.value : this.domainJson,
    );
  }

  @override
  String toString() {
    return (StringBuffer('TripEntry(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('startDate: $startDate, ')
          ..write('endDate: $endDate, ')
          ..write('baseCurrency: $baseCurrency, ')
          ..write('ownerId: $ownerId, ')
          ..write('joinCode: $joinCode, ')
          ..write('destination: $destination, ')
          ..write('stopsJson: $stopsJson, ')
          ..write('checklistJson: $checklistJson, ')
          ..write('notesJson: $notesJson, ')
          ..write('passesJson: $passesJson, ')
          ..write('fxConfigJson: $fxConfigJson, ')
          ..write('memberRolesJson: $memberRolesJson, ')
          ..write('simplifyDebts: $simplifyDebts, ')
          ..write('archived: $archived, ')
          ..write('frozen: $frozen, ')
          ..write('closed: $closed, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('domainJson: $domainJson')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hashAll([
    id,
    name,
    startDate,
    endDate,
    baseCurrency,
    ownerId,
    joinCode,
    destination,
    stopsJson,
    checklistJson,
    notesJson,
    passesJson,
    fxConfigJson,
    memberRolesJson,
    simplifyDebts,
    archived,
    frozen,
    closed,
    createdAt,
    updatedAt,
    domainJson,
  ]);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is TripEntry &&
          other.id == this.id &&
          other.name == this.name &&
          other.startDate == this.startDate &&
          other.endDate == this.endDate &&
          other.baseCurrency == this.baseCurrency &&
          other.ownerId == this.ownerId &&
          other.joinCode == this.joinCode &&
          other.destination == this.destination &&
          other.stopsJson == this.stopsJson &&
          other.checklistJson == this.checklistJson &&
          other.notesJson == this.notesJson &&
          other.passesJson == this.passesJson &&
          other.fxConfigJson == this.fxConfigJson &&
          other.memberRolesJson == this.memberRolesJson &&
          other.simplifyDebts == this.simplifyDebts &&
          other.archived == this.archived &&
          other.frozen == this.frozen &&
          other.closed == this.closed &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt &&
          other.domainJson == this.domainJson);
}

class TripsTableCompanion extends UpdateCompanion<TripEntry> {
  final Value<String> id;
  final Value<String> name;
  final Value<String> startDate;
  final Value<String> endDate;
  final Value<String> baseCurrency;
  final Value<String> ownerId;
  final Value<String?> joinCode;
  final Value<String?> destination;
  final Value<String?> stopsJson;
  final Value<String?> checklistJson;
  final Value<String?> notesJson;
  final Value<String?> passesJson;
  final Value<String?> fxConfigJson;
  final Value<String?> memberRolesJson;
  final Value<bool> simplifyDebts;
  final Value<bool> archived;
  final Value<bool> frozen;
  final Value<bool> closed;
  final Value<String?> createdAt;
  final Value<String?> updatedAt;
  final Value<String?> domainJson;
  final Value<int> rowid;
  const TripsTableCompanion({
    this.id = const Value.absent(),
    this.name = const Value.absent(),
    this.startDate = const Value.absent(),
    this.endDate = const Value.absent(),
    this.baseCurrency = const Value.absent(),
    this.ownerId = const Value.absent(),
    this.joinCode = const Value.absent(),
    this.destination = const Value.absent(),
    this.stopsJson = const Value.absent(),
    this.checklistJson = const Value.absent(),
    this.notesJson = const Value.absent(),
    this.passesJson = const Value.absent(),
    this.fxConfigJson = const Value.absent(),
    this.memberRolesJson = const Value.absent(),
    this.simplifyDebts = const Value.absent(),
    this.archived = const Value.absent(),
    this.frozen = const Value.absent(),
    this.closed = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.domainJson = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  TripsTableCompanion.insert({
    required String id,
    required String name,
    required String startDate,
    required String endDate,
    required String baseCurrency,
    required String ownerId,
    this.joinCode = const Value.absent(),
    this.destination = const Value.absent(),
    this.stopsJson = const Value.absent(),
    this.checklistJson = const Value.absent(),
    this.notesJson = const Value.absent(),
    this.passesJson = const Value.absent(),
    this.fxConfigJson = const Value.absent(),
    this.memberRolesJson = const Value.absent(),
    this.simplifyDebts = const Value.absent(),
    this.archived = const Value.absent(),
    this.frozen = const Value.absent(),
    this.closed = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.domainJson = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       name = Value(name),
       startDate = Value(startDate),
       endDate = Value(endDate),
       baseCurrency = Value(baseCurrency),
       ownerId = Value(ownerId);
  static Insertable<TripEntry> custom({
    Expression<String>? id,
    Expression<String>? name,
    Expression<String>? startDate,
    Expression<String>? endDate,
    Expression<String>? baseCurrency,
    Expression<String>? ownerId,
    Expression<String>? joinCode,
    Expression<String>? destination,
    Expression<String>? stopsJson,
    Expression<String>? checklistJson,
    Expression<String>? notesJson,
    Expression<String>? passesJson,
    Expression<String>? fxConfigJson,
    Expression<String>? memberRolesJson,
    Expression<bool>? simplifyDebts,
    Expression<bool>? archived,
    Expression<bool>? frozen,
    Expression<bool>? closed,
    Expression<String>? createdAt,
    Expression<String>? updatedAt,
    Expression<String>? domainJson,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      if (startDate != null) 'start_date': startDate,
      if (endDate != null) 'end_date': endDate,
      if (baseCurrency != null) 'base_currency': baseCurrency,
      if (ownerId != null) 'owner_id': ownerId,
      if (joinCode != null) 'join_code': joinCode,
      if (destination != null) 'destination': destination,
      if (stopsJson != null) 'stops_json': stopsJson,
      if (checklistJson != null) 'checklist_json': checklistJson,
      if (notesJson != null) 'notes_json': notesJson,
      if (passesJson != null) 'passes_json': passesJson,
      if (fxConfigJson != null) 'fx_config_json': fxConfigJson,
      if (memberRolesJson != null) 'member_roles_json': memberRolesJson,
      if (simplifyDebts != null) 'simplify_debts': simplifyDebts,
      if (archived != null) 'archived': archived,
      if (frozen != null) 'frozen': frozen,
      if (closed != null) 'closed': closed,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (domainJson != null) 'domain_json': domainJson,
      if (rowid != null) 'rowid': rowid,
    });
  }

  TripsTableCompanion copyWith({
    Value<String>? id,
    Value<String>? name,
    Value<String>? startDate,
    Value<String>? endDate,
    Value<String>? baseCurrency,
    Value<String>? ownerId,
    Value<String?>? joinCode,
    Value<String?>? destination,
    Value<String?>? stopsJson,
    Value<String?>? checklistJson,
    Value<String?>? notesJson,
    Value<String?>? passesJson,
    Value<String?>? fxConfigJson,
    Value<String?>? memberRolesJson,
    Value<bool>? simplifyDebts,
    Value<bool>? archived,
    Value<bool>? frozen,
    Value<bool>? closed,
    Value<String?>? createdAt,
    Value<String?>? updatedAt,
    Value<String?>? domainJson,
    Value<int>? rowid,
  }) {
    return TripsTableCompanion(
      id: id ?? this.id,
      name: name ?? this.name,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      baseCurrency: baseCurrency ?? this.baseCurrency,
      ownerId: ownerId ?? this.ownerId,
      joinCode: joinCode ?? this.joinCode,
      destination: destination ?? this.destination,
      stopsJson: stopsJson ?? this.stopsJson,
      checklistJson: checklistJson ?? this.checklistJson,
      notesJson: notesJson ?? this.notesJson,
      passesJson: passesJson ?? this.passesJson,
      fxConfigJson: fxConfigJson ?? this.fxConfigJson,
      memberRolesJson: memberRolesJson ?? this.memberRolesJson,
      simplifyDebts: simplifyDebts ?? this.simplifyDebts,
      archived: archived ?? this.archived,
      frozen: frozen ?? this.frozen,
      closed: closed ?? this.closed,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      domainJson: domainJson ?? this.domainJson,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (startDate.present) {
      map['start_date'] = Variable<String>(startDate.value);
    }
    if (endDate.present) {
      map['end_date'] = Variable<String>(endDate.value);
    }
    if (baseCurrency.present) {
      map['base_currency'] = Variable<String>(baseCurrency.value);
    }
    if (ownerId.present) {
      map['owner_id'] = Variable<String>(ownerId.value);
    }
    if (joinCode.present) {
      map['join_code'] = Variable<String>(joinCode.value);
    }
    if (destination.present) {
      map['destination'] = Variable<String>(destination.value);
    }
    if (stopsJson.present) {
      map['stops_json'] = Variable<String>(stopsJson.value);
    }
    if (checklistJson.present) {
      map['checklist_json'] = Variable<String>(checklistJson.value);
    }
    if (notesJson.present) {
      map['notes_json'] = Variable<String>(notesJson.value);
    }
    if (passesJson.present) {
      map['passes_json'] = Variable<String>(passesJson.value);
    }
    if (fxConfigJson.present) {
      map['fx_config_json'] = Variable<String>(fxConfigJson.value);
    }
    if (memberRolesJson.present) {
      map['member_roles_json'] = Variable<String>(memberRolesJson.value);
    }
    if (simplifyDebts.present) {
      map['simplify_debts'] = Variable<bool>(simplifyDebts.value);
    }
    if (archived.present) {
      map['archived'] = Variable<bool>(archived.value);
    }
    if (frozen.present) {
      map['frozen'] = Variable<bool>(frozen.value);
    }
    if (closed.present) {
      map['closed'] = Variable<bool>(closed.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<String>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<String>(updatedAt.value);
    }
    if (domainJson.present) {
      map['domain_json'] = Variable<String>(domainJson.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('TripsTableCompanion(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('startDate: $startDate, ')
          ..write('endDate: $endDate, ')
          ..write('baseCurrency: $baseCurrency, ')
          ..write('ownerId: $ownerId, ')
          ..write('joinCode: $joinCode, ')
          ..write('destination: $destination, ')
          ..write('stopsJson: $stopsJson, ')
          ..write('checklistJson: $checklistJson, ')
          ..write('notesJson: $notesJson, ')
          ..write('passesJson: $passesJson, ')
          ..write('fxConfigJson: $fxConfigJson, ')
          ..write('memberRolesJson: $memberRolesJson, ')
          ..write('simplifyDebts: $simplifyDebts, ')
          ..write('archived: $archived, ')
          ..write('frozen: $frozen, ')
          ..write('closed: $closed, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('domainJson: $domainJson, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $MembersTableTable extends MembersTable with TableInfo<$MembersTableTable, MemberEntry> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $MembersTableTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _tripIdMeta = const VerificationMeta('tripId');
  @override
  late final GeneratedColumn<String> tripId = GeneratedColumn<String>(
    'trip_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
    'name',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _linkedUserIdMeta = const VerificationMeta('linkedUserId');
  @override
  late final GeneratedColumn<String> linkedUserId = GeneratedColumn<String>(
    'linked_user_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _archivedMeta = const VerificationMeta('archived');
  @override
  late final GeneratedColumn<bool> archived = GeneratedColumn<bool>(
    'archived',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways('CHECK ("archived" IN (0, 1))'),
    defaultValue: const Constant(false),
  );
  static const VerificationMeta _joinDateMeta = const VerificationMeta('joinDate');
  @override
  late final GeneratedColumn<String> joinDate = GeneratedColumn<String>(
    'join_date',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _leaveDateMeta = const VerificationMeta('leaveDate');
  @override
  late final GeneratedColumn<String> leaveDate = GeneratedColumn<String>(
    'leave_date',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<String> createdAt = GeneratedColumn<String>(
    'created_at',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [id, tripId, name, linkedUserId, archived, joinDate, leaveDate, createdAt];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'members';
  @override
  VerificationContext validateIntegrity(Insertable<MemberEntry> instance, {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('trip_id')) {
      context.handle(_tripIdMeta, tripId.isAcceptableOrUnknown(data['trip_id']!, _tripIdMeta));
    } else if (isInserting) {
      context.missing(_tripIdMeta);
    }
    if (data.containsKey('name')) {
      context.handle(_nameMeta, name.isAcceptableOrUnknown(data['name']!, _nameMeta));
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('linked_user_id')) {
      context.handle(_linkedUserIdMeta, linkedUserId.isAcceptableOrUnknown(data['linked_user_id']!, _linkedUserIdMeta));
    }
    if (data.containsKey('archived')) {
      context.handle(_archivedMeta, archived.isAcceptableOrUnknown(data['archived']!, _archivedMeta));
    }
    if (data.containsKey('join_date')) {
      context.handle(_joinDateMeta, joinDate.isAcceptableOrUnknown(data['join_date']!, _joinDateMeta));
    }
    if (data.containsKey('leave_date')) {
      context.handle(_leaveDateMeta, leaveDate.isAcceptableOrUnknown(data['leave_date']!, _leaveDateMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta, createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  MemberEntry map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return MemberEntry(
      id: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      tripId: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}trip_id'])!,
      name: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}name'])!,
      linkedUserId: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}linked_user_id']),
      archived: attachedDatabase.typeMapping.read(DriftSqlType.bool, data['${effectivePrefix}archived'])!,
      joinDate: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}join_date']),
      leaveDate: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}leave_date']),
      createdAt: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}created_at']),
    );
  }

  @override
  $MembersTableTable createAlias(String alias) {
    return $MembersTableTable(attachedDatabase, alias);
  }
}

class MemberEntry extends DataClass implements Insertable<MemberEntry> {
  final String id;
  final String tripId;
  final String name;
  final String? linkedUserId;
  final bool archived;
  final String? joinDate;
  final String? leaveDate;
  final String? createdAt;
  const MemberEntry({
    required this.id,
    required this.tripId,
    required this.name,
    this.linkedUserId,
    required this.archived,
    this.joinDate,
    this.leaveDate,
    this.createdAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['trip_id'] = Variable<String>(tripId);
    map['name'] = Variable<String>(name);
    if (!nullToAbsent || linkedUserId != null) {
      map['linked_user_id'] = Variable<String>(linkedUserId);
    }
    map['archived'] = Variable<bool>(archived);
    if (!nullToAbsent || joinDate != null) {
      map['join_date'] = Variable<String>(joinDate);
    }
    if (!nullToAbsent || leaveDate != null) {
      map['leave_date'] = Variable<String>(leaveDate);
    }
    if (!nullToAbsent || createdAt != null) {
      map['created_at'] = Variable<String>(createdAt);
    }
    return map;
  }

  MembersTableCompanion toCompanion(bool nullToAbsent) {
    return MembersTableCompanion(
      id: Value(id),
      tripId: Value(tripId),
      name: Value(name),
      linkedUserId: linkedUserId == null && nullToAbsent ? const Value.absent() : Value(linkedUserId),
      archived: Value(archived),
      joinDate: joinDate == null && nullToAbsent ? const Value.absent() : Value(joinDate),
      leaveDate: leaveDate == null && nullToAbsent ? const Value.absent() : Value(leaveDate),
      createdAt: createdAt == null && nullToAbsent ? const Value.absent() : Value(createdAt),
    );
  }

  factory MemberEntry.fromJson(Map<String, dynamic> json, {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return MemberEntry(
      id: serializer.fromJson<String>(json['id']),
      tripId: serializer.fromJson<String>(json['tripId']),
      name: serializer.fromJson<String>(json['name']),
      linkedUserId: serializer.fromJson<String?>(json['linkedUserId']),
      archived: serializer.fromJson<bool>(json['archived']),
      joinDate: serializer.fromJson<String?>(json['joinDate']),
      leaveDate: serializer.fromJson<String?>(json['leaveDate']),
      createdAt: serializer.fromJson<String?>(json['createdAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'tripId': serializer.toJson<String>(tripId),
      'name': serializer.toJson<String>(name),
      'linkedUserId': serializer.toJson<String?>(linkedUserId),
      'archived': serializer.toJson<bool>(archived),
      'joinDate': serializer.toJson<String?>(joinDate),
      'leaveDate': serializer.toJson<String?>(leaveDate),
      'createdAt': serializer.toJson<String?>(createdAt),
    };
  }

  MemberEntry copyWith({
    String? id,
    String? tripId,
    String? name,
    Value<String?> linkedUserId = const Value.absent(),
    bool? archived,
    Value<String?> joinDate = const Value.absent(),
    Value<String?> leaveDate = const Value.absent(),
    Value<String?> createdAt = const Value.absent(),
  }) => MemberEntry(
    id: id ?? this.id,
    tripId: tripId ?? this.tripId,
    name: name ?? this.name,
    linkedUserId: linkedUserId.present ? linkedUserId.value : this.linkedUserId,
    archived: archived ?? this.archived,
    joinDate: joinDate.present ? joinDate.value : this.joinDate,
    leaveDate: leaveDate.present ? leaveDate.value : this.leaveDate,
    createdAt: createdAt.present ? createdAt.value : this.createdAt,
  );
  MemberEntry copyWithCompanion(MembersTableCompanion data) {
    return MemberEntry(
      id: data.id.present ? data.id.value : this.id,
      tripId: data.tripId.present ? data.tripId.value : this.tripId,
      name: data.name.present ? data.name.value : this.name,
      linkedUserId: data.linkedUserId.present ? data.linkedUserId.value : this.linkedUserId,
      archived: data.archived.present ? data.archived.value : this.archived,
      joinDate: data.joinDate.present ? data.joinDate.value : this.joinDate,
      leaveDate: data.leaveDate.present ? data.leaveDate.value : this.leaveDate,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('MemberEntry(')
          ..write('id: $id, ')
          ..write('tripId: $tripId, ')
          ..write('name: $name, ')
          ..write('linkedUserId: $linkedUserId, ')
          ..write('archived: $archived, ')
          ..write('joinDate: $joinDate, ')
          ..write('leaveDate: $leaveDate, ')
          ..write('createdAt: $createdAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, tripId, name, linkedUserId, archived, joinDate, leaveDate, createdAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is MemberEntry &&
          other.id == this.id &&
          other.tripId == this.tripId &&
          other.name == this.name &&
          other.linkedUserId == this.linkedUserId &&
          other.archived == this.archived &&
          other.joinDate == this.joinDate &&
          other.leaveDate == this.leaveDate &&
          other.createdAt == this.createdAt);
}

class MembersTableCompanion extends UpdateCompanion<MemberEntry> {
  final Value<String> id;
  final Value<String> tripId;
  final Value<String> name;
  final Value<String?> linkedUserId;
  final Value<bool> archived;
  final Value<String?> joinDate;
  final Value<String?> leaveDate;
  final Value<String?> createdAt;
  final Value<int> rowid;
  const MembersTableCompanion({
    this.id = const Value.absent(),
    this.tripId = const Value.absent(),
    this.name = const Value.absent(),
    this.linkedUserId = const Value.absent(),
    this.archived = const Value.absent(),
    this.joinDate = const Value.absent(),
    this.leaveDate = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  MembersTableCompanion.insert({
    required String id,
    required String tripId,
    required String name,
    this.linkedUserId = const Value.absent(),
    this.archived = const Value.absent(),
    this.joinDate = const Value.absent(),
    this.leaveDate = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       tripId = Value(tripId),
       name = Value(name);
  static Insertable<MemberEntry> custom({
    Expression<String>? id,
    Expression<String>? tripId,
    Expression<String>? name,
    Expression<String>? linkedUserId,
    Expression<bool>? archived,
    Expression<String>? joinDate,
    Expression<String>? leaveDate,
    Expression<String>? createdAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (tripId != null) 'trip_id': tripId,
      if (name != null) 'name': name,
      if (linkedUserId != null) 'linked_user_id': linkedUserId,
      if (archived != null) 'archived': archived,
      if (joinDate != null) 'join_date': joinDate,
      if (leaveDate != null) 'leave_date': leaveDate,
      if (createdAt != null) 'created_at': createdAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  MembersTableCompanion copyWith({
    Value<String>? id,
    Value<String>? tripId,
    Value<String>? name,
    Value<String?>? linkedUserId,
    Value<bool>? archived,
    Value<String?>? joinDate,
    Value<String?>? leaveDate,
    Value<String?>? createdAt,
    Value<int>? rowid,
  }) {
    return MembersTableCompanion(
      id: id ?? this.id,
      tripId: tripId ?? this.tripId,
      name: name ?? this.name,
      linkedUserId: linkedUserId ?? this.linkedUserId,
      archived: archived ?? this.archived,
      joinDate: joinDate ?? this.joinDate,
      leaveDate: leaveDate ?? this.leaveDate,
      createdAt: createdAt ?? this.createdAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (tripId.present) {
      map['trip_id'] = Variable<String>(tripId.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (linkedUserId.present) {
      map['linked_user_id'] = Variable<String>(linkedUserId.value);
    }
    if (archived.present) {
      map['archived'] = Variable<bool>(archived.value);
    }
    if (joinDate.present) {
      map['join_date'] = Variable<String>(joinDate.value);
    }
    if (leaveDate.present) {
      map['leave_date'] = Variable<String>(leaveDate.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<String>(createdAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('MembersTableCompanion(')
          ..write('id: $id, ')
          ..write('tripId: $tripId, ')
          ..write('name: $name, ')
          ..write('linkedUserId: $linkedUserId, ')
          ..write('archived: $archived, ')
          ..write('joinDate: $joinDate, ')
          ..write('leaveDate: $leaveDate, ')
          ..write('createdAt: $createdAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $GroupsTableTable extends GroupsTable with TableInfo<$GroupsTableTable, GroupEntry> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $GroupsTableTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _tripIdMeta = const VerificationMeta('tripId');
  @override
  late final GeneratedColumn<String> tripId = GeneratedColumn<String>(
    'trip_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
    'name',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<String> createdAt = GeneratedColumn<String>(
    'created_at',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _updatedAtMeta = const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<String> updatedAt = GeneratedColumn<String>(
    'updated_at',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [id, tripId, name, createdAt, updatedAt];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'groups';
  @override
  VerificationContext validateIntegrity(Insertable<GroupEntry> instance, {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('trip_id')) {
      context.handle(_tripIdMeta, tripId.isAcceptableOrUnknown(data['trip_id']!, _tripIdMeta));
    } else if (isInserting) {
      context.missing(_tripIdMeta);
    }
    if (data.containsKey('name')) {
      context.handle(_nameMeta, name.isAcceptableOrUnknown(data['name']!, _nameMeta));
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta, createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta, updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  GroupEntry map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return GroupEntry(
      id: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      tripId: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}trip_id'])!,
      name: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}name'])!,
      createdAt: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}created_at']),
      updatedAt: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}updated_at']),
    );
  }

  @override
  $GroupsTableTable createAlias(String alias) {
    return $GroupsTableTable(attachedDatabase, alias);
  }
}

class GroupEntry extends DataClass implements Insertable<GroupEntry> {
  final String id;
  final String tripId;
  final String name;
  final String? createdAt;
  final String? updatedAt;
  const GroupEntry({required this.id, required this.tripId, required this.name, this.createdAt, this.updatedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['trip_id'] = Variable<String>(tripId);
    map['name'] = Variable<String>(name);
    if (!nullToAbsent || createdAt != null) {
      map['created_at'] = Variable<String>(createdAt);
    }
    if (!nullToAbsent || updatedAt != null) {
      map['updated_at'] = Variable<String>(updatedAt);
    }
    return map;
  }

  GroupsTableCompanion toCompanion(bool nullToAbsent) {
    return GroupsTableCompanion(
      id: Value(id),
      tripId: Value(tripId),
      name: Value(name),
      createdAt: createdAt == null && nullToAbsent ? const Value.absent() : Value(createdAt),
      updatedAt: updatedAt == null && nullToAbsent ? const Value.absent() : Value(updatedAt),
    );
  }

  factory GroupEntry.fromJson(Map<String, dynamic> json, {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return GroupEntry(
      id: serializer.fromJson<String>(json['id']),
      tripId: serializer.fromJson<String>(json['tripId']),
      name: serializer.fromJson<String>(json['name']),
      createdAt: serializer.fromJson<String?>(json['createdAt']),
      updatedAt: serializer.fromJson<String?>(json['updatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'tripId': serializer.toJson<String>(tripId),
      'name': serializer.toJson<String>(name),
      'createdAt': serializer.toJson<String?>(createdAt),
      'updatedAt': serializer.toJson<String?>(updatedAt),
    };
  }

  GroupEntry copyWith({
    String? id,
    String? tripId,
    String? name,
    Value<String?> createdAt = const Value.absent(),
    Value<String?> updatedAt = const Value.absent(),
  }) => GroupEntry(
    id: id ?? this.id,
    tripId: tripId ?? this.tripId,
    name: name ?? this.name,
    createdAt: createdAt.present ? createdAt.value : this.createdAt,
    updatedAt: updatedAt.present ? updatedAt.value : this.updatedAt,
  );
  GroupEntry copyWithCompanion(GroupsTableCompanion data) {
    return GroupEntry(
      id: data.id.present ? data.id.value : this.id,
      tripId: data.tripId.present ? data.tripId.value : this.tripId,
      name: data.name.present ? data.name.value : this.name,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('GroupEntry(')
          ..write('id: $id, ')
          ..write('tripId: $tripId, ')
          ..write('name: $name, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, tripId, name, createdAt, updatedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is GroupEntry &&
          other.id == this.id &&
          other.tripId == this.tripId &&
          other.name == this.name &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt);
}

class GroupsTableCompanion extends UpdateCompanion<GroupEntry> {
  final Value<String> id;
  final Value<String> tripId;
  final Value<String> name;
  final Value<String?> createdAt;
  final Value<String?> updatedAt;
  final Value<int> rowid;
  const GroupsTableCompanion({
    this.id = const Value.absent(),
    this.tripId = const Value.absent(),
    this.name = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  GroupsTableCompanion.insert({
    required String id,
    required String tripId,
    required String name,
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       tripId = Value(tripId),
       name = Value(name);
  static Insertable<GroupEntry> custom({
    Expression<String>? id,
    Expression<String>? tripId,
    Expression<String>? name,
    Expression<String>? createdAt,
    Expression<String>? updatedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (tripId != null) 'trip_id': tripId,
      if (name != null) 'name': name,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  GroupsTableCompanion copyWith({
    Value<String>? id,
    Value<String>? tripId,
    Value<String>? name,
    Value<String?>? createdAt,
    Value<String?>? updatedAt,
    Value<int>? rowid,
  }) {
    return GroupsTableCompanion(
      id: id ?? this.id,
      tripId: tripId ?? this.tripId,
      name: name ?? this.name,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (tripId.present) {
      map['trip_id'] = Variable<String>(tripId.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<String>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<String>(updatedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('GroupsTableCompanion(')
          ..write('id: $id, ')
          ..write('tripId: $tripId, ')
          ..write('name: $name, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $GroupMembersTableTable extends GroupMembersTable with TableInfo<$GroupMembersTableTable, GroupMemberEntry> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $GroupMembersTableTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _groupIdMeta = const VerificationMeta('groupId');
  @override
  late final GeneratedColumn<String> groupId = GeneratedColumn<String>(
    'group_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _memberIdMeta = const VerificationMeta('memberId');
  @override
  late final GeneratedColumn<String> memberId = GeneratedColumn<String>(
    'member_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [groupId, memberId];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'group_members';
  @override
  VerificationContext validateIntegrity(Insertable<GroupMemberEntry> instance, {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('group_id')) {
      context.handle(_groupIdMeta, groupId.isAcceptableOrUnknown(data['group_id']!, _groupIdMeta));
    } else if (isInserting) {
      context.missing(_groupIdMeta);
    }
    if (data.containsKey('member_id')) {
      context.handle(_memberIdMeta, memberId.isAcceptableOrUnknown(data['member_id']!, _memberIdMeta));
    } else if (isInserting) {
      context.missing(_memberIdMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {groupId, memberId};
  @override
  GroupMemberEntry map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return GroupMemberEntry(
      groupId: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}group_id'])!,
      memberId: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}member_id'])!,
    );
  }

  @override
  $GroupMembersTableTable createAlias(String alias) {
    return $GroupMembersTableTable(attachedDatabase, alias);
  }
}

class GroupMemberEntry extends DataClass implements Insertable<GroupMemberEntry> {
  final String groupId;
  final String memberId;
  const GroupMemberEntry({required this.groupId, required this.memberId});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['group_id'] = Variable<String>(groupId);
    map['member_id'] = Variable<String>(memberId);
    return map;
  }

  GroupMembersTableCompanion toCompanion(bool nullToAbsent) {
    return GroupMembersTableCompanion(groupId: Value(groupId), memberId: Value(memberId));
  }

  factory GroupMemberEntry.fromJson(Map<String, dynamic> json, {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return GroupMemberEntry(
      groupId: serializer.fromJson<String>(json['groupId']),
      memberId: serializer.fromJson<String>(json['memberId']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'groupId': serializer.toJson<String>(groupId),
      'memberId': serializer.toJson<String>(memberId),
    };
  }

  GroupMemberEntry copyWith({String? groupId, String? memberId}) =>
      GroupMemberEntry(groupId: groupId ?? this.groupId, memberId: memberId ?? this.memberId);
  GroupMemberEntry copyWithCompanion(GroupMembersTableCompanion data) {
    return GroupMemberEntry(
      groupId: data.groupId.present ? data.groupId.value : this.groupId,
      memberId: data.memberId.present ? data.memberId.value : this.memberId,
    );
  }

  @override
  String toString() {
    return (StringBuffer('GroupMemberEntry(')
          ..write('groupId: $groupId, ')
          ..write('memberId: $memberId')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(groupId, memberId);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is GroupMemberEntry && other.groupId == this.groupId && other.memberId == this.memberId);
}

class GroupMembersTableCompanion extends UpdateCompanion<GroupMemberEntry> {
  final Value<String> groupId;
  final Value<String> memberId;
  final Value<int> rowid;
  const GroupMembersTableCompanion({
    this.groupId = const Value.absent(),
    this.memberId = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  GroupMembersTableCompanion.insert({
    required String groupId,
    required String memberId,
    this.rowid = const Value.absent(),
  }) : groupId = Value(groupId),
       memberId = Value(memberId);
  static Insertable<GroupMemberEntry> custom({
    Expression<String>? groupId,
    Expression<String>? memberId,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (groupId != null) 'group_id': groupId,
      if (memberId != null) 'member_id': memberId,
      if (rowid != null) 'rowid': rowid,
    });
  }

  GroupMembersTableCompanion copyWith({Value<String>? groupId, Value<String>? memberId, Value<int>? rowid}) {
    return GroupMembersTableCompanion(
      groupId: groupId ?? this.groupId,
      memberId: memberId ?? this.memberId,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (groupId.present) {
      map['group_id'] = Variable<String>(groupId.value);
    }
    if (memberId.present) {
      map['member_id'] = Variable<String>(memberId.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('GroupMembersTableCompanion(')
          ..write('groupId: $groupId, ')
          ..write('memberId: $memberId, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $CategoriesTableTable extends CategoriesTable with TableInfo<$CategoriesTableTable, CategoryEntry> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $CategoriesTableTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _tripIdMeta = const VerificationMeta('tripId');
  @override
  late final GeneratedColumn<String> tripId = GeneratedColumn<String>(
    'trip_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
    'name',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _iconMeta = const VerificationMeta('icon');
  @override
  late final GeneratedColumn<String> icon = GeneratedColumn<String>(
    'icon',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _isCustomMeta = const VerificationMeta('isCustom');
  @override
  late final GeneratedColumn<bool> isCustom = GeneratedColumn<bool>(
    'is_custom',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways('CHECK ("is_custom" IN (0, 1))'),
    defaultValue: const Constant(false),
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<String> createdAt = GeneratedColumn<String>(
    'created_at',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _updatedAtMeta = const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<String> updatedAt = GeneratedColumn<String>(
    'updated_at',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [id, tripId, name, icon, isCustom, createdAt, updatedAt];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'categories';
  @override
  VerificationContext validateIntegrity(Insertable<CategoryEntry> instance, {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('trip_id')) {
      context.handle(_tripIdMeta, tripId.isAcceptableOrUnknown(data['trip_id']!, _tripIdMeta));
    }
    if (data.containsKey('name')) {
      context.handle(_nameMeta, name.isAcceptableOrUnknown(data['name']!, _nameMeta));
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('icon')) {
      context.handle(_iconMeta, icon.isAcceptableOrUnknown(data['icon']!, _iconMeta));
    }
    if (data.containsKey('is_custom')) {
      context.handle(_isCustomMeta, isCustom.isAcceptableOrUnknown(data['is_custom']!, _isCustomMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta, createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta, updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  CategoryEntry map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return CategoryEntry(
      id: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      tripId: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}trip_id']),
      name: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}name'])!,
      icon: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}icon']),
      isCustom: attachedDatabase.typeMapping.read(DriftSqlType.bool, data['${effectivePrefix}is_custom'])!,
      createdAt: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}created_at']),
      updatedAt: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}updated_at']),
    );
  }

  @override
  $CategoriesTableTable createAlias(String alias) {
    return $CategoriesTableTable(attachedDatabase, alias);
  }
}

class CategoryEntry extends DataClass implements Insertable<CategoryEntry> {
  final String id;
  final String? tripId;
  final String name;
  final String? icon;
  final bool isCustom;
  final String? createdAt;
  final String? updatedAt;
  const CategoryEntry({
    required this.id,
    this.tripId,
    required this.name,
    this.icon,
    required this.isCustom,
    this.createdAt,
    this.updatedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    if (!nullToAbsent || tripId != null) {
      map['trip_id'] = Variable<String>(tripId);
    }
    map['name'] = Variable<String>(name);
    if (!nullToAbsent || icon != null) {
      map['icon'] = Variable<String>(icon);
    }
    map['is_custom'] = Variable<bool>(isCustom);
    if (!nullToAbsent || createdAt != null) {
      map['created_at'] = Variable<String>(createdAt);
    }
    if (!nullToAbsent || updatedAt != null) {
      map['updated_at'] = Variable<String>(updatedAt);
    }
    return map;
  }

  CategoriesTableCompanion toCompanion(bool nullToAbsent) {
    return CategoriesTableCompanion(
      id: Value(id),
      tripId: tripId == null && nullToAbsent ? const Value.absent() : Value(tripId),
      name: Value(name),
      icon: icon == null && nullToAbsent ? const Value.absent() : Value(icon),
      isCustom: Value(isCustom),
      createdAt: createdAt == null && nullToAbsent ? const Value.absent() : Value(createdAt),
      updatedAt: updatedAt == null && nullToAbsent ? const Value.absent() : Value(updatedAt),
    );
  }

  factory CategoryEntry.fromJson(Map<String, dynamic> json, {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return CategoryEntry(
      id: serializer.fromJson<String>(json['id']),
      tripId: serializer.fromJson<String?>(json['tripId']),
      name: serializer.fromJson<String>(json['name']),
      icon: serializer.fromJson<String?>(json['icon']),
      isCustom: serializer.fromJson<bool>(json['isCustom']),
      createdAt: serializer.fromJson<String?>(json['createdAt']),
      updatedAt: serializer.fromJson<String?>(json['updatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'tripId': serializer.toJson<String?>(tripId),
      'name': serializer.toJson<String>(name),
      'icon': serializer.toJson<String?>(icon),
      'isCustom': serializer.toJson<bool>(isCustom),
      'createdAt': serializer.toJson<String?>(createdAt),
      'updatedAt': serializer.toJson<String?>(updatedAt),
    };
  }

  CategoryEntry copyWith({
    String? id,
    Value<String?> tripId = const Value.absent(),
    String? name,
    Value<String?> icon = const Value.absent(),
    bool? isCustom,
    Value<String?> createdAt = const Value.absent(),
    Value<String?> updatedAt = const Value.absent(),
  }) => CategoryEntry(
    id: id ?? this.id,
    tripId: tripId.present ? tripId.value : this.tripId,
    name: name ?? this.name,
    icon: icon.present ? icon.value : this.icon,
    isCustom: isCustom ?? this.isCustom,
    createdAt: createdAt.present ? createdAt.value : this.createdAt,
    updatedAt: updatedAt.present ? updatedAt.value : this.updatedAt,
  );
  CategoryEntry copyWithCompanion(CategoriesTableCompanion data) {
    return CategoryEntry(
      id: data.id.present ? data.id.value : this.id,
      tripId: data.tripId.present ? data.tripId.value : this.tripId,
      name: data.name.present ? data.name.value : this.name,
      icon: data.icon.present ? data.icon.value : this.icon,
      isCustom: data.isCustom.present ? data.isCustom.value : this.isCustom,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('CategoryEntry(')
          ..write('id: $id, ')
          ..write('tripId: $tripId, ')
          ..write('name: $name, ')
          ..write('icon: $icon, ')
          ..write('isCustom: $isCustom, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, tripId, name, icon, isCustom, createdAt, updatedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is CategoryEntry &&
          other.id == this.id &&
          other.tripId == this.tripId &&
          other.name == this.name &&
          other.icon == this.icon &&
          other.isCustom == this.isCustom &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt);
}

class CategoriesTableCompanion extends UpdateCompanion<CategoryEntry> {
  final Value<String> id;
  final Value<String?> tripId;
  final Value<String> name;
  final Value<String?> icon;
  final Value<bool> isCustom;
  final Value<String?> createdAt;
  final Value<String?> updatedAt;
  final Value<int> rowid;
  const CategoriesTableCompanion({
    this.id = const Value.absent(),
    this.tripId = const Value.absent(),
    this.name = const Value.absent(),
    this.icon = const Value.absent(),
    this.isCustom = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  CategoriesTableCompanion.insert({
    required String id,
    this.tripId = const Value.absent(),
    required String name,
    this.icon = const Value.absent(),
    this.isCustom = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       name = Value(name);
  static Insertable<CategoryEntry> custom({
    Expression<String>? id,
    Expression<String>? tripId,
    Expression<String>? name,
    Expression<String>? icon,
    Expression<bool>? isCustom,
    Expression<String>? createdAt,
    Expression<String>? updatedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (tripId != null) 'trip_id': tripId,
      if (name != null) 'name': name,
      if (icon != null) 'icon': icon,
      if (isCustom != null) 'is_custom': isCustom,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  CategoriesTableCompanion copyWith({
    Value<String>? id,
    Value<String?>? tripId,
    Value<String>? name,
    Value<String?>? icon,
    Value<bool>? isCustom,
    Value<String?>? createdAt,
    Value<String?>? updatedAt,
    Value<int>? rowid,
  }) {
    return CategoriesTableCompanion(
      id: id ?? this.id,
      tripId: tripId ?? this.tripId,
      name: name ?? this.name,
      icon: icon ?? this.icon,
      isCustom: isCustom ?? this.isCustom,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (tripId.present) {
      map['trip_id'] = Variable<String>(tripId.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (icon.present) {
      map['icon'] = Variable<String>(icon.value);
    }
    if (isCustom.present) {
      map['is_custom'] = Variable<bool>(isCustom.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<String>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<String>(updatedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('CategoriesTableCompanion(')
          ..write('id: $id, ')
          ..write('tripId: $tripId, ')
          ..write('name: $name, ')
          ..write('icon: $icon, ')
          ..write('isCustom: $isCustom, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $ExpensesTableTable extends ExpensesTable with TableInfo<$ExpensesTableTable, ExpenseEntry> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $ExpensesTableTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _tripIdMeta = const VerificationMeta('tripId');
  @override
  late final GeneratedColumn<String> tripId = GeneratedColumn<String>(
    'trip_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _titleMeta = const VerificationMeta('title');
  @override
  late final GeneratedColumn<String> title = GeneratedColumn<String>(
    'title',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _amountMeta = const VerificationMeta('amount');
  @override
  late final GeneratedColumn<double> amount = GeneratedColumn<double>(
    'amount',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _currencyMeta = const VerificationMeta('currency');
  @override
  late final GeneratedColumn<String> currency = GeneratedColumn<String>(
    'currency',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _categoryIdMeta = const VerificationMeta('categoryId');
  @override
  late final GeneratedColumn<String> categoryId = GeneratedColumn<String>(
    'category_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _paidByMemberIdMeta = const VerificationMeta('paidByMemberId');
  @override
  late final GeneratedColumn<String> paidByMemberId = GeneratedColumn<String>(
    'paid_by_member_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _splitModeMeta = const VerificationMeta('splitMode');
  @override
  late final GeneratedColumn<String> splitMode = GeneratedColumn<String>(
    'split_mode',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _splitDataJsonMeta = const VerificationMeta('splitDataJson');
  @override
  late final GeneratedColumn<String> splitDataJson = GeneratedColumn<String>(
    'split_data_json',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _dateMeta = const VerificationMeta('date');
  @override
  late final GeneratedColumn<String> date = GeneratedColumn<String>(
    'date',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _receiptUrlMeta = const VerificationMeta('receiptUrl');
  @override
  late final GeneratedColumn<String> receiptUrl = GeneratedColumn<String>(
    'receipt_url',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _notesMeta = const VerificationMeta('notes');
  @override
  late final GeneratedColumn<String> notes = GeneratedColumn<String>(
    'notes',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _isReimbursementMeta = const VerificationMeta('isReimbursement');
  @override
  late final GeneratedColumn<bool> isReimbursement = GeneratedColumn<bool>(
    'is_reimbursement',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways('CHECK ("is_reimbursement" IN (0, 1))'),
    defaultValue: const Constant(false),
  );
  static const VerificationMeta _reimbursementToMemberIdMeta = const VerificationMeta('reimbursementToMemberId');
  @override
  late final GeneratedColumn<String> reimbursementToMemberId = GeneratedColumn<String>(
    'reimbursement_to_member_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _archivedMeta = const VerificationMeta('archived');
  @override
  late final GeneratedColumn<bool> archived = GeneratedColumn<bool>(
    'archived',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways('CHECK ("archived" IN (0, 1))'),
    defaultValue: const Constant(false),
  );
  static const VerificationMeta _recycledAtMeta = const VerificationMeta('recycledAt');
  @override
  late final GeneratedColumn<String> recycledAt = GeneratedColumn<String>(
    'recycled_at',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _payerWeightsJsonMeta = const VerificationMeta('payerWeightsJson');
  @override
  late final GeneratedColumn<String> payerWeightsJson = GeneratedColumn<String>(
    'payer_weights_json',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _exchangeRateMeta = const VerificationMeta('exchangeRate');
  @override
  late final GeneratedColumn<double> exchangeRate = GeneratedColumn<double>(
    'exchange_rate',
    aliasedName,
    true,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _disputeStatusMeta = const VerificationMeta('disputeStatus');
  @override
  late final GeneratedColumn<String> disputeStatus = GeneratedColumn<String>(
    'dispute_status',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _disputeNoteMeta = const VerificationMeta('disputeNote');
  @override
  late final GeneratedColumn<String> disputeNote = GeneratedColumn<String>(
    'dispute_note',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _disputedByMemberIdMeta = const VerificationMeta('disputedByMemberId');
  @override
  late final GeneratedColumn<String> disputedByMemberId = GeneratedColumn<String>(
    'disputed_by_member_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _settlementConfirmedMeta = const VerificationMeta('settlementConfirmed');
  @override
  late final GeneratedColumn<bool> settlementConfirmed = GeneratedColumn<bool>(
    'settlement_confirmed',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways('CHECK ("settlement_confirmed" IN (0, 1))'),
    defaultValue: const Constant(false),
  );
  static const VerificationMeta _settlementConfirmedAtMeta = const VerificationMeta('settlementConfirmedAt');
  @override
  late final GeneratedColumn<String> settlementConfirmedAt = GeneratedColumn<String>(
    'settlement_confirmed_at',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _approvalStatusMeta = const VerificationMeta('approvalStatus');
  @override
  late final GeneratedColumn<String> approvalStatus = GeneratedColumn<String>(
    'approval_status',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _approvedByMemberIdMeta = const VerificationMeta('approvedByMemberId');
  @override
  late final GeneratedColumn<String> approvedByMemberId = GeneratedColumn<String>(
    'approved_by_member_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _approvedAtMeta = const VerificationMeta('approvedAt');
  @override
  late final GeneratedColumn<String> approvedAt = GeneratedColumn<String>(
    'approved_at',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<String> createdAt = GeneratedColumn<String>(
    'created_at',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _updatedAtMeta = const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<String> updatedAt = GeneratedColumn<String>(
    'updated_at',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _domainJsonMeta = const VerificationMeta('domainJson');
  @override
  late final GeneratedColumn<String> domainJson = GeneratedColumn<String>(
    'domain_json',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    tripId,
    title,
    amount,
    currency,
    categoryId,
    paidByMemberId,
    splitMode,
    splitDataJson,
    date,
    receiptUrl,
    notes,
    isReimbursement,
    reimbursementToMemberId,
    archived,
    recycledAt,
    payerWeightsJson,
    exchangeRate,
    disputeStatus,
    disputeNote,
    disputedByMemberId,
    settlementConfirmed,
    settlementConfirmedAt,
    approvalStatus,
    approvedByMemberId,
    approvedAt,
    createdAt,
    updatedAt,
    domainJson,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'expenses';
  @override
  VerificationContext validateIntegrity(Insertable<ExpenseEntry> instance, {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('trip_id')) {
      context.handle(_tripIdMeta, tripId.isAcceptableOrUnknown(data['trip_id']!, _tripIdMeta));
    } else if (isInserting) {
      context.missing(_tripIdMeta);
    }
    if (data.containsKey('title')) {
      context.handle(_titleMeta, title.isAcceptableOrUnknown(data['title']!, _titleMeta));
    } else if (isInserting) {
      context.missing(_titleMeta);
    }
    if (data.containsKey('amount')) {
      context.handle(_amountMeta, amount.isAcceptableOrUnknown(data['amount']!, _amountMeta));
    } else if (isInserting) {
      context.missing(_amountMeta);
    }
    if (data.containsKey('currency')) {
      context.handle(_currencyMeta, currency.isAcceptableOrUnknown(data['currency']!, _currencyMeta));
    } else if (isInserting) {
      context.missing(_currencyMeta);
    }
    if (data.containsKey('category_id')) {
      context.handle(_categoryIdMeta, categoryId.isAcceptableOrUnknown(data['category_id']!, _categoryIdMeta));
    }
    if (data.containsKey('paid_by_member_id')) {
      context.handle(
        _paidByMemberIdMeta,
        paidByMemberId.isAcceptableOrUnknown(data['paid_by_member_id']!, _paidByMemberIdMeta),
      );
    } else if (isInserting) {
      context.missing(_paidByMemberIdMeta);
    }
    if (data.containsKey('split_mode')) {
      context.handle(_splitModeMeta, splitMode.isAcceptableOrUnknown(data['split_mode']!, _splitModeMeta));
    } else if (isInserting) {
      context.missing(_splitModeMeta);
    }
    if (data.containsKey('split_data_json')) {
      context.handle(
        _splitDataJsonMeta,
        splitDataJson.isAcceptableOrUnknown(data['split_data_json']!, _splitDataJsonMeta),
      );
    }
    if (data.containsKey('date')) {
      context.handle(_dateMeta, date.isAcceptableOrUnknown(data['date']!, _dateMeta));
    } else if (isInserting) {
      context.missing(_dateMeta);
    }
    if (data.containsKey('receipt_url')) {
      context.handle(_receiptUrlMeta, receiptUrl.isAcceptableOrUnknown(data['receipt_url']!, _receiptUrlMeta));
    }
    if (data.containsKey('notes')) {
      context.handle(_notesMeta, notes.isAcceptableOrUnknown(data['notes']!, _notesMeta));
    }
    if (data.containsKey('is_reimbursement')) {
      context.handle(
        _isReimbursementMeta,
        isReimbursement.isAcceptableOrUnknown(data['is_reimbursement']!, _isReimbursementMeta),
      );
    }
    if (data.containsKey('reimbursement_to_member_id')) {
      context.handle(
        _reimbursementToMemberIdMeta,
        reimbursementToMemberId.isAcceptableOrUnknown(
          data['reimbursement_to_member_id']!,
          _reimbursementToMemberIdMeta,
        ),
      );
    }
    if (data.containsKey('archived')) {
      context.handle(_archivedMeta, archived.isAcceptableOrUnknown(data['archived']!, _archivedMeta));
    }
    if (data.containsKey('recycled_at')) {
      context.handle(_recycledAtMeta, recycledAt.isAcceptableOrUnknown(data['recycled_at']!, _recycledAtMeta));
    }
    if (data.containsKey('payer_weights_json')) {
      context.handle(
        _payerWeightsJsonMeta,
        payerWeightsJson.isAcceptableOrUnknown(data['payer_weights_json']!, _payerWeightsJsonMeta),
      );
    }
    if (data.containsKey('exchange_rate')) {
      context.handle(_exchangeRateMeta, exchangeRate.isAcceptableOrUnknown(data['exchange_rate']!, _exchangeRateMeta));
    }
    if (data.containsKey('dispute_status')) {
      context.handle(
        _disputeStatusMeta,
        disputeStatus.isAcceptableOrUnknown(data['dispute_status']!, _disputeStatusMeta),
      );
    }
    if (data.containsKey('dispute_note')) {
      context.handle(_disputeNoteMeta, disputeNote.isAcceptableOrUnknown(data['dispute_note']!, _disputeNoteMeta));
    }
    if (data.containsKey('disputed_by_member_id')) {
      context.handle(
        _disputedByMemberIdMeta,
        disputedByMemberId.isAcceptableOrUnknown(data['disputed_by_member_id']!, _disputedByMemberIdMeta),
      );
    }
    if (data.containsKey('settlement_confirmed')) {
      context.handle(
        _settlementConfirmedMeta,
        settlementConfirmed.isAcceptableOrUnknown(data['settlement_confirmed']!, _settlementConfirmedMeta),
      );
    }
    if (data.containsKey('settlement_confirmed_at')) {
      context.handle(
        _settlementConfirmedAtMeta,
        settlementConfirmedAt.isAcceptableOrUnknown(data['settlement_confirmed_at']!, _settlementConfirmedAtMeta),
      );
    }
    if (data.containsKey('approval_status')) {
      context.handle(
        _approvalStatusMeta,
        approvalStatus.isAcceptableOrUnknown(data['approval_status']!, _approvalStatusMeta),
      );
    }
    if (data.containsKey('approved_by_member_id')) {
      context.handle(
        _approvedByMemberIdMeta,
        approvedByMemberId.isAcceptableOrUnknown(data['approved_by_member_id']!, _approvedByMemberIdMeta),
      );
    }
    if (data.containsKey('approved_at')) {
      context.handle(_approvedAtMeta, approvedAt.isAcceptableOrUnknown(data['approved_at']!, _approvedAtMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta, createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta, updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    }
    if (data.containsKey('domain_json')) {
      context.handle(_domainJsonMeta, domainJson.isAcceptableOrUnknown(data['domain_json']!, _domainJsonMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  ExpenseEntry map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return ExpenseEntry(
      id: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      tripId: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}trip_id'])!,
      title: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}title'])!,
      amount: attachedDatabase.typeMapping.read(DriftSqlType.double, data['${effectivePrefix}amount'])!,
      currency: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}currency'])!,
      categoryId: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}category_id']),
      paidByMemberId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}paid_by_member_id'],
      )!,
      splitMode: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}split_mode'])!,
      splitDataJson: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}split_data_json']),
      date: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}date'])!,
      receiptUrl: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}receipt_url']),
      notes: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}notes']),
      isReimbursement: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}is_reimbursement'],
      )!,
      reimbursementToMemberId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}reimbursement_to_member_id'],
      ),
      archived: attachedDatabase.typeMapping.read(DriftSqlType.bool, data['${effectivePrefix}archived'])!,
      recycledAt: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}recycled_at']),
      payerWeightsJson: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}payer_weights_json'],
      ),
      exchangeRate: attachedDatabase.typeMapping.read(DriftSqlType.double, data['${effectivePrefix}exchange_rate']),
      disputeStatus: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}dispute_status']),
      disputeNote: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}dispute_note']),
      disputedByMemberId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}disputed_by_member_id'],
      ),
      settlementConfirmed: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}settlement_confirmed'],
      )!,
      settlementConfirmedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}settlement_confirmed_at'],
      ),
      approvalStatus: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}approval_status']),
      approvedByMemberId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}approved_by_member_id'],
      ),
      approvedAt: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}approved_at']),
      createdAt: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}created_at']),
      updatedAt: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}updated_at']),
      domainJson: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}domain_json']),
    );
  }

  @override
  $ExpensesTableTable createAlias(String alias) {
    return $ExpensesTableTable(attachedDatabase, alias);
  }
}

class ExpenseEntry extends DataClass implements Insertable<ExpenseEntry> {
  final String id;
  final String tripId;
  final String title;
  final double amount;
  final String currency;
  final String? categoryId;
  final String paidByMemberId;
  final String splitMode;
  final String? splitDataJson;
  final String date;
  final String? receiptUrl;
  final String? notes;
  final bool isReimbursement;
  final String? reimbursementToMemberId;
  final bool archived;
  final String? recycledAt;
  final String? payerWeightsJson;
  final double? exchangeRate;
  final String? disputeStatus;
  final String? disputeNote;
  final String? disputedByMemberId;
  final bool settlementConfirmed;
  final String? settlementConfirmedAt;
  final String? approvalStatus;
  final String? approvedByMemberId;
  final String? approvedAt;
  final String? createdAt;
  final String? updatedAt;

  /// Full-fidelity domain `Expense.toJson()` (schema v2); columns above are for querying.
  final String? domainJson;
  const ExpenseEntry({
    required this.id,
    required this.tripId,
    required this.title,
    required this.amount,
    required this.currency,
    this.categoryId,
    required this.paidByMemberId,
    required this.splitMode,
    this.splitDataJson,
    required this.date,
    this.receiptUrl,
    this.notes,
    required this.isReimbursement,
    this.reimbursementToMemberId,
    required this.archived,
    this.recycledAt,
    this.payerWeightsJson,
    this.exchangeRate,
    this.disputeStatus,
    this.disputeNote,
    this.disputedByMemberId,
    required this.settlementConfirmed,
    this.settlementConfirmedAt,
    this.approvalStatus,
    this.approvedByMemberId,
    this.approvedAt,
    this.createdAt,
    this.updatedAt,
    this.domainJson,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['trip_id'] = Variable<String>(tripId);
    map['title'] = Variable<String>(title);
    map['amount'] = Variable<double>(amount);
    map['currency'] = Variable<String>(currency);
    if (!nullToAbsent || categoryId != null) {
      map['category_id'] = Variable<String>(categoryId);
    }
    map['paid_by_member_id'] = Variable<String>(paidByMemberId);
    map['split_mode'] = Variable<String>(splitMode);
    if (!nullToAbsent || splitDataJson != null) {
      map['split_data_json'] = Variable<String>(splitDataJson);
    }
    map['date'] = Variable<String>(date);
    if (!nullToAbsent || receiptUrl != null) {
      map['receipt_url'] = Variable<String>(receiptUrl);
    }
    if (!nullToAbsent || notes != null) {
      map['notes'] = Variable<String>(notes);
    }
    map['is_reimbursement'] = Variable<bool>(isReimbursement);
    if (!nullToAbsent || reimbursementToMemberId != null) {
      map['reimbursement_to_member_id'] = Variable<String>(reimbursementToMemberId);
    }
    map['archived'] = Variable<bool>(archived);
    if (!nullToAbsent || recycledAt != null) {
      map['recycled_at'] = Variable<String>(recycledAt);
    }
    if (!nullToAbsent || payerWeightsJson != null) {
      map['payer_weights_json'] = Variable<String>(payerWeightsJson);
    }
    if (!nullToAbsent || exchangeRate != null) {
      map['exchange_rate'] = Variable<double>(exchangeRate);
    }
    if (!nullToAbsent || disputeStatus != null) {
      map['dispute_status'] = Variable<String>(disputeStatus);
    }
    if (!nullToAbsent || disputeNote != null) {
      map['dispute_note'] = Variable<String>(disputeNote);
    }
    if (!nullToAbsent || disputedByMemberId != null) {
      map['disputed_by_member_id'] = Variable<String>(disputedByMemberId);
    }
    map['settlement_confirmed'] = Variable<bool>(settlementConfirmed);
    if (!nullToAbsent || settlementConfirmedAt != null) {
      map['settlement_confirmed_at'] = Variable<String>(settlementConfirmedAt);
    }
    if (!nullToAbsent || approvalStatus != null) {
      map['approval_status'] = Variable<String>(approvalStatus);
    }
    if (!nullToAbsent || approvedByMemberId != null) {
      map['approved_by_member_id'] = Variable<String>(approvedByMemberId);
    }
    if (!nullToAbsent || approvedAt != null) {
      map['approved_at'] = Variable<String>(approvedAt);
    }
    if (!nullToAbsent || createdAt != null) {
      map['created_at'] = Variable<String>(createdAt);
    }
    if (!nullToAbsent || updatedAt != null) {
      map['updated_at'] = Variable<String>(updatedAt);
    }
    if (!nullToAbsent || domainJson != null) {
      map['domain_json'] = Variable<String>(domainJson);
    }
    return map;
  }

  ExpensesTableCompanion toCompanion(bool nullToAbsent) {
    return ExpensesTableCompanion(
      id: Value(id),
      tripId: Value(tripId),
      title: Value(title),
      amount: Value(amount),
      currency: Value(currency),
      categoryId: categoryId == null && nullToAbsent ? const Value.absent() : Value(categoryId),
      paidByMemberId: Value(paidByMemberId),
      splitMode: Value(splitMode),
      splitDataJson: splitDataJson == null && nullToAbsent ? const Value.absent() : Value(splitDataJson),
      date: Value(date),
      receiptUrl: receiptUrl == null && nullToAbsent ? const Value.absent() : Value(receiptUrl),
      notes: notes == null && nullToAbsent ? const Value.absent() : Value(notes),
      isReimbursement: Value(isReimbursement),
      reimbursementToMemberId: reimbursementToMemberId == null && nullToAbsent
          ? const Value.absent()
          : Value(reimbursementToMemberId),
      archived: Value(archived),
      recycledAt: recycledAt == null && nullToAbsent ? const Value.absent() : Value(recycledAt),
      payerWeightsJson: payerWeightsJson == null && nullToAbsent ? const Value.absent() : Value(payerWeightsJson),
      exchangeRate: exchangeRate == null && nullToAbsent ? const Value.absent() : Value(exchangeRate),
      disputeStatus: disputeStatus == null && nullToAbsent ? const Value.absent() : Value(disputeStatus),
      disputeNote: disputeNote == null && nullToAbsent ? const Value.absent() : Value(disputeNote),
      disputedByMemberId: disputedByMemberId == null && nullToAbsent ? const Value.absent() : Value(disputedByMemberId),
      settlementConfirmed: Value(settlementConfirmed),
      settlementConfirmedAt: settlementConfirmedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(settlementConfirmedAt),
      approvalStatus: approvalStatus == null && nullToAbsent ? const Value.absent() : Value(approvalStatus),
      approvedByMemberId: approvedByMemberId == null && nullToAbsent ? const Value.absent() : Value(approvedByMemberId),
      approvedAt: approvedAt == null && nullToAbsent ? const Value.absent() : Value(approvedAt),
      createdAt: createdAt == null && nullToAbsent ? const Value.absent() : Value(createdAt),
      updatedAt: updatedAt == null && nullToAbsent ? const Value.absent() : Value(updatedAt),
      domainJson: domainJson == null && nullToAbsent ? const Value.absent() : Value(domainJson),
    );
  }

  factory ExpenseEntry.fromJson(Map<String, dynamic> json, {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return ExpenseEntry(
      id: serializer.fromJson<String>(json['id']),
      tripId: serializer.fromJson<String>(json['tripId']),
      title: serializer.fromJson<String>(json['title']),
      amount: serializer.fromJson<double>(json['amount']),
      currency: serializer.fromJson<String>(json['currency']),
      categoryId: serializer.fromJson<String?>(json['categoryId']),
      paidByMemberId: serializer.fromJson<String>(json['paidByMemberId']),
      splitMode: serializer.fromJson<String>(json['splitMode']),
      splitDataJson: serializer.fromJson<String?>(json['splitDataJson']),
      date: serializer.fromJson<String>(json['date']),
      receiptUrl: serializer.fromJson<String?>(json['receiptUrl']),
      notes: serializer.fromJson<String?>(json['notes']),
      isReimbursement: serializer.fromJson<bool>(json['isReimbursement']),
      reimbursementToMemberId: serializer.fromJson<String?>(json['reimbursementToMemberId']),
      archived: serializer.fromJson<bool>(json['archived']),
      recycledAt: serializer.fromJson<String?>(json['recycledAt']),
      payerWeightsJson: serializer.fromJson<String?>(json['payerWeightsJson']),
      exchangeRate: serializer.fromJson<double?>(json['exchangeRate']),
      disputeStatus: serializer.fromJson<String?>(json['disputeStatus']),
      disputeNote: serializer.fromJson<String?>(json['disputeNote']),
      disputedByMemberId: serializer.fromJson<String?>(json['disputedByMemberId']),
      settlementConfirmed: serializer.fromJson<bool>(json['settlementConfirmed']),
      settlementConfirmedAt: serializer.fromJson<String?>(json['settlementConfirmedAt']),
      approvalStatus: serializer.fromJson<String?>(json['approvalStatus']),
      approvedByMemberId: serializer.fromJson<String?>(json['approvedByMemberId']),
      approvedAt: serializer.fromJson<String?>(json['approvedAt']),
      createdAt: serializer.fromJson<String?>(json['createdAt']),
      updatedAt: serializer.fromJson<String?>(json['updatedAt']),
      domainJson: serializer.fromJson<String?>(json['domainJson']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'tripId': serializer.toJson<String>(tripId),
      'title': serializer.toJson<String>(title),
      'amount': serializer.toJson<double>(amount),
      'currency': serializer.toJson<String>(currency),
      'categoryId': serializer.toJson<String?>(categoryId),
      'paidByMemberId': serializer.toJson<String>(paidByMemberId),
      'splitMode': serializer.toJson<String>(splitMode),
      'splitDataJson': serializer.toJson<String?>(splitDataJson),
      'date': serializer.toJson<String>(date),
      'receiptUrl': serializer.toJson<String?>(receiptUrl),
      'notes': serializer.toJson<String?>(notes),
      'isReimbursement': serializer.toJson<bool>(isReimbursement),
      'reimbursementToMemberId': serializer.toJson<String?>(reimbursementToMemberId),
      'archived': serializer.toJson<bool>(archived),
      'recycledAt': serializer.toJson<String?>(recycledAt),
      'payerWeightsJson': serializer.toJson<String?>(payerWeightsJson),
      'exchangeRate': serializer.toJson<double?>(exchangeRate),
      'disputeStatus': serializer.toJson<String?>(disputeStatus),
      'disputeNote': serializer.toJson<String?>(disputeNote),
      'disputedByMemberId': serializer.toJson<String?>(disputedByMemberId),
      'settlementConfirmed': serializer.toJson<bool>(settlementConfirmed),
      'settlementConfirmedAt': serializer.toJson<String?>(settlementConfirmedAt),
      'approvalStatus': serializer.toJson<String?>(approvalStatus),
      'approvedByMemberId': serializer.toJson<String?>(approvedByMemberId),
      'approvedAt': serializer.toJson<String?>(approvedAt),
      'createdAt': serializer.toJson<String?>(createdAt),
      'updatedAt': serializer.toJson<String?>(updatedAt),
      'domainJson': serializer.toJson<String?>(domainJson),
    };
  }

  ExpenseEntry copyWith({
    String? id,
    String? tripId,
    String? title,
    double? amount,
    String? currency,
    Value<String?> categoryId = const Value.absent(),
    String? paidByMemberId,
    String? splitMode,
    Value<String?> splitDataJson = const Value.absent(),
    String? date,
    Value<String?> receiptUrl = const Value.absent(),
    Value<String?> notes = const Value.absent(),
    bool? isReimbursement,
    Value<String?> reimbursementToMemberId = const Value.absent(),
    bool? archived,
    Value<String?> recycledAt = const Value.absent(),
    Value<String?> payerWeightsJson = const Value.absent(),
    Value<double?> exchangeRate = const Value.absent(),
    Value<String?> disputeStatus = const Value.absent(),
    Value<String?> disputeNote = const Value.absent(),
    Value<String?> disputedByMemberId = const Value.absent(),
    bool? settlementConfirmed,
    Value<String?> settlementConfirmedAt = const Value.absent(),
    Value<String?> approvalStatus = const Value.absent(),
    Value<String?> approvedByMemberId = const Value.absent(),
    Value<String?> approvedAt = const Value.absent(),
    Value<String?> createdAt = const Value.absent(),
    Value<String?> updatedAt = const Value.absent(),
    Value<String?> domainJson = const Value.absent(),
  }) => ExpenseEntry(
    id: id ?? this.id,
    tripId: tripId ?? this.tripId,
    title: title ?? this.title,
    amount: amount ?? this.amount,
    currency: currency ?? this.currency,
    categoryId: categoryId.present ? categoryId.value : this.categoryId,
    paidByMemberId: paidByMemberId ?? this.paidByMemberId,
    splitMode: splitMode ?? this.splitMode,
    splitDataJson: splitDataJson.present ? splitDataJson.value : this.splitDataJson,
    date: date ?? this.date,
    receiptUrl: receiptUrl.present ? receiptUrl.value : this.receiptUrl,
    notes: notes.present ? notes.value : this.notes,
    isReimbursement: isReimbursement ?? this.isReimbursement,
    reimbursementToMemberId: reimbursementToMemberId.present
        ? reimbursementToMemberId.value
        : this.reimbursementToMemberId,
    archived: archived ?? this.archived,
    recycledAt: recycledAt.present ? recycledAt.value : this.recycledAt,
    payerWeightsJson: payerWeightsJson.present ? payerWeightsJson.value : this.payerWeightsJson,
    exchangeRate: exchangeRate.present ? exchangeRate.value : this.exchangeRate,
    disputeStatus: disputeStatus.present ? disputeStatus.value : this.disputeStatus,
    disputeNote: disputeNote.present ? disputeNote.value : this.disputeNote,
    disputedByMemberId: disputedByMemberId.present ? disputedByMemberId.value : this.disputedByMemberId,
    settlementConfirmed: settlementConfirmed ?? this.settlementConfirmed,
    settlementConfirmedAt: settlementConfirmedAt.present ? settlementConfirmedAt.value : this.settlementConfirmedAt,
    approvalStatus: approvalStatus.present ? approvalStatus.value : this.approvalStatus,
    approvedByMemberId: approvedByMemberId.present ? approvedByMemberId.value : this.approvedByMemberId,
    approvedAt: approvedAt.present ? approvedAt.value : this.approvedAt,
    createdAt: createdAt.present ? createdAt.value : this.createdAt,
    updatedAt: updatedAt.present ? updatedAt.value : this.updatedAt,
    domainJson: domainJson.present ? domainJson.value : this.domainJson,
  );
  ExpenseEntry copyWithCompanion(ExpensesTableCompanion data) {
    return ExpenseEntry(
      id: data.id.present ? data.id.value : this.id,
      tripId: data.tripId.present ? data.tripId.value : this.tripId,
      title: data.title.present ? data.title.value : this.title,
      amount: data.amount.present ? data.amount.value : this.amount,
      currency: data.currency.present ? data.currency.value : this.currency,
      categoryId: data.categoryId.present ? data.categoryId.value : this.categoryId,
      paidByMemberId: data.paidByMemberId.present ? data.paidByMemberId.value : this.paidByMemberId,
      splitMode: data.splitMode.present ? data.splitMode.value : this.splitMode,
      splitDataJson: data.splitDataJson.present ? data.splitDataJson.value : this.splitDataJson,
      date: data.date.present ? data.date.value : this.date,
      receiptUrl: data.receiptUrl.present ? data.receiptUrl.value : this.receiptUrl,
      notes: data.notes.present ? data.notes.value : this.notes,
      isReimbursement: data.isReimbursement.present ? data.isReimbursement.value : this.isReimbursement,
      reimbursementToMemberId: data.reimbursementToMemberId.present
          ? data.reimbursementToMemberId.value
          : this.reimbursementToMemberId,
      archived: data.archived.present ? data.archived.value : this.archived,
      recycledAt: data.recycledAt.present ? data.recycledAt.value : this.recycledAt,
      payerWeightsJson: data.payerWeightsJson.present ? data.payerWeightsJson.value : this.payerWeightsJson,
      exchangeRate: data.exchangeRate.present ? data.exchangeRate.value : this.exchangeRate,
      disputeStatus: data.disputeStatus.present ? data.disputeStatus.value : this.disputeStatus,
      disputeNote: data.disputeNote.present ? data.disputeNote.value : this.disputeNote,
      disputedByMemberId: data.disputedByMemberId.present ? data.disputedByMemberId.value : this.disputedByMemberId,
      settlementConfirmed: data.settlementConfirmed.present ? data.settlementConfirmed.value : this.settlementConfirmed,
      settlementConfirmedAt: data.settlementConfirmedAt.present
          ? data.settlementConfirmedAt.value
          : this.settlementConfirmedAt,
      approvalStatus: data.approvalStatus.present ? data.approvalStatus.value : this.approvalStatus,
      approvedByMemberId: data.approvedByMemberId.present ? data.approvedByMemberId.value : this.approvedByMemberId,
      approvedAt: data.approvedAt.present ? data.approvedAt.value : this.approvedAt,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      domainJson: data.domainJson.present ? data.domainJson.value : this.domainJson,
    );
  }

  @override
  String toString() {
    return (StringBuffer('ExpenseEntry(')
          ..write('id: $id, ')
          ..write('tripId: $tripId, ')
          ..write('title: $title, ')
          ..write('amount: $amount, ')
          ..write('currency: $currency, ')
          ..write('categoryId: $categoryId, ')
          ..write('paidByMemberId: $paidByMemberId, ')
          ..write('splitMode: $splitMode, ')
          ..write('splitDataJson: $splitDataJson, ')
          ..write('date: $date, ')
          ..write('receiptUrl: $receiptUrl, ')
          ..write('notes: $notes, ')
          ..write('isReimbursement: $isReimbursement, ')
          ..write('reimbursementToMemberId: $reimbursementToMemberId, ')
          ..write('archived: $archived, ')
          ..write('recycledAt: $recycledAt, ')
          ..write('payerWeightsJson: $payerWeightsJson, ')
          ..write('exchangeRate: $exchangeRate, ')
          ..write('disputeStatus: $disputeStatus, ')
          ..write('disputeNote: $disputeNote, ')
          ..write('disputedByMemberId: $disputedByMemberId, ')
          ..write('settlementConfirmed: $settlementConfirmed, ')
          ..write('settlementConfirmedAt: $settlementConfirmedAt, ')
          ..write('approvalStatus: $approvalStatus, ')
          ..write('approvedByMemberId: $approvedByMemberId, ')
          ..write('approvedAt: $approvedAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('domainJson: $domainJson')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hashAll([
    id,
    tripId,
    title,
    amount,
    currency,
    categoryId,
    paidByMemberId,
    splitMode,
    splitDataJson,
    date,
    receiptUrl,
    notes,
    isReimbursement,
    reimbursementToMemberId,
    archived,
    recycledAt,
    payerWeightsJson,
    exchangeRate,
    disputeStatus,
    disputeNote,
    disputedByMemberId,
    settlementConfirmed,
    settlementConfirmedAt,
    approvalStatus,
    approvedByMemberId,
    approvedAt,
    createdAt,
    updatedAt,
    domainJson,
  ]);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is ExpenseEntry &&
          other.id == this.id &&
          other.tripId == this.tripId &&
          other.title == this.title &&
          other.amount == this.amount &&
          other.currency == this.currency &&
          other.categoryId == this.categoryId &&
          other.paidByMemberId == this.paidByMemberId &&
          other.splitMode == this.splitMode &&
          other.splitDataJson == this.splitDataJson &&
          other.date == this.date &&
          other.receiptUrl == this.receiptUrl &&
          other.notes == this.notes &&
          other.isReimbursement == this.isReimbursement &&
          other.reimbursementToMemberId == this.reimbursementToMemberId &&
          other.archived == this.archived &&
          other.recycledAt == this.recycledAt &&
          other.payerWeightsJson == this.payerWeightsJson &&
          other.exchangeRate == this.exchangeRate &&
          other.disputeStatus == this.disputeStatus &&
          other.disputeNote == this.disputeNote &&
          other.disputedByMemberId == this.disputedByMemberId &&
          other.settlementConfirmed == this.settlementConfirmed &&
          other.settlementConfirmedAt == this.settlementConfirmedAt &&
          other.approvalStatus == this.approvalStatus &&
          other.approvedByMemberId == this.approvedByMemberId &&
          other.approvedAt == this.approvedAt &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt &&
          other.domainJson == this.domainJson);
}

class ExpensesTableCompanion extends UpdateCompanion<ExpenseEntry> {
  final Value<String> id;
  final Value<String> tripId;
  final Value<String> title;
  final Value<double> amount;
  final Value<String> currency;
  final Value<String?> categoryId;
  final Value<String> paidByMemberId;
  final Value<String> splitMode;
  final Value<String?> splitDataJson;
  final Value<String> date;
  final Value<String?> receiptUrl;
  final Value<String?> notes;
  final Value<bool> isReimbursement;
  final Value<String?> reimbursementToMemberId;
  final Value<bool> archived;
  final Value<String?> recycledAt;
  final Value<String?> payerWeightsJson;
  final Value<double?> exchangeRate;
  final Value<String?> disputeStatus;
  final Value<String?> disputeNote;
  final Value<String?> disputedByMemberId;
  final Value<bool> settlementConfirmed;
  final Value<String?> settlementConfirmedAt;
  final Value<String?> approvalStatus;
  final Value<String?> approvedByMemberId;
  final Value<String?> approvedAt;
  final Value<String?> createdAt;
  final Value<String?> updatedAt;
  final Value<String?> domainJson;
  final Value<int> rowid;
  const ExpensesTableCompanion({
    this.id = const Value.absent(),
    this.tripId = const Value.absent(),
    this.title = const Value.absent(),
    this.amount = const Value.absent(),
    this.currency = const Value.absent(),
    this.categoryId = const Value.absent(),
    this.paidByMemberId = const Value.absent(),
    this.splitMode = const Value.absent(),
    this.splitDataJson = const Value.absent(),
    this.date = const Value.absent(),
    this.receiptUrl = const Value.absent(),
    this.notes = const Value.absent(),
    this.isReimbursement = const Value.absent(),
    this.reimbursementToMemberId = const Value.absent(),
    this.archived = const Value.absent(),
    this.recycledAt = const Value.absent(),
    this.payerWeightsJson = const Value.absent(),
    this.exchangeRate = const Value.absent(),
    this.disputeStatus = const Value.absent(),
    this.disputeNote = const Value.absent(),
    this.disputedByMemberId = const Value.absent(),
    this.settlementConfirmed = const Value.absent(),
    this.settlementConfirmedAt = const Value.absent(),
    this.approvalStatus = const Value.absent(),
    this.approvedByMemberId = const Value.absent(),
    this.approvedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.domainJson = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  ExpensesTableCompanion.insert({
    required String id,
    required String tripId,
    required String title,
    required double amount,
    required String currency,
    this.categoryId = const Value.absent(),
    required String paidByMemberId,
    required String splitMode,
    this.splitDataJson = const Value.absent(),
    required String date,
    this.receiptUrl = const Value.absent(),
    this.notes = const Value.absent(),
    this.isReimbursement = const Value.absent(),
    this.reimbursementToMemberId = const Value.absent(),
    this.archived = const Value.absent(),
    this.recycledAt = const Value.absent(),
    this.payerWeightsJson = const Value.absent(),
    this.exchangeRate = const Value.absent(),
    this.disputeStatus = const Value.absent(),
    this.disputeNote = const Value.absent(),
    this.disputedByMemberId = const Value.absent(),
    this.settlementConfirmed = const Value.absent(),
    this.settlementConfirmedAt = const Value.absent(),
    this.approvalStatus = const Value.absent(),
    this.approvedByMemberId = const Value.absent(),
    this.approvedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.domainJson = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       tripId = Value(tripId),
       title = Value(title),
       amount = Value(amount),
       currency = Value(currency),
       paidByMemberId = Value(paidByMemberId),
       splitMode = Value(splitMode),
       date = Value(date);
  static Insertable<ExpenseEntry> custom({
    Expression<String>? id,
    Expression<String>? tripId,
    Expression<String>? title,
    Expression<double>? amount,
    Expression<String>? currency,
    Expression<String>? categoryId,
    Expression<String>? paidByMemberId,
    Expression<String>? splitMode,
    Expression<String>? splitDataJson,
    Expression<String>? date,
    Expression<String>? receiptUrl,
    Expression<String>? notes,
    Expression<bool>? isReimbursement,
    Expression<String>? reimbursementToMemberId,
    Expression<bool>? archived,
    Expression<String>? recycledAt,
    Expression<String>? payerWeightsJson,
    Expression<double>? exchangeRate,
    Expression<String>? disputeStatus,
    Expression<String>? disputeNote,
    Expression<String>? disputedByMemberId,
    Expression<bool>? settlementConfirmed,
    Expression<String>? settlementConfirmedAt,
    Expression<String>? approvalStatus,
    Expression<String>? approvedByMemberId,
    Expression<String>? approvedAt,
    Expression<String>? createdAt,
    Expression<String>? updatedAt,
    Expression<String>? domainJson,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (tripId != null) 'trip_id': tripId,
      if (title != null) 'title': title,
      if (amount != null) 'amount': amount,
      if (currency != null) 'currency': currency,
      if (categoryId != null) 'category_id': categoryId,
      if (paidByMemberId != null) 'paid_by_member_id': paidByMemberId,
      if (splitMode != null) 'split_mode': splitMode,
      if (splitDataJson != null) 'split_data_json': splitDataJson,
      if (date != null) 'date': date,
      if (receiptUrl != null) 'receipt_url': receiptUrl,
      if (notes != null) 'notes': notes,
      if (isReimbursement != null) 'is_reimbursement': isReimbursement,
      if (reimbursementToMemberId != null) 'reimbursement_to_member_id': reimbursementToMemberId,
      if (archived != null) 'archived': archived,
      if (recycledAt != null) 'recycled_at': recycledAt,
      if (payerWeightsJson != null) 'payer_weights_json': payerWeightsJson,
      if (exchangeRate != null) 'exchange_rate': exchangeRate,
      if (disputeStatus != null) 'dispute_status': disputeStatus,
      if (disputeNote != null) 'dispute_note': disputeNote,
      if (disputedByMemberId != null) 'disputed_by_member_id': disputedByMemberId,
      if (settlementConfirmed != null) 'settlement_confirmed': settlementConfirmed,
      if (settlementConfirmedAt != null) 'settlement_confirmed_at': settlementConfirmedAt,
      if (approvalStatus != null) 'approval_status': approvalStatus,
      if (approvedByMemberId != null) 'approved_by_member_id': approvedByMemberId,
      if (approvedAt != null) 'approved_at': approvedAt,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (domainJson != null) 'domain_json': domainJson,
      if (rowid != null) 'rowid': rowid,
    });
  }

  ExpensesTableCompanion copyWith({
    Value<String>? id,
    Value<String>? tripId,
    Value<String>? title,
    Value<double>? amount,
    Value<String>? currency,
    Value<String?>? categoryId,
    Value<String>? paidByMemberId,
    Value<String>? splitMode,
    Value<String?>? splitDataJson,
    Value<String>? date,
    Value<String?>? receiptUrl,
    Value<String?>? notes,
    Value<bool>? isReimbursement,
    Value<String?>? reimbursementToMemberId,
    Value<bool>? archived,
    Value<String?>? recycledAt,
    Value<String?>? payerWeightsJson,
    Value<double?>? exchangeRate,
    Value<String?>? disputeStatus,
    Value<String?>? disputeNote,
    Value<String?>? disputedByMemberId,
    Value<bool>? settlementConfirmed,
    Value<String?>? settlementConfirmedAt,
    Value<String?>? approvalStatus,
    Value<String?>? approvedByMemberId,
    Value<String?>? approvedAt,
    Value<String?>? createdAt,
    Value<String?>? updatedAt,
    Value<String?>? domainJson,
    Value<int>? rowid,
  }) {
    return ExpensesTableCompanion(
      id: id ?? this.id,
      tripId: tripId ?? this.tripId,
      title: title ?? this.title,
      amount: amount ?? this.amount,
      currency: currency ?? this.currency,
      categoryId: categoryId ?? this.categoryId,
      paidByMemberId: paidByMemberId ?? this.paidByMemberId,
      splitMode: splitMode ?? this.splitMode,
      splitDataJson: splitDataJson ?? this.splitDataJson,
      date: date ?? this.date,
      receiptUrl: receiptUrl ?? this.receiptUrl,
      notes: notes ?? this.notes,
      isReimbursement: isReimbursement ?? this.isReimbursement,
      reimbursementToMemberId: reimbursementToMemberId ?? this.reimbursementToMemberId,
      archived: archived ?? this.archived,
      recycledAt: recycledAt ?? this.recycledAt,
      payerWeightsJson: payerWeightsJson ?? this.payerWeightsJson,
      exchangeRate: exchangeRate ?? this.exchangeRate,
      disputeStatus: disputeStatus ?? this.disputeStatus,
      disputeNote: disputeNote ?? this.disputeNote,
      disputedByMemberId: disputedByMemberId ?? this.disputedByMemberId,
      settlementConfirmed: settlementConfirmed ?? this.settlementConfirmed,
      settlementConfirmedAt: settlementConfirmedAt ?? this.settlementConfirmedAt,
      approvalStatus: approvalStatus ?? this.approvalStatus,
      approvedByMemberId: approvedByMemberId ?? this.approvedByMemberId,
      approvedAt: approvedAt ?? this.approvedAt,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      domainJson: domainJson ?? this.domainJson,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (tripId.present) {
      map['trip_id'] = Variable<String>(tripId.value);
    }
    if (title.present) {
      map['title'] = Variable<String>(title.value);
    }
    if (amount.present) {
      map['amount'] = Variable<double>(amount.value);
    }
    if (currency.present) {
      map['currency'] = Variable<String>(currency.value);
    }
    if (categoryId.present) {
      map['category_id'] = Variable<String>(categoryId.value);
    }
    if (paidByMemberId.present) {
      map['paid_by_member_id'] = Variable<String>(paidByMemberId.value);
    }
    if (splitMode.present) {
      map['split_mode'] = Variable<String>(splitMode.value);
    }
    if (splitDataJson.present) {
      map['split_data_json'] = Variable<String>(splitDataJson.value);
    }
    if (date.present) {
      map['date'] = Variable<String>(date.value);
    }
    if (receiptUrl.present) {
      map['receipt_url'] = Variable<String>(receiptUrl.value);
    }
    if (notes.present) {
      map['notes'] = Variable<String>(notes.value);
    }
    if (isReimbursement.present) {
      map['is_reimbursement'] = Variable<bool>(isReimbursement.value);
    }
    if (reimbursementToMemberId.present) {
      map['reimbursement_to_member_id'] = Variable<String>(reimbursementToMemberId.value);
    }
    if (archived.present) {
      map['archived'] = Variable<bool>(archived.value);
    }
    if (recycledAt.present) {
      map['recycled_at'] = Variable<String>(recycledAt.value);
    }
    if (payerWeightsJson.present) {
      map['payer_weights_json'] = Variable<String>(payerWeightsJson.value);
    }
    if (exchangeRate.present) {
      map['exchange_rate'] = Variable<double>(exchangeRate.value);
    }
    if (disputeStatus.present) {
      map['dispute_status'] = Variable<String>(disputeStatus.value);
    }
    if (disputeNote.present) {
      map['dispute_note'] = Variable<String>(disputeNote.value);
    }
    if (disputedByMemberId.present) {
      map['disputed_by_member_id'] = Variable<String>(disputedByMemberId.value);
    }
    if (settlementConfirmed.present) {
      map['settlement_confirmed'] = Variable<bool>(settlementConfirmed.value);
    }
    if (settlementConfirmedAt.present) {
      map['settlement_confirmed_at'] = Variable<String>(settlementConfirmedAt.value);
    }
    if (approvalStatus.present) {
      map['approval_status'] = Variable<String>(approvalStatus.value);
    }
    if (approvedByMemberId.present) {
      map['approved_by_member_id'] = Variable<String>(approvedByMemberId.value);
    }
    if (approvedAt.present) {
      map['approved_at'] = Variable<String>(approvedAt.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<String>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<String>(updatedAt.value);
    }
    if (domainJson.present) {
      map['domain_json'] = Variable<String>(domainJson.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('ExpensesTableCompanion(')
          ..write('id: $id, ')
          ..write('tripId: $tripId, ')
          ..write('title: $title, ')
          ..write('amount: $amount, ')
          ..write('currency: $currency, ')
          ..write('categoryId: $categoryId, ')
          ..write('paidByMemberId: $paidByMemberId, ')
          ..write('splitMode: $splitMode, ')
          ..write('splitDataJson: $splitDataJson, ')
          ..write('date: $date, ')
          ..write('receiptUrl: $receiptUrl, ')
          ..write('notes: $notes, ')
          ..write('isReimbursement: $isReimbursement, ')
          ..write('reimbursementToMemberId: $reimbursementToMemberId, ')
          ..write('archived: $archived, ')
          ..write('recycledAt: $recycledAt, ')
          ..write('payerWeightsJson: $payerWeightsJson, ')
          ..write('exchangeRate: $exchangeRate, ')
          ..write('disputeStatus: $disputeStatus, ')
          ..write('disputeNote: $disputeNote, ')
          ..write('disputedByMemberId: $disputedByMemberId, ')
          ..write('settlementConfirmed: $settlementConfirmed, ')
          ..write('settlementConfirmedAt: $settlementConfirmedAt, ')
          ..write('approvalStatus: $approvalStatus, ')
          ..write('approvedByMemberId: $approvedByMemberId, ')
          ..write('approvedAt: $approvedAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('domainJson: $domainJson, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $TripMessagesTableTable extends TripMessagesTable with TableInfo<$TripMessagesTableTable, TripMessageEntry> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $TripMessagesTableTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _tripIdMeta = const VerificationMeta('tripId');
  @override
  late final GeneratedColumn<String> tripId = GeneratedColumn<String>(
    'trip_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _userIdMeta = const VerificationMeta('userId');
  @override
  late final GeneratedColumn<String> userId = GeneratedColumn<String>(
    'user_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _senderNameMeta = const VerificationMeta('senderName');
  @override
  late final GeneratedColumn<String> senderName = GeneratedColumn<String>(
    'sender_name',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _kindMeta = const VerificationMeta('kind');
  @override
  late final GeneratedColumn<String> kind = GeneratedColumn<String>(
    'kind',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _messageMeta = const VerificationMeta('message');
  @override
  late final GeneratedColumn<String> message = GeneratedColumn<String>(
    'message',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _expensePayloadJsonMeta = const VerificationMeta('expensePayloadJson');
  @override
  late final GeneratedColumn<String> expensePayloadJson = GeneratedColumn<String>(
    'expense_payload_json',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<String> createdAt = GeneratedColumn<String>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _domainJsonMeta = const VerificationMeta('domainJson');
  @override
  late final GeneratedColumn<String> domainJson = GeneratedColumn<String>(
    'domain_json',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    tripId,
    userId,
    senderName,
    kind,
    message,
    expensePayloadJson,
    createdAt,
    domainJson,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'trip_messages';
  @override
  VerificationContext validateIntegrity(Insertable<TripMessageEntry> instance, {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('trip_id')) {
      context.handle(_tripIdMeta, tripId.isAcceptableOrUnknown(data['trip_id']!, _tripIdMeta));
    } else if (isInserting) {
      context.missing(_tripIdMeta);
    }
    if (data.containsKey('user_id')) {
      context.handle(_userIdMeta, userId.isAcceptableOrUnknown(data['user_id']!, _userIdMeta));
    } else if (isInserting) {
      context.missing(_userIdMeta);
    }
    if (data.containsKey('sender_name')) {
      context.handle(_senderNameMeta, senderName.isAcceptableOrUnknown(data['sender_name']!, _senderNameMeta));
    } else if (isInserting) {
      context.missing(_senderNameMeta);
    }
    if (data.containsKey('kind')) {
      context.handle(_kindMeta, kind.isAcceptableOrUnknown(data['kind']!, _kindMeta));
    } else if (isInserting) {
      context.missing(_kindMeta);
    }
    if (data.containsKey('message')) {
      context.handle(_messageMeta, message.isAcceptableOrUnknown(data['message']!, _messageMeta));
    } else if (isInserting) {
      context.missing(_messageMeta);
    }
    if (data.containsKey('expense_payload_json')) {
      context.handle(
        _expensePayloadJsonMeta,
        expensePayloadJson.isAcceptableOrUnknown(data['expense_payload_json']!, _expensePayloadJsonMeta),
      );
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta, createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('domain_json')) {
      context.handle(_domainJsonMeta, domainJson.isAcceptableOrUnknown(data['domain_json']!, _domainJsonMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  TripMessageEntry map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return TripMessageEntry(
      id: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      tripId: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}trip_id'])!,
      userId: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}user_id'])!,
      senderName: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}sender_name'])!,
      kind: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}kind'])!,
      message: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}message'])!,
      expensePayloadJson: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}expense_payload_json'],
      ),
      createdAt: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}created_at'])!,
      domainJson: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}domain_json']),
    );
  }

  @override
  $TripMessagesTableTable createAlias(String alias) {
    return $TripMessagesTableTable(attachedDatabase, alias);
  }
}

class TripMessageEntry extends DataClass implements Insertable<TripMessageEntry> {
  final String id;
  final String tripId;
  final String userId;
  final String senderName;
  final String kind;
  final String message;
  final String? expensePayloadJson;
  final String createdAt;

  /// Full-fidelity domain `TripMessage.toJson()` (schema v2). Legacy columns
  /// map: user_id <- memberId, message <- body, sender_name unused ('').
  final String? domainJson;
  const TripMessageEntry({
    required this.id,
    required this.tripId,
    required this.userId,
    required this.senderName,
    required this.kind,
    required this.message,
    this.expensePayloadJson,
    required this.createdAt,
    this.domainJson,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['trip_id'] = Variable<String>(tripId);
    map['user_id'] = Variable<String>(userId);
    map['sender_name'] = Variable<String>(senderName);
    map['kind'] = Variable<String>(kind);
    map['message'] = Variable<String>(message);
    if (!nullToAbsent || expensePayloadJson != null) {
      map['expense_payload_json'] = Variable<String>(expensePayloadJson);
    }
    map['created_at'] = Variable<String>(createdAt);
    if (!nullToAbsent || domainJson != null) {
      map['domain_json'] = Variable<String>(domainJson);
    }
    return map;
  }

  TripMessagesTableCompanion toCompanion(bool nullToAbsent) {
    return TripMessagesTableCompanion(
      id: Value(id),
      tripId: Value(tripId),
      userId: Value(userId),
      senderName: Value(senderName),
      kind: Value(kind),
      message: Value(message),
      expensePayloadJson: expensePayloadJson == null && nullToAbsent ? const Value.absent() : Value(expensePayloadJson),
      createdAt: Value(createdAt),
      domainJson: domainJson == null && nullToAbsent ? const Value.absent() : Value(domainJson),
    );
  }

  factory TripMessageEntry.fromJson(Map<String, dynamic> json, {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return TripMessageEntry(
      id: serializer.fromJson<String>(json['id']),
      tripId: serializer.fromJson<String>(json['tripId']),
      userId: serializer.fromJson<String>(json['userId']),
      senderName: serializer.fromJson<String>(json['senderName']),
      kind: serializer.fromJson<String>(json['kind']),
      message: serializer.fromJson<String>(json['message']),
      expensePayloadJson: serializer.fromJson<String?>(json['expensePayloadJson']),
      createdAt: serializer.fromJson<String>(json['createdAt']),
      domainJson: serializer.fromJson<String?>(json['domainJson']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'tripId': serializer.toJson<String>(tripId),
      'userId': serializer.toJson<String>(userId),
      'senderName': serializer.toJson<String>(senderName),
      'kind': serializer.toJson<String>(kind),
      'message': serializer.toJson<String>(message),
      'expensePayloadJson': serializer.toJson<String?>(expensePayloadJson),
      'createdAt': serializer.toJson<String>(createdAt),
      'domainJson': serializer.toJson<String?>(domainJson),
    };
  }

  TripMessageEntry copyWith({
    String? id,
    String? tripId,
    String? userId,
    String? senderName,
    String? kind,
    String? message,
    Value<String?> expensePayloadJson = const Value.absent(),
    String? createdAt,
    Value<String?> domainJson = const Value.absent(),
  }) => TripMessageEntry(
    id: id ?? this.id,
    tripId: tripId ?? this.tripId,
    userId: userId ?? this.userId,
    senderName: senderName ?? this.senderName,
    kind: kind ?? this.kind,
    message: message ?? this.message,
    expensePayloadJson: expensePayloadJson.present ? expensePayloadJson.value : this.expensePayloadJson,
    createdAt: createdAt ?? this.createdAt,
    domainJson: domainJson.present ? domainJson.value : this.domainJson,
  );
  TripMessageEntry copyWithCompanion(TripMessagesTableCompanion data) {
    return TripMessageEntry(
      id: data.id.present ? data.id.value : this.id,
      tripId: data.tripId.present ? data.tripId.value : this.tripId,
      userId: data.userId.present ? data.userId.value : this.userId,
      senderName: data.senderName.present ? data.senderName.value : this.senderName,
      kind: data.kind.present ? data.kind.value : this.kind,
      message: data.message.present ? data.message.value : this.message,
      expensePayloadJson: data.expensePayloadJson.present ? data.expensePayloadJson.value : this.expensePayloadJson,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      domainJson: data.domainJson.present ? data.domainJson.value : this.domainJson,
    );
  }

  @override
  String toString() {
    return (StringBuffer('TripMessageEntry(')
          ..write('id: $id, ')
          ..write('tripId: $tripId, ')
          ..write('userId: $userId, ')
          ..write('senderName: $senderName, ')
          ..write('kind: $kind, ')
          ..write('message: $message, ')
          ..write('expensePayloadJson: $expensePayloadJson, ')
          ..write('createdAt: $createdAt, ')
          ..write('domainJson: $domainJson')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode =>
      Object.hash(id, tripId, userId, senderName, kind, message, expensePayloadJson, createdAt, domainJson);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is TripMessageEntry &&
          other.id == this.id &&
          other.tripId == this.tripId &&
          other.userId == this.userId &&
          other.senderName == this.senderName &&
          other.kind == this.kind &&
          other.message == this.message &&
          other.expensePayloadJson == this.expensePayloadJson &&
          other.createdAt == this.createdAt &&
          other.domainJson == this.domainJson);
}

class TripMessagesTableCompanion extends UpdateCompanion<TripMessageEntry> {
  final Value<String> id;
  final Value<String> tripId;
  final Value<String> userId;
  final Value<String> senderName;
  final Value<String> kind;
  final Value<String> message;
  final Value<String?> expensePayloadJson;
  final Value<String> createdAt;
  final Value<String?> domainJson;
  final Value<int> rowid;
  const TripMessagesTableCompanion({
    this.id = const Value.absent(),
    this.tripId = const Value.absent(),
    this.userId = const Value.absent(),
    this.senderName = const Value.absent(),
    this.kind = const Value.absent(),
    this.message = const Value.absent(),
    this.expensePayloadJson = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.domainJson = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  TripMessagesTableCompanion.insert({
    required String id,
    required String tripId,
    required String userId,
    required String senderName,
    required String kind,
    required String message,
    this.expensePayloadJson = const Value.absent(),
    required String createdAt,
    this.domainJson = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       tripId = Value(tripId),
       userId = Value(userId),
       senderName = Value(senderName),
       kind = Value(kind),
       message = Value(message),
       createdAt = Value(createdAt);
  static Insertable<TripMessageEntry> custom({
    Expression<String>? id,
    Expression<String>? tripId,
    Expression<String>? userId,
    Expression<String>? senderName,
    Expression<String>? kind,
    Expression<String>? message,
    Expression<String>? expensePayloadJson,
    Expression<String>? createdAt,
    Expression<String>? domainJson,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (tripId != null) 'trip_id': tripId,
      if (userId != null) 'user_id': userId,
      if (senderName != null) 'sender_name': senderName,
      if (kind != null) 'kind': kind,
      if (message != null) 'message': message,
      if (expensePayloadJson != null) 'expense_payload_json': expensePayloadJson,
      if (createdAt != null) 'created_at': createdAt,
      if (domainJson != null) 'domain_json': domainJson,
      if (rowid != null) 'rowid': rowid,
    });
  }

  TripMessagesTableCompanion copyWith({
    Value<String>? id,
    Value<String>? tripId,
    Value<String>? userId,
    Value<String>? senderName,
    Value<String>? kind,
    Value<String>? message,
    Value<String?>? expensePayloadJson,
    Value<String>? createdAt,
    Value<String?>? domainJson,
    Value<int>? rowid,
  }) {
    return TripMessagesTableCompanion(
      id: id ?? this.id,
      tripId: tripId ?? this.tripId,
      userId: userId ?? this.userId,
      senderName: senderName ?? this.senderName,
      kind: kind ?? this.kind,
      message: message ?? this.message,
      expensePayloadJson: expensePayloadJson ?? this.expensePayloadJson,
      createdAt: createdAt ?? this.createdAt,
      domainJson: domainJson ?? this.domainJson,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (tripId.present) {
      map['trip_id'] = Variable<String>(tripId.value);
    }
    if (userId.present) {
      map['user_id'] = Variable<String>(userId.value);
    }
    if (senderName.present) {
      map['sender_name'] = Variable<String>(senderName.value);
    }
    if (kind.present) {
      map['kind'] = Variable<String>(kind.value);
    }
    if (message.present) {
      map['message'] = Variable<String>(message.value);
    }
    if (expensePayloadJson.present) {
      map['expense_payload_json'] = Variable<String>(expensePayloadJson.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<String>(createdAt.value);
    }
    if (domainJson.present) {
      map['domain_json'] = Variable<String>(domainJson.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('TripMessagesTableCompanion(')
          ..write('id: $id, ')
          ..write('tripId: $tripId, ')
          ..write('userId: $userId, ')
          ..write('senderName: $senderName, ')
          ..write('kind: $kind, ')
          ..write('message: $message, ')
          ..write('expensePayloadJson: $expensePayloadJson, ')
          ..write('createdAt: $createdAt, ')
          ..write('domainJson: $domainJson, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $NotificationsTableTable extends NotificationsTable with TableInfo<$NotificationsTableTable, NotificationEntry> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $NotificationsTableTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _userIdMeta = const VerificationMeta('userId');
  @override
  late final GeneratedColumn<String> userId = GeneratedColumn<String>(
    'user_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _tripIdMeta = const VerificationMeta('tripId');
  @override
  late final GeneratedColumn<String> tripId = GeneratedColumn<String>(
    'trip_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _titleMeta = const VerificationMeta('title');
  @override
  late final GeneratedColumn<String> title = GeneratedColumn<String>(
    'title',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _bodyMeta = const VerificationMeta('body');
  @override
  late final GeneratedColumn<String> body = GeneratedColumn<String>(
    'body',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _dataJsonMeta = const VerificationMeta('dataJson');
  @override
  late final GeneratedColumn<String> dataJson = GeneratedColumn<String>(
    'data_json',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _readMeta = const VerificationMeta('read');
  @override
  late final GeneratedColumn<bool> read = GeneratedColumn<bool>(
    'read',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways('CHECK ("read" IN (0, 1))'),
    defaultValue: const Constant(false),
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<String> createdAt = GeneratedColumn<String>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [id, userId, tripId, title, body, dataJson, read, createdAt];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'notifications';
  @override
  VerificationContext validateIntegrity(Insertable<NotificationEntry> instance, {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('user_id')) {
      context.handle(_userIdMeta, userId.isAcceptableOrUnknown(data['user_id']!, _userIdMeta));
    } else if (isInserting) {
      context.missing(_userIdMeta);
    }
    if (data.containsKey('trip_id')) {
      context.handle(_tripIdMeta, tripId.isAcceptableOrUnknown(data['trip_id']!, _tripIdMeta));
    }
    if (data.containsKey('title')) {
      context.handle(_titleMeta, title.isAcceptableOrUnknown(data['title']!, _titleMeta));
    } else if (isInserting) {
      context.missing(_titleMeta);
    }
    if (data.containsKey('body')) {
      context.handle(_bodyMeta, body.isAcceptableOrUnknown(data['body']!, _bodyMeta));
    } else if (isInserting) {
      context.missing(_bodyMeta);
    }
    if (data.containsKey('data_json')) {
      context.handle(_dataJsonMeta, dataJson.isAcceptableOrUnknown(data['data_json']!, _dataJsonMeta));
    }
    if (data.containsKey('read')) {
      context.handle(_readMeta, read.isAcceptableOrUnknown(data['read']!, _readMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta, createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  NotificationEntry map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return NotificationEntry(
      id: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      userId: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}user_id'])!,
      tripId: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}trip_id']),
      title: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}title'])!,
      body: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}body'])!,
      dataJson: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}data_json']),
      read: attachedDatabase.typeMapping.read(DriftSqlType.bool, data['${effectivePrefix}read'])!,
      createdAt: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}created_at'])!,
    );
  }

  @override
  $NotificationsTableTable createAlias(String alias) {
    return $NotificationsTableTable(attachedDatabase, alias);
  }
}

class NotificationEntry extends DataClass implements Insertable<NotificationEntry> {
  final String id;
  final String userId;
  final String? tripId;
  final String title;
  final String body;
  final String? dataJson;
  final bool read;
  final String createdAt;
  const NotificationEntry({
    required this.id,
    required this.userId,
    this.tripId,
    required this.title,
    required this.body,
    this.dataJson,
    required this.read,
    required this.createdAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['user_id'] = Variable<String>(userId);
    if (!nullToAbsent || tripId != null) {
      map['trip_id'] = Variable<String>(tripId);
    }
    map['title'] = Variable<String>(title);
    map['body'] = Variable<String>(body);
    if (!nullToAbsent || dataJson != null) {
      map['data_json'] = Variable<String>(dataJson);
    }
    map['read'] = Variable<bool>(read);
    map['created_at'] = Variable<String>(createdAt);
    return map;
  }

  NotificationsTableCompanion toCompanion(bool nullToAbsent) {
    return NotificationsTableCompanion(
      id: Value(id),
      userId: Value(userId),
      tripId: tripId == null && nullToAbsent ? const Value.absent() : Value(tripId),
      title: Value(title),
      body: Value(body),
      dataJson: dataJson == null && nullToAbsent ? const Value.absent() : Value(dataJson),
      read: Value(read),
      createdAt: Value(createdAt),
    );
  }

  factory NotificationEntry.fromJson(Map<String, dynamic> json, {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return NotificationEntry(
      id: serializer.fromJson<String>(json['id']),
      userId: serializer.fromJson<String>(json['userId']),
      tripId: serializer.fromJson<String?>(json['tripId']),
      title: serializer.fromJson<String>(json['title']),
      body: serializer.fromJson<String>(json['body']),
      dataJson: serializer.fromJson<String?>(json['dataJson']),
      read: serializer.fromJson<bool>(json['read']),
      createdAt: serializer.fromJson<String>(json['createdAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'userId': serializer.toJson<String>(userId),
      'tripId': serializer.toJson<String?>(tripId),
      'title': serializer.toJson<String>(title),
      'body': serializer.toJson<String>(body),
      'dataJson': serializer.toJson<String?>(dataJson),
      'read': serializer.toJson<bool>(read),
      'createdAt': serializer.toJson<String>(createdAt),
    };
  }

  NotificationEntry copyWith({
    String? id,
    String? userId,
    Value<String?> tripId = const Value.absent(),
    String? title,
    String? body,
    Value<String?> dataJson = const Value.absent(),
    bool? read,
    String? createdAt,
  }) => NotificationEntry(
    id: id ?? this.id,
    userId: userId ?? this.userId,
    tripId: tripId.present ? tripId.value : this.tripId,
    title: title ?? this.title,
    body: body ?? this.body,
    dataJson: dataJson.present ? dataJson.value : this.dataJson,
    read: read ?? this.read,
    createdAt: createdAt ?? this.createdAt,
  );
  NotificationEntry copyWithCompanion(NotificationsTableCompanion data) {
    return NotificationEntry(
      id: data.id.present ? data.id.value : this.id,
      userId: data.userId.present ? data.userId.value : this.userId,
      tripId: data.tripId.present ? data.tripId.value : this.tripId,
      title: data.title.present ? data.title.value : this.title,
      body: data.body.present ? data.body.value : this.body,
      dataJson: data.dataJson.present ? data.dataJson.value : this.dataJson,
      read: data.read.present ? data.read.value : this.read,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('NotificationEntry(')
          ..write('id: $id, ')
          ..write('userId: $userId, ')
          ..write('tripId: $tripId, ')
          ..write('title: $title, ')
          ..write('body: $body, ')
          ..write('dataJson: $dataJson, ')
          ..write('read: $read, ')
          ..write('createdAt: $createdAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, userId, tripId, title, body, dataJson, read, createdAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is NotificationEntry &&
          other.id == this.id &&
          other.userId == this.userId &&
          other.tripId == this.tripId &&
          other.title == this.title &&
          other.body == this.body &&
          other.dataJson == this.dataJson &&
          other.read == this.read &&
          other.createdAt == this.createdAt);
}

class NotificationsTableCompanion extends UpdateCompanion<NotificationEntry> {
  final Value<String> id;
  final Value<String> userId;
  final Value<String?> tripId;
  final Value<String> title;
  final Value<String> body;
  final Value<String?> dataJson;
  final Value<bool> read;
  final Value<String> createdAt;
  final Value<int> rowid;
  const NotificationsTableCompanion({
    this.id = const Value.absent(),
    this.userId = const Value.absent(),
    this.tripId = const Value.absent(),
    this.title = const Value.absent(),
    this.body = const Value.absent(),
    this.dataJson = const Value.absent(),
    this.read = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  NotificationsTableCompanion.insert({
    required String id,
    required String userId,
    this.tripId = const Value.absent(),
    required String title,
    required String body,
    this.dataJson = const Value.absent(),
    this.read = const Value.absent(),
    required String createdAt,
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       userId = Value(userId),
       title = Value(title),
       body = Value(body),
       createdAt = Value(createdAt);
  static Insertable<NotificationEntry> custom({
    Expression<String>? id,
    Expression<String>? userId,
    Expression<String>? tripId,
    Expression<String>? title,
    Expression<String>? body,
    Expression<String>? dataJson,
    Expression<bool>? read,
    Expression<String>? createdAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (userId != null) 'user_id': userId,
      if (tripId != null) 'trip_id': tripId,
      if (title != null) 'title': title,
      if (body != null) 'body': body,
      if (dataJson != null) 'data_json': dataJson,
      if (read != null) 'read': read,
      if (createdAt != null) 'created_at': createdAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  NotificationsTableCompanion copyWith({
    Value<String>? id,
    Value<String>? userId,
    Value<String?>? tripId,
    Value<String>? title,
    Value<String>? body,
    Value<String?>? dataJson,
    Value<bool>? read,
    Value<String>? createdAt,
    Value<int>? rowid,
  }) {
    return NotificationsTableCompanion(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      tripId: tripId ?? this.tripId,
      title: title ?? this.title,
      body: body ?? this.body,
      dataJson: dataJson ?? this.dataJson,
      read: read ?? this.read,
      createdAt: createdAt ?? this.createdAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (userId.present) {
      map['user_id'] = Variable<String>(userId.value);
    }
    if (tripId.present) {
      map['trip_id'] = Variable<String>(tripId.value);
    }
    if (title.present) {
      map['title'] = Variable<String>(title.value);
    }
    if (body.present) {
      map['body'] = Variable<String>(body.value);
    }
    if (dataJson.present) {
      map['data_json'] = Variable<String>(dataJson.value);
    }
    if (read.present) {
      map['read'] = Variable<bool>(read.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<String>(createdAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('NotificationsTableCompanion(')
          ..write('id: $id, ')
          ..write('userId: $userId, ')
          ..write('tripId: $tripId, ')
          ..write('title: $title, ')
          ..write('body: $body, ')
          ..write('dataJson: $dataJson, ')
          ..write('read: $read, ')
          ..write('createdAt: $createdAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $OutboxTableTable extends OutboxTable with TableInfo<$OutboxTableTable, OutboxEntry> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $OutboxTableTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _itemTypeMeta = const VerificationMeta('itemType');
  @override
  late final GeneratedColumn<String> itemType = GeneratedColumn<String>(
    'item_type',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _tripIdMeta = const VerificationMeta('tripId');
  @override
  late final GeneratedColumn<String> tripId = GeneratedColumn<String>(
    'trip_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _payloadJsonMeta = const VerificationMeta('payloadJson');
  @override
  late final GeneratedColumn<String> payloadJson = GeneratedColumn<String>(
    'payload_json',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _idempotencyKeyMeta = const VerificationMeta('idempotencyKey');
  @override
  late final GeneratedColumn<String> idempotencyKey = GeneratedColumn<String>(
    'idempotency_key',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _attemptsMeta = const VerificationMeta('attempts');
  @override
  late final GeneratedColumn<int> attempts = GeneratedColumn<int>(
    'attempts',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
    'status',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('pending'),
  );
  static const VerificationMeta _lastErrorMeta = const VerificationMeta('lastError');
  @override
  late final GeneratedColumn<String> lastError = GeneratedColumn<String>(
    'last_error',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<String> createdAt = GeneratedColumn<String>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _lastAttemptedAtMeta = const VerificationMeta('lastAttemptedAt');
  @override
  late final GeneratedColumn<String> lastAttemptedAt = GeneratedColumn<String>(
    'last_attempted_at',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    itemType,
    tripId,
    payloadJson,
    idempotencyKey,
    attempts,
    status,
    lastError,
    createdAt,
    lastAttemptedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'outbox_mutations';
  @override
  VerificationContext validateIntegrity(Insertable<OutboxEntry> instance, {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('item_type')) {
      context.handle(_itemTypeMeta, itemType.isAcceptableOrUnknown(data['item_type']!, _itemTypeMeta));
    } else if (isInserting) {
      context.missing(_itemTypeMeta);
    }
    if (data.containsKey('trip_id')) {
      context.handle(_tripIdMeta, tripId.isAcceptableOrUnknown(data['trip_id']!, _tripIdMeta));
    }
    if (data.containsKey('payload_json')) {
      context.handle(_payloadJsonMeta, payloadJson.isAcceptableOrUnknown(data['payload_json']!, _payloadJsonMeta));
    } else if (isInserting) {
      context.missing(_payloadJsonMeta);
    }
    if (data.containsKey('idempotency_key')) {
      context.handle(
        _idempotencyKeyMeta,
        idempotencyKey.isAcceptableOrUnknown(data['idempotency_key']!, _idempotencyKeyMeta),
      );
    } else if (isInserting) {
      context.missing(_idempotencyKeyMeta);
    }
    if (data.containsKey('attempts')) {
      context.handle(_attemptsMeta, attempts.isAcceptableOrUnknown(data['attempts']!, _attemptsMeta));
    }
    if (data.containsKey('status')) {
      context.handle(_statusMeta, status.isAcceptableOrUnknown(data['status']!, _statusMeta));
    }
    if (data.containsKey('last_error')) {
      context.handle(_lastErrorMeta, lastError.isAcceptableOrUnknown(data['last_error']!, _lastErrorMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta, createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('last_attempted_at')) {
      context.handle(
        _lastAttemptedAtMeta,
        lastAttemptedAt.isAcceptableOrUnknown(data['last_attempted_at']!, _lastAttemptedAtMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  OutboxEntry map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return OutboxEntry(
      id: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      itemType: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}item_type'])!,
      tripId: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}trip_id']),
      payloadJson: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}payload_json'])!,
      idempotencyKey: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}idempotency_key'],
      )!,
      attempts: attachedDatabase.typeMapping.read(DriftSqlType.int, data['${effectivePrefix}attempts'])!,
      status: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}status'])!,
      lastError: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}last_error']),
      createdAt: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}created_at'])!,
      lastAttemptedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}last_attempted_at'],
      ),
    );
  }

  @override
  $OutboxTableTable createAlias(String alias) {
    return $OutboxTableTable(attachedDatabase, alias);
  }
}

class OutboxEntry extends DataClass implements Insertable<OutboxEntry> {
  final String id;
  final String itemType;
  final String? tripId;
  final String payloadJson;
  final String idempotencyKey;
  final int attempts;
  final String status;
  final String? lastError;
  final String createdAt;
  final String? lastAttemptedAt;
  const OutboxEntry({
    required this.id,
    required this.itemType,
    this.tripId,
    required this.payloadJson,
    required this.idempotencyKey,
    required this.attempts,
    required this.status,
    this.lastError,
    required this.createdAt,
    this.lastAttemptedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['item_type'] = Variable<String>(itemType);
    if (!nullToAbsent || tripId != null) {
      map['trip_id'] = Variable<String>(tripId);
    }
    map['payload_json'] = Variable<String>(payloadJson);
    map['idempotency_key'] = Variable<String>(idempotencyKey);
    map['attempts'] = Variable<int>(attempts);
    map['status'] = Variable<String>(status);
    if (!nullToAbsent || lastError != null) {
      map['last_error'] = Variable<String>(lastError);
    }
    map['created_at'] = Variable<String>(createdAt);
    if (!nullToAbsent || lastAttemptedAt != null) {
      map['last_attempted_at'] = Variable<String>(lastAttemptedAt);
    }
    return map;
  }

  OutboxTableCompanion toCompanion(bool nullToAbsent) {
    return OutboxTableCompanion(
      id: Value(id),
      itemType: Value(itemType),
      tripId: tripId == null && nullToAbsent ? const Value.absent() : Value(tripId),
      payloadJson: Value(payloadJson),
      idempotencyKey: Value(idempotencyKey),
      attempts: Value(attempts),
      status: Value(status),
      lastError: lastError == null && nullToAbsent ? const Value.absent() : Value(lastError),
      createdAt: Value(createdAt),
      lastAttemptedAt: lastAttemptedAt == null && nullToAbsent ? const Value.absent() : Value(lastAttemptedAt),
    );
  }

  factory OutboxEntry.fromJson(Map<String, dynamic> json, {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return OutboxEntry(
      id: serializer.fromJson<String>(json['id']),
      itemType: serializer.fromJson<String>(json['itemType']),
      tripId: serializer.fromJson<String?>(json['tripId']),
      payloadJson: serializer.fromJson<String>(json['payloadJson']),
      idempotencyKey: serializer.fromJson<String>(json['idempotencyKey']),
      attempts: serializer.fromJson<int>(json['attempts']),
      status: serializer.fromJson<String>(json['status']),
      lastError: serializer.fromJson<String?>(json['lastError']),
      createdAt: serializer.fromJson<String>(json['createdAt']),
      lastAttemptedAt: serializer.fromJson<String?>(json['lastAttemptedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'itemType': serializer.toJson<String>(itemType),
      'tripId': serializer.toJson<String?>(tripId),
      'payloadJson': serializer.toJson<String>(payloadJson),
      'idempotencyKey': serializer.toJson<String>(idempotencyKey),
      'attempts': serializer.toJson<int>(attempts),
      'status': serializer.toJson<String>(status),
      'lastError': serializer.toJson<String?>(lastError),
      'createdAt': serializer.toJson<String>(createdAt),
      'lastAttemptedAt': serializer.toJson<String?>(lastAttemptedAt),
    };
  }

  OutboxEntry copyWith({
    String? id,
    String? itemType,
    Value<String?> tripId = const Value.absent(),
    String? payloadJson,
    String? idempotencyKey,
    int? attempts,
    String? status,
    Value<String?> lastError = const Value.absent(),
    String? createdAt,
    Value<String?> lastAttemptedAt = const Value.absent(),
  }) => OutboxEntry(
    id: id ?? this.id,
    itemType: itemType ?? this.itemType,
    tripId: tripId.present ? tripId.value : this.tripId,
    payloadJson: payloadJson ?? this.payloadJson,
    idempotencyKey: idempotencyKey ?? this.idempotencyKey,
    attempts: attempts ?? this.attempts,
    status: status ?? this.status,
    lastError: lastError.present ? lastError.value : this.lastError,
    createdAt: createdAt ?? this.createdAt,
    lastAttemptedAt: lastAttemptedAt.present ? lastAttemptedAt.value : this.lastAttemptedAt,
  );
  OutboxEntry copyWithCompanion(OutboxTableCompanion data) {
    return OutboxEntry(
      id: data.id.present ? data.id.value : this.id,
      itemType: data.itemType.present ? data.itemType.value : this.itemType,
      tripId: data.tripId.present ? data.tripId.value : this.tripId,
      payloadJson: data.payloadJson.present ? data.payloadJson.value : this.payloadJson,
      idempotencyKey: data.idempotencyKey.present ? data.idempotencyKey.value : this.idempotencyKey,
      attempts: data.attempts.present ? data.attempts.value : this.attempts,
      status: data.status.present ? data.status.value : this.status,
      lastError: data.lastError.present ? data.lastError.value : this.lastError,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      lastAttemptedAt: data.lastAttemptedAt.present ? data.lastAttemptedAt.value : this.lastAttemptedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('OutboxEntry(')
          ..write('id: $id, ')
          ..write('itemType: $itemType, ')
          ..write('tripId: $tripId, ')
          ..write('payloadJson: $payloadJson, ')
          ..write('idempotencyKey: $idempotencyKey, ')
          ..write('attempts: $attempts, ')
          ..write('status: $status, ')
          ..write('lastError: $lastError, ')
          ..write('createdAt: $createdAt, ')
          ..write('lastAttemptedAt: $lastAttemptedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    itemType,
    tripId,
    payloadJson,
    idempotencyKey,
    attempts,
    status,
    lastError,
    createdAt,
    lastAttemptedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is OutboxEntry &&
          other.id == this.id &&
          other.itemType == this.itemType &&
          other.tripId == this.tripId &&
          other.payloadJson == this.payloadJson &&
          other.idempotencyKey == this.idempotencyKey &&
          other.attempts == this.attempts &&
          other.status == this.status &&
          other.lastError == this.lastError &&
          other.createdAt == this.createdAt &&
          other.lastAttemptedAt == this.lastAttemptedAt);
}

class OutboxTableCompanion extends UpdateCompanion<OutboxEntry> {
  final Value<String> id;
  final Value<String> itemType;
  final Value<String?> tripId;
  final Value<String> payloadJson;
  final Value<String> idempotencyKey;
  final Value<int> attempts;
  final Value<String> status;
  final Value<String?> lastError;
  final Value<String> createdAt;
  final Value<String?> lastAttemptedAt;
  final Value<int> rowid;
  const OutboxTableCompanion({
    this.id = const Value.absent(),
    this.itemType = const Value.absent(),
    this.tripId = const Value.absent(),
    this.payloadJson = const Value.absent(),
    this.idempotencyKey = const Value.absent(),
    this.attempts = const Value.absent(),
    this.status = const Value.absent(),
    this.lastError = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.lastAttemptedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  OutboxTableCompanion.insert({
    required String id,
    required String itemType,
    this.tripId = const Value.absent(),
    required String payloadJson,
    required String idempotencyKey,
    this.attempts = const Value.absent(),
    this.status = const Value.absent(),
    this.lastError = const Value.absent(),
    required String createdAt,
    this.lastAttemptedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       itemType = Value(itemType),
       payloadJson = Value(payloadJson),
       idempotencyKey = Value(idempotencyKey),
       createdAt = Value(createdAt);
  static Insertable<OutboxEntry> custom({
    Expression<String>? id,
    Expression<String>? itemType,
    Expression<String>? tripId,
    Expression<String>? payloadJson,
    Expression<String>? idempotencyKey,
    Expression<int>? attempts,
    Expression<String>? status,
    Expression<String>? lastError,
    Expression<String>? createdAt,
    Expression<String>? lastAttemptedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (itemType != null) 'item_type': itemType,
      if (tripId != null) 'trip_id': tripId,
      if (payloadJson != null) 'payload_json': payloadJson,
      if (idempotencyKey != null) 'idempotency_key': idempotencyKey,
      if (attempts != null) 'attempts': attempts,
      if (status != null) 'status': status,
      if (lastError != null) 'last_error': lastError,
      if (createdAt != null) 'created_at': createdAt,
      if (lastAttemptedAt != null) 'last_attempted_at': lastAttemptedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  OutboxTableCompanion copyWith({
    Value<String>? id,
    Value<String>? itemType,
    Value<String?>? tripId,
    Value<String>? payloadJson,
    Value<String>? idempotencyKey,
    Value<int>? attempts,
    Value<String>? status,
    Value<String?>? lastError,
    Value<String>? createdAt,
    Value<String?>? lastAttemptedAt,
    Value<int>? rowid,
  }) {
    return OutboxTableCompanion(
      id: id ?? this.id,
      itemType: itemType ?? this.itemType,
      tripId: tripId ?? this.tripId,
      payloadJson: payloadJson ?? this.payloadJson,
      idempotencyKey: idempotencyKey ?? this.idempotencyKey,
      attempts: attempts ?? this.attempts,
      status: status ?? this.status,
      lastError: lastError ?? this.lastError,
      createdAt: createdAt ?? this.createdAt,
      lastAttemptedAt: lastAttemptedAt ?? this.lastAttemptedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (itemType.present) {
      map['item_type'] = Variable<String>(itemType.value);
    }
    if (tripId.present) {
      map['trip_id'] = Variable<String>(tripId.value);
    }
    if (payloadJson.present) {
      map['payload_json'] = Variable<String>(payloadJson.value);
    }
    if (idempotencyKey.present) {
      map['idempotency_key'] = Variable<String>(idempotencyKey.value);
    }
    if (attempts.present) {
      map['attempts'] = Variable<int>(attempts.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (lastError.present) {
      map['last_error'] = Variable<String>(lastError.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<String>(createdAt.value);
    }
    if (lastAttemptedAt.present) {
      map['last_attempted_at'] = Variable<String>(lastAttemptedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('OutboxTableCompanion(')
          ..write('id: $id, ')
          ..write('itemType: $itemType, ')
          ..write('tripId: $tripId, ')
          ..write('payloadJson: $payloadJson, ')
          ..write('idempotencyKey: $idempotencyKey, ')
          ..write('attempts: $attempts, ')
          ..write('status: $status, ')
          ..write('lastError: $lastError, ')
          ..write('createdAt: $createdAt, ')
          ..write('lastAttemptedAt: $lastAttemptedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $SyncMetaTableTable extends SyncMetaTable with TableInfo<$SyncMetaTableTable, SyncMetaEntry> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $SyncMetaTableTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _keyMeta = const VerificationMeta('key');
  @override
  late final GeneratedColumn<String> key = GeneratedColumn<String>(
    'key',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _valueMeta = const VerificationMeta('value');
  @override
  late final GeneratedColumn<String> value = GeneratedColumn<String>(
    'value',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _updatedAtMeta = const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<String> updatedAt = GeneratedColumn<String>(
    'updated_at',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [key, value, updatedAt];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'sync_meta';
  @override
  VerificationContext validateIntegrity(Insertable<SyncMetaEntry> instance, {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('key')) {
      context.handle(_keyMeta, key.isAcceptableOrUnknown(data['key']!, _keyMeta));
    } else if (isInserting) {
      context.missing(_keyMeta);
    }
    if (data.containsKey('value')) {
      context.handle(_valueMeta, value.isAcceptableOrUnknown(data['value']!, _valueMeta));
    } else if (isInserting) {
      context.missing(_valueMeta);
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta, updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    } else if (isInserting) {
      context.missing(_updatedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {key};
  @override
  SyncMetaEntry map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return SyncMetaEntry(
      key: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}key'])!,
      value: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}value'])!,
      updatedAt: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}updated_at'])!,
    );
  }

  @override
  $SyncMetaTableTable createAlias(String alias) {
    return $SyncMetaTableTable(attachedDatabase, alias);
  }
}

class SyncMetaEntry extends DataClass implements Insertable<SyncMetaEntry> {
  final String key;
  final String value;
  final String updatedAt;
  const SyncMetaEntry({required this.key, required this.value, required this.updatedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['key'] = Variable<String>(key);
    map['value'] = Variable<String>(value);
    map['updated_at'] = Variable<String>(updatedAt);
    return map;
  }

  SyncMetaTableCompanion toCompanion(bool nullToAbsent) {
    return SyncMetaTableCompanion(key: Value(key), value: Value(value), updatedAt: Value(updatedAt));
  }

  factory SyncMetaEntry.fromJson(Map<String, dynamic> json, {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return SyncMetaEntry(
      key: serializer.fromJson<String>(json['key']),
      value: serializer.fromJson<String>(json['value']),
      updatedAt: serializer.fromJson<String>(json['updatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'key': serializer.toJson<String>(key),
      'value': serializer.toJson<String>(value),
      'updatedAt': serializer.toJson<String>(updatedAt),
    };
  }

  SyncMetaEntry copyWith({String? key, String? value, String? updatedAt}) =>
      SyncMetaEntry(key: key ?? this.key, value: value ?? this.value, updatedAt: updatedAt ?? this.updatedAt);
  SyncMetaEntry copyWithCompanion(SyncMetaTableCompanion data) {
    return SyncMetaEntry(
      key: data.key.present ? data.key.value : this.key,
      value: data.value.present ? data.value.value : this.value,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('SyncMetaEntry(')
          ..write('key: $key, ')
          ..write('value: $value, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(key, value, updatedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is SyncMetaEntry &&
          other.key == this.key &&
          other.value == this.value &&
          other.updatedAt == this.updatedAt);
}

class SyncMetaTableCompanion extends UpdateCompanion<SyncMetaEntry> {
  final Value<String> key;
  final Value<String> value;
  final Value<String> updatedAt;
  final Value<int> rowid;
  const SyncMetaTableCompanion({
    this.key = const Value.absent(),
    this.value = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  SyncMetaTableCompanion.insert({
    required String key,
    required String value,
    required String updatedAt,
    this.rowid = const Value.absent(),
  }) : key = Value(key),
       value = Value(value),
       updatedAt = Value(updatedAt);
  static Insertable<SyncMetaEntry> custom({
    Expression<String>? key,
    Expression<String>? value,
    Expression<String>? updatedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (key != null) 'key': key,
      if (value != null) 'value': value,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  SyncMetaTableCompanion copyWith({
    Value<String>? key,
    Value<String>? value,
    Value<String>? updatedAt,
    Value<int>? rowid,
  }) {
    return SyncMetaTableCompanion(
      key: key ?? this.key,
      value: value ?? this.value,
      updatedAt: updatedAt ?? this.updatedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (key.present) {
      map['key'] = Variable<String>(key.value);
    }
    if (value.present) {
      map['value'] = Variable<String>(value.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<String>(updatedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('SyncMetaTableCompanion(')
          ..write('key: $key, ')
          ..write('value: $value, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $SettingsKvTableTable extends SettingsKvTable with TableInfo<$SettingsKvTableTable, SettingsKvEntry> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $SettingsKvTableTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _keyMeta = const VerificationMeta('key');
  @override
  late final GeneratedColumn<String> key = GeneratedColumn<String>(
    'key',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _valueMeta = const VerificationMeta('value');
  @override
  late final GeneratedColumn<String> value = GeneratedColumn<String>(
    'value',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [key, value];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'settings_kv';
  @override
  VerificationContext validateIntegrity(Insertable<SettingsKvEntry> instance, {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('key')) {
      context.handle(_keyMeta, key.isAcceptableOrUnknown(data['key']!, _keyMeta));
    } else if (isInserting) {
      context.missing(_keyMeta);
    }
    if (data.containsKey('value')) {
      context.handle(_valueMeta, value.isAcceptableOrUnknown(data['value']!, _valueMeta));
    } else if (isInserting) {
      context.missing(_valueMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {key};
  @override
  SettingsKvEntry map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return SettingsKvEntry(
      key: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}key'])!,
      value: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}value'])!,
    );
  }

  @override
  $SettingsKvTableTable createAlias(String alias) {
    return $SettingsKvTableTable(attachedDatabase, alias);
  }
}

class SettingsKvEntry extends DataClass implements Insertable<SettingsKvEntry> {
  final String key;
  final String value;
  const SettingsKvEntry({required this.key, required this.value});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['key'] = Variable<String>(key);
    map['value'] = Variable<String>(value);
    return map;
  }

  SettingsKvTableCompanion toCompanion(bool nullToAbsent) {
    return SettingsKvTableCompanion(key: Value(key), value: Value(value));
  }

  factory SettingsKvEntry.fromJson(Map<String, dynamic> json, {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return SettingsKvEntry(
      key: serializer.fromJson<String>(json['key']),
      value: serializer.fromJson<String>(json['value']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{'key': serializer.toJson<String>(key), 'value': serializer.toJson<String>(value)};
  }

  SettingsKvEntry copyWith({String? key, String? value}) =>
      SettingsKvEntry(key: key ?? this.key, value: value ?? this.value);
  SettingsKvEntry copyWithCompanion(SettingsKvTableCompanion data) {
    return SettingsKvEntry(
      key: data.key.present ? data.key.value : this.key,
      value: data.value.present ? data.value.value : this.value,
    );
  }

  @override
  String toString() {
    return (StringBuffer('SettingsKvEntry(')
          ..write('key: $key, ')
          ..write('value: $value')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(key, value);
  @override
  bool operator ==(Object other) =>
      identical(this, other) || (other is SettingsKvEntry && other.key == this.key && other.value == this.value);
}

class SettingsKvTableCompanion extends UpdateCompanion<SettingsKvEntry> {
  final Value<String> key;
  final Value<String> value;
  final Value<int> rowid;
  const SettingsKvTableCompanion({
    this.key = const Value.absent(),
    this.value = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  SettingsKvTableCompanion.insert({required String key, required String value, this.rowid = const Value.absent()})
    : key = Value(key),
      value = Value(value);
  static Insertable<SettingsKvEntry> custom({
    Expression<String>? key,
    Expression<String>? value,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (key != null) 'key': key,
      if (value != null) 'value': value,
      if (rowid != null) 'rowid': rowid,
    });
  }

  SettingsKvTableCompanion copyWith({Value<String>? key, Value<String>? value, Value<int>? rowid}) {
    return SettingsKvTableCompanion(key: key ?? this.key, value: value ?? this.value, rowid: rowid ?? this.rowid);
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (key.present) {
      map['key'] = Variable<String>(key.value);
    }
    if (value.present) {
      map['value'] = Variable<String>(value.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('SettingsKvTableCompanion(')
          ..write('key: $key, ')
          ..write('value: $value, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $OfflineReceiptsTableTable extends OfflineReceiptsTable
    with TableInfo<$OfflineReceiptsTableTable, OfflineReceiptEntry> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $OfflineReceiptsTableTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _expenseIdMeta = const VerificationMeta('expenseId');
  @override
  late final GeneratedColumn<String> expenseId = GeneratedColumn<String>(
    'expense_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _localFilePathMeta = const VerificationMeta('localFilePath');
  @override
  late final GeneratedColumn<String> localFilePath = GeneratedColumn<String>(
    'local_file_path',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _mimeTypeMeta = const VerificationMeta('mimeType');
  @override
  late final GeneratedColumn<String> mimeType = GeneratedColumn<String>(
    'mime_type',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _uploadedMeta = const VerificationMeta('uploaded');
  @override
  late final GeneratedColumn<bool> uploaded = GeneratedColumn<bool>(
    'uploaded',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways('CHECK ("uploaded" IN (0, 1))'),
    defaultValue: const Constant(false),
  );
  static const VerificationMeta _remoteUrlMeta = const VerificationMeta('remoteUrl');
  @override
  late final GeneratedColumn<String> remoteUrl = GeneratedColumn<String>(
    'remote_url',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<String> createdAt = GeneratedColumn<String>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [expenseId, localFilePath, mimeType, uploaded, remoteUrl, createdAt];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'offline_receipts';
  @override
  VerificationContext validateIntegrity(Insertable<OfflineReceiptEntry> instance, {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('expense_id')) {
      context.handle(_expenseIdMeta, expenseId.isAcceptableOrUnknown(data['expense_id']!, _expenseIdMeta));
    } else if (isInserting) {
      context.missing(_expenseIdMeta);
    }
    if (data.containsKey('local_file_path')) {
      context.handle(
        _localFilePathMeta,
        localFilePath.isAcceptableOrUnknown(data['local_file_path']!, _localFilePathMeta),
      );
    } else if (isInserting) {
      context.missing(_localFilePathMeta);
    }
    if (data.containsKey('mime_type')) {
      context.handle(_mimeTypeMeta, mimeType.isAcceptableOrUnknown(data['mime_type']!, _mimeTypeMeta));
    } else if (isInserting) {
      context.missing(_mimeTypeMeta);
    }
    if (data.containsKey('uploaded')) {
      context.handle(_uploadedMeta, uploaded.isAcceptableOrUnknown(data['uploaded']!, _uploadedMeta));
    }
    if (data.containsKey('remote_url')) {
      context.handle(_remoteUrlMeta, remoteUrl.isAcceptableOrUnknown(data['remote_url']!, _remoteUrlMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta, createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {expenseId};
  @override
  OfflineReceiptEntry map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return OfflineReceiptEntry(
      expenseId: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}expense_id'])!,
      localFilePath: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}local_file_path'])!,
      mimeType: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}mime_type'])!,
      uploaded: attachedDatabase.typeMapping.read(DriftSqlType.bool, data['${effectivePrefix}uploaded'])!,
      remoteUrl: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}remote_url']),
      createdAt: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}created_at'])!,
    );
  }

  @override
  $OfflineReceiptsTableTable createAlias(String alias) {
    return $OfflineReceiptsTableTable(attachedDatabase, alias);
  }
}

class OfflineReceiptEntry extends DataClass implements Insertable<OfflineReceiptEntry> {
  final String expenseId;
  final String localFilePath;
  final String mimeType;
  final bool uploaded;
  final String? remoteUrl;
  final String createdAt;
  const OfflineReceiptEntry({
    required this.expenseId,
    required this.localFilePath,
    required this.mimeType,
    required this.uploaded,
    this.remoteUrl,
    required this.createdAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['expense_id'] = Variable<String>(expenseId);
    map['local_file_path'] = Variable<String>(localFilePath);
    map['mime_type'] = Variable<String>(mimeType);
    map['uploaded'] = Variable<bool>(uploaded);
    if (!nullToAbsent || remoteUrl != null) {
      map['remote_url'] = Variable<String>(remoteUrl);
    }
    map['created_at'] = Variable<String>(createdAt);
    return map;
  }

  OfflineReceiptsTableCompanion toCompanion(bool nullToAbsent) {
    return OfflineReceiptsTableCompanion(
      expenseId: Value(expenseId),
      localFilePath: Value(localFilePath),
      mimeType: Value(mimeType),
      uploaded: Value(uploaded),
      remoteUrl: remoteUrl == null && nullToAbsent ? const Value.absent() : Value(remoteUrl),
      createdAt: Value(createdAt),
    );
  }

  factory OfflineReceiptEntry.fromJson(Map<String, dynamic> json, {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return OfflineReceiptEntry(
      expenseId: serializer.fromJson<String>(json['expenseId']),
      localFilePath: serializer.fromJson<String>(json['localFilePath']),
      mimeType: serializer.fromJson<String>(json['mimeType']),
      uploaded: serializer.fromJson<bool>(json['uploaded']),
      remoteUrl: serializer.fromJson<String?>(json['remoteUrl']),
      createdAt: serializer.fromJson<String>(json['createdAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'expenseId': serializer.toJson<String>(expenseId),
      'localFilePath': serializer.toJson<String>(localFilePath),
      'mimeType': serializer.toJson<String>(mimeType),
      'uploaded': serializer.toJson<bool>(uploaded),
      'remoteUrl': serializer.toJson<String?>(remoteUrl),
      'createdAt': serializer.toJson<String>(createdAt),
    };
  }

  OfflineReceiptEntry copyWith({
    String? expenseId,
    String? localFilePath,
    String? mimeType,
    bool? uploaded,
    Value<String?> remoteUrl = const Value.absent(),
    String? createdAt,
  }) => OfflineReceiptEntry(
    expenseId: expenseId ?? this.expenseId,
    localFilePath: localFilePath ?? this.localFilePath,
    mimeType: mimeType ?? this.mimeType,
    uploaded: uploaded ?? this.uploaded,
    remoteUrl: remoteUrl.present ? remoteUrl.value : this.remoteUrl,
    createdAt: createdAt ?? this.createdAt,
  );
  OfflineReceiptEntry copyWithCompanion(OfflineReceiptsTableCompanion data) {
    return OfflineReceiptEntry(
      expenseId: data.expenseId.present ? data.expenseId.value : this.expenseId,
      localFilePath: data.localFilePath.present ? data.localFilePath.value : this.localFilePath,
      mimeType: data.mimeType.present ? data.mimeType.value : this.mimeType,
      uploaded: data.uploaded.present ? data.uploaded.value : this.uploaded,
      remoteUrl: data.remoteUrl.present ? data.remoteUrl.value : this.remoteUrl,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('OfflineReceiptEntry(')
          ..write('expenseId: $expenseId, ')
          ..write('localFilePath: $localFilePath, ')
          ..write('mimeType: $mimeType, ')
          ..write('uploaded: $uploaded, ')
          ..write('remoteUrl: $remoteUrl, ')
          ..write('createdAt: $createdAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(expenseId, localFilePath, mimeType, uploaded, remoteUrl, createdAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is OfflineReceiptEntry &&
          other.expenseId == this.expenseId &&
          other.localFilePath == this.localFilePath &&
          other.mimeType == this.mimeType &&
          other.uploaded == this.uploaded &&
          other.remoteUrl == this.remoteUrl &&
          other.createdAt == this.createdAt);
}

class OfflineReceiptsTableCompanion extends UpdateCompanion<OfflineReceiptEntry> {
  final Value<String> expenseId;
  final Value<String> localFilePath;
  final Value<String> mimeType;
  final Value<bool> uploaded;
  final Value<String?> remoteUrl;
  final Value<String> createdAt;
  final Value<int> rowid;
  const OfflineReceiptsTableCompanion({
    this.expenseId = const Value.absent(),
    this.localFilePath = const Value.absent(),
    this.mimeType = const Value.absent(),
    this.uploaded = const Value.absent(),
    this.remoteUrl = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  OfflineReceiptsTableCompanion.insert({
    required String expenseId,
    required String localFilePath,
    required String mimeType,
    this.uploaded = const Value.absent(),
    this.remoteUrl = const Value.absent(),
    required String createdAt,
    this.rowid = const Value.absent(),
  }) : expenseId = Value(expenseId),
       localFilePath = Value(localFilePath),
       mimeType = Value(mimeType),
       createdAt = Value(createdAt);
  static Insertable<OfflineReceiptEntry> custom({
    Expression<String>? expenseId,
    Expression<String>? localFilePath,
    Expression<String>? mimeType,
    Expression<bool>? uploaded,
    Expression<String>? remoteUrl,
    Expression<String>? createdAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (expenseId != null) 'expense_id': expenseId,
      if (localFilePath != null) 'local_file_path': localFilePath,
      if (mimeType != null) 'mime_type': mimeType,
      if (uploaded != null) 'uploaded': uploaded,
      if (remoteUrl != null) 'remote_url': remoteUrl,
      if (createdAt != null) 'created_at': createdAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  OfflineReceiptsTableCompanion copyWith({
    Value<String>? expenseId,
    Value<String>? localFilePath,
    Value<String>? mimeType,
    Value<bool>? uploaded,
    Value<String?>? remoteUrl,
    Value<String>? createdAt,
    Value<int>? rowid,
  }) {
    return OfflineReceiptsTableCompanion(
      expenseId: expenseId ?? this.expenseId,
      localFilePath: localFilePath ?? this.localFilePath,
      mimeType: mimeType ?? this.mimeType,
      uploaded: uploaded ?? this.uploaded,
      remoteUrl: remoteUrl ?? this.remoteUrl,
      createdAt: createdAt ?? this.createdAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (expenseId.present) {
      map['expense_id'] = Variable<String>(expenseId.value);
    }
    if (localFilePath.present) {
      map['local_file_path'] = Variable<String>(localFilePath.value);
    }
    if (mimeType.present) {
      map['mime_type'] = Variable<String>(mimeType.value);
    }
    if (uploaded.present) {
      map['uploaded'] = Variable<bool>(uploaded.value);
    }
    if (remoteUrl.present) {
      map['remote_url'] = Variable<String>(remoteUrl.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<String>(createdAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('OfflineReceiptsTableCompanion(')
          ..write('expenseId: $expenseId, ')
          ..write('localFilePath: $localFilePath, ')
          ..write('mimeType: $mimeType, ')
          ..write('uploaded: $uploaded, ')
          ..write('remoteUrl: $remoteUrl, ')
          ..write('createdAt: $createdAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $FeatureFlagsTableTable extends FeatureFlagsTable with TableInfo<$FeatureFlagsTableTable, FeatureFlagEntry> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $FeatureFlagsTableTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _keyMeta = const VerificationMeta('key');
  @override
  late final GeneratedColumn<String> key = GeneratedColumn<String>(
    'key',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _enabledMeta = const VerificationMeta('enabled');
  @override
  late final GeneratedColumn<bool> enabled = GeneratedColumn<bool>(
    'enabled',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: true,
    defaultConstraints: GeneratedColumn.constraintIsAlways('CHECK ("enabled" IN (0, 1))'),
  );
  static const VerificationMeta _valueJsonMeta = const VerificationMeta('valueJson');
  @override
  late final GeneratedColumn<String> valueJson = GeneratedColumn<String>(
    'value_json',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _updatedAtMeta = const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<String> updatedAt = GeneratedColumn<String>(
    'updated_at',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [key, enabled, valueJson, updatedAt];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'feature_flags';
  @override
  VerificationContext validateIntegrity(Insertable<FeatureFlagEntry> instance, {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('key')) {
      context.handle(_keyMeta, key.isAcceptableOrUnknown(data['key']!, _keyMeta));
    } else if (isInserting) {
      context.missing(_keyMeta);
    }
    if (data.containsKey('enabled')) {
      context.handle(_enabledMeta, enabled.isAcceptableOrUnknown(data['enabled']!, _enabledMeta));
    } else if (isInserting) {
      context.missing(_enabledMeta);
    }
    if (data.containsKey('value_json')) {
      context.handle(_valueJsonMeta, valueJson.isAcceptableOrUnknown(data['value_json']!, _valueJsonMeta));
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta, updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    } else if (isInserting) {
      context.missing(_updatedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {key};
  @override
  FeatureFlagEntry map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return FeatureFlagEntry(
      key: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}key'])!,
      enabled: attachedDatabase.typeMapping.read(DriftSqlType.bool, data['${effectivePrefix}enabled'])!,
      valueJson: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}value_json']),
      updatedAt: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}updated_at'])!,
    );
  }

  @override
  $FeatureFlagsTableTable createAlias(String alias) {
    return $FeatureFlagsTableTable(attachedDatabase, alias);
  }
}

class FeatureFlagEntry extends DataClass implements Insertable<FeatureFlagEntry> {
  final String key;
  final bool enabled;
  final String? valueJson;
  final String updatedAt;
  const FeatureFlagEntry({required this.key, required this.enabled, this.valueJson, required this.updatedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['key'] = Variable<String>(key);
    map['enabled'] = Variable<bool>(enabled);
    if (!nullToAbsent || valueJson != null) {
      map['value_json'] = Variable<String>(valueJson);
    }
    map['updated_at'] = Variable<String>(updatedAt);
    return map;
  }

  FeatureFlagsTableCompanion toCompanion(bool nullToAbsent) {
    return FeatureFlagsTableCompanion(
      key: Value(key),
      enabled: Value(enabled),
      valueJson: valueJson == null && nullToAbsent ? const Value.absent() : Value(valueJson),
      updatedAt: Value(updatedAt),
    );
  }

  factory FeatureFlagEntry.fromJson(Map<String, dynamic> json, {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return FeatureFlagEntry(
      key: serializer.fromJson<String>(json['key']),
      enabled: serializer.fromJson<bool>(json['enabled']),
      valueJson: serializer.fromJson<String?>(json['valueJson']),
      updatedAt: serializer.fromJson<String>(json['updatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'key': serializer.toJson<String>(key),
      'enabled': serializer.toJson<bool>(enabled),
      'valueJson': serializer.toJson<String?>(valueJson),
      'updatedAt': serializer.toJson<String>(updatedAt),
    };
  }

  FeatureFlagEntry copyWith({
    String? key,
    bool? enabled,
    Value<String?> valueJson = const Value.absent(),
    String? updatedAt,
  }) => FeatureFlagEntry(
    key: key ?? this.key,
    enabled: enabled ?? this.enabled,
    valueJson: valueJson.present ? valueJson.value : this.valueJson,
    updatedAt: updatedAt ?? this.updatedAt,
  );
  FeatureFlagEntry copyWithCompanion(FeatureFlagsTableCompanion data) {
    return FeatureFlagEntry(
      key: data.key.present ? data.key.value : this.key,
      enabled: data.enabled.present ? data.enabled.value : this.enabled,
      valueJson: data.valueJson.present ? data.valueJson.value : this.valueJson,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('FeatureFlagEntry(')
          ..write('key: $key, ')
          ..write('enabled: $enabled, ')
          ..write('valueJson: $valueJson, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(key, enabled, valueJson, updatedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is FeatureFlagEntry &&
          other.key == this.key &&
          other.enabled == this.enabled &&
          other.valueJson == this.valueJson &&
          other.updatedAt == this.updatedAt);
}

class FeatureFlagsTableCompanion extends UpdateCompanion<FeatureFlagEntry> {
  final Value<String> key;
  final Value<bool> enabled;
  final Value<String?> valueJson;
  final Value<String> updatedAt;
  final Value<int> rowid;
  const FeatureFlagsTableCompanion({
    this.key = const Value.absent(),
    this.enabled = const Value.absent(),
    this.valueJson = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  FeatureFlagsTableCompanion.insert({
    required String key,
    required bool enabled,
    this.valueJson = const Value.absent(),
    required String updatedAt,
    this.rowid = const Value.absent(),
  }) : key = Value(key),
       enabled = Value(enabled),
       updatedAt = Value(updatedAt);
  static Insertable<FeatureFlagEntry> custom({
    Expression<String>? key,
    Expression<bool>? enabled,
    Expression<String>? valueJson,
    Expression<String>? updatedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (key != null) 'key': key,
      if (enabled != null) 'enabled': enabled,
      if (valueJson != null) 'value_json': valueJson,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  FeatureFlagsTableCompanion copyWith({
    Value<String>? key,
    Value<bool>? enabled,
    Value<String?>? valueJson,
    Value<String>? updatedAt,
    Value<int>? rowid,
  }) {
    return FeatureFlagsTableCompanion(
      key: key ?? this.key,
      enabled: enabled ?? this.enabled,
      valueJson: valueJson ?? this.valueJson,
      updatedAt: updatedAt ?? this.updatedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (key.present) {
      map['key'] = Variable<String>(key.value);
    }
    if (enabled.present) {
      map['enabled'] = Variable<bool>(enabled.value);
    }
    if (valueJson.present) {
      map['value_json'] = Variable<String>(valueJson.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<String>(updatedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('FeatureFlagsTableCompanion(')
          ..write('key: $key, ')
          ..write('enabled: $enabled, ')
          ..write('valueJson: $valueJson, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $TripsTableTable tripsTable = $TripsTableTable(this);
  late final $MembersTableTable membersTable = $MembersTableTable(this);
  late final $GroupsTableTable groupsTable = $GroupsTableTable(this);
  late final $GroupMembersTableTable groupMembersTable = $GroupMembersTableTable(this);
  late final $CategoriesTableTable categoriesTable = $CategoriesTableTable(this);
  late final $ExpensesTableTable expensesTable = $ExpensesTableTable(this);
  late final $TripMessagesTableTable tripMessagesTable = $TripMessagesTableTable(this);
  late final $NotificationsTableTable notificationsTable = $NotificationsTableTable(this);
  late final $OutboxTableTable outboxTable = $OutboxTableTable(this);
  late final $SyncMetaTableTable syncMetaTable = $SyncMetaTableTable(this);
  late final $SettingsKvTableTable settingsKvTable = $SettingsKvTableTable(this);
  late final $OfflineReceiptsTableTable offlineReceiptsTable = $OfflineReceiptsTableTable(this);
  late final $FeatureFlagsTableTable featureFlagsTable = $FeatureFlagsTableTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables => allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [
    tripsTable,
    membersTable,
    groupsTable,
    groupMembersTable,
    categoriesTable,
    expensesTable,
    tripMessagesTable,
    notificationsTable,
    outboxTable,
    syncMetaTable,
    settingsKvTable,
    offlineReceiptsTable,
    featureFlagsTable,
  ];
}

typedef $$TripsTableTableCreateCompanionBuilder = TripsTableCompanion Function({
  required String id,
  required String name,
  required String startDate,
  required String endDate,
  required String baseCurrency,
  required String ownerId,
  Value<String?> joinCode,
  Value<String?> destination,
  Value<String?> stopsJson,
  Value<String?> checklistJson,
  Value<String?> notesJson,
  Value<String?> passesJson,
  Value<String?> fxConfigJson,
  Value<String?> memberRolesJson,
  Value<bool> simplifyDebts,
  Value<bool> archived,
  Value<bool> frozen,
  Value<bool> closed,
  Value<String?> createdAt,
  Value<String?> updatedAt,
  Value<String?> domainJson,
  Value<int> rowid,
});
typedef $$TripsTableTableUpdateCompanionBuilder = TripsTableCompanion Function({
  Value<String> id,
  Value<String> name,
  Value<String> startDate,
  Value<String> endDate,
  Value<String> baseCurrency,
  Value<String> ownerId,
  Value<String?> joinCode,
  Value<String?> destination,
  Value<String?> stopsJson,
  Value<String?> checklistJson,
  Value<String?> notesJson,
  Value<String?> passesJson,
  Value<String?> fxConfigJson,
  Value<String?> memberRolesJson,
  Value<bool> simplifyDebts,
  Value<bool> archived,
  Value<bool> frozen,
  Value<bool> closed,
  Value<String?> createdAt,
  Value<String?> updatedAt,
  Value<String?> domainJson,
  Value<int> rowid,
});

class $$TripsTableTableFilterComposer extends Composer<_$AppDatabase, $TripsTableTable> {
  $$TripsTableTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get name => $composableBuilder(column: $table.name, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get startDate =>
      $composableBuilder(column: $table.startDate, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get endDate =>
      $composableBuilder(column: $table.endDate, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get baseCurrency =>
      $composableBuilder(column: $table.baseCurrency, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get ownerId =>
      $composableBuilder(column: $table.ownerId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get joinCode =>
      $composableBuilder(column: $table.joinCode, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get destination =>
      $composableBuilder(column: $table.destination, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get stopsJson =>
      $composableBuilder(column: $table.stopsJson, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get checklistJson =>
      $composableBuilder(column: $table.checklistJson, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get notesJson =>
      $composableBuilder(column: $table.notesJson, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get passesJson =>
      $composableBuilder(column: $table.passesJson, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get fxConfigJson =>
      $composableBuilder(column: $table.fxConfigJson, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get memberRolesJson =>
      $composableBuilder(column: $table.memberRolesJson, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get simplifyDebts =>
      $composableBuilder(column: $table.simplifyDebts, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get archived =>
      $composableBuilder(column: $table.archived, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get frozen =>
      $composableBuilder(column: $table.frozen, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get closed =>
      $composableBuilder(column: $table.closed, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get domainJson =>
      $composableBuilder(column: $table.domainJson, builder: (column) => ColumnFilters(column));
}

class $$TripsTableTableOrderingComposer extends Composer<_$AppDatabase, $TripsTableTable> {
  $$TripsTableTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get startDate =>
      $composableBuilder(column: $table.startDate, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get endDate =>
      $composableBuilder(column: $table.endDate, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get baseCurrency =>
      $composableBuilder(column: $table.baseCurrency, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get ownerId =>
      $composableBuilder(column: $table.ownerId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get joinCode =>
      $composableBuilder(column: $table.joinCode, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get destination =>
      $composableBuilder(column: $table.destination, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get stopsJson =>
      $composableBuilder(column: $table.stopsJson, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get checklistJson =>
      $composableBuilder(column: $table.checklistJson, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get notesJson =>
      $composableBuilder(column: $table.notesJson, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get passesJson =>
      $composableBuilder(column: $table.passesJson, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get fxConfigJson =>
      $composableBuilder(column: $table.fxConfigJson, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get memberRolesJson =>
      $composableBuilder(column: $table.memberRolesJson, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get simplifyDebts =>
      $composableBuilder(column: $table.simplifyDebts, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get archived =>
      $composableBuilder(column: $table.archived, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get frozen =>
      $composableBuilder(column: $table.frozen, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get closed =>
      $composableBuilder(column: $table.closed, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get domainJson =>
      $composableBuilder(column: $table.domainJson, builder: (column) => ColumnOrderings(column));
}

class $$TripsTableTableAnnotationComposer extends Composer<_$AppDatabase, $TripsTableTable> {
  $$TripsTableTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id => $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get name => $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<String> get startDate => $composableBuilder(column: $table.startDate, builder: (column) => column);

  GeneratedColumn<String> get endDate => $composableBuilder(column: $table.endDate, builder: (column) => column);

  GeneratedColumn<String> get baseCurrency =>
      $composableBuilder(column: $table.baseCurrency, builder: (column) => column);

  GeneratedColumn<String> get ownerId => $composableBuilder(column: $table.ownerId, builder: (column) => column);

  GeneratedColumn<String> get joinCode => $composableBuilder(column: $table.joinCode, builder: (column) => column);

  GeneratedColumn<String> get destination =>
      $composableBuilder(column: $table.destination, builder: (column) => column);

  GeneratedColumn<String> get stopsJson => $composableBuilder(column: $table.stopsJson, builder: (column) => column);

  GeneratedColumn<String> get checklistJson =>
      $composableBuilder(column: $table.checklistJson, builder: (column) => column);

  GeneratedColumn<String> get notesJson => $composableBuilder(column: $table.notesJson, builder: (column) => column);

  GeneratedColumn<String> get passesJson => $composableBuilder(column: $table.passesJson, builder: (column) => column);

  GeneratedColumn<String> get fxConfigJson =>
      $composableBuilder(column: $table.fxConfigJson, builder: (column) => column);

  GeneratedColumn<String> get memberRolesJson =>
      $composableBuilder(column: $table.memberRolesJson, builder: (column) => column);

  GeneratedColumn<bool> get simplifyDebts =>
      $composableBuilder(column: $table.simplifyDebts, builder: (column) => column);

  GeneratedColumn<bool> get archived => $composableBuilder(column: $table.archived, builder: (column) => column);

  GeneratedColumn<bool> get frozen => $composableBuilder(column: $table.frozen, builder: (column) => column);

  GeneratedColumn<bool> get closed => $composableBuilder(column: $table.closed, builder: (column) => column);

  GeneratedColumn<String> get createdAt => $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<String> get updatedAt => $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumn<String> get domainJson => $composableBuilder(column: $table.domainJson, builder: (column) => column);
}

class $$TripsTableTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $TripsTableTable,
          TripEntry,
          $$TripsTableTableFilterComposer,
          $$TripsTableTableOrderingComposer,
          $$TripsTableTableAnnotationComposer,
          $$TripsTableTableCreateCompanionBuilder,
          $$TripsTableTableUpdateCompanionBuilder,
          (TripEntry, BaseReferences<_$AppDatabase, $TripsTableTable, TripEntry>),
          TripEntry,
          PrefetchHooks Function()
        > {
  $$TripsTableTableTableManager(_$AppDatabase db, $TripsTableTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () => $$TripsTableTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () => $$TripsTableTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () => $$TripsTableTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> name = const Value.absent(),
                Value<String> startDate = const Value.absent(),
                Value<String> endDate = const Value.absent(),
                Value<String> baseCurrency = const Value.absent(),
                Value<String> ownerId = const Value.absent(),
                Value<String?> joinCode = const Value.absent(),
                Value<String?> destination = const Value.absent(),
                Value<String?> stopsJson = const Value.absent(),
                Value<String?> checklistJson = const Value.absent(),
                Value<String?> notesJson = const Value.absent(),
                Value<String?> passesJson = const Value.absent(),
                Value<String?> fxConfigJson = const Value.absent(),
                Value<String?> memberRolesJson = const Value.absent(),
                Value<bool> simplifyDebts = const Value.absent(),
                Value<bool> archived = const Value.absent(),
                Value<bool> frozen = const Value.absent(),
                Value<bool> closed = const Value.absent(),
                Value<String?> createdAt = const Value.absent(),
                Value<String?> updatedAt = const Value.absent(),
                Value<String?> domainJson = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => TripsTableCompanion(
                id: id,
                name: name,
                startDate: startDate,
                endDate: endDate,
                baseCurrency: baseCurrency,
                ownerId: ownerId,
                joinCode: joinCode,
                destination: destination,
                stopsJson: stopsJson,
                checklistJson: checklistJson,
                notesJson: notesJson,
                passesJson: passesJson,
                fxConfigJson: fxConfigJson,
                memberRolesJson: memberRolesJson,
                simplifyDebts: simplifyDebts,
                archived: archived,
                frozen: frozen,
                closed: closed,
                createdAt: createdAt,
                updatedAt: updatedAt,
                domainJson: domainJson,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String name,
                required String startDate,
                required String endDate,
                required String baseCurrency,
                required String ownerId,
                Value<String?> joinCode = const Value.absent(),
                Value<String?> destination = const Value.absent(),
                Value<String?> stopsJson = const Value.absent(),
                Value<String?> checklistJson = const Value.absent(),
                Value<String?> notesJson = const Value.absent(),
                Value<String?> passesJson = const Value.absent(),
                Value<String?> fxConfigJson = const Value.absent(),
                Value<String?> memberRolesJson = const Value.absent(),
                Value<bool> simplifyDebts = const Value.absent(),
                Value<bool> archived = const Value.absent(),
                Value<bool> frozen = const Value.absent(),
                Value<bool> closed = const Value.absent(),
                Value<String?> createdAt = const Value.absent(),
                Value<String?> updatedAt = const Value.absent(),
                Value<String?> domainJson = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => TripsTableCompanion.insert(
                id: id,
                name: name,
                startDate: startDate,
                endDate: endDate,
                baseCurrency: baseCurrency,
                ownerId: ownerId,
                joinCode: joinCode,
                destination: destination,
                stopsJson: stopsJson,
                checklistJson: checklistJson,
                notesJson: notesJson,
                passesJson: passesJson,
                fxConfigJson: fxConfigJson,
                memberRolesJson: memberRolesJson,
                simplifyDebts: simplifyDebts,
                archived: archived,
                frozen: frozen,
                closed: closed,
                createdAt: createdAt,
                updatedAt: updatedAt,
                domainJson: domainJson,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable<$TripsTableTable, TripEntry>(table),
                  BaseReferences<_$AppDatabase, $TripsTableTable, TripEntry>(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$TripsTableTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $TripsTableTable,
      TripEntry,
      $$TripsTableTableFilterComposer,
      $$TripsTableTableOrderingComposer,
      $$TripsTableTableAnnotationComposer,
      $$TripsTableTableCreateCompanionBuilder,
      $$TripsTableTableUpdateCompanionBuilder,
      (TripEntry, BaseReferences<_$AppDatabase, $TripsTableTable, TripEntry>),
      TripEntry,
      PrefetchHooks Function()
    >;
typedef $$MembersTableTableCreateCompanionBuilder = MembersTableCompanion Function({
  required String id,
  required String tripId,
  required String name,
  Value<String?> linkedUserId,
  Value<bool> archived,
  Value<String?> joinDate,
  Value<String?> leaveDate,
  Value<String?> createdAt,
  Value<int> rowid,
});
typedef $$MembersTableTableUpdateCompanionBuilder = MembersTableCompanion Function({
  Value<String> id,
  Value<String> tripId,
  Value<String> name,
  Value<String?> linkedUserId,
  Value<bool> archived,
  Value<String?> joinDate,
  Value<String?> leaveDate,
  Value<String?> createdAt,
  Value<int> rowid,
});

class $$MembersTableTableFilterComposer extends Composer<_$AppDatabase, $MembersTableTable> {
  $$MembersTableTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get tripId =>
      $composableBuilder(column: $table.tripId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get name => $composableBuilder(column: $table.name, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get linkedUserId =>
      $composableBuilder(column: $table.linkedUserId, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get archived =>
      $composableBuilder(column: $table.archived, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get joinDate =>
      $composableBuilder(column: $table.joinDate, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get leaveDate =>
      $composableBuilder(column: $table.leaveDate, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => ColumnFilters(column));
}

class $$MembersTableTableOrderingComposer extends Composer<_$AppDatabase, $MembersTableTable> {
  $$MembersTableTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get tripId =>
      $composableBuilder(column: $table.tripId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get linkedUserId =>
      $composableBuilder(column: $table.linkedUserId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get archived =>
      $composableBuilder(column: $table.archived, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get joinDate =>
      $composableBuilder(column: $table.joinDate, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get leaveDate =>
      $composableBuilder(column: $table.leaveDate, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => ColumnOrderings(column));
}

class $$MembersTableTableAnnotationComposer extends Composer<_$AppDatabase, $MembersTableTable> {
  $$MembersTableTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id => $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get tripId => $composableBuilder(column: $table.tripId, builder: (column) => column);

  GeneratedColumn<String> get name => $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<String> get linkedUserId =>
      $composableBuilder(column: $table.linkedUserId, builder: (column) => column);

  GeneratedColumn<bool> get archived => $composableBuilder(column: $table.archived, builder: (column) => column);

  GeneratedColumn<String> get joinDate => $composableBuilder(column: $table.joinDate, builder: (column) => column);

  GeneratedColumn<String> get leaveDate => $composableBuilder(column: $table.leaveDate, builder: (column) => column);

  GeneratedColumn<String> get createdAt => $composableBuilder(column: $table.createdAt, builder: (column) => column);
}

class $$MembersTableTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $MembersTableTable,
          MemberEntry,
          $$MembersTableTableFilterComposer,
          $$MembersTableTableOrderingComposer,
          $$MembersTableTableAnnotationComposer,
          $$MembersTableTableCreateCompanionBuilder,
          $$MembersTableTableUpdateCompanionBuilder,
          (MemberEntry, BaseReferences<_$AppDatabase, $MembersTableTable, MemberEntry>),
          MemberEntry,
          PrefetchHooks Function()
        > {
  $$MembersTableTableTableManager(_$AppDatabase db, $MembersTableTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () => $$MembersTableTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () => $$MembersTableTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () => $$MembersTableTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> tripId = const Value.absent(),
                Value<String> name = const Value.absent(),
                Value<String?> linkedUserId = const Value.absent(),
                Value<bool> archived = const Value.absent(),
                Value<String?> joinDate = const Value.absent(),
                Value<String?> leaveDate = const Value.absent(),
                Value<String?> createdAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => MembersTableCompanion(
                id: id,
                tripId: tripId,
                name: name,
                linkedUserId: linkedUserId,
                archived: archived,
                joinDate: joinDate,
                leaveDate: leaveDate,
                createdAt: createdAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String tripId,
                required String name,
                Value<String?> linkedUserId = const Value.absent(),
                Value<bool> archived = const Value.absent(),
                Value<String?> joinDate = const Value.absent(),
                Value<String?> leaveDate = const Value.absent(),
                Value<String?> createdAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => MembersTableCompanion.insert(
                id: id,
                tripId: tripId,
                name: name,
                linkedUserId: linkedUserId,
                archived: archived,
                joinDate: joinDate,
                leaveDate: leaveDate,
                createdAt: createdAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable<$MembersTableTable, MemberEntry>(table),
                  BaseReferences<_$AppDatabase, $MembersTableTable, MemberEntry>(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$MembersTableTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $MembersTableTable,
      MemberEntry,
      $$MembersTableTableFilterComposer,
      $$MembersTableTableOrderingComposer,
      $$MembersTableTableAnnotationComposer,
      $$MembersTableTableCreateCompanionBuilder,
      $$MembersTableTableUpdateCompanionBuilder,
      (MemberEntry, BaseReferences<_$AppDatabase, $MembersTableTable, MemberEntry>),
      MemberEntry,
      PrefetchHooks Function()
    >;
typedef $$GroupsTableTableCreateCompanionBuilder = GroupsTableCompanion Function({
  required String id,
  required String tripId,
  required String name,
  Value<String?> createdAt,
  Value<String?> updatedAt,
  Value<int> rowid,
});
typedef $$GroupsTableTableUpdateCompanionBuilder = GroupsTableCompanion Function({
  Value<String> id,
  Value<String> tripId,
  Value<String> name,
  Value<String?> createdAt,
  Value<String?> updatedAt,
  Value<int> rowid,
});

class $$GroupsTableTableFilterComposer extends Composer<_$AppDatabase, $GroupsTableTable> {
  $$GroupsTableTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get tripId =>
      $composableBuilder(column: $table.tripId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get name => $composableBuilder(column: $table.name, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => ColumnFilters(column));
}

class $$GroupsTableTableOrderingComposer extends Composer<_$AppDatabase, $GroupsTableTable> {
  $$GroupsTableTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get tripId =>
      $composableBuilder(column: $table.tripId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => ColumnOrderings(column));
}

class $$GroupsTableTableAnnotationComposer extends Composer<_$AppDatabase, $GroupsTableTable> {
  $$GroupsTableTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id => $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get tripId => $composableBuilder(column: $table.tripId, builder: (column) => column);

  GeneratedColumn<String> get name => $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<String> get createdAt => $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<String> get updatedAt => $composableBuilder(column: $table.updatedAt, builder: (column) => column);
}

class $$GroupsTableTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $GroupsTableTable,
          GroupEntry,
          $$GroupsTableTableFilterComposer,
          $$GroupsTableTableOrderingComposer,
          $$GroupsTableTableAnnotationComposer,
          $$GroupsTableTableCreateCompanionBuilder,
          $$GroupsTableTableUpdateCompanionBuilder,
          (GroupEntry, BaseReferences<_$AppDatabase, $GroupsTableTable, GroupEntry>),
          GroupEntry,
          PrefetchHooks Function()
        > {
  $$GroupsTableTableTableManager(_$AppDatabase db, $GroupsTableTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () => $$GroupsTableTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () => $$GroupsTableTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () => $$GroupsTableTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> tripId = const Value.absent(),
                Value<String> name = const Value.absent(),
                Value<String?> createdAt = const Value.absent(),
                Value<String?> updatedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => GroupsTableCompanion(
                id: id,
                tripId: tripId,
                name: name,
                createdAt: createdAt,
                updatedAt: updatedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String tripId,
                required String name,
                Value<String?> createdAt = const Value.absent(),
                Value<String?> updatedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => GroupsTableCompanion.insert(
                id: id,
                tripId: tripId,
                name: name,
                createdAt: createdAt,
                updatedAt: updatedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable<$GroupsTableTable, GroupEntry>(table),
                  BaseReferences<_$AppDatabase, $GroupsTableTable, GroupEntry>(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$GroupsTableTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $GroupsTableTable,
      GroupEntry,
      $$GroupsTableTableFilterComposer,
      $$GroupsTableTableOrderingComposer,
      $$GroupsTableTableAnnotationComposer,
      $$GroupsTableTableCreateCompanionBuilder,
      $$GroupsTableTableUpdateCompanionBuilder,
      (GroupEntry, BaseReferences<_$AppDatabase, $GroupsTableTable, GroupEntry>),
      GroupEntry,
      PrefetchHooks Function()
    >;
typedef $$GroupMembersTableTableCreateCompanionBuilder = GroupMembersTableCompanion Function({
  required String groupId,
  required String memberId,
  Value<int> rowid,
});
typedef $$GroupMembersTableTableUpdateCompanionBuilder = GroupMembersTableCompanion Function({
  Value<String> groupId,
  Value<String> memberId,
  Value<int> rowid,
});

class $$GroupMembersTableTableFilterComposer extends Composer<_$AppDatabase, $GroupMembersTableTable> {
  $$GroupMembersTableTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get groupId =>
      $composableBuilder(column: $table.groupId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get memberId =>
      $composableBuilder(column: $table.memberId, builder: (column) => ColumnFilters(column));
}

class $$GroupMembersTableTableOrderingComposer extends Composer<_$AppDatabase, $GroupMembersTableTable> {
  $$GroupMembersTableTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get groupId =>
      $composableBuilder(column: $table.groupId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get memberId =>
      $composableBuilder(column: $table.memberId, builder: (column) => ColumnOrderings(column));
}

class $$GroupMembersTableTableAnnotationComposer extends Composer<_$AppDatabase, $GroupMembersTableTable> {
  $$GroupMembersTableTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get groupId => $composableBuilder(column: $table.groupId, builder: (column) => column);

  GeneratedColumn<String> get memberId => $composableBuilder(column: $table.memberId, builder: (column) => column);
}

class $$GroupMembersTableTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $GroupMembersTableTable,
          GroupMemberEntry,
          $$GroupMembersTableTableFilterComposer,
          $$GroupMembersTableTableOrderingComposer,
          $$GroupMembersTableTableAnnotationComposer,
          $$GroupMembersTableTableCreateCompanionBuilder,
          $$GroupMembersTableTableUpdateCompanionBuilder,
          (GroupMemberEntry, BaseReferences<_$AppDatabase, $GroupMembersTableTable, GroupMemberEntry>),
          GroupMemberEntry,
          PrefetchHooks Function()
        > {
  $$GroupMembersTableTableTableManager(_$AppDatabase db, $GroupMembersTableTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () => $$GroupMembersTableTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () => $$GroupMembersTableTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () => $$GroupMembersTableTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> groupId = const Value.absent(),
            Value<String> memberId = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) => GroupMembersTableCompanion(groupId: groupId, memberId: memberId, rowid: rowid),
          createCompanionCallback: ({
            required String groupId,
            required String memberId,
            Value<int> rowid = const Value.absent(),
          }) => GroupMembersTableCompanion.insert(groupId: groupId, memberId: memberId, rowid: rowid),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable<$GroupMembersTableTable, GroupMemberEntry>(table),
                  BaseReferences<_$AppDatabase, $GroupMembersTableTable, GroupMemberEntry>(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$GroupMembersTableTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $GroupMembersTableTable,
      GroupMemberEntry,
      $$GroupMembersTableTableFilterComposer,
      $$GroupMembersTableTableOrderingComposer,
      $$GroupMembersTableTableAnnotationComposer,
      $$GroupMembersTableTableCreateCompanionBuilder,
      $$GroupMembersTableTableUpdateCompanionBuilder,
      (GroupMemberEntry, BaseReferences<_$AppDatabase, $GroupMembersTableTable, GroupMemberEntry>),
      GroupMemberEntry,
      PrefetchHooks Function()
    >;
typedef $$CategoriesTableTableCreateCompanionBuilder = CategoriesTableCompanion Function({
  required String id,
  Value<String?> tripId,
  required String name,
  Value<String?> icon,
  Value<bool> isCustom,
  Value<String?> createdAt,
  Value<String?> updatedAt,
  Value<int> rowid,
});
typedef $$CategoriesTableTableUpdateCompanionBuilder = CategoriesTableCompanion Function({
  Value<String> id,
  Value<String?> tripId,
  Value<String> name,
  Value<String?> icon,
  Value<bool> isCustom,
  Value<String?> createdAt,
  Value<String?> updatedAt,
  Value<int> rowid,
});

class $$CategoriesTableTableFilterComposer extends Composer<_$AppDatabase, $CategoriesTableTable> {
  $$CategoriesTableTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get tripId =>
      $composableBuilder(column: $table.tripId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get name => $composableBuilder(column: $table.name, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get icon => $composableBuilder(column: $table.icon, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isCustom =>
      $composableBuilder(column: $table.isCustom, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => ColumnFilters(column));
}

class $$CategoriesTableTableOrderingComposer extends Composer<_$AppDatabase, $CategoriesTableTable> {
  $$CategoriesTableTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get tripId =>
      $composableBuilder(column: $table.tripId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get icon =>
      $composableBuilder(column: $table.icon, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isCustom =>
      $composableBuilder(column: $table.isCustom, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => ColumnOrderings(column));
}

class $$CategoriesTableTableAnnotationComposer extends Composer<_$AppDatabase, $CategoriesTableTable> {
  $$CategoriesTableTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id => $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get tripId => $composableBuilder(column: $table.tripId, builder: (column) => column);

  GeneratedColumn<String> get name => $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<String> get icon => $composableBuilder(column: $table.icon, builder: (column) => column);

  GeneratedColumn<bool> get isCustom => $composableBuilder(column: $table.isCustom, builder: (column) => column);

  GeneratedColumn<String> get createdAt => $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<String> get updatedAt => $composableBuilder(column: $table.updatedAt, builder: (column) => column);
}

class $$CategoriesTableTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $CategoriesTableTable,
          CategoryEntry,
          $$CategoriesTableTableFilterComposer,
          $$CategoriesTableTableOrderingComposer,
          $$CategoriesTableTableAnnotationComposer,
          $$CategoriesTableTableCreateCompanionBuilder,
          $$CategoriesTableTableUpdateCompanionBuilder,
          (CategoryEntry, BaseReferences<_$AppDatabase, $CategoriesTableTable, CategoryEntry>),
          CategoryEntry,
          PrefetchHooks Function()
        > {
  $$CategoriesTableTableTableManager(_$AppDatabase db, $CategoriesTableTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () => $$CategoriesTableTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () => $$CategoriesTableTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () => $$CategoriesTableTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String?> tripId = const Value.absent(),
                Value<String> name = const Value.absent(),
                Value<String?> icon = const Value.absent(),
                Value<bool> isCustom = const Value.absent(),
                Value<String?> createdAt = const Value.absent(),
                Value<String?> updatedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CategoriesTableCompanion(
                id: id,
                tripId: tripId,
                name: name,
                icon: icon,
                isCustom: isCustom,
                createdAt: createdAt,
                updatedAt: updatedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                Value<String?> tripId = const Value.absent(),
                required String name,
                Value<String?> icon = const Value.absent(),
                Value<bool> isCustom = const Value.absent(),
                Value<String?> createdAt = const Value.absent(),
                Value<String?> updatedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CategoriesTableCompanion.insert(
                id: id,
                tripId: tripId,
                name: name,
                icon: icon,
                isCustom: isCustom,
                createdAt: createdAt,
                updatedAt: updatedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable<$CategoriesTableTable, CategoryEntry>(table),
                  BaseReferences<_$AppDatabase, $CategoriesTableTable, CategoryEntry>(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$CategoriesTableTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $CategoriesTableTable,
      CategoryEntry,
      $$CategoriesTableTableFilterComposer,
      $$CategoriesTableTableOrderingComposer,
      $$CategoriesTableTableAnnotationComposer,
      $$CategoriesTableTableCreateCompanionBuilder,
      $$CategoriesTableTableUpdateCompanionBuilder,
      (CategoryEntry, BaseReferences<_$AppDatabase, $CategoriesTableTable, CategoryEntry>),
      CategoryEntry,
      PrefetchHooks Function()
    >;
typedef $$ExpensesTableTableCreateCompanionBuilder = ExpensesTableCompanion Function({
  required String id,
  required String tripId,
  required String title,
  required double amount,
  required String currency,
  Value<String?> categoryId,
  required String paidByMemberId,
  required String splitMode,
  Value<String?> splitDataJson,
  required String date,
  Value<String?> receiptUrl,
  Value<String?> notes,
  Value<bool> isReimbursement,
  Value<String?> reimbursementToMemberId,
  Value<bool> archived,
  Value<String?> recycledAt,
  Value<String?> payerWeightsJson,
  Value<double?> exchangeRate,
  Value<String?> disputeStatus,
  Value<String?> disputeNote,
  Value<String?> disputedByMemberId,
  Value<bool> settlementConfirmed,
  Value<String?> settlementConfirmedAt,
  Value<String?> approvalStatus,
  Value<String?> approvedByMemberId,
  Value<String?> approvedAt,
  Value<String?> createdAt,
  Value<String?> updatedAt,
  Value<String?> domainJson,
  Value<int> rowid,
});
typedef $$ExpensesTableTableUpdateCompanionBuilder = ExpensesTableCompanion Function({
  Value<String> id,
  Value<String> tripId,
  Value<String> title,
  Value<double> amount,
  Value<String> currency,
  Value<String?> categoryId,
  Value<String> paidByMemberId,
  Value<String> splitMode,
  Value<String?> splitDataJson,
  Value<String> date,
  Value<String?> receiptUrl,
  Value<String?> notes,
  Value<bool> isReimbursement,
  Value<String?> reimbursementToMemberId,
  Value<bool> archived,
  Value<String?> recycledAt,
  Value<String?> payerWeightsJson,
  Value<double?> exchangeRate,
  Value<String?> disputeStatus,
  Value<String?> disputeNote,
  Value<String?> disputedByMemberId,
  Value<bool> settlementConfirmed,
  Value<String?> settlementConfirmedAt,
  Value<String?> approvalStatus,
  Value<String?> approvedByMemberId,
  Value<String?> approvedAt,
  Value<String?> createdAt,
  Value<String?> updatedAt,
  Value<String?> domainJson,
  Value<int> rowid,
});

class $$ExpensesTableTableFilterComposer extends Composer<_$AppDatabase, $ExpensesTableTable> {
  $$ExpensesTableTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get tripId =>
      $composableBuilder(column: $table.tripId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get title =>
      $composableBuilder(column: $table.title, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get amount =>
      $composableBuilder(column: $table.amount, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get currency =>
      $composableBuilder(column: $table.currency, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get categoryId =>
      $composableBuilder(column: $table.categoryId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get paidByMemberId =>
      $composableBuilder(column: $table.paidByMemberId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get splitMode =>
      $composableBuilder(column: $table.splitMode, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get splitDataJson =>
      $composableBuilder(column: $table.splitDataJson, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get date => $composableBuilder(column: $table.date, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get receiptUrl =>
      $composableBuilder(column: $table.receiptUrl, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get notes =>
      $composableBuilder(column: $table.notes, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isReimbursement =>
      $composableBuilder(column: $table.isReimbursement, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get reimbursementToMemberId =>
      $composableBuilder(column: $table.reimbursementToMemberId, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get archived =>
      $composableBuilder(column: $table.archived, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get recycledAt =>
      $composableBuilder(column: $table.recycledAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get payerWeightsJson =>
      $composableBuilder(column: $table.payerWeightsJson, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get exchangeRate =>
      $composableBuilder(column: $table.exchangeRate, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get disputeStatus =>
      $composableBuilder(column: $table.disputeStatus, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get disputeNote =>
      $composableBuilder(column: $table.disputeNote, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get disputedByMemberId =>
      $composableBuilder(column: $table.disputedByMemberId, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get settlementConfirmed =>
      $composableBuilder(column: $table.settlementConfirmed, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get settlementConfirmedAt =>
      $composableBuilder(column: $table.settlementConfirmedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get approvalStatus =>
      $composableBuilder(column: $table.approvalStatus, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get approvedByMemberId =>
      $composableBuilder(column: $table.approvedByMemberId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get approvedAt =>
      $composableBuilder(column: $table.approvedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get domainJson =>
      $composableBuilder(column: $table.domainJson, builder: (column) => ColumnFilters(column));
}

class $$ExpensesTableTableOrderingComposer extends Composer<_$AppDatabase, $ExpensesTableTable> {
  $$ExpensesTableTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get tripId =>
      $composableBuilder(column: $table.tripId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get title =>
      $composableBuilder(column: $table.title, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get amount =>
      $composableBuilder(column: $table.amount, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get currency =>
      $composableBuilder(column: $table.currency, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get categoryId =>
      $composableBuilder(column: $table.categoryId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get paidByMemberId =>
      $composableBuilder(column: $table.paidByMemberId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get splitMode =>
      $composableBuilder(column: $table.splitMode, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get splitDataJson =>
      $composableBuilder(column: $table.splitDataJson, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get date =>
      $composableBuilder(column: $table.date, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get receiptUrl =>
      $composableBuilder(column: $table.receiptUrl, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get notes =>
      $composableBuilder(column: $table.notes, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isReimbursement =>
      $composableBuilder(column: $table.isReimbursement, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get reimbursementToMemberId =>
      $composableBuilder(column: $table.reimbursementToMemberId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get archived =>
      $composableBuilder(column: $table.archived, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get recycledAt =>
      $composableBuilder(column: $table.recycledAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get payerWeightsJson =>
      $composableBuilder(column: $table.payerWeightsJson, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get exchangeRate =>
      $composableBuilder(column: $table.exchangeRate, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get disputeStatus =>
      $composableBuilder(column: $table.disputeStatus, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get disputeNote =>
      $composableBuilder(column: $table.disputeNote, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get disputedByMemberId =>
      $composableBuilder(column: $table.disputedByMemberId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get settlementConfirmed =>
      $composableBuilder(column: $table.settlementConfirmed, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get settlementConfirmedAt =>
      $composableBuilder(column: $table.settlementConfirmedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get approvalStatus =>
      $composableBuilder(column: $table.approvalStatus, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get approvedByMemberId =>
      $composableBuilder(column: $table.approvedByMemberId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get approvedAt =>
      $composableBuilder(column: $table.approvedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get domainJson =>
      $composableBuilder(column: $table.domainJson, builder: (column) => ColumnOrderings(column));
}

class $$ExpensesTableTableAnnotationComposer extends Composer<_$AppDatabase, $ExpensesTableTable> {
  $$ExpensesTableTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id => $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get tripId => $composableBuilder(column: $table.tripId, builder: (column) => column);

  GeneratedColumn<String> get title => $composableBuilder(column: $table.title, builder: (column) => column);

  GeneratedColumn<double> get amount => $composableBuilder(column: $table.amount, builder: (column) => column);

  GeneratedColumn<String> get currency => $composableBuilder(column: $table.currency, builder: (column) => column);

  GeneratedColumn<String> get categoryId => $composableBuilder(column: $table.categoryId, builder: (column) => column);

  GeneratedColumn<String> get paidByMemberId =>
      $composableBuilder(column: $table.paidByMemberId, builder: (column) => column);

  GeneratedColumn<String> get splitMode => $composableBuilder(column: $table.splitMode, builder: (column) => column);

  GeneratedColumn<String> get splitDataJson =>
      $composableBuilder(column: $table.splitDataJson, builder: (column) => column);

  GeneratedColumn<String> get date => $composableBuilder(column: $table.date, builder: (column) => column);

  GeneratedColumn<String> get receiptUrl => $composableBuilder(column: $table.receiptUrl, builder: (column) => column);

  GeneratedColumn<String> get notes => $composableBuilder(column: $table.notes, builder: (column) => column);

  GeneratedColumn<bool> get isReimbursement =>
      $composableBuilder(column: $table.isReimbursement, builder: (column) => column);

  GeneratedColumn<String> get reimbursementToMemberId =>
      $composableBuilder(column: $table.reimbursementToMemberId, builder: (column) => column);

  GeneratedColumn<bool> get archived => $composableBuilder(column: $table.archived, builder: (column) => column);

  GeneratedColumn<String> get recycledAt => $composableBuilder(column: $table.recycledAt, builder: (column) => column);

  GeneratedColumn<String> get payerWeightsJson =>
      $composableBuilder(column: $table.payerWeightsJson, builder: (column) => column);

  GeneratedColumn<double> get exchangeRate =>
      $composableBuilder(column: $table.exchangeRate, builder: (column) => column);

  GeneratedColumn<String> get disputeStatus =>
      $composableBuilder(column: $table.disputeStatus, builder: (column) => column);

  GeneratedColumn<String> get disputeNote =>
      $composableBuilder(column: $table.disputeNote, builder: (column) => column);

  GeneratedColumn<String> get disputedByMemberId =>
      $composableBuilder(column: $table.disputedByMemberId, builder: (column) => column);

  GeneratedColumn<bool> get settlementConfirmed =>
      $composableBuilder(column: $table.settlementConfirmed, builder: (column) => column);

  GeneratedColumn<String> get settlementConfirmedAt =>
      $composableBuilder(column: $table.settlementConfirmedAt, builder: (column) => column);

  GeneratedColumn<String> get approvalStatus =>
      $composableBuilder(column: $table.approvalStatus, builder: (column) => column);

  GeneratedColumn<String> get approvedByMemberId =>
      $composableBuilder(column: $table.approvedByMemberId, builder: (column) => column);

  GeneratedColumn<String> get approvedAt => $composableBuilder(column: $table.approvedAt, builder: (column) => column);

  GeneratedColumn<String> get createdAt => $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<String> get updatedAt => $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumn<String> get domainJson => $composableBuilder(column: $table.domainJson, builder: (column) => column);
}

class $$ExpensesTableTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $ExpensesTableTable,
          ExpenseEntry,
          $$ExpensesTableTableFilterComposer,
          $$ExpensesTableTableOrderingComposer,
          $$ExpensesTableTableAnnotationComposer,
          $$ExpensesTableTableCreateCompanionBuilder,
          $$ExpensesTableTableUpdateCompanionBuilder,
          (ExpenseEntry, BaseReferences<_$AppDatabase, $ExpensesTableTable, ExpenseEntry>),
          ExpenseEntry,
          PrefetchHooks Function()
        > {
  $$ExpensesTableTableTableManager(_$AppDatabase db, $ExpensesTableTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () => $$ExpensesTableTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () => $$ExpensesTableTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () => $$ExpensesTableTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> tripId = const Value.absent(),
                Value<String> title = const Value.absent(),
                Value<double> amount = const Value.absent(),
                Value<String> currency = const Value.absent(),
                Value<String?> categoryId = const Value.absent(),
                Value<String> paidByMemberId = const Value.absent(),
                Value<String> splitMode = const Value.absent(),
                Value<String?> splitDataJson = const Value.absent(),
                Value<String> date = const Value.absent(),
                Value<String?> receiptUrl = const Value.absent(),
                Value<String?> notes = const Value.absent(),
                Value<bool> isReimbursement = const Value.absent(),
                Value<String?> reimbursementToMemberId = const Value.absent(),
                Value<bool> archived = const Value.absent(),
                Value<String?> recycledAt = const Value.absent(),
                Value<String?> payerWeightsJson = const Value.absent(),
                Value<double?> exchangeRate = const Value.absent(),
                Value<String?> disputeStatus = const Value.absent(),
                Value<String?> disputeNote = const Value.absent(),
                Value<String?> disputedByMemberId = const Value.absent(),
                Value<bool> settlementConfirmed = const Value.absent(),
                Value<String?> settlementConfirmedAt = const Value.absent(),
                Value<String?> approvalStatus = const Value.absent(),
                Value<String?> approvedByMemberId = const Value.absent(),
                Value<String?> approvedAt = const Value.absent(),
                Value<String?> createdAt = const Value.absent(),
                Value<String?> updatedAt = const Value.absent(),
                Value<String?> domainJson = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => ExpensesTableCompanion(
                id: id,
                tripId: tripId,
                title: title,
                amount: amount,
                currency: currency,
                categoryId: categoryId,
                paidByMemberId: paidByMemberId,
                splitMode: splitMode,
                splitDataJson: splitDataJson,
                date: date,
                receiptUrl: receiptUrl,
                notes: notes,
                isReimbursement: isReimbursement,
                reimbursementToMemberId: reimbursementToMemberId,
                archived: archived,
                recycledAt: recycledAt,
                payerWeightsJson: payerWeightsJson,
                exchangeRate: exchangeRate,
                disputeStatus: disputeStatus,
                disputeNote: disputeNote,
                disputedByMemberId: disputedByMemberId,
                settlementConfirmed: settlementConfirmed,
                settlementConfirmedAt: settlementConfirmedAt,
                approvalStatus: approvalStatus,
                approvedByMemberId: approvedByMemberId,
                approvedAt: approvedAt,
                createdAt: createdAt,
                updatedAt: updatedAt,
                domainJson: domainJson,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String tripId,
                required String title,
                required double amount,
                required String currency,
                Value<String?> categoryId = const Value.absent(),
                required String paidByMemberId,
                required String splitMode,
                Value<String?> splitDataJson = const Value.absent(),
                required String date,
                Value<String?> receiptUrl = const Value.absent(),
                Value<String?> notes = const Value.absent(),
                Value<bool> isReimbursement = const Value.absent(),
                Value<String?> reimbursementToMemberId = const Value.absent(),
                Value<bool> archived = const Value.absent(),
                Value<String?> recycledAt = const Value.absent(),
                Value<String?> payerWeightsJson = const Value.absent(),
                Value<double?> exchangeRate = const Value.absent(),
                Value<String?> disputeStatus = const Value.absent(),
                Value<String?> disputeNote = const Value.absent(),
                Value<String?> disputedByMemberId = const Value.absent(),
                Value<bool> settlementConfirmed = const Value.absent(),
                Value<String?> settlementConfirmedAt = const Value.absent(),
                Value<String?> approvalStatus = const Value.absent(),
                Value<String?> approvedByMemberId = const Value.absent(),
                Value<String?> approvedAt = const Value.absent(),
                Value<String?> createdAt = const Value.absent(),
                Value<String?> updatedAt = const Value.absent(),
                Value<String?> domainJson = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => ExpensesTableCompanion.insert(
                id: id,
                tripId: tripId,
                title: title,
                amount: amount,
                currency: currency,
                categoryId: categoryId,
                paidByMemberId: paidByMemberId,
                splitMode: splitMode,
                splitDataJson: splitDataJson,
                date: date,
                receiptUrl: receiptUrl,
                notes: notes,
                isReimbursement: isReimbursement,
                reimbursementToMemberId: reimbursementToMemberId,
                archived: archived,
                recycledAt: recycledAt,
                payerWeightsJson: payerWeightsJson,
                exchangeRate: exchangeRate,
                disputeStatus: disputeStatus,
                disputeNote: disputeNote,
                disputedByMemberId: disputedByMemberId,
                settlementConfirmed: settlementConfirmed,
                settlementConfirmedAt: settlementConfirmedAt,
                approvalStatus: approvalStatus,
                approvedByMemberId: approvedByMemberId,
                approvedAt: approvedAt,
                createdAt: createdAt,
                updatedAt: updatedAt,
                domainJson: domainJson,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable<$ExpensesTableTable, ExpenseEntry>(table),
                  BaseReferences<_$AppDatabase, $ExpensesTableTable, ExpenseEntry>(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$ExpensesTableTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $ExpensesTableTable,
      ExpenseEntry,
      $$ExpensesTableTableFilterComposer,
      $$ExpensesTableTableOrderingComposer,
      $$ExpensesTableTableAnnotationComposer,
      $$ExpensesTableTableCreateCompanionBuilder,
      $$ExpensesTableTableUpdateCompanionBuilder,
      (ExpenseEntry, BaseReferences<_$AppDatabase, $ExpensesTableTable, ExpenseEntry>),
      ExpenseEntry,
      PrefetchHooks Function()
    >;
typedef $$TripMessagesTableTableCreateCompanionBuilder = TripMessagesTableCompanion Function({
  required String id,
  required String tripId,
  required String userId,
  required String senderName,
  required String kind,
  required String message,
  Value<String?> expensePayloadJson,
  required String createdAt,
  Value<String?> domainJson,
  Value<int> rowid,
});
typedef $$TripMessagesTableTableUpdateCompanionBuilder = TripMessagesTableCompanion Function({
  Value<String> id,
  Value<String> tripId,
  Value<String> userId,
  Value<String> senderName,
  Value<String> kind,
  Value<String> message,
  Value<String?> expensePayloadJson,
  Value<String> createdAt,
  Value<String?> domainJson,
  Value<int> rowid,
});

class $$TripMessagesTableTableFilterComposer extends Composer<_$AppDatabase, $TripMessagesTableTable> {
  $$TripMessagesTableTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get tripId =>
      $composableBuilder(column: $table.tripId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get userId =>
      $composableBuilder(column: $table.userId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get senderName =>
      $composableBuilder(column: $table.senderName, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get kind => $composableBuilder(column: $table.kind, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get message =>
      $composableBuilder(column: $table.message, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get expensePayloadJson =>
      $composableBuilder(column: $table.expensePayloadJson, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get domainJson =>
      $composableBuilder(column: $table.domainJson, builder: (column) => ColumnFilters(column));
}

class $$TripMessagesTableTableOrderingComposer extends Composer<_$AppDatabase, $TripMessagesTableTable> {
  $$TripMessagesTableTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get tripId =>
      $composableBuilder(column: $table.tripId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get userId =>
      $composableBuilder(column: $table.userId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get senderName =>
      $composableBuilder(column: $table.senderName, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get kind =>
      $composableBuilder(column: $table.kind, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get message =>
      $composableBuilder(column: $table.message, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get expensePayloadJson =>
      $composableBuilder(column: $table.expensePayloadJson, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get domainJson =>
      $composableBuilder(column: $table.domainJson, builder: (column) => ColumnOrderings(column));
}

class $$TripMessagesTableTableAnnotationComposer extends Composer<_$AppDatabase, $TripMessagesTableTable> {
  $$TripMessagesTableTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id => $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get tripId => $composableBuilder(column: $table.tripId, builder: (column) => column);

  GeneratedColumn<String> get userId => $composableBuilder(column: $table.userId, builder: (column) => column);

  GeneratedColumn<String> get senderName => $composableBuilder(column: $table.senderName, builder: (column) => column);

  GeneratedColumn<String> get kind => $composableBuilder(column: $table.kind, builder: (column) => column);

  GeneratedColumn<String> get message => $composableBuilder(column: $table.message, builder: (column) => column);

  GeneratedColumn<String> get expensePayloadJson =>
      $composableBuilder(column: $table.expensePayloadJson, builder: (column) => column);

  GeneratedColumn<String> get createdAt => $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<String> get domainJson => $composableBuilder(column: $table.domainJson, builder: (column) => column);
}

class $$TripMessagesTableTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $TripMessagesTableTable,
          TripMessageEntry,
          $$TripMessagesTableTableFilterComposer,
          $$TripMessagesTableTableOrderingComposer,
          $$TripMessagesTableTableAnnotationComposer,
          $$TripMessagesTableTableCreateCompanionBuilder,
          $$TripMessagesTableTableUpdateCompanionBuilder,
          (TripMessageEntry, BaseReferences<_$AppDatabase, $TripMessagesTableTable, TripMessageEntry>),
          TripMessageEntry,
          PrefetchHooks Function()
        > {
  $$TripMessagesTableTableTableManager(_$AppDatabase db, $TripMessagesTableTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () => $$TripMessagesTableTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () => $$TripMessagesTableTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () => $$TripMessagesTableTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> tripId = const Value.absent(),
                Value<String> userId = const Value.absent(),
                Value<String> senderName = const Value.absent(),
                Value<String> kind = const Value.absent(),
                Value<String> message = const Value.absent(),
                Value<String?> expensePayloadJson = const Value.absent(),
                Value<String> createdAt = const Value.absent(),
                Value<String?> domainJson = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => TripMessagesTableCompanion(
                id: id,
                tripId: tripId,
                userId: userId,
                senderName: senderName,
                kind: kind,
                message: message,
                expensePayloadJson: expensePayloadJson,
                createdAt: createdAt,
                domainJson: domainJson,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String tripId,
                required String userId,
                required String senderName,
                required String kind,
                required String message,
                Value<String?> expensePayloadJson = const Value.absent(),
                required String createdAt,
                Value<String?> domainJson = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => TripMessagesTableCompanion.insert(
                id: id,
                tripId: tripId,
                userId: userId,
                senderName: senderName,
                kind: kind,
                message: message,
                expensePayloadJson: expensePayloadJson,
                createdAt: createdAt,
                domainJson: domainJson,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable<$TripMessagesTableTable, TripMessageEntry>(table),
                  BaseReferences<_$AppDatabase, $TripMessagesTableTable, TripMessageEntry>(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$TripMessagesTableTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $TripMessagesTableTable,
      TripMessageEntry,
      $$TripMessagesTableTableFilterComposer,
      $$TripMessagesTableTableOrderingComposer,
      $$TripMessagesTableTableAnnotationComposer,
      $$TripMessagesTableTableCreateCompanionBuilder,
      $$TripMessagesTableTableUpdateCompanionBuilder,
      (TripMessageEntry, BaseReferences<_$AppDatabase, $TripMessagesTableTable, TripMessageEntry>),
      TripMessageEntry,
      PrefetchHooks Function()
    >;
typedef $$NotificationsTableTableCreateCompanionBuilder = NotificationsTableCompanion Function({
  required String id,
  required String userId,
  Value<String?> tripId,
  required String title,
  required String body,
  Value<String?> dataJson,
  Value<bool> read,
  required String createdAt,
  Value<int> rowid,
});
typedef $$NotificationsTableTableUpdateCompanionBuilder = NotificationsTableCompanion Function({
  Value<String> id,
  Value<String> userId,
  Value<String?> tripId,
  Value<String> title,
  Value<String> body,
  Value<String?> dataJson,
  Value<bool> read,
  Value<String> createdAt,
  Value<int> rowid,
});

class $$NotificationsTableTableFilterComposer extends Composer<_$AppDatabase, $NotificationsTableTable> {
  $$NotificationsTableTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get userId =>
      $composableBuilder(column: $table.userId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get tripId =>
      $composableBuilder(column: $table.tripId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get title =>
      $composableBuilder(column: $table.title, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get body => $composableBuilder(column: $table.body, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get dataJson =>
      $composableBuilder(column: $table.dataJson, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get read => $composableBuilder(column: $table.read, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => ColumnFilters(column));
}

class $$NotificationsTableTableOrderingComposer extends Composer<_$AppDatabase, $NotificationsTableTable> {
  $$NotificationsTableTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get userId =>
      $composableBuilder(column: $table.userId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get tripId =>
      $composableBuilder(column: $table.tripId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get title =>
      $composableBuilder(column: $table.title, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get body =>
      $composableBuilder(column: $table.body, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get dataJson =>
      $composableBuilder(column: $table.dataJson, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get read =>
      $composableBuilder(column: $table.read, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => ColumnOrderings(column));
}

class $$NotificationsTableTableAnnotationComposer extends Composer<_$AppDatabase, $NotificationsTableTable> {
  $$NotificationsTableTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id => $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get userId => $composableBuilder(column: $table.userId, builder: (column) => column);

  GeneratedColumn<String> get tripId => $composableBuilder(column: $table.tripId, builder: (column) => column);

  GeneratedColumn<String> get title => $composableBuilder(column: $table.title, builder: (column) => column);

  GeneratedColumn<String> get body => $composableBuilder(column: $table.body, builder: (column) => column);

  GeneratedColumn<String> get dataJson => $composableBuilder(column: $table.dataJson, builder: (column) => column);

  GeneratedColumn<bool> get read => $composableBuilder(column: $table.read, builder: (column) => column);

  GeneratedColumn<String> get createdAt => $composableBuilder(column: $table.createdAt, builder: (column) => column);
}

class $$NotificationsTableTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $NotificationsTableTable,
          NotificationEntry,
          $$NotificationsTableTableFilterComposer,
          $$NotificationsTableTableOrderingComposer,
          $$NotificationsTableTableAnnotationComposer,
          $$NotificationsTableTableCreateCompanionBuilder,
          $$NotificationsTableTableUpdateCompanionBuilder,
          (NotificationEntry, BaseReferences<_$AppDatabase, $NotificationsTableTable, NotificationEntry>),
          NotificationEntry,
          PrefetchHooks Function()
        > {
  $$NotificationsTableTableTableManager(_$AppDatabase db, $NotificationsTableTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () => $$NotificationsTableTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () => $$NotificationsTableTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () => $$NotificationsTableTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> userId = const Value.absent(),
                Value<String?> tripId = const Value.absent(),
                Value<String> title = const Value.absent(),
                Value<String> body = const Value.absent(),
                Value<String?> dataJson = const Value.absent(),
                Value<bool> read = const Value.absent(),
                Value<String> createdAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => NotificationsTableCompanion(
                id: id,
                userId: userId,
                tripId: tripId,
                title: title,
                body: body,
                dataJson: dataJson,
                read: read,
                createdAt: createdAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String userId,
                Value<String?> tripId = const Value.absent(),
                required String title,
                required String body,
                Value<String?> dataJson = const Value.absent(),
                Value<bool> read = const Value.absent(),
                required String createdAt,
                Value<int> rowid = const Value.absent(),
              }) => NotificationsTableCompanion.insert(
                id: id,
                userId: userId,
                tripId: tripId,
                title: title,
                body: body,
                dataJson: dataJson,
                read: read,
                createdAt: createdAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable<$NotificationsTableTable, NotificationEntry>(table),
                  BaseReferences<_$AppDatabase, $NotificationsTableTable, NotificationEntry>(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$NotificationsTableTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $NotificationsTableTable,
      NotificationEntry,
      $$NotificationsTableTableFilterComposer,
      $$NotificationsTableTableOrderingComposer,
      $$NotificationsTableTableAnnotationComposer,
      $$NotificationsTableTableCreateCompanionBuilder,
      $$NotificationsTableTableUpdateCompanionBuilder,
      (NotificationEntry, BaseReferences<_$AppDatabase, $NotificationsTableTable, NotificationEntry>),
      NotificationEntry,
      PrefetchHooks Function()
    >;
typedef $$OutboxTableTableCreateCompanionBuilder = OutboxTableCompanion Function({
  required String id,
  required String itemType,
  Value<String?> tripId,
  required String payloadJson,
  required String idempotencyKey,
  Value<int> attempts,
  Value<String> status,
  Value<String?> lastError,
  required String createdAt,
  Value<String?> lastAttemptedAt,
  Value<int> rowid,
});
typedef $$OutboxTableTableUpdateCompanionBuilder = OutboxTableCompanion Function({
  Value<String> id,
  Value<String> itemType,
  Value<String?> tripId,
  Value<String> payloadJson,
  Value<String> idempotencyKey,
  Value<int> attempts,
  Value<String> status,
  Value<String?> lastError,
  Value<String> createdAt,
  Value<String?> lastAttemptedAt,
  Value<int> rowid,
});

class $$OutboxTableTableFilterComposer extends Composer<_$AppDatabase, $OutboxTableTable> {
  $$OutboxTableTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get itemType =>
      $composableBuilder(column: $table.itemType, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get tripId =>
      $composableBuilder(column: $table.tripId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get payloadJson =>
      $composableBuilder(column: $table.payloadJson, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get idempotencyKey =>
      $composableBuilder(column: $table.idempotencyKey, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get attempts =>
      $composableBuilder(column: $table.attempts, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get lastError =>
      $composableBuilder(column: $table.lastError, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get lastAttemptedAt =>
      $composableBuilder(column: $table.lastAttemptedAt, builder: (column) => ColumnFilters(column));
}

class $$OutboxTableTableOrderingComposer extends Composer<_$AppDatabase, $OutboxTableTable> {
  $$OutboxTableTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get itemType =>
      $composableBuilder(column: $table.itemType, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get tripId =>
      $composableBuilder(column: $table.tripId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get payloadJson =>
      $composableBuilder(column: $table.payloadJson, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get idempotencyKey =>
      $composableBuilder(column: $table.idempotencyKey, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get attempts =>
      $composableBuilder(column: $table.attempts, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get lastError =>
      $composableBuilder(column: $table.lastError, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get lastAttemptedAt =>
      $composableBuilder(column: $table.lastAttemptedAt, builder: (column) => ColumnOrderings(column));
}

class $$OutboxTableTableAnnotationComposer extends Composer<_$AppDatabase, $OutboxTableTable> {
  $$OutboxTableTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id => $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get itemType => $composableBuilder(column: $table.itemType, builder: (column) => column);

  GeneratedColumn<String> get tripId => $composableBuilder(column: $table.tripId, builder: (column) => column);

  GeneratedColumn<String> get payloadJson =>
      $composableBuilder(column: $table.payloadJson, builder: (column) => column);

  GeneratedColumn<String> get idempotencyKey =>
      $composableBuilder(column: $table.idempotencyKey, builder: (column) => column);

  GeneratedColumn<int> get attempts => $composableBuilder(column: $table.attempts, builder: (column) => column);

  GeneratedColumn<String> get status => $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<String> get lastError => $composableBuilder(column: $table.lastError, builder: (column) => column);

  GeneratedColumn<String> get createdAt => $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<String> get lastAttemptedAt =>
      $composableBuilder(column: $table.lastAttemptedAt, builder: (column) => column);
}

class $$OutboxTableTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $OutboxTableTable,
          OutboxEntry,
          $$OutboxTableTableFilterComposer,
          $$OutboxTableTableOrderingComposer,
          $$OutboxTableTableAnnotationComposer,
          $$OutboxTableTableCreateCompanionBuilder,
          $$OutboxTableTableUpdateCompanionBuilder,
          (OutboxEntry, BaseReferences<_$AppDatabase, $OutboxTableTable, OutboxEntry>),
          OutboxEntry,
          PrefetchHooks Function()
        > {
  $$OutboxTableTableTableManager(_$AppDatabase db, $OutboxTableTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () => $$OutboxTableTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () => $$OutboxTableTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () => $$OutboxTableTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> itemType = const Value.absent(),
                Value<String?> tripId = const Value.absent(),
                Value<String> payloadJson = const Value.absent(),
                Value<String> idempotencyKey = const Value.absent(),
                Value<int> attempts = const Value.absent(),
                Value<String> status = const Value.absent(),
                Value<String?> lastError = const Value.absent(),
                Value<String> createdAt = const Value.absent(),
                Value<String?> lastAttemptedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => OutboxTableCompanion(
                id: id,
                itemType: itemType,
                tripId: tripId,
                payloadJson: payloadJson,
                idempotencyKey: idempotencyKey,
                attempts: attempts,
                status: status,
                lastError: lastError,
                createdAt: createdAt,
                lastAttemptedAt: lastAttemptedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String itemType,
                Value<String?> tripId = const Value.absent(),
                required String payloadJson,
                required String idempotencyKey,
                Value<int> attempts = const Value.absent(),
                Value<String> status = const Value.absent(),
                Value<String?> lastError = const Value.absent(),
                required String createdAt,
                Value<String?> lastAttemptedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => OutboxTableCompanion.insert(
                id: id,
                itemType: itemType,
                tripId: tripId,
                payloadJson: payloadJson,
                idempotencyKey: idempotencyKey,
                attempts: attempts,
                status: status,
                lastError: lastError,
                createdAt: createdAt,
                lastAttemptedAt: lastAttemptedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable<$OutboxTableTable, OutboxEntry>(table),
                  BaseReferences<_$AppDatabase, $OutboxTableTable, OutboxEntry>(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$OutboxTableTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $OutboxTableTable,
      OutboxEntry,
      $$OutboxTableTableFilterComposer,
      $$OutboxTableTableOrderingComposer,
      $$OutboxTableTableAnnotationComposer,
      $$OutboxTableTableCreateCompanionBuilder,
      $$OutboxTableTableUpdateCompanionBuilder,
      (OutboxEntry, BaseReferences<_$AppDatabase, $OutboxTableTable, OutboxEntry>),
      OutboxEntry,
      PrefetchHooks Function()
    >;
typedef $$SyncMetaTableTableCreateCompanionBuilder = SyncMetaTableCompanion Function({
  required String key,
  required String value,
  required String updatedAt,
  Value<int> rowid,
});
typedef $$SyncMetaTableTableUpdateCompanionBuilder = SyncMetaTableCompanion Function({
  Value<String> key,
  Value<String> value,
  Value<String> updatedAt,
  Value<int> rowid,
});

class $$SyncMetaTableTableFilterComposer extends Composer<_$AppDatabase, $SyncMetaTableTable> {
  $$SyncMetaTableTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get key => $composableBuilder(column: $table.key, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get value =>
      $composableBuilder(column: $table.value, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => ColumnFilters(column));
}

class $$SyncMetaTableTableOrderingComposer extends Composer<_$AppDatabase, $SyncMetaTableTable> {
  $$SyncMetaTableTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get key =>
      $composableBuilder(column: $table.key, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get value =>
      $composableBuilder(column: $table.value, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => ColumnOrderings(column));
}

class $$SyncMetaTableTableAnnotationComposer extends Composer<_$AppDatabase, $SyncMetaTableTable> {
  $$SyncMetaTableTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get key => $composableBuilder(column: $table.key, builder: (column) => column);

  GeneratedColumn<String> get value => $composableBuilder(column: $table.value, builder: (column) => column);

  GeneratedColumn<String> get updatedAt => $composableBuilder(column: $table.updatedAt, builder: (column) => column);
}

class $$SyncMetaTableTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $SyncMetaTableTable,
          SyncMetaEntry,
          $$SyncMetaTableTableFilterComposer,
          $$SyncMetaTableTableOrderingComposer,
          $$SyncMetaTableTableAnnotationComposer,
          $$SyncMetaTableTableCreateCompanionBuilder,
          $$SyncMetaTableTableUpdateCompanionBuilder,
          (SyncMetaEntry, BaseReferences<_$AppDatabase, $SyncMetaTableTable, SyncMetaEntry>),
          SyncMetaEntry,
          PrefetchHooks Function()
        > {
  $$SyncMetaTableTableTableManager(_$AppDatabase db, $SyncMetaTableTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () => $$SyncMetaTableTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () => $$SyncMetaTableTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () => $$SyncMetaTableTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> key = const Value.absent(),
            Value<String> value = const Value.absent(),
            Value<String> updatedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) => SyncMetaTableCompanion(key: key, value: value, updatedAt: updatedAt, rowid: rowid),
          createCompanionCallback: ({
            required String key,
            required String value,
            required String updatedAt,
            Value<int> rowid = const Value.absent(),
          }) => SyncMetaTableCompanion.insert(key: key, value: value, updatedAt: updatedAt, rowid: rowid),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable<$SyncMetaTableTable, SyncMetaEntry>(table),
                  BaseReferences<_$AppDatabase, $SyncMetaTableTable, SyncMetaEntry>(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$SyncMetaTableTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $SyncMetaTableTable,
      SyncMetaEntry,
      $$SyncMetaTableTableFilterComposer,
      $$SyncMetaTableTableOrderingComposer,
      $$SyncMetaTableTableAnnotationComposer,
      $$SyncMetaTableTableCreateCompanionBuilder,
      $$SyncMetaTableTableUpdateCompanionBuilder,
      (SyncMetaEntry, BaseReferences<_$AppDatabase, $SyncMetaTableTable, SyncMetaEntry>),
      SyncMetaEntry,
      PrefetchHooks Function()
    >;
typedef $$SettingsKvTableTableCreateCompanionBuilder = SettingsKvTableCompanion Function({
  required String key,
  required String value,
  Value<int> rowid,
});
typedef $$SettingsKvTableTableUpdateCompanionBuilder = SettingsKvTableCompanion Function({
  Value<String> key,
  Value<String> value,
  Value<int> rowid,
});

class $$SettingsKvTableTableFilterComposer extends Composer<_$AppDatabase, $SettingsKvTableTable> {
  $$SettingsKvTableTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get key => $composableBuilder(column: $table.key, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get value =>
      $composableBuilder(column: $table.value, builder: (column) => ColumnFilters(column));
}

class $$SettingsKvTableTableOrderingComposer extends Composer<_$AppDatabase, $SettingsKvTableTable> {
  $$SettingsKvTableTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get key =>
      $composableBuilder(column: $table.key, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get value =>
      $composableBuilder(column: $table.value, builder: (column) => ColumnOrderings(column));
}

class $$SettingsKvTableTableAnnotationComposer extends Composer<_$AppDatabase, $SettingsKvTableTable> {
  $$SettingsKvTableTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get key => $composableBuilder(column: $table.key, builder: (column) => column);

  GeneratedColumn<String> get value => $composableBuilder(column: $table.value, builder: (column) => column);
}

class $$SettingsKvTableTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $SettingsKvTableTable,
          SettingsKvEntry,
          $$SettingsKvTableTableFilterComposer,
          $$SettingsKvTableTableOrderingComposer,
          $$SettingsKvTableTableAnnotationComposer,
          $$SettingsKvTableTableCreateCompanionBuilder,
          $$SettingsKvTableTableUpdateCompanionBuilder,
          (SettingsKvEntry, BaseReferences<_$AppDatabase, $SettingsKvTableTable, SettingsKvEntry>),
          SettingsKvEntry,
          PrefetchHooks Function()
        > {
  $$SettingsKvTableTableTableManager(_$AppDatabase db, $SettingsKvTableTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () => $$SettingsKvTableTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () => $$SettingsKvTableTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () => $$SettingsKvTableTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> key = const Value.absent(),
            Value<String> value = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) => SettingsKvTableCompanion(key: key, value: value, rowid: rowid),
          createCompanionCallback: ({
            required String key,
            required String value,
            Value<int> rowid = const Value.absent(),
          }) => SettingsKvTableCompanion.insert(key: key, value: value, rowid: rowid),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable<$SettingsKvTableTable, SettingsKvEntry>(table),
                  BaseReferences<_$AppDatabase, $SettingsKvTableTable, SettingsKvEntry>(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$SettingsKvTableTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $SettingsKvTableTable,
      SettingsKvEntry,
      $$SettingsKvTableTableFilterComposer,
      $$SettingsKvTableTableOrderingComposer,
      $$SettingsKvTableTableAnnotationComposer,
      $$SettingsKvTableTableCreateCompanionBuilder,
      $$SettingsKvTableTableUpdateCompanionBuilder,
      (SettingsKvEntry, BaseReferences<_$AppDatabase, $SettingsKvTableTable, SettingsKvEntry>),
      SettingsKvEntry,
      PrefetchHooks Function()
    >;
typedef $$OfflineReceiptsTableTableCreateCompanionBuilder = OfflineReceiptsTableCompanion Function({
  required String expenseId,
  required String localFilePath,
  required String mimeType,
  Value<bool> uploaded,
  Value<String?> remoteUrl,
  required String createdAt,
  Value<int> rowid,
});
typedef $$OfflineReceiptsTableTableUpdateCompanionBuilder = OfflineReceiptsTableCompanion Function({
  Value<String> expenseId,
  Value<String> localFilePath,
  Value<String> mimeType,
  Value<bool> uploaded,
  Value<String?> remoteUrl,
  Value<String> createdAt,
  Value<int> rowid,
});

class $$OfflineReceiptsTableTableFilterComposer extends Composer<_$AppDatabase, $OfflineReceiptsTableTable> {
  $$OfflineReceiptsTableTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get expenseId =>
      $composableBuilder(column: $table.expenseId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get localFilePath =>
      $composableBuilder(column: $table.localFilePath, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get mimeType =>
      $composableBuilder(column: $table.mimeType, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get uploaded =>
      $composableBuilder(column: $table.uploaded, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get remoteUrl =>
      $composableBuilder(column: $table.remoteUrl, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => ColumnFilters(column));
}

class $$OfflineReceiptsTableTableOrderingComposer extends Composer<_$AppDatabase, $OfflineReceiptsTableTable> {
  $$OfflineReceiptsTableTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get expenseId =>
      $composableBuilder(column: $table.expenseId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get localFilePath =>
      $composableBuilder(column: $table.localFilePath, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get mimeType =>
      $composableBuilder(column: $table.mimeType, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get uploaded =>
      $composableBuilder(column: $table.uploaded, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get remoteUrl =>
      $composableBuilder(column: $table.remoteUrl, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => ColumnOrderings(column));
}

class $$OfflineReceiptsTableTableAnnotationComposer extends Composer<_$AppDatabase, $OfflineReceiptsTableTable> {
  $$OfflineReceiptsTableTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get expenseId => $composableBuilder(column: $table.expenseId, builder: (column) => column);

  GeneratedColumn<String> get localFilePath =>
      $composableBuilder(column: $table.localFilePath, builder: (column) => column);

  GeneratedColumn<String> get mimeType => $composableBuilder(column: $table.mimeType, builder: (column) => column);

  GeneratedColumn<bool> get uploaded => $composableBuilder(column: $table.uploaded, builder: (column) => column);

  GeneratedColumn<String> get remoteUrl => $composableBuilder(column: $table.remoteUrl, builder: (column) => column);

  GeneratedColumn<String> get createdAt => $composableBuilder(column: $table.createdAt, builder: (column) => column);
}

class $$OfflineReceiptsTableTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $OfflineReceiptsTableTable,
          OfflineReceiptEntry,
          $$OfflineReceiptsTableTableFilterComposer,
          $$OfflineReceiptsTableTableOrderingComposer,
          $$OfflineReceiptsTableTableAnnotationComposer,
          $$OfflineReceiptsTableTableCreateCompanionBuilder,
          $$OfflineReceiptsTableTableUpdateCompanionBuilder,
          (OfflineReceiptEntry, BaseReferences<_$AppDatabase, $OfflineReceiptsTableTable, OfflineReceiptEntry>),
          OfflineReceiptEntry,
          PrefetchHooks Function()
        > {
  $$OfflineReceiptsTableTableTableManager(_$AppDatabase db, $OfflineReceiptsTableTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () => $$OfflineReceiptsTableTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () => $$OfflineReceiptsTableTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () => $$OfflineReceiptsTableTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> expenseId = const Value.absent(),
                Value<String> localFilePath = const Value.absent(),
                Value<String> mimeType = const Value.absent(),
                Value<bool> uploaded = const Value.absent(),
                Value<String?> remoteUrl = const Value.absent(),
                Value<String> createdAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => OfflineReceiptsTableCompanion(
                expenseId: expenseId,
                localFilePath: localFilePath,
                mimeType: mimeType,
                uploaded: uploaded,
                remoteUrl: remoteUrl,
                createdAt: createdAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String expenseId,
                required String localFilePath,
                required String mimeType,
                Value<bool> uploaded = const Value.absent(),
                Value<String?> remoteUrl = const Value.absent(),
                required String createdAt,
                Value<int> rowid = const Value.absent(),
              }) => OfflineReceiptsTableCompanion.insert(
                expenseId: expenseId,
                localFilePath: localFilePath,
                mimeType: mimeType,
                uploaded: uploaded,
                remoteUrl: remoteUrl,
                createdAt: createdAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable<$OfflineReceiptsTableTable, OfflineReceiptEntry>(table),
                  BaseReferences<_$AppDatabase, $OfflineReceiptsTableTable, OfflineReceiptEntry>(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$OfflineReceiptsTableTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $OfflineReceiptsTableTable,
      OfflineReceiptEntry,
      $$OfflineReceiptsTableTableFilterComposer,
      $$OfflineReceiptsTableTableOrderingComposer,
      $$OfflineReceiptsTableTableAnnotationComposer,
      $$OfflineReceiptsTableTableCreateCompanionBuilder,
      $$OfflineReceiptsTableTableUpdateCompanionBuilder,
      (OfflineReceiptEntry, BaseReferences<_$AppDatabase, $OfflineReceiptsTableTable, OfflineReceiptEntry>),
      OfflineReceiptEntry,
      PrefetchHooks Function()
    >;
typedef $$FeatureFlagsTableTableCreateCompanionBuilder = FeatureFlagsTableCompanion Function({
  required String key,
  required bool enabled,
  Value<String?> valueJson,
  required String updatedAt,
  Value<int> rowid,
});
typedef $$FeatureFlagsTableTableUpdateCompanionBuilder = FeatureFlagsTableCompanion Function({
  Value<String> key,
  Value<bool> enabled,
  Value<String?> valueJson,
  Value<String> updatedAt,
  Value<int> rowid,
});

class $$FeatureFlagsTableTableFilterComposer extends Composer<_$AppDatabase, $FeatureFlagsTableTable> {
  $$FeatureFlagsTableTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get key => $composableBuilder(column: $table.key, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get enabled =>
      $composableBuilder(column: $table.enabled, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get valueJson =>
      $composableBuilder(column: $table.valueJson, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => ColumnFilters(column));
}

class $$FeatureFlagsTableTableOrderingComposer extends Composer<_$AppDatabase, $FeatureFlagsTableTable> {
  $$FeatureFlagsTableTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get key =>
      $composableBuilder(column: $table.key, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get enabled =>
      $composableBuilder(column: $table.enabled, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get valueJson =>
      $composableBuilder(column: $table.valueJson, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => ColumnOrderings(column));
}

class $$FeatureFlagsTableTableAnnotationComposer extends Composer<_$AppDatabase, $FeatureFlagsTableTable> {
  $$FeatureFlagsTableTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get key => $composableBuilder(column: $table.key, builder: (column) => column);

  GeneratedColumn<bool> get enabled => $composableBuilder(column: $table.enabled, builder: (column) => column);

  GeneratedColumn<String> get valueJson => $composableBuilder(column: $table.valueJson, builder: (column) => column);

  GeneratedColumn<String> get updatedAt => $composableBuilder(column: $table.updatedAt, builder: (column) => column);
}

class $$FeatureFlagsTableTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $FeatureFlagsTableTable,
          FeatureFlagEntry,
          $$FeatureFlagsTableTableFilterComposer,
          $$FeatureFlagsTableTableOrderingComposer,
          $$FeatureFlagsTableTableAnnotationComposer,
          $$FeatureFlagsTableTableCreateCompanionBuilder,
          $$FeatureFlagsTableTableUpdateCompanionBuilder,
          (FeatureFlagEntry, BaseReferences<_$AppDatabase, $FeatureFlagsTableTable, FeatureFlagEntry>),
          FeatureFlagEntry,
          PrefetchHooks Function()
        > {
  $$FeatureFlagsTableTableTableManager(_$AppDatabase db, $FeatureFlagsTableTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () => $$FeatureFlagsTableTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () => $$FeatureFlagsTableTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () => $$FeatureFlagsTableTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> key = const Value.absent(),
                Value<bool> enabled = const Value.absent(),
                Value<String?> valueJson = const Value.absent(),
                Value<String> updatedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => FeatureFlagsTableCompanion(
                key: key,
                enabled: enabled,
                valueJson: valueJson,
                updatedAt: updatedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String key,
                required bool enabled,
                Value<String?> valueJson = const Value.absent(),
                required String updatedAt,
                Value<int> rowid = const Value.absent(),
              }) => FeatureFlagsTableCompanion.insert(
                key: key,
                enabled: enabled,
                valueJson: valueJson,
                updatedAt: updatedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable<$FeatureFlagsTableTable, FeatureFlagEntry>(table),
                  BaseReferences<_$AppDatabase, $FeatureFlagsTableTable, FeatureFlagEntry>(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$FeatureFlagsTableTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $FeatureFlagsTableTable,
      FeatureFlagEntry,
      $$FeatureFlagsTableTableFilterComposer,
      $$FeatureFlagsTableTableOrderingComposer,
      $$FeatureFlagsTableTableAnnotationComposer,
      $$FeatureFlagsTableTableCreateCompanionBuilder,
      $$FeatureFlagsTableTableUpdateCompanionBuilder,
      (FeatureFlagEntry, BaseReferences<_$AppDatabase, $FeatureFlagsTableTable, FeatureFlagEntry>),
      FeatureFlagEntry,
      PrefetchHooks Function()
    >;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$TripsTableTableTableManager get tripsTable => $$TripsTableTableTableManager(_db, _db.tripsTable);
  $$MembersTableTableTableManager get membersTable => $$MembersTableTableTableManager(_db, _db.membersTable);
  $$GroupsTableTableTableManager get groupsTable => $$GroupsTableTableTableManager(_db, _db.groupsTable);
  $$GroupMembersTableTableTableManager get groupMembersTable =>
      $$GroupMembersTableTableTableManager(_db, _db.groupMembersTable);
  $$CategoriesTableTableTableManager get categoriesTable =>
      $$CategoriesTableTableTableManager(_db, _db.categoriesTable);
  $$ExpensesTableTableTableManager get expensesTable => $$ExpensesTableTableTableManager(_db, _db.expensesTable);
  $$TripMessagesTableTableTableManager get tripMessagesTable =>
      $$TripMessagesTableTableTableManager(_db, _db.tripMessagesTable);
  $$NotificationsTableTableTableManager get notificationsTable =>
      $$NotificationsTableTableTableManager(_db, _db.notificationsTable);
  $$OutboxTableTableTableManager get outboxTable => $$OutboxTableTableTableManager(_db, _db.outboxTable);
  $$SyncMetaTableTableTableManager get syncMetaTable => $$SyncMetaTableTableTableManager(_db, _db.syncMetaTable);
  $$SettingsKvTableTableTableManager get settingsKvTable =>
      $$SettingsKvTableTableTableManager(_db, _db.settingsKvTable);
  $$OfflineReceiptsTableTableTableManager get offlineReceiptsTable =>
      $$OfflineReceiptsTableTableTableManager(_db, _db.offlineReceiptsTable);
  $$FeatureFlagsTableTableTableManager get featureFlagsTable =>
      $$FeatureFlagsTableTableTableManager(_db, _db.featureFlagsTable);
}
