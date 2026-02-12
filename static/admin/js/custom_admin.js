// Custom JavaScript to fix Jazzmin tab navigation
// Save this as: static/admin/js/custom_admin.js

(function() {
    'use strict';

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTabs);
    } else {
        initTabs();
    }

    function initTabs() {
        // Initialize Bootstrap tabs if not already initialized
        const tabLinks = document.querySelectorAll('.nav-tabs a[data-toggle="tab"], .nav-tabs a[data-bs-toggle="tab"]');

        tabLinks.forEach(function(tabLink) {
            // Remove any existing click handlers
            const newTabLink = tabLink.cloneNode(true);
            tabLink.parentNode.replaceChild(newTabLink, tabLink);

            // Add new click handler
            newTabLink.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                console.log('Tab clicked:', this.getAttribute('href'));

                // Get target pane
                const targetId = this.getAttribute('href');

                if (!targetId) return;

                // Remove active from all tabs in this group
                const tabContainer = this.closest('.nav-tabs');
                tabContainer.querySelectorAll('.nav-link').forEach(function(link) {
                    link.classList.remove('active');
                    link.setAttribute('aria-selected', 'false');
                });

                // Add active to clicked tab
                this.classList.add('active');
                this.setAttribute('aria-selected', 'true');

                // Find tab content container
                const tabContent = tabContainer.parentElement.querySelector('.tab-content');

                if (tabContent) {
                    // Hide all panes
                    tabContent.querySelectorAll('.tab-pane').forEach(function(pane) {
                        pane.classList.remove('show', 'active');
                    });

                    // Show target pane
                    const targetPane = document.querySelector(targetId);
                    if (targetPane) {
                        targetPane.classList.add('show', 'active');
                    }
                }

                return false;
            });
        });

        console.log('Tabs initialized:', tabLinks.length);
    }

    // Reinitialize on AJAX requests (for inline editing)
    document.addEventListener('DOMNodeInserted', function(e) {
        if (e.target.classList && e.target.classList.contains('nav-tabs')) {
            setTimeout(initTabs, 100);
        }
    });
})();