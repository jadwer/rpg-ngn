import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/**
 * El borde de arriba de las pantallas. La barra de estado va oculta en toda
 * la app (app.json y Root, v14), pero en Android `insets.top` sigue
 * reportando su alto y las pantallas con cabecera propia dejaban un hueco
 * negro encima del logo (27-09). En Android la ventana ya empieza debajo de
 * la camara, asi que es 0; en iOS la muesca sigue ahi aunque no haya barra.
 */
export function useTopInset(): number {
  const insets = useSafeAreaInsets()
  return Platform.OS === 'ios' ? insets.top : 0
}
