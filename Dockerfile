FROM nginx:alpine

# Copiar el script de inicio a la carpeta que lee nginx al arrancar
COPY docker-entrypoint.sh /docker-entrypoint.d/99-envsubst-config.sh
RUN chmod +x /docker-entrypoint.d/99-envsubst-config.sh

# Copiar el proyecto al directorio por defecto de Nginx
COPY . /usr/share/nginx/html/

# Exponer el puerto
EXPOSE 80

# Nginx alpine usa CMD ["nginx", "-g", "daemon off;"] por defecto
