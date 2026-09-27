// enableDestinationAutocomplete: a small, hand-kept list of popular trip
// destinations. It catches typos offline and ranks above the online
// geocoder, which misses some well-known spots (it has no "Munnar" for
// "Munar") and floods others with same-named hamlets. [name, region, ISO country]
export const GAZETTEER: [string, string, string][] = [
  // India
  ['Goa', 'India', 'IN'], ['Manali', 'Himachal Pradesh, India', 'IN'], ['Shimla', 'Himachal Pradesh, India', 'IN'],
  ['Kasol', 'Himachal Pradesh, India', 'IN'], ['Dharamshala', 'Himachal Pradesh, India', 'IN'], ['McLeod Ganj', 'Himachal Pradesh, India', 'IN'],
  ['Spiti', 'Himachal Pradesh, India', 'IN'], ['Kasauli', 'Himachal Pradesh, India', 'IN'], ['Dalhousie', 'Himachal Pradesh, India', 'IN'],
  ['Leh', 'Ladakh, India', 'IN'], ['Ladakh', 'India', 'IN'], ['Srinagar', 'Jammu and Kashmir, India', 'IN'],
  ['Gulmarg', 'Jammu and Kashmir, India', 'IN'], ['Pahalgam', 'Jammu and Kashmir, India', 'IN'], ['Rishikesh', 'Uttarakhand, India', 'IN'],
  ['Haridwar', 'Uttarakhand, India', 'IN'], ['Mussoorie', 'Uttarakhand, India', 'IN'], ['Nainital', 'Uttarakhand, India', 'IN'],
  ['Auli', 'Uttarakhand, India', 'IN'], ['Jim Corbett', 'Uttarakhand, India', 'IN'], ['Kedarnath', 'Uttarakhand, India', 'IN'],
  ['Jaipur', 'Rajasthan, India', 'IN'], ['Udaipur', 'Rajasthan, India', 'IN'], ['Jodhpur', 'Rajasthan, India', 'IN'],
  ['Jaisalmer', 'Rajasthan, India', 'IN'], ['Pushkar', 'Rajasthan, India', 'IN'], ['Mount Abu', 'Rajasthan, India', 'IN'],
  ['Agra', 'Uttar Pradesh, India', 'IN'], ['Varanasi', 'Uttar Pradesh, India', 'IN'], ['Delhi', 'India', 'IN'],
  ['Mumbai', 'Maharashtra, India', 'IN'], ['Pune', 'Maharashtra, India', 'IN'], ['Lonavala', 'Maharashtra, India', 'IN'],
  ['Mahabaleshwar', 'Maharashtra, India', 'IN'], ['Alibaug', 'Maharashtra, India', 'IN'], ['Bengaluru', 'Karnataka, India', 'IN'],
  ['Coorg', 'Karnataka, India', 'IN'], ['Chikmagalur', 'Karnataka, India', 'IN'], ['Hampi', 'Karnataka, India', 'IN'],
  ['Gokarna', 'Karnataka, India', 'IN'], ['Mysuru', 'Karnataka, India', 'IN'], ['Munnar', 'Kerala, India', 'IN'],
  ['Alleppey', 'Kerala, India', 'IN'], ['Kochi', 'Kerala, India', 'IN'], ['Wayanad', 'Kerala, India', 'IN'],
  ['Varkala', 'Kerala, India', 'IN'], ['Thekkady', 'Kerala, India', 'IN'], ['Ooty', 'Tamil Nadu, India', 'IN'],
  ['Kodaikanal', 'Tamil Nadu, India', 'IN'], ['Chennai', 'Tamil Nadu, India', 'IN'], ['Mahabalipuram', 'Tamil Nadu, India', 'IN'],
  ['Rameswaram', 'Tamil Nadu, India', 'IN'], ['Puducherry', 'India', 'IN'], ['Hyderabad', 'Telangana, India', 'IN'],
  ['Kolkata', 'West Bengal, India', 'IN'], ['Darjeeling', 'West Bengal, India', 'IN'], ['Gangtok', 'Sikkim, India', 'IN'],
  ['Lachung', 'Sikkim, India', 'IN'], ['Pelling', 'Sikkim, India', 'IN'], ['Shillong', 'Meghalaya, India', 'IN'],
  ['Cherrapunji', 'Meghalaya, India', 'IN'], ['Tawang', 'Arunachal Pradesh, India', 'IN'], ['Kaziranga', 'Assam, India', 'IN'],
  ['Guwahati', 'Assam, India', 'IN'], ['Andaman', 'India', 'IN'], ['Port Blair', 'Andaman and Nicobar, India', 'IN'],
  ['Havelock Island', 'Andaman and Nicobar, India', 'IN'], ['Rann of Kutch', 'Gujarat, India', 'IN'], ['Ahmedabad', 'Gujarat, India', 'IN'],
  ['Amritsar', 'Punjab, India', 'IN'], ['Khajuraho', 'Madhya Pradesh, India', 'IN'], ['Pachmarhi', 'Madhya Pradesh, India', 'IN'],
  ['Puri', 'Odisha, India', 'IN'], ['Lakshadweep', 'India', 'IN'],
  // Nearby & popular abroad
  ['Nepal', 'Asia', 'NP'], ['Kathmandu', 'Nepal', 'NP'], ['Pokhara', 'Nepal', 'NP'], ['Bhutan', 'Asia', 'BT'],
  ['Thimphu', 'Bhutan', 'BT'], ['Paro', 'Bhutan', 'BT'], ['Sri Lanka', 'Asia', 'LK'], ['Colombo', 'Sri Lanka', 'LK'],
  ['Maldives', 'Asia', 'MV'], ['Dubai', 'United Arab Emirates', 'AE'], ['Abu Dhabi', 'United Arab Emirates', 'AE'],
  ['Thailand', 'Asia', 'TH'], ['Bangkok', 'Thailand', 'TH'], ['Phuket', 'Thailand', 'TH'], ['Krabi', 'Thailand', 'TH'],
  ['Pattaya', 'Thailand', 'TH'], ['Chiang Mai', 'Thailand', 'TH'], ['Bali', 'Indonesia', 'ID'], ['Indonesia', 'Asia', 'ID'],
  ['Vietnam', 'Asia', 'VN'], ['Hanoi', 'Vietnam', 'VN'], ['Ho Chi Minh City', 'Vietnam', 'VN'], ['Da Nang', 'Vietnam', 'VN'],
  ['Singapore', 'Asia', 'SG'], ['Malaysia', 'Asia', 'MY'], ['Kuala Lumpur', 'Malaysia', 'MY'], ['Langkawi', 'Malaysia', 'MY'],
  ['Japan', 'Asia', 'JP'], ['Tokyo', 'Japan', 'JP'], ['Kyoto', 'Japan', 'JP'], ['Osaka', 'Japan', 'JP'],
  ['Seoul', 'South Korea', 'KR'], ['Hong Kong', 'China', 'HK'], ['Turkey', 'Europe/Asia', 'TR'], ['Istanbul', 'Turkey', 'TR'],
  ['Cappadocia', 'Turkey', 'TR'], ['Egypt', 'Africa', 'EG'], ['Kenya', 'Africa', 'KE'], ['Mauritius', 'Africa', 'MU'],
  ['Switzerland', 'Europe', 'CH'], ['Zurich', 'Switzerland', 'CH'], ['Interlaken', 'Switzerland', 'CH'], ['Lucerne', 'Switzerland', 'CH'],
  ['France', 'Europe', 'FR'], ['Paris', 'France', 'FR'], ['Italy', 'Europe', 'IT'], ['Rome', 'Italy', 'IT'],
  ['Venice', 'Italy', 'IT'], ['Florence', 'Italy', 'IT'], ['Spain', 'Europe', 'ES'], ['Barcelona', 'Spain', 'ES'],
  ['Greece', 'Europe', 'GR'], ['Santorini', 'Greece', 'GR'], ['Amsterdam', 'Netherlands', 'NL'], ['Prague', 'Czechia', 'CZ'],
  ['Vienna', 'Austria', 'AT'], ['Iceland', 'Europe', 'IS'], ['London', 'United Kingdom', 'GB'], ['Scotland', 'United Kingdom', 'GB'],
  ['Germany', 'Europe', 'DE'], ['Berlin', 'Germany', 'DE'], ['Munich', 'Germany', 'DE'], ['Portugal', 'Europe', 'PT'],
  ['Lisbon', 'Portugal', 'PT'], ['New York', 'United States', 'US'], ['Las Vegas', 'United States', 'US'],
  ['San Francisco', 'United States', 'US'], ['Los Angeles', 'United States', 'US'], ['Canada', 'North America', 'CA'],
  ['Toronto', 'Canada', 'CA'], ['Vancouver', 'Canada', 'CA'], ['Australia', 'Oceania', 'AU'], ['Sydney', 'Australia', 'AU'],
  ['Melbourne', 'Australia', 'AU'], ['New Zealand', 'Oceania', 'NZ'], ['Queenstown', 'New Zealand', 'NZ'],
];

// ISO country -> currency, for the currency suggestion after a place is
// picked. Countries not listed simply get no suggestion.
export const COUNTRY_CURRENCY: Record<string, string> = {
  IN: 'INR', NP: 'NPR', BT: 'BTN', LK: 'LKR', MV: 'MVR', AE: 'AED', TH: 'THB', ID: 'IDR', VN: 'VND',
  SG: 'SGD', MY: 'MYR', JP: 'JPY', KR: 'KRW', HK: 'HKD', CN: 'CNY', TR: 'TRY', EG: 'EGP', KE: 'KES',
  MU: 'MUR', CH: 'CHF', FR: 'EUR', IT: 'EUR', ES: 'EUR', GR: 'EUR', NL: 'EUR', DE: 'EUR', PT: 'EUR',
  AT: 'EUR', BE: 'EUR', IE: 'EUR', FI: 'EUR', HR: 'EUR', CZ: 'CZK', HU: 'HUF', IS: 'ISK', NO: 'NOK',
  SE: 'SEK', DK: 'DKK', GB: 'GBP', US: 'USD', CA: 'CAD', MX: 'MXN', AU: 'AUD', NZ: 'NZD', PH: 'PHP',
  KH: 'USD', ZA: 'ZAR', QA: 'QAR', OM: 'OMR', SA: 'SAR',
};
