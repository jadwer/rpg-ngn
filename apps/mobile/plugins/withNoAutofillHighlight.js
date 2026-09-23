// Android pinta un velo amarillo (verde olivo sobre fondo oscuro) sobre los
// campos que rellena el autocompletado. En la app instalada se quita desde el
// tema; en Expo Go no se puede, porque el tema es el de Expo Go.
const { withAndroidStyles } = require('expo/config-plugins')

module.exports = function withNoAutofillHighlight(config) {
  return withAndroidStyles(config, (cfg) => {
    const styles = cfg.modResults.resources.style ?? []
    const app = styles.find((s) => s.$?.name === 'AppTheme')
    if (app) {
      app.item = (app.item ?? []).filter((i) => i.$?.name !== 'android:autofilledHighlight')
      app.item.push({ $: { name: 'android:autofilledHighlight' }, _: '@android:color/transparent' })
    }
    return cfg
  })
}
