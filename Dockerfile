FROM nginx:alpine

# Copie des fichiers statiques dans le répertoire servi par nginx
COPY ./ /usr/share/nginx/html/

# Remplacement de la conf nginx par la notre (routing /public comme Netlify)
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
