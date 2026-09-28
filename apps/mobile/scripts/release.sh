#!/usr/bin/env bash
# APK de release de Ad Astra Mentis, compilada en local (sin EAS).
#
#   apps/mobile/scripts/release.sh             arm64 con R8, para el telefono
#   apps/mobile/scripts/release.sh --universal las cuatro arquitecturas, sin R8
#   apps/mobile/scripts/release.sh --no-clean  reusa android/ (mas rapido, menos fiel)
#
# Se niega a compilar sin la llave de subida: una APK firmada con la de
# depuracion no se instala encima de la que ya tiene el telefono. Al final
# comprueba la firma contra el certificado conocido y deja la APK en
# dist/apk/ con el versionCode en el nombre.
set -euo pipefail

CERT_SHA256_PREFIX='f85837e4'
JAVA17="${JAVA17:-$HOME/.sdkman/candidates/java/17.0.20-tem}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"

universal=0
clean=1
for arg in "$@"; do
  case "$arg" in
    --universal) universal=1 ;;
    --no-clean) clean=0 ;;
    *) echo "Opcion desconocida: $arg" >&2; exit 2 ;;
  esac
done

cd "$(dirname "$0")/.."

props="$HOME/.gradle/gradle.properties"
for key in RPG_UPLOAD_STORE_FILE RPG_UPLOAD_KEY_ALIAS RPG_UPLOAD_STORE_PASSWORD; do
  grep -q "^$key=" "$props" 2>/dev/null || { echo "Falta $key en $props: sin la llave de subida no hay release." >&2; exit 1; }
done
[ -x "$JAVA17/bin/java" ] || { echo "No encuentro el JDK 17 en $JAVA17 (JAVA17=... para cambiarlo)." >&2; exit 1; }
[ -d "$ANDROID_HOME/build-tools" ] || { echo "No encuentro el SDK de Android en $ANDROID_HOME." >&2; exit 1; }

version_code=$(node -p "require('./app.json').expo.android.versionCode")
version_name=$(node -p "require('./app.json').expo.version")
echo "Ad Astra Mentis $version_name (versionCode $version_code)"

# prebuild reescribe los scripts android e ios de package.json; se restaura
# siempre, tambien si algo falla a medias.
cp package.json package.json.release-bak
trap 'mv -f package.json.release-bak package.json' EXIT

prebuild_args=(--platform android --no-install)
[ "$clean" = 1 ] && prebuild_args+=(--clean)
CI=1 npx expo prebuild "${prebuild_args[@]}"

gradle_args=(assembleRelease)
if [ "$universal" = 0 ]; then
  gradle_args+=(-PreactNativeArchitectures=arm64-v8a -Pandroid.enableMinifyInReleaseBuilds=true -Pandroid.enableShrinkResourcesInReleaseBuilds=true)
fi
(cd android && JAVA_HOME="$JAVA17" ./gradlew "${gradle_args[@]}")

apk=android/app/build/outputs/apk/release/app-release.apk
apksigner=$(ls -d "$ANDROID_HOME"/build-tools/*/ | sort -V | tail -1)apksigner
cert=$(JAVA_HOME="$JAVA17" "$apksigner" verify --print-certs "$apk" | awk -F': ' '/SHA-256 digest/ {print $2; exit}')
case "$cert" in
  "$CERT_SHA256_PREFIX"*) ;;
  *) echo "La APK no esta firmada con la llave de subida (certificado $cert)." >&2; exit 1 ;;
esac

suffix=$([ "$universal" = 1 ] && echo universal || echo arm64)
mkdir -p dist/apk
out="dist/apk/ad-astra-mentis-v${version_code}-${suffix}.apk"
cp "$apk" "$out"
echo
echo "Listo: apps/mobile/$out"
echo "  $(du -h "$out" | cut -f1), firma $cert"
echo "  sha256 $(sha256sum "$out" | cut -d' ' -f1)"
