# R8 rules for release builds (Phase 12.5). Flutter's own rules are added by the Flutter Gradle plugin.
# Keep Firebase Messaging and local notification receivers referenced only from the manifest.
-keep class com.dexterous.flutterlocalnotifications.** { *; }
-dontwarn com.google.android.play.core.**
# ML Kit text recognition: the plugin references the optional Chinese/Devanagari/Japanese/Korean models, which we do not bundle (Latin only).
-dontwarn com.google.mlkit.vision.text.chinese.**
-dontwarn com.google.mlkit.vision.text.devanagari.**
-dontwarn com.google.mlkit.vision.text.japanese.**
-dontwarn com.google.mlkit.vision.text.korean.**
