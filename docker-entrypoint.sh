#!/bin/sh
set -e

# Extraer y reemplazar variables de entorno en la plantilla
echo "Inyectando variables de entorno en config.js..."

envsubst < /usr/share/nginx/html/assets/js/config.template.js > /usr/share/nginx/html/assets/js/config.js

# Si no hubo problemas, Nginx iniciará automáticamente.
echo "Variables inyectadas con éxito."
