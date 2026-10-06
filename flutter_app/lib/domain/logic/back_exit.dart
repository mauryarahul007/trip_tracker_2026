/// Port of src/utils/doubleBackExit.ts.
const exitWindow = Duration(milliseconds: 2000);

/// True when this back press lands inside the window opened by the previous one.
bool isSecondBackPress(DateTime? lastPressAt, DateTime now) =>
    lastPressAt != null && now.difference(lastPressAt) <= exitWindow;
