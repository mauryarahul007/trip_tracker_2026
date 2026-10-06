// Curated gazetteer and destination matching algorithms.
// Parity with web `src/utils/placeGazetteer.ts` and `src/services/placeSuggest.ts`.

class GazetteerEntry {
  final String name;
  final String region;
  final String countryCode;

  const GazetteerEntry(this.name, this.region, this.countryCode);
}

const List<GazetteerEntry> gazetteer = [
  // India
  GazetteerEntry('Goa', 'India', 'IN'),
  GazetteerEntry('Manali', 'Himachal Pradesh, India', 'IN'),
  GazetteerEntry('Shimla', 'Himachal Pradesh, India', 'IN'),
  GazetteerEntry('Kasol', 'Himachal Pradesh, India', 'IN'),
  GazetteerEntry('Dharamshala', 'Himachal Pradesh, India', 'IN'),
  GazetteerEntry('McLeod Ganj', 'Himachal Pradesh, India', 'IN'),
  GazetteerEntry('Spiti', 'Himachal Pradesh, India', 'IN'),
  GazetteerEntry('Kasauli', 'Himachal Pradesh, India', 'IN'),
  GazetteerEntry('Dalhousie', 'Himachal Pradesh, India', 'IN'),
  GazetteerEntry('Leh', 'Ladakh, India', 'IN'),
  GazetteerEntry('Ladakh', 'India', 'IN'),
  GazetteerEntry('Srinagar', 'Jammu and Kashmir, India', 'IN'),
  GazetteerEntry('Gulmarg', 'Jammu and Kashmir, India', 'IN'),
  GazetteerEntry('Pahalgam', 'Jammu and Kashmir, India', 'IN'),
  GazetteerEntry('Rishikesh', 'Uttarakhand, India', 'IN'),
  GazetteerEntry('Haridwar', 'Uttarakhand, India', 'IN'),
  GazetteerEntry('Mussoorie', 'Uttarakhand, India', 'IN'),
  GazetteerEntry('Nainital', 'Uttarakhand, India', 'IN'),
  GazetteerEntry('Auli', 'Uttarakhand, India', 'IN'),
  GazetteerEntry('Jim Corbett', 'Uttarakhand, India', 'IN'),
  GazetteerEntry('Kedarnath', 'Uttarakhand, India', 'IN'),
  GazetteerEntry('Jaipur', 'Rajasthan, India', 'IN'),
  GazetteerEntry('Udaipur', 'Rajasthan, India', 'IN'),
  GazetteerEntry('Jodhpur', 'Rajasthan, India', 'IN'),
  GazetteerEntry('Jaisalmer', 'Rajasthan, India', 'IN'),
  GazetteerEntry('Pushkar', 'Rajasthan, India', 'IN'),
  GazetteerEntry('Mount Abu', 'Rajasthan, India', 'IN'),
  GazetteerEntry('Agra', 'Uttar Pradesh, India', 'IN'),
  GazetteerEntry('Varanasi', 'Uttar Pradesh, India', 'IN'),
  GazetteerEntry('Delhi', 'India', 'IN'),
  GazetteerEntry('Mumbai', 'Maharashtra, India', 'IN'),
  GazetteerEntry('Pune', 'Maharashtra, India', 'IN'),
  GazetteerEntry('Lonavala', 'Maharashtra, India', 'IN'),
  GazetteerEntry('Mahabaleshwar', 'Maharashtra, India', 'IN'),
  GazetteerEntry('Alibaug', 'Maharashtra, India', 'IN'),
  GazetteerEntry('Bengaluru', 'Karnataka, India', 'IN'),
  GazetteerEntry('Coorg', 'Karnataka, India', 'IN'),
  GazetteerEntry('Chikmagalur', 'Karnataka, India', 'IN'),
  GazetteerEntry('Hampi', 'Karnataka, India', 'IN'),
  GazetteerEntry('Gokarna', 'Karnataka, India', 'IN'),
  GazetteerEntry('Mysuru', 'Karnataka, India', 'IN'),
  GazetteerEntry('Munnar', 'Kerala, India', 'IN'),
  GazetteerEntry('Alleppey', 'Kerala, India', 'IN'),
  GazetteerEntry('Kochi', 'Kerala, India', 'IN'),
  GazetteerEntry('Wayanad', 'Kerala, India', 'IN'),
  GazetteerEntry('Varkala', 'Kerala, India', 'IN'),
  GazetteerEntry('Thekkady', 'Kerala, India', 'IN'),
  GazetteerEntry('Ooty', 'Tamil Nadu, India', 'IN'),
  GazetteerEntry('Kodaikanal', 'Tamil Nadu, India', 'IN'),
  GazetteerEntry('Chennai', 'Tamil Nadu, India', 'IN'),
  GazetteerEntry('Mahabalipuram', 'Tamil Nadu, India', 'IN'),
  GazetteerEntry('Rameswaram', 'Tamil Nadu, India', 'IN'),
  GazetteerEntry('Puducherry', 'India', 'IN'),
  GazetteerEntry('Hyderabad', 'Telangana, India', 'IN'),
  GazetteerEntry('Kolkata', 'West Bengal, India', 'IN'),
  GazetteerEntry('Darjeeling', 'West Bengal, India', 'IN'),
  GazetteerEntry('Gangtok', 'Sikkim, India', 'IN'),
  GazetteerEntry('Lachung', 'Sikkim, India', 'IN'),
  GazetteerEntry('Pelling', 'Sikkim, India', 'IN'),
  GazetteerEntry('Shillong', 'Meghalaya, India', 'IN'),
  GazetteerEntry('Cherrapunji', 'Meghalaya, India', 'IN'),
  GazetteerEntry('Tawang', 'Arunachal Pradesh, India', 'IN'),
  GazetteerEntry('Kaziranga', 'Assam, India', 'IN'),
  GazetteerEntry('Guwahati', 'Assam, India', 'IN'),
  GazetteerEntry('Andaman', 'India', 'IN'),
  GazetteerEntry('Port Blair', 'Andaman and Nicobar, India', 'IN'),
  GazetteerEntry('Havelock Island', 'Andaman and Nicobar, India', 'IN'),
  GazetteerEntry('Rann of Kutch', 'Gujarat, India', 'IN'),
  GazetteerEntry('Ahmedabad', 'Gujarat, India', 'IN'),
  GazetteerEntry('Amritsar', 'Punjab, India', 'IN'),
  GazetteerEntry('Khajuraho', 'Madhya Pradesh, India', 'IN'),
  GazetteerEntry('Pachmarhi', 'Madhya Pradesh, India', 'IN'),
  GazetteerEntry('Puri', 'Odisha, India', 'IN'),
  GazetteerEntry('Lakshadweep', 'India', 'IN'),

  // Global Destinations
  GazetteerEntry('Nepal', 'Asia', 'NP'),
  GazetteerEntry('Kathmandu', 'Nepal', 'NP'),
  GazetteerEntry('Pokhara', 'Nepal', 'NP'),
  GazetteerEntry('Bhutan', 'Asia', 'BT'),
  GazetteerEntry('Thimphu', 'Bhutan', 'BT'),
  GazetteerEntry('Paro', 'Bhutan', 'BT'),
  GazetteerEntry('Sri Lanka', 'Asia', 'LK'),
  GazetteerEntry('Colombo', 'Sri Lanka', 'LK'),
  GazetteerEntry('Maldives', 'Asia', 'MV'),
  GazetteerEntry('Dubai', 'United Arab Emirates', 'AE'),
  GazetteerEntry('Abu Dhabi', 'United Arab Emirates', 'AE'),
  GazetteerEntry('Thailand', 'Asia', 'TH'),
  GazetteerEntry('Bangkok', 'Thailand', 'TH'),
  GazetteerEntry('Phuket', 'Thailand', 'TH'),
  GazetteerEntry('Krabi', 'Thailand', 'TH'),
  GazetteerEntry('Pattaya', 'Thailand', 'TH'),
  GazetteerEntry('Chiang Mai', 'Thailand', 'TH'),
  GazetteerEntry('Bali', 'Indonesia', 'ID'),
  GazetteerEntry('Indonesia', 'Asia', 'ID'),
  GazetteerEntry('Vietnam', 'Asia', 'VN'),
  GazetteerEntry('Hanoi', 'Vietnam', 'VN'),
  GazetteerEntry('Ho Chi Minh City', 'Vietnam', 'VN'),
  GazetteerEntry('Da Nang', 'Vietnam', 'VN'),
  GazetteerEntry('Singapore', 'Asia', 'SG'),
  GazetteerEntry('Malaysia', 'Asia', 'MY'),
  GazetteerEntry('Kuala Lumpur', 'Malaysia', 'MY'),
  GazetteerEntry('Langkawi', 'Malaysia', 'MY'),
  GazetteerEntry('Japan', 'Asia', 'JP'),
  GazetteerEntry('Tokyo', 'Japan', 'JP'),
  GazetteerEntry('Kyoto', 'Japan', 'JP'),
  GazetteerEntry('Osaka', 'Japan', 'JP'),
  GazetteerEntry('Seoul', 'South Korea', 'KR'),
  GazetteerEntry('Hong Kong', 'China', 'HK'),
  GazetteerEntry('Turkey', 'Europe/Asia', 'TR'),
  GazetteerEntry('Istanbul', 'Turkey', 'TR'),
  GazetteerEntry('Cappadocia', 'Turkey', 'TR'),
  GazetteerEntry('Egypt', 'Africa', 'EG'),
  GazetteerEntry('Kenya', 'Africa', 'KE'),
  GazetteerEntry('Mauritius', 'Africa', 'MU'),
  GazetteerEntry('Switzerland', 'Europe', 'CH'),
  GazetteerEntry('Zurich', 'Switzerland', 'CH'),
  GazetteerEntry('Interlaken', 'Switzerland', 'CH'),
  GazetteerEntry('Lucerne', 'Switzerland', 'CH'),
  GazetteerEntry('France', 'Europe', 'FR'),
  GazetteerEntry('Paris', 'France', 'FR'),
  GazetteerEntry('Italy', 'Europe', 'IT'),
  GazetteerEntry('Rome', 'Italy', 'IT'),
  GazetteerEntry('Venice', 'Italy', 'IT'),
  GazetteerEntry('Florence', 'Italy', 'IT'),
  GazetteerEntry('Spain', 'Europe', 'ES'),
  GazetteerEntry('Barcelona', 'Spain', 'ES'),
  GazetteerEntry('Greece', 'Europe', 'GR'),
  GazetteerEntry('Santorini', 'Greece', 'GR'),
  GazetteerEntry('Amsterdam', 'Netherlands', 'NL'),
  GazetteerEntry('Prague', 'Czechia', 'CZ'),
  GazetteerEntry('Vienna', 'Austria', 'AT'),
  GazetteerEntry('Iceland', 'Europe', 'IS'),
  GazetteerEntry('London', 'United Kingdom', 'GB'),
  GazetteerEntry('Scotland', 'United Kingdom', 'GB'),
  GazetteerEntry('Germany', 'Europe', 'DE'),
  GazetteerEntry('Berlin', 'Germany', 'DE'),
  GazetteerEntry('Munich', 'Germany', 'DE'),
  GazetteerEntry('Portugal', 'Europe', 'PT'),
  GazetteerEntry('Lisbon', 'Portugal', 'PT'),
  GazetteerEntry('New York', 'United States', 'US'),
  GazetteerEntry('Las Vegas', 'United States', 'US'),
  GazetteerEntry('San Francisco', 'United States', 'US'),
  GazetteerEntry('Los Angeles', 'United States', 'US'),
  GazetteerEntry('Canada', 'North America', 'CA'),
  GazetteerEntry('Toronto', 'Canada', 'CA'),
  GazetteerEntry('Vancouver', 'Canada', 'CA'),
  GazetteerEntry('Australia', 'Oceania', 'AU'),
  GazetteerEntry('Sydney', 'Australia', 'AU'),
  GazetteerEntry('Melbourne', 'Australia', 'AU'),
  GazetteerEntry('New Zealand', 'Oceania', 'NZ'),
  GazetteerEntry('Queenstown', 'New Zealand', 'NZ'),
];

const Map<String, String> countryCurrency = {
  'IN': 'INR',
  'NP': 'NPR',
  'BT': 'BTN',
  'LK': 'LKR',
  'MV': 'MVR',
  'AE': 'AED',
  'TH': 'THB',
  'ID': 'IDR',
  'VN': 'VND',
  'SG': 'SGD',
  'MY': 'MYR',
  'JP': 'JPY',
  'KR': 'KRW',
  'HK': 'HKD',
  'CN': 'CNY',
  'TR': 'TRY',
  'EG': 'EGP',
  'KE': 'KES',
  'MU': 'MUR',
  'CH': 'CHF',
  'FR': 'EUR',
  'IT': 'EUR',
  'ES': 'EUR',
  'GR': 'EUR',
  'NL': 'EUR',
  'DE': 'EUR',
  'PT': 'EUR',
  'AT': 'EUR',
  'CZ': 'CZK',
  'IS': 'ISK',
  'GB': 'GBP',
  'US': 'USD',
  'CA': 'CAD',
  'AU': 'AUD',
  'NZ': 'NZD',
};

const _diacritics = {
  'à': 'a',
  'á': 'a',
  'â': 'a',
  'ã': 'a',
  'ä': 'a',
  'å': 'a',
  'æ': 'ae',
  'ç': 'c',
  'è': 'e',
  'é': 'e',
  'ê': 'e',
  'ë': 'e',
  'ì': 'i',
  'í': 'i',
  'î': 'i',
  'ï': 'i',
  'ñ': 'n',
  'ò': 'o',
  'ó': 'o',
  'ô': 'o',
  'õ': 'o',
  'ö': 'o',
  'ø': 'o',
  'ù': 'u',
  'ú': 'u',
  'û': 'u',
  'ü': 'u',
  'ý': 'y',
  'ÿ': 'y',
  'ß': 'ss',
};

String normalizeQuery(String s) {
  var res = s.toLowerCase().trim();
  for (final entry in _diacritics.entries) {
    res = res.replaceAll(entry.key, entry.value);
  }
  return res.replaceAll(RegExp(r'[\u0300-\u036f]'), '').replaceAll(RegExp(r'\s+'), ' ').trim();
}

/// Edit distance counting a swapped pair of letters as one edit ("Swtizerland").
/// Parity with web `editDistance` in `src/services/placeSuggest.ts`.
int editDistance(String a, String b) {
  final d = List.generate(a.length + 1, (i) => List<int>.filled(b.length + 1, 0));

  for (var i = 0; i <= a.length; i++) {
    d[i][0] = i;
  }
  for (var j = 0; j <= b.length; j++) {
    d[0][j] = j;
  }

  for (var i = 1; i <= a.length; i++) {
    for (var j = 1; j <= b.length; j++) {
      final cost = a[i - 1] == b[j - 1] ? 0 : 1;
      d[i][j] = [d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost].reduce((min, val) => val < min ? val : min);

      if (i > 1 && j > 1 && a[i - 1] == b[j - 2] && a[i - 2] == b[j - 1]) {
        final trans = d[i - 2][j - 2] + 1;
        if (trans < d[i][j]) {
          d[i][j] = trans;
        }
      }
    }
  }
  return d[a.length][b.length];
}

int typoTolerance(int len) => (len <= 4
    ? 1
    : len <= 8
    ? 2
    : 3);
