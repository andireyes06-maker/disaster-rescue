# Native release configuration

Debug uses local.rescuereports.app, a development-only identifier. It is not a claimed organization domain. Both platforms display Rescue Reports.

Android release requires a service-owned -PrescueApplicationId and RESCUE_KEYSTORE_PATH, RESCUE_KEY_ALIAS, RESCUE_STORE_PASSWORD, RESCUE_KEY_PASSWORD in the build environment. Signing never falls back to debug. Keep the keystore and passwords outside source control. Example command structure: flutter build appbundle --release with the approved Dart defines, passing the owned application ID through Gradle's project property configuration.

iOS uses Identity.xcconfig for its development default. Supply RESCUE_BUNDLE_ID and DEVELOPMENT_TEAM through an approved release build configuration. verify-release.sh blocks the local/default identifier or missing team. Match Firebase/APNs configuration to the owned bundle ID before distribution.

If an application was previously published under a different identifier, settle migration/update compatibility before changing that published product. No release key, owned ID, provider configuration or store deployment has been invented. Native toolchain/build/install and device checks remain release gates.

Set the matching `RESCUE_APPLICATION_ID` Dart define for the map user-agent identity. Its fallback is development-only; it must match the approved native application identity in a distributed build.
