// Amélioration de l'accessibilité pour Juniver Santé

/**
 * Gestion accessible du carousel
 */
class AccessibleCarousel {
  constructor(carouselSelector) {
    this.carousel = document.querySelector(carouselSelector);
    if (!this.carousel) return;

    this.prevBtn = this.carousel.querySelector('#prev-profile');
    this.nextBtn = this.carousel.querySelector('#next-profile');
    this.content = this.carousel.querySelector('#profiles-content');
    
    this.init();
  }

  init() {
    // Ajouter la navigation au clavier
    if (this.prevBtn) {
      this.prevBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.prevBtn.click();
        }
      });
    }

    if (this.nextBtn) {
      this.nextBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.nextBtn.click();
        }
      });
    }

    // Annoncer les changements pour les lecteurs d'écran
    this.announceChanges();
  }

  announceChanges() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && this.content) {
          this.content.setAttribute('aria-live', 'polite');
        }
      });
    });

    if (this.content) {
      observer.observe(this.content, { childList: true, subtree: true });
    }
  }
}

/**
 * Validation accessible des formulaires
 */
class AccessibleFormValidator {
  constructor(formSelector) {
    this.form = document.querySelector(formSelector);
    if (!this.form) return;

    this.init();
  }

  init() {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    
    // Validation en temps réel
    const inputs = this.form.querySelectorAll('input, textarea');
    inputs.forEach(input => {
      input.addEventListener('blur', () => this.validateField(input));
      input.addEventListener('input', () => this.clearErrors(input));
    });
  }

  handleSubmit(e) {
    e.preventDefault();
    
    const isValid = this.validateForm();
    
    if (isValid) {
      // Formulaire valide, procéder à l'envoi
      this.form.submit();
    } else {
      // Focus sur le premier champ en erreur
      const firstError = this.form.querySelector('[aria-invalid="true"]');
      if (firstError) {
        firstError.focus();
      }
    }
  }

  validateForm() {
    const inputs = this.form.querySelectorAll('input[required], textarea[required]');
    let isValid = true;

    inputs.forEach(input => {
      if (!this.validateField(input)) {
        isValid = false;
      }
    });

    return isValid;
  }

  validateField(input) {
    const value = input.value.trim();
    const fieldName = input.name;
    const errorElement = document.getElementById(`${fieldName}-error`);
    
    let errorMessage = '';
    let isValid = true;

    // Validation des champs requis
    if (input.hasAttribute('required') && !value) {
      errorMessage = `Le champ ${this.getFieldLabel(input)} est obligatoire.`;
      isValid = false;
    }
    
    // Validation email
    if (input.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errorMessage = 'Veuillez saisir une adresse email valide.';
        isValid = false;
      }
    }

    // Mettre à jour l'état du champ
    input.setAttribute('aria-invalid', isValid ? 'false' : 'true');
    
    if (errorElement) {
      errorElement.textContent = errorMessage;
      errorElement.setAttribute('aria-live', 'polite');
    }

    return isValid;
  }

  clearErrors(input) {
    const fieldName = input.name;
    const errorElement = document.getElementById(`${fieldName}-error`);
    
    if (errorElement && input.value.trim()) {
      errorElement.textContent = '';
      input.setAttribute('aria-invalid', 'false');
    }
  }

  getFieldLabel(input) {
    const label = this.form.querySelector(`label[for="${input.id}"]`);
    if (label) {
      return label.textContent.replace('*', '').trim();
    }
    return input.name;
  }
}

/**
 * Gestion accessible des onglets de filtres
 */
class AccessibleTabs {
  constructor(tabsSelector) {
    this.tabsContainer = document.querySelector(tabsSelector);
    if (!this.tabsContainer) return;

    this.tabs = this.tabsContainer.querySelectorAll('[role="tab"]');
    this.panels = document.querySelectorAll('[role="tabpanel"]');
    
    this.init();
  }

  init() {
    this.tabs.forEach((tab, index) => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        this.selectTab(tab);
      });

      tab.addEventListener('keydown', (e) => {
        this.handleKeyPress(e, index);
      });
    });
  }

  selectTab(selectedTab) {
    // Désactiver tous les onglets
    this.tabs.forEach(tab => {
      tab.setAttribute('aria-selected', 'false');
      tab.classList.remove('active');
    });

    // Activer l'onglet sélectionné
    selectedTab.setAttribute('aria-selected', 'true');
    selectedTab.classList.add('active');

    // Annoncer le changement
    this.announceTabChange(selectedTab);
  }

  handleKeyPress(e, currentIndex) {
    let newIndex = currentIndex;

    switch (e.key) {
      case 'ArrowLeft':
        newIndex = currentIndex > 0 ? currentIndex - 1 : this.tabs.length - 1;
        break;
      case 'ArrowRight':
        newIndex = currentIndex < this.tabs.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = this.tabs.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    this.tabs[newIndex].focus();
    this.selectTab(this.tabs[newIndex]);
  }

  announceTabChange(tab) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = `Filtre ${tab.textContent} sélectionné`;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }
}

/**
 * Initialisation des améliorations d'accessibilité
 */
document.addEventListener('DOMContentLoaded', () => {
  // Initialiser le carousel accessible
  new AccessibleCarousel('#profiles-carousel');
  
  // Initialiser la validation de formulaire accessible
  new AccessibleFormValidator('#contact-form');
  
  // Initialiser les onglets accessibles
  new AccessibleTabs('#category-list');

  // Améliorer le menu burger pour l'accessibilité
  const menuToggle = document.getElementById('menu-toggle');
  const menuLabel = document.querySelector('label[for="menu-toggle"]');
  
  if (menuToggle && menuLabel) {
    menuToggle.addEventListener('change', () => {
      const isOpen = menuToggle.checked;
      menuLabel.setAttribute('aria-expanded', isOpen.toString());
      menuLabel.setAttribute('aria-label', isOpen ? 'Fermer le menu de navigation' : 'Ouvrir le menu de navigation');
    });
  }

  // Gestion du skip link
  const skipLink = document.querySelector('.skip-to-content');
  if (skipLink) {
    skipLink.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(skipLink.getAttribute('href'));
      if (target) {
        target.focus();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
});

// Export pour utilisation modulaire
export { AccessibleCarousel, AccessibleFormValidator, AccessibleTabs }; 