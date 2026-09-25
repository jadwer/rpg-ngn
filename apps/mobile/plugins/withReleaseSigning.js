/**
 * Firma el APK de release con la llave de subida de Ad Astra Mentis en vez de
 * la de depuracion que trae la plantilla de Expo.
 *
 * La llave y su contraseña nunca entran al repo: las lee Gradle de
 * ~/.gradle/gradle.properties (RPG_UPLOAD_STORE_FILE, RPG_UPLOAD_STORE_PASSWORD,
 * RPG_UPLOAD_KEY_ALIAS). Si faltan, el release sigue firmado con la de
 * depuracion, como antes, para que un build sin la llave no falle.
 */
const { withAppBuildGradle } = require('expo/config-plugins')

const RELEASE_CONFIG = `
        release {
            if (project.hasProperty('RPG_UPLOAD_STORE_FILE')) {
                storeFile file(RPG_UPLOAD_STORE_FILE)
                storePassword RPG_UPLOAD_STORE_PASSWORD
                keyAlias RPG_UPLOAD_KEY_ALIAS
                keyPassword RPG_UPLOAD_STORE_PASSWORD
            }
        }`

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let gradle = config.modResults.contents
    if (!gradle.includes("RPG_UPLOAD_STORE_FILE")) {
      gradle = gradle.replace(/signingConfigs \{\n(\s+debug \{[\s\S]*?\n\s+\})/, (block) => block + RELEASE_CONFIG)
      gradle = gradle.replace(
        /(release \{\n(?:\s+\/\/[^\n]*\n)*)(\s+)signingConfig signingConfigs\.debug/,
        "$1$2signingConfig project.hasProperty('RPG_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug",
      )
    }
    config.modResults.contents = gradle
    return config
  })
}
