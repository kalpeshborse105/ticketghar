# MahaTicket — R8 keep rules (Play DEX obfuscation / shrinking)

-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod,SourceFile,LineNumberTable
-keepattributes RuntimeVisibleAnnotations,RuntimeVisibleParameterAnnotations

# React Native core
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.soloader.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-dontwarn com.facebook.react.**
-dontwarn com.facebook.hermes.**

# Keep native methods (JNI)
-keepclasseswithmembernames class * {
    native <methods>;
}

# Reanimated / Gesture Handler / Screens / Worklets / Safe Area
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.swmansion.rnscreens.** { *; }
-keep class com.swmansion.worklets.** { *; }
-keep class com.th3rdwave.safeareacontext.** { *; }
-dontwarn com.swmansion.**

# Vector icons / SVG / WebView / AsyncStorage
-keep class com.oblador.vectoricons.** { *; }
-keep class com.horcrux.svg.** { *; }
-keep class com.reactnativecommunity.webview.** { *; }
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Razorpay Checkout (reflection + activities)
-dontwarn com.razorpay.**
-keep class com.razorpay.** {*;}
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @com.razorpay.** *;
}
-keepclasseswithmembers class * {
    public void onPaymentSuccess(java.lang.String);
    public void onPaymentError(int, java.lang.String);
}

# OkHttp / Okio (used by RN networking)
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# Kotlin metadata used by some SDKs
-dontwarn kotlin.**
-keep class kotlin.Metadata { *; }

# App package entry points
-keep class com.kalpkrutinfotech.mahaticket.** { *; }

# VisionCamera + bundled ML Kit barcode (FastGate native QR) — R8 strips these → FATAL crash
-keep class com.mrousavy.camera.** { *; }
-keep class com.mrousavy.** { *; }
-keep class com.google.mlkit.** { *; }
-keep class com.google.android.gms.internal.mlkit_** { *; }
-keep class com.google.android.gms.internal.mlkit_vision_barcode.** { *; }
-keep class com.google.android.gms.internal.mlkit_vision_barcode_bundled.** { *; }
-dontwarn com.mrousavy.**
-dontwarn com.google.mlkit.**
-dontwarn com.google.android.gms.internal.mlkit_**
