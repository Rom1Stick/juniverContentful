/**
 * Animations premium pour Juniver Santé
 * Script qui ajoute des animations et interactions sophistiquées à l'interface
 */

document.addEventListener('DOMContentLoaded', () => {
    // Animation au défilement pour les différents types d'animations
    const animateOnScroll = () => {
        const elements = {
            fadeIn: document.querySelectorAll('.animate-fadeIn'),
            scale: document.querySelectorAll('.animate-scale'),
            left: document.querySelectorAll('.animate-left'),
            right: document.querySelectorAll('.animate-right')
        };
        
        const applyAnimation = (element, threshold = 100) => {
            const elementPosition = element.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            // Si l'élément est visible dans la fenêtre
            if (elementPosition < windowHeight - threshold) {
                element.style.opacity = '1';
                element.style.transform = element.classList.contains('animate-scale') 
                    ? 'scale(1)' 
                    : element.classList.contains('animate-left')
                        ? 'translateX(0)'
                        : element.classList.contains('animate-right')
                            ? 'translateX(0)'
                            : 'translateY(0)';
            }
        };
        
        // Appliquer les animations pour chaque type
        Object.values(elements).forEach(group => {
            group.forEach(element => applyAnimation(element));
        });
    };

    // Effet parallaxe pour le fond et les éléments
    const parallaxEffect = () => {
        const presentationSection = document.getElementById('presentation');
        const scrollPosition = window.pageYOffset;
        
        if (presentationSection) {
            // Effet parallaxe subtil pour le fond
            presentationSection.style.backgroundPosition = `center ${scrollPosition * 0.05}px`;
            
            // Effet de profondeur pour certains éléments
            const title = presentationSection.querySelector('h2');
            if (title) {
                title.style.transform = `translateY(${scrollPosition * 0.03}px)`;
            }
        }
        
        // Effet parallaxe pour d'autres sections au défilement
        const featuredArticle = document.getElementById('featured-article');
        if (featuredArticle) {
            const offset = featuredArticle.offsetTop;
            const relativeScroll = scrollPosition - offset + 500;
            
            if (relativeScroll > 0) {
                featuredArticle.style.transform = `translateY(${Math.min(relativeScroll * 0.02, 20)}px)`;
            }
        }
    };

    // Animation du header au défilement avec transition élégante
    const headerAnimation = () => {
        const header = document.querySelector('.header-website');
        
        if (window.scrollY > 100) {
            header.classList.add('header-scrolled');
        } else {
            header.classList.remove('header-scrolled');
        }
    };

    // Gestion avancée du carrousel de profils
    const initCarousel = () => {
        const prevBtn = document.getElementById('prev-profile');
        const nextBtn = document.getElementById('next-profile');
        const profilesContent = document.getElementById('profiles-content');
        const loadingText = profilesContent?.querySelector('.loading-text');
        
        if (!prevBtn || !nextBtn || !profilesContent) return;
        
        // Masquer le texte de chargement si des profils sont présents
        const profileItems = profilesContent.querySelectorAll('.profile-item');
        if (profileItems.length > 0 && loadingText) {
            loadingText.style.display = 'none';
        }
        
        let currentPosition = 0;
        let itemWidth = 0;
        let maxPosition = 0;
        
        // Fonction pour calculer les dimensions
        const calculateDimensions = () => {
            const profileItems = profilesContent.querySelectorAll('.profile-item');
            if (profileItems.length === 0) return;
            
            itemWidth = profileItems[0].offsetWidth;
            maxPosition = (profileItems.length - 1) * itemWidth;
            
            // Ajuster la largeur pour le mode mobile
            if (window.innerWidth < 768) {
                maxPosition = Math.max(0, (profileItems.length * itemWidth) - profilesContent.offsetWidth);
            }
        };
        
        // Fonction pour mettre à jour la position du carrousel avec easing
        const updateCarouselPosition = () => {
            calculateDimensions();
            
            if (currentPosition < 0) currentPosition = 0;
            if (currentPosition > maxPosition) currentPosition = maxPosition;
            
            profilesContent.style.transform = `translateX(-${currentPosition}px)`;
        };
        
        // Écouteurs d'événement pour les boutons avec animation fluide
        prevBtn.addEventListener('click', () => {
            calculateDimensions();
            currentPosition = Math.max(0, currentPosition - itemWidth);
            updateCarouselPosition();
        });
        
        nextBtn.addEventListener('click', () => {
            calculateDimensions();
            currentPosition = Math.min(maxPosition, currentPosition + itemWidth);
            updateCarouselPosition();
        });
        
        // Gérer le redimensionnement de la fenêtre
        window.addEventListener('resize', () => {
            calculateDimensions();
            currentPosition = Math.min(currentPosition, maxPosition);
            updateCarouselPosition();
        });
        
        // Initialiser les dimensions
        calculateDimensions();
    };

    // Filtres dynamiques pour les articles avec animations
    const initFilters = () => {
        const categoryList = document.getElementById('category-list');
        const contentSection = document.getElementById('content');
        const loadingText = contentSection?.querySelector('.loading-text');
        
        if (!categoryList || !contentSection) return;
        
        // Masquer le texte de chargement si des articles sont présents
        const articles = contentSection.querySelectorAll('.article-card');
        if (articles.length > 0 && loadingText) {
            loadingText.style.display = 'none';
        }
        
        categoryList.addEventListener('click', (e) => {
            if (e.target.tagName === 'LI') {
                // Suppression de la classe active sur tous les filtres
                categoryList.querySelectorAll('li').forEach(li => {
                    li.classList.remove('active');
                });
                
                // Ajout de la classe active sur le filtre cliqué
                e.target.classList.add('active');
                
                // Filtrage des articles avec animation fluide
                const category = e.target.getAttribute('data-category');
                
                articles.forEach(article => {
                    // Animation de sortie
                    article.style.opacity = '0';
                    article.style.transform = 'translateY(20px)';
                    
                    setTimeout(() => {
                        if (category === 'all' || article.getAttribute('data-category') === category) {
                            article.style.display = 'block';
                            // Animation d'entrée
                            setTimeout(() => {
                                article.style.opacity = '1';
                                article.style.transform = 'translateY(0)';
                            }, 50);
                        } else {
                            article.style.display = 'none';
                        }
                    }, 300);
                });
            }
        });
    };

    // Initialisation des animations au chargement de la page
    window.addEventListener('scroll', () => {
        requestAnimationFrame(() => {
            animateOnScroll();
            parallaxEffect();
            headerAnimation();
        });
    });
    
    // Déclencher une fois au chargement
    setTimeout(() => {
        animateOnScroll();
        headerAnimation();
    }, 100);
    
    initCarousel();
    initFilters();
    
    // Animation au survol des cartes et boutons
    const initHoverEffects = () => {
        // Effets de survol améliorés pour les cartes d'articles
        const articleCards = document.querySelectorAll('.article-card');
        articleCards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-8px)';
                card.style.boxShadow = '0 20px 45px var(--shadow-medium)';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = '0 12px 35px var(--shadow-light)';
            });
        });
        
        // Effets de survol pour les boutons
        const buttons = document.querySelectorAll('.read-more, .carousel-nav');
        buttons.forEach(button => {
            button.addEventListener('mouseenter', () => {
                button.style.transform = 'translateY(-3px)';
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.transform = 'translateY(0)';
            });
        });
    };
    
    initHoverEffects();
}); 