# R8 rules for release builds (Phase 12.5). Flutter's own rules are added by the Flutter Gradle plugin.
# Keep Firebase Messaging and local notification receivers referenced only from the manifest.
-keep class com.dexterous.flutterlocalnotifications.** { *; }
-dontwarn com.google.android.play.core.**
