# APK Optimization & Security

## Android Keystore

Store cryptographic keys in a secure container. Keys are used for encryption and decryption of sensitive information, as well as for storing the app signing key.

---

## Obfuscation

Obfuscation renames classes, methods, and variables to make reverse engineering harder. **ProGuard/R8** is integrated with Android Studio and generates a mapping file for decoding stack traces.

!!! tip "Annotations for Obfuscation Control"
    - Use `@Keep` to skip obfuscation on specific classes or members.
    - Use `@SerializedName` on data class members to preserve JSON field names.

!!! warning "Common Obfuscation Pitfalls"
    - **SimpleName collision**: `MainFragment.class.getSimpleName()` used as a TAG can break if ProGuard assigns the same short name to different fragments.
    - **Reflection**: Code using reflection may fail if referenced classes/methods are renamed.
    - **Custom Views in XML**: Require custom ProGuard rules to prevent renaming.

---

## Code Minification

Removes whitespace, comments, and metadata from the compiled output. Typically coupled with obfuscation in the build pipeline.

---

## Key Security

!!! warning
    You can never fully hide keys embedded in an app. The goal is to make it **harder** to reverse engineer, not impossible.

---

## APK Size Reduction

=== "Resource Optimization"

    - Remove unused resources with `shrinkResources true` in `build.gradle`
    - Enable code shrinking with `minifyEnabled true` + ProGuard rules
    - Use **vector drawables** for simple images
    - Compress images and use **WebP** format
    - Download fonts at runtime instead of bundling them

=== "Build Configuration"

    - Use **Android App Bundle (AAB)** instead of APK for distribution
    - Remove unused dependencies
    - Optimize native libraries by excluding unused CPU architectures:

    ```groovy
    android {
        defaultConfig {
            ndk {
                abiFilters "armeabi-v7a", "arm64-v8a"
            }
        }
    }
    ```

    - Fine-tune ProGuard configurations

=== "Architecture"

    - Use **Dynamic Feature modules** to deliver features on demand
    - Avoid large in-app assets -- use a **CDN** for heavy resources

---

## Interview Q&A

??? question "What is the difference between ProGuard and R8?"
    R8 is the default code shrinker and obfuscator in Android Gradle Plugin 3.4+, replacing ProGuard. R8 performs the same functions — code shrinking, obfuscation, and optimization — but is faster because it integrates directly into the D8 dexing step. R8 is largely compatible with ProGuard rules, so existing configurations still work.

??? question "How does an Android App Bundle (AAB) reduce APK size compared to a universal APK?"
    An AAB lets Google Play generate optimized APKs per device configuration. Each user downloads only the resources, native libraries, and code for their specific screen density, CPU architecture, and language. This can reduce download size by 15-30% compared to a universal APK that bundles all configurations.

??? question "What does shrinkResources do and how does it differ from minifyEnabled?"
    `minifyEnabled` removes unused code (classes, methods) via tree-shaking and applies obfuscation. `shrinkResources` removes unused resources (layouts, drawables, strings) that are no longer referenced after code shrinking. `shrinkResources` requires `minifyEnabled` to be set to `true` because it relies on code analysis to determine which resources are actually used.

??? question "How would you secure API keys in an Android app?"
    You cannot fully hide keys embedded in an app — a determined attacker can always extract them. Best practices include storing keys in the `local.properties` file (excluded from version control), injecting them via BuildConfig fields, using the Android Keystore for encryption, and ideally proxying sensitive API calls through your own backend so the key never ships in the APK.

---

!!! tip "Further Reading"
    - [Shrink, obfuscate, and optimize your app](https://developer.android.com/build/shrink-code)
    - [Android App Bundles](https://developer.android.com/guide/app-bundle)
    - [Android Keystore system](https://developer.android.com/privacy-and-security/keystore)
    - [Reduce your app size](https://developer.android.com/topic/performance/reduce-apk-size)
