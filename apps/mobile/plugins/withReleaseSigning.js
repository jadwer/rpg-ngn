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
      // La plantilla de Expo escribe `signingConfig signingConfigs.debug` o, desde
      // su ultima version, `signingConfig = signingConfigs.debug`. Con la forma
      // nueva el reemplazo no pegaba y el AAB v25 salio firmado en depuracion
      // (Play lo rechazo, 05-10).
      gradle = gradle.replace(
        /(release \{\n(?:\s+\/\/[^\n]*\n)*)(\s+)signingConfig(\s*=\s*|\s+)signingConfigs\.debug/,
        "$1$2signingConfig = project.hasProperty('RPG_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug",
      )
      if (!/release \{[\s\S]*?signingConfig = project\.hasProperty\('RPG_UPLOAD_STORE_FILE'\)/.test(gradle)) {
        throw new Error('withReleaseSigning: no encontre el signingConfig del release en build.gradle; la plantilla de Expo cambio otra vez')
      }
    }
    config.modResults.contents = gradle
    return config
  })
}
