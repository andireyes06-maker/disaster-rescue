plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

val releaseRequested = gradle.startParameter.taskNames.any { it.contains("release", ignoreCase = true) }
val ownedApplicationId = providers.gradleProperty("rescueApplicationId").orNull
val releaseStore = System.getenv("RESCUE_KEYSTORE_PATH")
val releaseAlias = System.getenv("RESCUE_KEY_ALIAS")
val releaseStorePassword = System.getenv("RESCUE_STORE_PASSWORD")
val releaseKeyPassword = System.getenv("RESCUE_KEY_PASSWORD")
val validateReleaseConfiguration = {
    require(!ownedApplicationId.isNullOrBlank() && !ownedApplicationId.startsWith("local.")) {
        "Release requires -PrescueApplicationId with the service-owned application ID."
    }
    require(listOf(releaseStore, releaseAlias, releaseStorePassword, releaseKeyPassword).all { !it.isNullOrBlank() }) {
        "Release requires RESCUE_KEYSTORE_PATH, RESCUE_KEY_ALIAS, RESCUE_STORE_PASSWORD and RESCUE_KEY_PASSWORD."
    }
    require(file(releaseStore!!).exists()) { "Release keystore was not found." }
}

if (releaseRequested) validateReleaseConfiguration()
gradle.taskGraph.whenReady {
    if (allTasks.any { it.name.contains("release", ignoreCase = true) }) validateReleaseConfiguration()
}

android {
    namespace = "local.rescuereports.app"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = ownedApplicationId ?: "local.rescuereports.app"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        create("release") {
            if (!releaseStore.isNullOrBlank()) storeFile = file(releaseStore)
            storePassword = releaseStorePassword
            keyAlias = releaseAlias
            keyPassword = releaseKeyPassword
        }
    }
    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
