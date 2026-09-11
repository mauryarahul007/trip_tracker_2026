/** Warm lazy Settings leaf chunks on hover/press so the first tap is instant. */
export function prefetchSettingsLeaves(): void {
  void import('./SettingsCategoriesScreen');
  void import('./SettingsRecycleBinScreen');
  void import('./SettingsLegalScreen');
  void import('../BugReportModal');
  void import('../FeatureRequestModal');
}

export function prefetchSettingsLegal(): void {
  void import('./SettingsLegalScreen');
}
