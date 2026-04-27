# ViewModel Internals

## Properties

- Holds UI state
- Survives configuration changes (e.g., screen rotation)
- Sharable between classes (e.g., multiple Fragments in the same Activity)

---

## How ViewModel is Created

```kotlin
val viewModel = ViewModelProvider(viewModelStoreOwner).get(MyViewModel::class.java)
```

---

## Internals — Step by Step

### ViewModelStoreOwner

Both `Fragment` and `Activity` implement `ViewModelStoreOwner`, which provides a `ViewModelStore`.

### Where is ViewModelStore stored?

```
ViewModelStoreOwner
  └── getViewModelStore()
        └── stored in NonConfigurationInstances class
              └── ViewModelStoreOwner calls getLastNonConfigurationInstances()
                    └── lastNonConfigurationInstances retained in ActivityClientRecord
                          └── inside ActivityThread (singleton, keeps map of activities)
```

!!! info "Why it survives configuration changes"
    `ActivityThread` is a singleton that maintains a map of `ActivityClientRecord` objects. During a configuration change, the Activity is destroyed and recreated, but the `ActivityClientRecord` (and therefore `NonConfigurationInstances` containing the `ViewModelStore`) is **retained** in `ActivityThread`.

### ViewModelStore

A simple class with a `HashMap`:

```kotlin
public class ViewModelStore {
    private val map = HashMap<String, ViewModel>()
    // key = canonical class name
    // value = ViewModel instance
}
```

### ViewModel Creation via Factory

- ViewModel is **not** instantiated directly
- A `ViewModelProvider.Factory` is used to create ViewModel instances
- The Factory checks if a ViewModel already exists in the map (or was cleared)
- If not found, it creates a new instance and stores it in the map

```kotlin
// Simplified flow
fun <T : ViewModel> get(modelClass: Class<T>): T {
    val canonicalName = modelClass.canonicalName
    var viewModel = viewModelStore.get(canonicalName)
    if (viewModel != null && modelClass.isInstance(viewModel)) {
        return viewModel as T
    }
    viewModel = factory.create(modelClass)
    viewModelStore.put(canonicalName, viewModel)
    return viewModel
}
```

### When is ViewModel Cleared?

!!! warning "Key Distinction"
    - ViewModel is cleared when the Activity is **destroyed normally** (user presses back, `finish()` is called)
    - ViewModel is **NOT** cleared when the Activity is destroyed due to a **configuration change** (rotation, locale change)

The `ViewModelStore.clear()` method is called from `ComponentActivity.onDestroy()` only if `isChangingConfigurations` is `false`.
