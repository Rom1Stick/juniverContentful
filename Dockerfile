FROM nginx:alpine

# Copie des fichiers du projet dans le répertoire de NGINX
COPY ./ /usr/share/nginx/html/

# Configuration des redirections NGINX
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/

# Exposition du port 80
EXPOSE 80

# Commande pour démarrer NGINX en premier plan
CMD ["nginx", "-g", "daemon off;"] 