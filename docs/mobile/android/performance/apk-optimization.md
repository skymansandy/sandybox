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
