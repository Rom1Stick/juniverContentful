# Formation Docker pour le Développement Web

## Table des matières

1. [Introduction à Docker](#1-introduction-à-docker)
   - [Qu'est-ce que Docker ?](#quest-ce-que-docker)
   - [Pourquoi utiliser Docker ?](#pourquoi-utiliser-docker)
   - [Docker vs Virtualisation traditionnelle](#docker-vs-virtualisation-traditionnelle)

2. [Concepts fondamentaux](#2-concepts-fondamentaux)
   - [Images Docker](#images-docker)
   - [Conteneurs](#conteneurs)
   - [Dockerfile](#dockerfile)
   - [Volumes](#volumes)
   - [Réseaux Docker](#réseaux-docker)

3. [Installation et configuration](#3-installation-et-configuration)
   - [Installation sur Windows](#installation-sur-windows)
   - [Installation sur macOS](#installation-sur-macos)
   - [Installation sur Linux](#installation-sur-linux)
   - [Vérification de l'installation](#vérification-de-linstallation)

4. [Commandes Docker essentielles](#4-commandes-docker-essentielles)
   - [Gestion des images](#gestion-des-images)
   - [Gestion des conteneurs](#gestion-des-conteneurs)
   - [Gestion des volumes](#gestion-des-volumes)
   - [Gestion des réseaux](#gestion-des-réseaux)

5. [Création de notre premier Dockerfile](#5-création-de-notre-premier-dockerfile)
   - [Structure d'un Dockerfile](#structure-dun-dockerfile)
   - [Bonnes pratiques pour le Dockerfile](#bonnes-pratiques-pour-le-dockerfile)
   - [Dockerfile pour notre projet web](#dockerfile-pour-notre-projet-web)

6. [Docker Compose](#6-docker-compose)
   - [Introduction à Docker Compose](#introduction-à-docker-compose)
   - [Syntaxe du fichier docker-compose.yml](#syntaxe-du-fichier-docker-composeyml)
   - [Docker Compose pour notre projet](#docker-compose-pour-notre-projet)

7. [Déploiement du projet web](#7-déploiement-du-projet-web)
   - [Préparation du projet](#préparation-du-projet)
   - [Construction et lancement des conteneurs](#construction-et-lancement-des-conteneurs)
   - [Tests et validation](#tests-et-validation)

8. [Bonnes pratiques et optimisations](#8-bonnes-pratiques-et-optimisations)
   - [Optimisation des images](#optimisation-des-images)
   - [Sécurité des conteneurs](#sécurité-des-conteneurs)
   - [CI/CD avec Docker](#cicd-avec-docker)

9. [Ressources complémentaires](#9-ressources-complémentaires)
   - [Documentation officielle](#documentation-officielle)
   - [Tutoriels recommandés](#tutoriels-recommandés)
   - [Communauté Docker](#communauté-docker)

10. [Fonctionnalités Docker dans notre projet](#10-fonctionnalités-docker-dans-notre-projet)
    - [Configuration NGINX](#configuration-nginx)
    - [Gestion des volumes](#gestion-des-volumes-dans-notre-projet)
    - [Déploiement du site web et de l'administration](#déploiement-du-site-web-et-de-ladministration)
    - [Résolution des problèmes courants](#résolution-des-problèmes-courants)

---

## 1. Introduction à Docker

### Qu'est-ce que Docker ?

Docker est une plateforme open-source qui permet d'automatiser le déploiement d'applications dans des conteneurs légers et portables. Ces conteneurs embarquent tout ce dont l'application a besoin pour fonctionner (code, bibliothèques, variables d'environnement, fichiers de configuration), garantissant ainsi que l'application fonctionne de manière identique quel que soit l'environnement d'exécution.

**Analogie simple** : Si vous imaginez votre application comme un plat cuisiné, Docker serait comme une boîte hermétique qui contient non seulement le plat, mais aussi tous les ustensiles et ingrédients nécessaires pour le servir. Vous pouvez ainsi transporter cette boîte n'importe où, et le plat sera servi exactement de la même façon, peu importe la cuisine où vous vous trouvez.

### Pourquoi utiliser Docker ?

1. **Uniformité des environnements** : "Fonctionne sur ma machine" devient "fonctionne partout"
2. **Isolation** : Les applications s'exécutent dans leur propre environnement sans interférer avec d'autres
3. **Portabilité** : Déployez facilement sur n'importe quel système supportant Docker
4. **Mise à l'échelle** : Multipliez rapidement les instances de votre application
5. **Rapidité de déploiement** : Démarrez un conteneur en quelques secondes
6. **Optimisation des ressources** : Consomme moins de ressources qu'une machine virtuelle complète
7. **Facilité de collaboration** : Partagez facilement votre environnement de développement

### Docker vs Virtualisation traditionnelle

| Aspect | Docker (Conteneurs) | Machines Virtuelles |
|--------|---------------------|---------------------|
| Isolation | Au niveau du système d'exploitation | Au niveau du matériel |
| Taille | Léger (quelques Mo) | Lourde (quelques Go) |
| Démarrage | Quelques secondes | Quelques minutes |
| Ressources | Partagées avec l'hôte | Allouées statiquement |
| Performance | Proche des performances natives | Overhead significatif |
| Portabilité | Très portable | Moins portable |

**Analogie** : Une machine virtuelle est comme une maison entière avec ses fondations, tandis qu'un conteneur Docker est comme un appartement dans un immeuble qui partage les fondations et l'infrastructure commune.

## 2. Concepts fondamentaux

### Images Docker

Une image Docker est un modèle en lecture seule qui contient un ensemble d'instructions pour créer un conteneur. Elle comprend :
- Le code de l'application
- Les dépendances
- Outils et bibliothèques
- Autres fichiers nécessaires à l'exécution

**Analogie** : Une image Docker est comme le plan de construction et les matériaux d'une maison, prêts à être assemblés.

### Conteneurs

Un conteneur est une instance exécutable d'une image Docker. Il s'agit d'un environnement isolé et léger qui :
- Possède son propre système de fichiers
- Partage le noyau du système d'exploitation hôte
- S'exécute comme un processus isolé
- Peut être démarré, arrêté, déplacé et supprimé

**Analogie** : Si l'image est le plan de la maison, le conteneur est la maison construite selon ce plan, où l'on peut vivre.

### Dockerfile

Un Dockerfile est un fichier texte qui contient une série d'instructions pour construire une image Docker. Ces instructions définissent :
- L'image de base à utiliser
- Les commandes à exécuter
- Les fichiers à copier
- Les ports à exposer
- La commande de démarrage

**Analogie** : Un Dockerfile est comme une recette de cuisine pas à pas qui détaille tous les ingrédients et étapes nécessaires.

### Volumes

Les volumes Docker sont des mécanismes de persistance des données en dehors des conteneurs. Ils permettent de :
- Stocker des données indépendamment du cycle de vie du conteneur
- Partager des données entre conteneurs
- Accéder aux données depuis l'hôte

**Analogie** : Les volumes sont comme des boîtes de rangement externes que vous pouvez attacher à différentes maisons (conteneurs) selon vos besoins.

### Réseaux Docker

Les réseaux Docker permettent aux conteneurs de communiquer entre eux et avec le monde extérieur. Docker propose plusieurs types de réseaux :
- Bridge (par défaut)
- Host
- None
- Overlay (pour les clusters)
- Macvlan

**Analogie** : Les réseaux Docker sont comme les systèmes de communication (téléphone, internet) qui relient différentes maisons entre elles.

## 3. Installation et configuration

### Installation sur Windows

1. Téléchargez Docker Desktop pour Windows depuis [le site officiel](https://www.docker.com/products/docker-desktop)
2. Exécutez l'installateur et suivez les instructions
3. Assurez-vous que WSL 2 est activé (Windows Subsystem for Linux)
4. Redémarrez votre ordinateur si nécessaire
5. Lancez Docker Desktop

### Installation sur macOS

1. Téléchargez Docker Desktop pour Mac depuis [le site officiel](https://www.docker.com/products/docker-desktop)
2. Faites glisser l'application Docker dans votre dossier Applications
3. Lancez Docker depuis votre dossier Applications
4. Attendez que Docker démarre (icône dans la barre de menu)

### Installation sur Linux

Pour Ubuntu/Debian :
```bash
# Mettre à jour les packages
sudo apt-get update

# Installer les prérequis
sudo apt-get install apt-transport-https ca-certificates curl software-properties-common

# Ajouter la clé GPG officielle de Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -

# Ajouter le dépôt Docker
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"

# Mettre à jour la liste des packages
sudo apt-get update

# Installer Docker
sudo apt-get install docker-ce docker-ce-cli containerd.io

# Ajouter votre utilisateur au groupe docker (pour exécuter Docker sans sudo)
sudo usermod -aG docker $USER
```

### Vérification de l'installation

Pour vérifier que Docker est correctement installé, ouvrez un terminal et exécutez :

```bash
docker --version
docker run hello-world
```

Si vous voyez un message "Hello from Docker!", l'installation est réussie.

## 4. Commandes Docker essentielles

### Gestion des images

```bash
# Lister les images disponibles localement
docker images

# Télécharger une image depuis Docker Hub
docker pull nom_image:tag

# Construire une image à partir d'un Dockerfile
docker build -t nom_image:tag .

# Supprimer une image
docker rmi nom_image:tag

# Rechercher des images sur Docker Hub
docker search terme_recherche
```

### Gestion des conteneurs

```bash
# Lister les conteneurs en cours d'exécution
docker ps

# Lister tous les conteneurs (même arrêtés)
docker ps -a

# Créer et démarrer un conteneur
docker run -d --name mon_conteneur nom_image:tag

# Arrêter un conteneur
docker stop nom_ou_id_conteneur

# Démarrer un conteneur arrêté
docker start nom_ou_id_conteneur

# Supprimer un conteneur
docker rm nom_ou_id_conteneur

# Afficher les logs d'un conteneur
docker logs nom_ou_id_conteneur

# Exécuter une commande dans un conteneur en cours d'exécution
docker exec -it nom_ou_id_conteneur commande
```

### Gestion des volumes

```bash
# Créer un volume
docker volume create nom_volume

# Lister les volumes
docker volume ls

# Supprimer un volume
docker volume rm nom_volume

# Utiliser un volume lors du lancement d'un conteneur
docker run -v nom_volume:/chemin/dans/conteneur nom_image

# Monter un répertoire de l'hôte dans un conteneur
docker run -v /chemin/hôte:/chemin/conteneur nom_image
```

### Gestion des réseaux

```bash
# Créer un réseau
docker network create nom_réseau

# Lister les réseaux
docker network ls

# Connecter un conteneur à un réseau
docker network connect nom_réseau nom_conteneur

# Déconnecter un conteneur d'un réseau
docker network disconnect nom_réseau nom_conteneur

# Supprimer un réseau
docker network rm nom_réseau
```

## 5. Création de notre premier Dockerfile

### Structure d'un Dockerfile

Un Dockerfile typique suit cette structure :

```dockerfile
# Image de base
FROM image_base:tag

# Métadonnées (optionnel)
LABEL maintainer="votre_email@exemple.com"
LABEL version="1.0"

# Variables d'environnement
ENV VARIABLE_NAME=valeur

# Répertoire de travail
WORKDIR /chemin/application

# Copie des fichiers
COPY source destination
ADD source destination

# Installation des dépendances
RUN commande_installation

# Expose des ports
EXPOSE numero_port

# Volume de données (optionnel)
VOLUME /chemin/données

# Commande par défaut au démarrage
CMD ["commande", "param1", "param2"]
# ou
ENTRYPOINT ["commande", "param1", "param2"]
```

### Bonnes pratiques pour le Dockerfile

1. **Utiliser des images officielles et spécifiques** : Préférez `node:18-alpine` à simplement `node`
2. **Minimiser le nombre de couches** : Regroupez les commandes RUN similaires avec `&&`
3. **Nettoyez après l'installation** : Supprimez les fichiers temporaires et caches
4. **Utilisez .dockerignore** : Excluez les fichiers non nécessaires
5. **Spécifiez les versions précises** : Évitez les tags `latest`
6. **Définir un utilisateur non-root** : Utilisez USER pour exécuter en tant qu'utilisateur non privilégié
7. **Utilisez les multi-stage builds** pour les applications compilées
8. **Ordonnez les instructions selon leur fréquence de changement** : Du moins fréquent au plus fréquent

### Dockerfile pour notre projet web

Voici le Dockerfile que nous avons créé pour notre projet web :

```dockerfile
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
```

**Explication ligne par ligne** :

1. `FROM nginx:alpine` : Utilise l'image officielle NGINX basée sur Alpine Linux (très légère)
2. `COPY ./ /usr/share/nginx/html/` : Copie tous les fichiers du projet dans le répertoire de publication de NGINX
3. `RUN rm /etc/nginx/conf.d/default.conf` : Supprime la configuration par défaut de NGINX
4. `COPY nginx.conf /etc/nginx/conf.d/` : Copie notre configuration personnalisée
5. `EXPOSE 80` : Informe Docker que le conteneur écoutera sur le port 80
6. `CMD ["nginx", "-g", "daemon off;"]` : Commande pour démarrer NGINX en mode premier plan (nécessaire pour Docker)

## 6. Docker Compose

### Introduction à Docker Compose

Docker Compose est un outil qui permet de définir et de gérer des applications multi-conteneurs. Il utilise un fichier YAML pour configurer les services, les réseaux et les volumes de l'application.

**Avantages de Docker Compose** :
- Définition déclarative de l'infrastructure
- Gestion simplifiée de plusieurs conteneurs
- Facilité de partage de la configuration
- Gestion du cycle de vie des conteneurs avec une seule commande

### Syntaxe du fichier docker-compose.yml

Structure de base d'un fichier docker-compose.yml :

```yaml
version: '3'  # Version de la syntaxe Docker Compose

services:      # Définition des services (conteneurs)
  service1:
    image: image_name  # Utiliser une image existante
    # ou
    build: ./path      # Construire à partir d'un Dockerfile
    ports:
      - "host_port:container_port"  # Mappage de ports
    volumes:
      - host_path:container_path    # Montage de volumes
    environment:
      - KEY=VALUE                   # Variables d'environnement
    networks:
      - network_name                # Réseaux
    depends_on:
      - service2                    # Dépendances entre services

networks:      # Définition des réseaux personnalisés
  network_name:
    driver: bridge

volumes:       # Définition des volumes persistants
  volume_name:
```

### Docker Compose pour notre projet

Voici le fichier docker-compose.yml que nous avons créé pour notre projet web :

```yaml
version: '3'

services:
  web:
    build: .
    ports:
      - "8080:80"
    volumes:
      - ./public:/usr/share/nginx/html/public
      - ./admin:/usr/share/nginx/html/admin
      - ./assets:/usr/share/nginx/html/assets
    restart: unless-stopped
```

**Explication ligne par ligne** :

1. `version: '3'` : Spécifie la version de la syntaxe Docker Compose à utiliser
2. `services:` : Début de la définition des services
3. `web:` : Nom de notre service
4. `build: .` : Construit l'image à partir du Dockerfile dans le répertoire courant
5. `ports: - "8080:80"` : Mappe le port 8080 de l'hôte vers le port 80 du conteneur
6. `volumes:` : Définit les montages de volumes
   - `./public:/usr/share/nginx/html/public` : Monte le dossier public local dans le conteneur
   - `./admin:/usr/share/nginx/html/admin` : Monte le dossier admin local dans le conteneur
   - `./assets:/usr/share/nginx/html/assets` : Monte le dossier assets local dans le conteneur
7. `restart: unless-stopped` : Politique de redémarrage (redémarre le conteneur sauf si arrêté manuellement)

## 7. Déploiement du projet web

### Préparation du projet

1. Assurez-vous que votre projet est correctement structuré
2. Vérifiez que les fichiers Dockerfile, nginx.conf et docker-compose.yml sont à la racine du projet
3. Créez un fichier .dockerignore pour exclure les fichiers non nécessaires :

```
.git
node_modules
*.log
```

### Construction et lancement des conteneurs

Pour construire et lancer votre projet avec Docker Compose :

```bash
# Construction des images (première fois ou après modification du Dockerfile)
docker-compose build

# Démarrage des conteneurs en arrière-plan
docker-compose up -d

# Voir les logs
docker-compose logs

# Arrêter les conteneurs
docker-compose down
```

### Tests et validation

Une fois votre conteneur démarré, vous pouvez accéder à votre site web à l'adresse :
http://localhost:8080

Pour vérifier que tout fonctionne correctement :
1. Testez la navigation sur toutes les pages
2. Vérifiez que les redirections fonctionnent
3. Testez le chargement des ressources (CSS, JavaScript, images)
4. Testez les fonctionnalités dynamiques (si présentes)

## 8. Bonnes pratiques et optimisations

### Optimisation des images

1. **Utiliser des images de base légères** : Préférez Alpine Linux ou Debian slim
2. **Multi-stage builds** : Séparation des étapes de build et de production
3. **Minimiser le nombre de couches** : Regroupez les commandes RUN
4. **Nettoyez les caches et fichiers temporaires**
5. **Utilisez .dockerignore** : Excluez les fichiers inutiles

Exemple d'optimisation pour une application Node.js :
```dockerfile
# Étape de build
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Étape de production
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Sécurité des conteneurs

1. **Utiliser un utilisateur non-root** :
```dockerfile
RUN addgroup -g 1000 appuser && \
    adduser -u 1000 -G appuser -s /bin/sh -D appuser
USER appuser
```

2. **Scanner les vulnérabilités** :
```bash
docker scan nom_image
```

3. **Limiter les capacités et ressources** :
```bash
docker run --cap-drop=ALL --memory=512m --cpus=0.5 nom_image
```

4. **Utiliser des secrets pour les données sensibles** :
```bash
docker-compose exec -e MYSECRET=valeur service commande
```

5. **Mettre à jour régulièrement les images** :
```bash
docker pull nom_image:tag
```

### CI/CD avec Docker

Intégration de Docker dans une pipeline CI/CD :

1. **Build automatisé** : Construire l'image Docker à chaque commit
2. **Tests dans des conteneurs** : Exécuter les tests dans un environnement isolé
3. **Publication d'images** : Publier l'image sur un registre Docker (Docker Hub, GitHub Container Registry)
4. **Déploiement automatisé** : Déployer automatiquement les nouvelles versions

Exemple avec GitHub Actions :
```yaml
name: Docker CI/CD

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build and test
        run: |
          docker-compose build
          docker-compose run --rm web npm test
      
      - name: Push to Docker Hub
        uses: docker/build-push-action@v2
        with:
          push: true
          tags: username/image:latest
```

## 9. Ressources complémentaires

### Documentation officielle

- [Documentation Docker](https://docs.docker.com/)
- [Docker Hub](https://hub.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Référence Dockerfile](https://docs.docker.com/engine/reference/builder/)

### Tutoriels recommandés

- [Docker pour les débutants](https://docker-curriculum.com/)
- [Play with Docker](https://labs.play-with-docker.com/)
- [Cours Docker sur FreeCodeCamp](https://www.freecodecamp.org/news/the-docker-handbook/)
- [Docker en pratique sur Katacoda](https://www.katacoda.com/courses/docker)

### Communauté Docker

- [Forum Docker](https://forums.docker.com/)
- [Docker Reddit](https://www.reddit.com/r/docker/)
- [StackOverflow Docker](https://stackoverflow.com/questions/tagged/docker)
- [Meetups Docker](https://www.docker.com/community/meetups/)

## 10. Fonctionnalités Docker dans notre projet

Dans cette section, nous allons explorer les fonctionnalités Docker que nous avons mises en place pour notre projet de site web avec une partie publique et une partie administrative.

### Configuration NGINX

Notre projet utilise NGINX comme serveur web, configuré pour servir à la fois le site public et l'interface d'administration.

#### Le fichier nginx.conf

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Activer la compression gzip
    gzip on;
    gzip_types text/plain text/css application/javascript image/svg+xml;
    gzip_min_length 1000;

    # Redirection de la racine vers public/index.html
    location = / {
        rewrite ^ /public/index.html last;
    }

    # Accès direct aux fichiers CSS et JS de public
    location ~ ^/public/(.+\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot))$ {
        try_files $uri =404;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # Accès à l'admin
    location ^~ /admin {
        alias /usr/share/nginx/html/admin;
        try_files $uri $uri/ /admin/admin.html =404;
    }

    # Accès aux assets depuis la partie publique
    location ~ ^/assets/ {
        try_files /public$uri $uri =404;
        expires 30d;
    }

    # Accès aux assets de l'admin
    location ~ ^/admin/assets/ {
        try_files $uri =404;
        expires 30d;
    }

    # Accès aux ressources JavaScript
    location ~ ^/js/ {
        try_files /public$uri $uri =404;
    }

    # Redirection pour tous les autres chemins vers public/
    location / {
        try_files $uri /public/$uri /public/index.html;
    }
}
```

Cette configuration NGINX offre plusieurs fonctionnalités :

1. **Compression gzip** : Réduit la taille des fichiers transmis pour améliorer les performances.
2. **Redirection intelligente** : Dirige automatiquement l'utilisateur vers les bonnes pages.
3. **Gestion des assets** : Configuration spécifique pour servir les fichiers statiques (CSS, JS, images).
4. **Séparation des environnements** : Configuration distincte pour la partie publique et administrative.
5. **Cache optimisé** : Les ressources statiques sont mises en cache pour de meilleures performances.

### Gestion des volumes dans notre projet

Notre `docker-compose.yml` configure plusieurs volumes pour persister et partager les données entre le conteneur et la machine hôte :

```yaml
volumes:
  - ./public:/usr/share/nginx/html/public
  - ./admin:/usr/share/nginx/html/admin
  - ./config:/usr/share/nginx/html/config
  - ./public/js:/usr/share/nginx/html/js
  - ./public/assets:/usr/share/nginx/html/public/assets
  - ./public/views:/usr/share/nginx/html/views
  - ./_redirects:/usr/share/nginx/html/_redirects
```

Avantages de cette configuration :

1. **Développement en temps réel** : Les modifications apportées aux fichiers sur la machine hôte sont immédiatement disponibles dans le conteneur sans nécessiter de reconstruction.
2. **Persistance des données** : Les données restent intactes même si le conteneur est supprimé ou recréé.
3. **Organisation claire** : Chaque type de contenu (public, admin, assets) est monté séparément pour une meilleure organisation.
4. **Sécurité améliorée** : Les fichiers sensibles peuvent être isolés et gérés séparément.

### Déploiement du site web et de l'administration

Notre Dockerfile est conçu pour créer une image légère et efficace :

```dockerfile
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
```

Caractéristiques de notre déploiement :

1. **Image de base légère** : Utilisation de `nginx:alpine` pour une empreinte minimale.
2. **Configuration personnalisée** : Remplacement de la configuration NGINX par défaut.
3. **Exposition de port** : Le port 80 est exposé pour l'accès web.
4. **Mappage de port** : Dans docker-compose.yml, le port 8080 de l'hôte est mappé vers le port 80 du conteneur.
5. **Redémarrage automatique** : Le conteneur redémarre automatiquement (sauf arrêt manuel).

### Résolution des problèmes courants

Lors de la mise en place de notre environnement Docker, nous avons rencontré et résolu plusieurs problèmes courants :

1. **Problèmes d'accès aux fichiers statiques** :
   - Symptôme : Les styles CSS ne s'affichaient pas correctement.
   - Solution : Correction des directives `try_files` dans la configuration NGINX pour chercher les fichiers au bon endroit.

2. **Conflits de montage de volumes** :
   - Symptôme : Certains fichiers n'étaient pas accessibles ou étaient dupliqués.
   - Solution : Simplification des montages de volumes pour éviter les redondances et les conflits.

3. **Problèmes d'accès à l'administration** :
   - Symptôme : La section admin n'était pas accessible.
   - Solution : Ajout d'une directive `alias` dans la configuration NGINX pour le chemin `/admin`.

4. **Mise en cache des ressources** :
   - Amélioration : Ajout des directives `expires` et `Cache-Control` pour optimiser le chargement des pages.

## Prochaines fonctionnalités à implémenter

Dans les prochaines versions de notre projet, nous prévoyons d'implémenter les fonctionnalités Docker suivantes :

1. **Multi-conteneurs** : Séparation du frontend et du backend dans des conteneurs distincts.
2. **Base de données** : Ajout d'un conteneur pour la base de données (MySQL, PostgreSQL ou MongoDB).
3. **Environnements de développement et de production** : Configuration spécifique pour chaque environnement.
4. **CI/CD** : Mise en place d'un pipeline d'intégration et de déploiement continu.
5. **Surveillance** : Ajout d'outils de monitoring (Prometheus, Grafana).

Cette section sera mise à jour au fur et à mesure que nous ajouterons de nouvelles fonctionnalités Docker à notre projet. 