/// Money as a screen reader should say it: the visual sign ("− ₹1,200", "+ ₹300") is dropped because the words
/// around it ("You owe", "You get back") already carry the direction, and TalkBack would read "minus".
String spokenMoney(String shown) => shown.replaceFirst(RegExp(r'^\s*[−+\-]\s*'), '').trim();
