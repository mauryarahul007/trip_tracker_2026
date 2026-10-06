class TravelPass {
  final String id;
  final String tripId;
  final String type; // 'flight' | 'train' | 'stay' | 'activity' | 'transit'
  final String title;
  final String? provider;
  final String? referenceCode;
  final String? bookingId;
  final String? passengerName;
  final String? legIdentifier;
  final String? startDateTime;
  final String? endDateTime;
  final String? origin;
  final String? destination;
  final String? seatOrRoom;
  final String? address;
  final String? phone;
  final String? qrData;
  final String? notes;
  final List<String> assignedMemberIds;
  final String? attachmentUrl;
  final String? attachmentName;
  final int createdAt;
  final int updatedAt;

  const TravelPass({
    required this.id,
    required this.tripId,
    required this.type,
    required this.title,
    this.provider,
    this.referenceCode,
    this.bookingId,
    this.passengerName,
    this.legIdentifier,
    this.startDateTime,
    this.endDateTime,
    this.origin,
    this.destination,
    this.seatOrRoom,
    this.address,
    this.phone,
    this.qrData,
    this.notes,
    this.assignedMemberIds = const [],
    this.attachmentUrl,
    this.attachmentName,
    required this.createdAt,
    required this.updatedAt,
  });

  TravelPass copyWith({
    String? id,
    String? tripId,
    String? type,
    String? title,
    String? provider,
    String? referenceCode,
    String? bookingId,
    String? passengerName,
    String? legIdentifier,
    String? startDateTime,
    String? endDateTime,
    String? origin,
    String? destination,
    String? seatOrRoom,
    String? address,
    String? phone,
    String? qrData,
    String? notes,
    List<String>? assignedMemberIds,
    String? attachmentUrl,
    String? attachmentName,
    int? createdAt,
    int? updatedAt,
  }) {
    return TravelPass(
      id: id ?? this.id,
      tripId: tripId ?? this.tripId,
      type: type ?? this.type,
      title: title ?? this.title,
      provider: provider ?? this.provider,
      referenceCode: referenceCode ?? this.referenceCode,
      bookingId: bookingId ?? this.bookingId,
      passengerName: passengerName ?? this.passengerName,
      legIdentifier: legIdentifier ?? this.legIdentifier,
      startDateTime: startDateTime ?? this.startDateTime,
      endDateTime: endDateTime ?? this.endDateTime,
      origin: origin ?? this.origin,
      destination: destination ?? this.destination,
      seatOrRoom: seatOrRoom ?? this.seatOrRoom,
      address: address ?? this.address,
      phone: phone ?? this.phone,
      qrData: qrData ?? this.qrData,
      notes: notes ?? this.notes,
      assignedMemberIds: assignedMemberIds ?? this.assignedMemberIds,
      attachmentUrl: attachmentUrl ?? this.attachmentUrl,
      attachmentName: attachmentName ?? this.attachmentName,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'tripId': tripId,
      'type': type,
      'title': title,
      if (provider != null) 'provider': provider,
      if (referenceCode != null) 'referenceCode': referenceCode,
      if (bookingId != null) 'bookingId': bookingId,
      if (passengerName != null) 'passengerName': passengerName,
      if (legIdentifier != null) 'legIdentifier': legIdentifier,
      if (startDateTime != null) 'startDateTime': startDateTime,
      if (endDateTime != null) 'endDateTime': endDateTime,
      if (origin != null) 'origin': origin,
      if (destination != null) 'destination': destination,
      if (seatOrRoom != null) 'seatOrRoom': seatOrRoom,
      if (address != null) 'address': address,
      if (phone != null) 'phone': phone,
      if (qrData != null) 'qrData': qrData,
      if (notes != null) 'notes': notes,
      'assignedMemberIds': assignedMemberIds,
      if (attachmentUrl != null) 'attachmentUrl': attachmentUrl,
      if (attachmentName != null) 'attachmentName': attachmentName,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }

  factory TravelPass.fromJson(Map<String, dynamic> json) {
    return TravelPass(
      id: json['id'] as String,
      tripId: (json['tripId'] ?? json['trip_id'] ?? '') as String,
      type: json['type'] as String? ?? 'transit',
      title: json['title'] as String? ?? 'Pass',
      provider: json['provider'] as String?,
      referenceCode: json['referenceCode'] as String?,
      bookingId: json['bookingId'] as String?,
      passengerName: json['passengerName'] as String?,
      legIdentifier: json['legIdentifier'] as String?,
      startDateTime: json['startDateTime'] as String?,
      endDateTime: json['endDateTime'] as String?,
      origin: json['origin'] as String?,
      destination: json['destination'] as String?,
      seatOrRoom: json['seatOrRoom'] as String?,
      address: json['address'] as String?,
      phone: json['phone'] as String?,
      qrData: json['qrData'] as String?,
      notes: json['notes'] as String?,
      assignedMemberIds: (json['assignedMemberIds'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
      attachmentUrl: json['attachmentUrl'] as String?,
      attachmentName: json['attachmentName'] as String?,
      createdAt: (json['createdAt'] as num?)?.toInt() ?? 0,
      updatedAt: (json['updatedAt'] as num?)?.toInt() ?? 0,
    );
  }
}
