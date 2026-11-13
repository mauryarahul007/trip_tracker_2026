class ItineraryItem {
  final String id;
  final String tripId;
  final String date; // YYYY-MM-DD
  final String? time; // HH:mm
  final String title;
  final String category; // 'activity', 'food', 'transport', 'lodging', 'sightseeing', 'other'
  final String? location;
  final String? notes;
  final bool completed;
  final double? costEstimate;
  final String? linkedExpenseId;
  final int createdAt;
  final int updatedAt;

  const ItineraryItem({
    required this.id,
    required this.tripId,
    required this.date,
    this.time,
    required this.title,
    this.category = 'activity',
    this.location,
    this.notes,
    this.completed = false,
    this.costEstimate,
    this.linkedExpenseId,
    required this.createdAt,
    required this.updatedAt,
  });

  ItineraryItem copyWith({
    String? id,
    String? tripId,
    String? date,
    String? time,
    String? title,
    String? category,
    String? location,
    String? notes,
    bool? completed,
    double? costEstimate,
    String? linkedExpenseId,
    int? createdAt,
    int? updatedAt,
  }) {
    return ItineraryItem(
      id: id ?? this.id,
      tripId: tripId ?? this.tripId,
      date: date ?? this.date,
      time: time ?? this.time,
      title: title ?? this.title,
      category: category ?? this.category,
      location: location ?? this.location,
      notes: notes ?? this.notes,
      completed: completed ?? this.completed,
      costEstimate: costEstimate ?? this.costEstimate,
      linkedExpenseId: linkedExpenseId ?? this.linkedExpenseId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'tripId': tripId,
    'date': date,
    if (time != null) 'time': time,
    'title': title,
    'category': category,
    if (location != null) 'location': location,
    if (notes != null) 'notes': notes,
    'completed': completed,
    if (costEstimate != null) 'costEstimate': costEstimate,
    if (linkedExpenseId != null) 'linkedExpenseId': linkedExpenseId,
    'createdAt': createdAt,
    'updatedAt': updatedAt,
  };

  factory ItineraryItem.fromJson(Map<String, dynamic> json) => ItineraryItem(
    id: json['id'] as String,
    tripId: (json['tripId'] as String?) ?? '',
    date: json['date'] as String,
    time: json['time'] as String?,
    title: json['title'] as String,
    category: (json['category'] as String?) ?? 'activity',
    location: json['location'] as String?,
    notes: json['notes'] as String?,
    completed: (json['completed'] as bool?) ?? false,
    costEstimate: (json['costEstimate'] as num?)?.toDouble(),
    linkedExpenseId: json['linkedExpenseId'] as String?,
    createdAt: (json['createdAt'] as num?)?.toInt() ?? 0,
    updatedAt: (json['updatedAt'] as num?)?.toInt() ?? 0,
  );
}
