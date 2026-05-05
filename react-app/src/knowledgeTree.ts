export interface TreeNode {
  id: string
  label: string
  children?: TreeNode[]
  docPath?: string // path to markdown file
  icon?: string
}

export const knowledgeTree: TreeNode = {
  id: 'root',
  label: 'Sandybox',
  icon: '🧠',
  children: [
    {
      id: 'mobile',
      label: 'Mobile',
      icon: '📱',
      children: [
        {
          id: 'android',
          label: 'Android',
          icon: '🤖',
          children: [
            {
              id: 'android-core',
              label: 'Core Platform',
              icon: '⚙️',
              children: [
                { id: 'android-arch', label: 'Architecture & Runtime', docPath: 'mobile/android/core-platform/architecture.md' },
                { id: 'android-lifecycle', label: 'Activity & Lifecycle', docPath: 'mobile/android/core-platform/app-components.md' },
                { id: 'android-views', label: 'Views & UI', docPath: 'mobile/android/core-platform/views.md' },
              ],
            },
            {
              id: 'android-concurrency',
              label: 'Concurrency',
              icon: '🔄',
              children: [
                { id: 'android-mt', label: 'Multithreading', docPath: 'mobile/android/concurrency/multithreading.md' },
                { id: 'android-main-thread', label: 'Main Thread', docPath: 'mobile/android/concurrency/main-thread.md' },
                { id: 'android-coroutines', label: 'Coroutine Internals', docPath: 'mobile/android/concurrency/coroutine-internals.md' },
                { id: 'android-flow-channel', label: 'Flow & Channel', docPath: 'mobile/android/concurrency/flow-channel-best-practices.md' },
              ],
            },
            {
              id: 'android-arch-patterns',
              label: 'Architecture',
              icon: '🏗️',
              children: [
                { id: 'android-design-patterns', label: 'Design Patterns', docPath: 'mobile/android/architecture-patterns/design-patterns.md' },
                { id: 'android-solid', label: 'SOLID Principles', docPath: 'mobile/android/architecture-patterns/solid-principles.md' },
                { id: 'android-di', label: 'Dependency Injection', docPath: 'mobile/android/architecture-patterns/dependency-injection.md' },
                { id: 'android-vm', label: 'ViewModel Internals', docPath: 'mobile/android/architecture-patterns/viewmodel-internals.md' },
                { id: 'android-modules', label: 'Modularization', docPath: 'mobile/android/architecture-patterns/modularization.md' },
              ],
            },
            {
              id: 'android-ui',
              label: 'UI',
              icon: '🎨',
              children: [
                { id: 'android-compose', label: 'Jetpack Compose', docPath: 'mobile/android/ui/jetpack-compose.md' },
                { id: 'android-side-effects', label: 'Compose Side Effects', docPath: 'mobile/android/ui/compose-side-effects.md' },
                { id: 'android-compose-perf', label: 'Compose Performance', docPath: 'mobile/android/ui/compose-performance.md' },
                { id: 'android-compose-test', label: 'Compose Testing', docPath: 'mobile/android/ui/compose-testing.md' },
                { id: 'android-rv', label: 'RecyclerView', docPath: 'mobile/android/ui/recyclerview.md' },
              ],
            },
            {
              id: 'android-net',
              label: 'Networking',
              icon: '🌐',
              children: [
                { id: 'android-networking', label: 'Networking', docPath: 'mobile/android/networking/networking.md' },
                { id: 'android-ssl', label: 'SSL Pinning', docPath: 'mobile/android/networking/ssl-pinning.md' },
              ],
            },
            {
              id: 'android-data',
              label: 'Data & Storage',
              icon: '💾',
              children: [
                { id: 'android-storage', label: 'Storage', docPath: 'mobile/android/data-storage/storage.md' },
                { id: 'android-serial', label: 'Serialization', docPath: 'mobile/android/data-storage/serialization.md' },
                { id: 'android-db', label: 'Database Internals', docPath: 'mobile/android/data-storage/database-internals.md' },
                { id: 'android-room-idx', label: 'Room Indexing', docPath: 'mobile/android/data-storage/room-indexing.md' },
                { id: 'android-room-trig', label: 'Room Triggers', docPath: 'mobile/android/data-storage/room-triggers.md' },
                { id: 'android-room-flow', label: 'Reactive Queries', docPath: 'mobile/android/data-storage/room-reactive-queries.md' },
              ],
            },
            {
              id: 'android-perf',
              label: 'Performance',
              icon: '⚡',
              children: [
                { id: 'android-memory', label: 'Memory Management', docPath: 'mobile/android/performance/memory-management.md' },
                { id: 'android-apk', label: 'APK Optimization', docPath: 'mobile/android/performance/apk-optimization.md' },
                { id: 'android-bitmap', label: 'Bitmap Pool', docPath: 'mobile/android/performance/bitmap-pool.md' },
              ],
            },
            {
              id: 'android-services',
              label: 'System Services',
              icon: '🔧',
              children: [
                { id: 'android-svc', label: 'Services', docPath: 'mobile/android/system-services/services.md' },
                { id: 'android-br', label: 'Broadcast Receivers', docPath: 'mobile/android/system-services/broadcast-receivers.md' },
                { id: 'android-cp', label: 'Content Providers', docPath: 'mobile/android/system-services/content-providers.md' },
                { id: 'android-notif', label: 'Notifications & FCM', docPath: 'mobile/android/system-services/notifications.md' },
                { id: 'android-wm', label: 'WorkManager', docPath: 'mobile/android/system-services/workmanager.md' },
                { id: 'android-ipc', label: 'Intents & IPC', docPath: 'mobile/android/system-services/intents-ipc.md' },
              ],
            },
            {
              id: 'android-obs',
              label: 'Observability',
              icon: '👁️',
              children: [
                { id: 'android-crash', label: 'Crash Reporting', docPath: 'mobile/android/observability/crash-reporting.md' },
                { id: 'android-log', label: 'Logging Strategies', docPath: 'mobile/android/observability/logging.md' },
                { id: 'android-perf-mon', label: 'Performance Monitor', docPath: 'mobile/android/observability/performance-monitoring.md' },
                { id: 'android-net-mon', label: 'Network Monitor', docPath: 'mobile/android/observability/network-monitoring.md' },
              ],
            },
            {
              id: 'android-release',
              label: 'Release Strategy',
              icon: '🚀',
              children: [
                { id: 'android-pipeline', label: 'Release Pipeline', docPath: 'mobile/android/release-strategy/release-pipeline.md' },
                { id: 'android-version', label: 'Versioning', docPath: 'mobile/android/release-strategy/versioning.md' },
                { id: 'android-rollout', label: 'Staged Rollouts', docPath: 'mobile/android/release-strategy/staged-rollouts.md' },
                { id: 'android-updates', label: 'App Updates', docPath: 'mobile/android/release-strategy/app-updates.md' },
              ],
            },
            {
              id: 'android-build',
              label: 'Build System',
              icon: '🏭',
              children: [
                { id: 'android-gradle', label: 'Gradle Fundamentals', docPath: 'mobile/android/build-system/gradle-fundamentals.md' },
                { id: 'android-variants', label: 'Build Variants', docPath: 'mobile/android/build-system/build-variants.md' },
                { id: 'android-deps', label: 'Dependency Mgmt', docPath: 'mobile/android/build-system/dependency-management.md' },
                { id: 'android-build-perf', label: 'Build Performance', docPath: 'mobile/android/build-system/build-performance.md' },
              ],
            },
            {
              id: 'android-misc',
              label: 'Miscellaneous',
              icon: '📦',
              children: [
                { id: 'android-essentials', label: 'Android Essentials', docPath: 'mobile/android/miscellaneous/android-essentials.md' },
                { id: 'android-testing', label: 'Unit Testing', docPath: 'mobile/android/miscellaneous/unit-testing.md' },
                { id: 'android-startup', label: 'App Startup', docPath: 'mobile/android/miscellaneous/app-startup.md' },
                { id: 'android-pagination', label: 'Pagination', docPath: 'mobile/android/miscellaneous/pagination.md' },
                { id: 'android-metrics', label: 'Product Metrics', docPath: 'mobile/android/miscellaneous/product-metrics.md' },
              ],
            },
          ],
        },
        {
          id: 'ios',
          label: 'iOS',
          icon: '🍎',
          children: [
            { id: 'ios-swift', label: 'Swift Essentials', docPath: 'mobile/ios/swift-essentials.md' },
            { id: 'ios-lifecycle', label: 'iOS App Lifecycle', docPath: 'mobile/ios/app-lifecycle.md' },
          ],
        },
        {
          id: 'cross-platform',
          label: 'Cross-Platform',
          icon: '🔀',
          docPath: 'mobile/cross-platform/index.md',
        },
      ],
    },
    {
      id: 'programming',
      label: 'Programming',
      icon: '💻',
      children: [
        {
          id: 'languages',
          label: 'Languages',
          icon: '📝',
          children: [
            {
              id: 'kotlin',
              label: 'Kotlin',
              icon: '🟣',
              children: [
                { id: 'kotlin-essentials', label: 'Essentials', docPath: 'programming/languages/kotlin/essentials.md' },
                { id: 'kotlin-coroutines', label: 'Coroutines', docPath: 'programming/languages/kotlin/coroutines.md' },
                { id: 'kotlin-flow', label: 'Flow', docPath: 'programming/languages/kotlin/flow.md' },
                { id: 'kotlin-kmp', label: 'KMP', docPath: 'programming/languages/kotlin/kmp.md' },
              ],
            },
          ],
        },
        {
          id: 'design-patterns',
          label: 'Design Patterns',
          icon: '🧩',
          children: [
            { id: 'dp-creational', label: 'Creational', docPath: 'programming/design-patterns/creational-patterns.md' },
            { id: 'dp-structural', label: 'Structural', docPath: 'programming/design-patterns/structural-patterns.md' },
            { id: 'dp-behavioral', label: 'Behavioral', docPath: 'programming/design-patterns/behavioral-patterns.md' },
          ],
        },
        {
          id: 'dsa',
          label: 'DSA',
          icon: '🌲',
          docPath: 'programming/dsa/index.md',
        },
      ],
    },
    {
      id: 'infra',
      label: 'Infrastructure',
      icon: '🏢',
      children: [
        {
          id: 'networking',
          label: 'Networking',
          icon: '🌐',
          docPath: 'infra/networking/index.md',
        },
        {
          id: 'devops',
          label: 'DevOps',
          icon: '🔄',
          children: [
            {
              id: 'docker',
              label: 'Docker',
              icon: '🐳',
              children: [
                { id: 'docker-fundamentals', label: 'Fundamentals', docPath: 'infra/devops/docker/fundamentals.md' },
                { id: 'docker-networking', label: 'Networking & Storage', docPath: 'infra/devops/docker/networking-storage.md' },
                { id: 'docker-compose', label: 'Docker Compose', docPath: 'infra/devops/docker/compose.md' },
                { id: 'docker-best', label: 'Best Practices', docPath: 'infra/devops/docker/best-practices.md' },
              ],
            },
            {
              id: 'kubernetes',
              label: 'Kubernetes',
              icon: '☸️',
              children: [
                { id: 'k8s-arch', label: 'Architecture', docPath: 'infra/devops/kubernetes/architecture.md' },
                { id: 'k8s-workloads', label: 'Workloads', docPath: 'infra/devops/kubernetes/workloads.md' },
                { id: 'k8s-networking', label: 'Networking', docPath: 'infra/devops/kubernetes/networking.md' },
                { id: 'k8s-storage', label: 'Storage & Config', docPath: 'infra/devops/kubernetes/storage-config.md' },
                { id: 'k8s-scaling', label: 'Scaling & Ops', docPath: 'infra/devops/kubernetes/scaling-operations.md' },
              ],
            },
            {
              id: 'cicd',
              label: 'CI/CD',
              icon: '🔁',
              children: [
                { id: 'ci', label: 'Continuous Integration', docPath: 'infra/devops/ci-cd/continuous-integration.md' },
                { id: 'cd', label: 'Continuous Delivery', docPath: 'infra/devops/ci-cd/continuous-delivery.md' },
                { id: 'pipeline', label: 'Pipeline Design', docPath: 'infra/devops/ci-cd/pipeline-design.md' },
              ],
            },
          ],
        },
        {
          id: 'databases',
          label: 'Databases',
          icon: '🗄️',
          children: [
            { id: 'sql-nosql', label: 'SQL vs NoSQL', docPath: 'infra/databases/sql-vs-nosql.md' },
          ],
        },
      ],
    },
    {
      id: 'science',
      label: 'Science',
      icon: '🔬',
      children: [
        {
          id: 'physics',
          label: 'Physics',
          icon: '⚛️',
          docPath: 'science/physics/index.md',
        },
        {
          id: 'astronomy',
          label: 'Astronomy',
          icon: '🔭',
          children: [
            {
              id: 'solar-system',
              label: 'Solar System',
              icon: '☀️',
              children: [
                { id: 'sun', label: 'The Sun', docPath: 'science/astronomy/solar-system/the-sun.md' },
                { id: 'inner-planets', label: 'Inner Planets', docPath: 'science/astronomy/solar-system/inner-planets.md' },
                { id: 'outer-planets', label: 'Outer Planets', docPath: 'science/astronomy/solar-system/outer-planets.md' },
                { id: 'dwarf-planets', label: 'Dwarf Planets', docPath: 'science/astronomy/solar-system/dwarf-planets-and-small-bodies.md' },
              ],
            },
            { id: 'black-holes', label: 'Black Holes', docPath: 'science/astronomy/black-holes.md' },
          ],
        },
        {
          id: 'chemistry',
          label: 'Chemistry',
          icon: '🧪',
          children: [
            { id: 'chem-atomic', label: 'Atomic Structure', docPath: 'science/chemistry/atomic-structure.md' },
            { id: 'chem-periodic', label: 'Periodic Table', docPath: 'science/chemistry/periodic-table.md' },
            { id: 'chem-bonding', label: 'Chemical Bonding', docPath: 'science/chemistry/chemical-bonding.md' },
            { id: 'chem-reactions', label: 'Reactions', docPath: 'science/chemistry/reactions-and-equations.md' },
            { id: 'chem-states', label: 'States of Matter', docPath: 'science/chemistry/states-of-matter.md' },
          ],
        },
      ],
    },
    {
      id: 'tools',
      label: 'Tools',
      icon: '🛠️',
      docPath: 'tools/index.md',
    },
    {
      id: 'til',
      label: 'TIL',
      icon: '💡',
      docPath: 'til/index.md',
    },
  ],
}
