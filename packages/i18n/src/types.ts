/** El mismo arbol de claves que el español, con textos en otro idioma. */
export type Messages<T> = { [K in keyof T]: T[K] extends string ? string : Messages<T[K]> }

/** 'common.languages.es' para cada hoja del arbol. */
export type Paths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Paths<T[K], `${P}${K}.`>
}[keyof T & string]
