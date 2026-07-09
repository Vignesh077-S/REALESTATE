/* ==========================================================================
   Srinivasan Realestate - Interactive Form & Owner Lead Dashboard Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------------------
    // Configuration & State
    // -------------------------------------------------------------------------
    const ADMIN_PIN = "0000"; // Security PIN for owner dashboard
    const MAX_ATTEMPTS = 3; // Maximum failed attempts allowed
    let currentStep = 1;
    let leads = JSON.parse(localStorage.getItem('srinivasan_leads')) || [];
    
    // Check failed attempts from localStorage
    let failedAttempts = parseInt(localStorage.getItem('portal_failed_attempts')) || 0;
    let portalDisabled = failedAttempts >= MAX_ATTEMPTS;

    // -------------------------------------------------------------------------
    // DOM Elements
    // -------------------------------------------------------------------------
    // Form Navigation Elements
    const form = document.getElementById('requirement-form');
    const formSteps = document.querySelectorAll('.form-step');
    const stepNodes = document.querySelectorAll('.step-node');
    const progressLine = document.getElementById('progress-line');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');

    // Dynamic Fields (Step 2)
    const propertyTypeRadios = document.getElementsByName('propertyType');
    const specLandFields = document.getElementById('spec-land-fields');
    const specHouseFields = document.getElementById('spec-house-fields');
    const specBothFields = document.getElementById('spec-both-fields');

    // Budget Slider & Manual Input
    const budgetSlider = document.getElementById('budget-slider');
    const budgetValue = document.getElementById('budget-value');
    const manualBudget = document.getElementById('manual-budget');

    // Validation Fields
    const clientNameInput = document.getElementById('client-name');
    const clientPhoneInput = document.getElementById('client-phone');
    const clientEmailInput = document.getElementById('client-email');

    // Modals
    const successModal = document.getElementById('success-modal');
    const successClientName = document.getElementById('success-client-name');
    const successContactPref = document.getElementById('success-contact-pref');
    const successCloseBtn = document.getElementById('success-close-btn');

    const pinModal = document.getElementById('pin-modal');
    const pinForm = document.getElementById('pin-form');
    const adminPinInput = document.getElementById('admin-pin');
    const pinError = document.getElementById('pin-error');
    const pinCancelBtn = document.getElementById('pin-cancel-btn');

    // Admin Dashboard Toggle
    const adminToggleBtn = document.getElementById('admin-toggle-btn');
    const adminSection = document.getElementById('admin-section');
    const closeAdminBtn = document.getElementById('close-admin-btn');
    const leadsList = document.getElementById('leads-list');
    const exportLeadsBtn = document.getElementById('export-leads-btn');

    // Admin Search & Filters
    const leadSearch = document.getElementById('lead-search');
    const filterType = document.getElementById('filter-type');
    const filterStatus = document.getElementById('filter-status');

    // Admin Metrics
    const metricTotal = document.getElementById('metric-total');
    const metricNew = document.getElementById('metric-new');
    const metricContacted = document.getElementById('metric-contacted');

    // Toast Container
    const toastContainer = document.getElementById('toast-container');

    // Initialize UI
    updateStepUI();
    updateBudgetDisplay(budgetSlider.value);
    initializeDemoLeads();
    
    // Check and disable portal if max attempts reached
    if (portalDisabled) {
        adminToggleBtn.disabled = true;
        adminToggleBtn.style.opacity = '0.5';
        adminToggleBtn.style.cursor = 'not-allowed';
        adminToggleBtn.title = 'Owner Portal disabled due to too many failed login attempts';
        showToast('Owner Portal is disabled. Too many failed login attempts.', 'error');
    }

    // -------------------------------------------------------------------------
    // Toast Notification System
    // -------------------------------------------------------------------------
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = '<i class="fa-solid fa-circle-info"></i>';
        if (type === 'success') icon = '<i class="fa-solid fa-circle-check"></i>';
        if (type === 'error') icon = '<i class="fa-solid fa-circle-exclamation"></i>';
        
        toast.innerHTML = `${icon} <span>${message}</span>`;
        toastContainer.appendChild(toast);

        // Slide out and remove
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3500);
    }

    // -------------------------------------------------------------------------
    // Form Dynamic Specifications (Step 1 -> Step 2 transition)
    // -------------------------------------------------------------------------
    function getSelectedPropertyType() {
        for (let i = 0; i < propertyTypeRadios.length; i++) {
            if (propertyTypeRadios[i].checked) {
                return propertyTypeRadios[i].value;
            }
        }
        return null;
    }

    // Monitor radio select triggers to toggle form input groups
    function updateSpecFieldsVisibility() {
        const selectedType = getSelectedPropertyType();
        
        // Hide all specification groups first
        specLandFields.classList.add('hidden');
        specHouseFields.classList.add('hidden');
        specBothFields.classList.add('hidden');

        // Show matching group
        if (selectedType === 'Land') {
            specLandFields.classList.remove('hidden');
        } else if (selectedType === 'House') {
            specHouseFields.classList.remove('hidden');
        } else if (selectedType === 'Both') {
            specBothFields.classList.remove('hidden');
        }
    }

    // Add listeners to Property Type cards
    propertyTypeRadios.forEach(radio => {
        radio.addEventListener('change', updateSpecFieldsVisibility);
    });

    // -------------------------------------------------------------------------
    // Budget & Slider Syncing
    // -------------------------------------------------------------------------
    function formatCurrency(value) {
        return parseInt(value).toLocaleString();
    }

    function updateBudgetDisplay(value) {
        budgetValue.textContent = formatCurrency(value);
    }

    budgetSlider.addEventListener('input', (e) => {
        updateBudgetDisplay(e.target.value);
        manualBudget.value = ''; // Clear manual value if slider is dragged
    });

    manualBudget.addEventListener('input', (e) => {
        const val = e.target.value;
        if (val && val > 0) {
            updateBudgetDisplay(val);
            if (val <= budgetSlider.max && val >= budgetSlider.min) {
                budgetSlider.value = val;
            }
        } else {
            updateBudgetDisplay(budgetSlider.value);
        }
    });

    // -------------------------------------------------------------------------
    // Form Navigation & Validation
    // -------------------------------------------------------------------------
    function updateStepUI() {
        // Toggle step section visibility
        formSteps.forEach((step, index) => {
            if (index + 1 === currentStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });

        // Toggle progress nodes classes
        stepNodes.forEach((node, index) => {
            const stepNum = index + 1;
            node.classList.remove('active', 'completed');
            
            if (stepNum === currentStep) {
                node.classList.add('active');
            } else if (stepNum < currentStep) {
                node.classList.add('completed');
            }
        });

        // Update indicator line
        const container = document.querySelector('.form-card-container');
        if (container) {
            container.setAttribute('data-active-step', currentStep);
        }

        // Adjust navigation button visibility
        if (currentStep === 1) {
            prevBtn.classList.add('hidden');
            nextBtn.classList.remove('hidden');
            submitBtn.classList.add('hidden');
        } else if (currentStep === 4) {
            prevBtn.classList.remove('hidden');
            nextBtn.classList.add('hidden');
            submitBtn.classList.remove('hidden');
        } else {
            prevBtn.classList.remove('hidden');
            nextBtn.classList.remove('hidden');
            submitBtn.classList.add('hidden');
        }
    }

    function validateStep(step) {
        let isValid = true;

        if (step === 1) {
            // Must select a property type
            const selectedType = getSelectedPropertyType();
            if (!selectedType) {
                showToast("Please select a property type to proceed.", "error");
                isValid = false;
            }
        } else if (step === 2) {
            // Validation of inputs depending on type
            const type = getSelectedPropertyType();
            if (type === 'Land') {
                const landSize = document.getElementById('land-size').value;
                const landZoning = document.getElementById('land-zoning').value;
                if (!landSize) {
                    showToast("Please enter land size preference.", "error");
                    isValid = false;
                }
            } else if (type === 'House') {
                const houseStyle = document.getElementById('house-type').value;
                if (!houseStyle) {
                    showToast("Please select your preferred house style.", "error");
                    isValid = false;
                }
            } else if (type === 'Both') {
                const bothLandSize = document.getElementById('both-land-size').value;
                const bothHouseSize = document.getElementById('both-house-size').value;
                if (!bothLandSize || !bothHouseSize) {
                    showToast("Please fill out preferred plot size and house layout size.", "error");
                    isValid = false;
                }
            }
        } else if (step === 3) {
            // No strict validation required here, range slider has default values
        } else if (step === 4) {
            // Name and Phone are required
            const clientNameField = clientNameInput.parentElement.parentElement;
            const clientPhoneField = clientPhoneInput.parentElement.parentElement;
            
            // Name check
            if (!clientNameInput.value.trim()) {
                clientNameField.classList.add('has-error');
                isValid = false;
            } else {
                clientNameField.classList.remove('has-error');
            }

            // Phone check (basic validation)
            if (!clientPhoneInput.value.trim() || clientPhoneInput.value.trim().length < 7) {
                clientPhoneField.classList.add('has-error');
                isValid = false;
            } else {
                clientPhoneField.classList.remove('has-error');
            }

            // Email check (optional but must be valid if entered)
            const emailVal = clientEmailInput.value.trim();
            const clientEmailField = clientEmailInput.parentElement.parentElement;
            if (emailVal) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(emailVal)) {
                    clientEmailField.classList.add('has-error');
                    isValid = false;
                } else {
                    clientEmailField.classList.remove('has-error');
                }
            } else {
                clientEmailField.classList.remove('has-error');
            }
        }

        return isValid;
    }

    nextBtn.addEventListener('click', () => {
        if (validateStep(currentStep)) {
            currentStep++;
            updateStepUI();
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentStep > 1) {
            currentStep--;
            updateStepUI();
        }
    });

    // -------------------------------------------------------------------------
    // Form Submission & Persistence
    // -------------------------------------------------------------------------
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Final step validation
        if (!validateStep(4)) {
            return;
        }

        // Get Property Type
        const propertyType = getSelectedPropertyType();
        
        // Build Specs object based on selection
        let specifications = {};
        if (propertyType === 'Land') {
            const size = document.getElementById('land-size').value;
            const unit = document.getElementById('land-size-unit').value;
            const zoning = document.getElementById('land-zoning').value;
            const locationCheckboxes = document.querySelectorAll('input[name="landLocationPref"]:checked');
            const locations = Array.from(locationCheckboxes).map(cb => cb.value);

            specifications = {
                size: size,
                unit: unit,
                zoning: zoning,
                locationPreferences: locations.join(', ') || 'Any'
            };
        } else if (propertyType === 'House') {
            const bhkRadio = document.querySelector('input[name="houseBhk"]:checked');
            const bhk = bhkRadio ? bhkRadio.value : '3';
            const style = document.getElementById('house-type').value;
            const floors = document.getElementById('house-floors').value;
            const furnishing = document.getElementById('house-furnishing').value;

            specifications = {
                bhk: bhk,
                style: style,
                floors: floors,
                furnishing: furnishing
            };
        } else if (propertyType === 'Both') {
            const landSize = document.getElementById('both-land-size').value;
            const landUnit = document.getElementById('both-land-size-unit').value;
            const houseSize = document.getElementById('both-house-size').value;
            const bhkRadio = document.querySelector('input[name="bothHouseBhk"]:checked');
            const bhk = bhkRadio ? bhkRadio.value : '3';
            const locality = document.getElementById('both-locality').value || 'Any';

            specifications = {
                landSize: landSize,
                landUnit: landUnit,
                houseSize: houseSize,
                bhk: bhk,
                locality: locality
            };
        }

        // Budget Calculations
        let budget = budgetSlider.value;
        if (manualBudget.value && manualBudget.value > 0) {
            budget = manualBudget.value;
        }

        const timelineRadio = document.querySelector('input[name="timeline"]:checked');
        const timeline = timelineRadio ? timelineRadio.value : 'Immediate';

        // Customer details
        const contactPref = document.getElementById('pref-contact').value;
        const additionalNotes = document.getElementById('additional-notes').value;

        // Assembly of single Lead record
        const newLead = {
            id: 'lead_' + Date.now(),
            date: new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            timestamp: Date.now(),
            clientName: clientNameInput.value.trim(),
            clientPhone: clientPhoneInput.value.trim(),
            clientEmail: clientEmailInput.value.trim() || 'N/A',
            propertyType: propertyType,
            specifications: specifications,
            maxBudget: budget,
            timeline: timeline,
            contactPref: contactPref,
            additionalNotes: additionalNotes.trim() || 'None',
            status: 'New'
        };

        // Save to leads array and localStorage
        leads.unshift(newLead); // Add new lead to the beginning of the list
        localStorage.setItem('srinivasan_leads', JSON.stringify(leads));

        // Update Metrics and Re-render admin board
        updateAdminMetrics();
        renderLeadsTable();

        // Display Success Modal
        successClientName.textContent = newLead.clientName;
        successContactPref.textContent = newLead.contactPref;
        successModal.classList.remove('hidden');

        // Reset form variables and steps
        form.reset();
        currentStep = 1;
        updateStepUI();
        updateBudgetDisplay(budgetSlider.value);
        
        // Hide Step 2 custom panels
        specLandFields.classList.add('hidden');
        specHouseFields.classList.add('hidden');
        specBothFields.classList.add('hidden');
    });

    // Close success modal button
    successCloseBtn.addEventListener('click', () => {
        successModal.classList.add('hidden');
    });

    // -------------------------------------------------------------------------
    // Security PIN Verification & Modal
    // -------------------------------------------------------------------------
    adminToggleBtn.addEventListener('click', () => {
        // Check if portal is disabled
        if (portalDisabled) {
            showToast('Owner Portal is disabled due to too many failed attempts.', 'error');
            return;
        }
        
        // Toggle view logic: If dashboard already open, close it, else authenticate
        if (!adminSection.classList.contains('hidden')) {
            adminSection.classList.add('hidden');
            adminToggleBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Owner Portal';
            adminToggleBtn.classList.remove('btn-gold');
            adminToggleBtn.classList.add('btn-outline-gold');
            showToast("Owner Dashboard closed.", "info");
        } else {
            pinModal.classList.remove('hidden');
            adminPinInput.focus();
            // Display attempt counter if there are previous failed attempts
            if (failedAttempts > 0) {
                const attemptsLeft = MAX_ATTEMPTS - failedAttempts;
                pinError.textContent = `Attempts remaining: ${attemptsLeft}`;
                pinError.style.display = 'block';
                pinError.style.color = 'var(--color-text-muted)';
            }
        }
    });

    pinCancelBtn.addEventListener('click', () => {
        pinModal.classList.add('hidden');
        adminPinInput.value = '';
        pinError.style.display = 'none';
        pinError.style.color = 'var(--color-error)';
        pinError.textContent = 'Incorrect PIN. Try again.';
    });

    pinForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        console.log('PIN Form submitted. Input:', adminPinInput.value, 'Expected:', ADMIN_PIN);
        console.log('Before: failedAttempts =', failedAttempts);
        
        if (adminPinInput.value === ADMIN_PIN) {
            // Access granted - reset failed attempts
            failedAttempts = 0;
            localStorage.setItem('portal_failed_attempts', '0');
            console.log('PIN correct. localStorage set to 0');
            portalDisabled = false;
            
            pinModal.classList.add('hidden');
            adminPinInput.value = '';
            pinError.style.display = 'none';
            pinError.style.color = 'var(--color-error)';
            pinError.textContent = 'Incorrect PIN. Try again.';
            
            // Open Dashboard
            adminSection.classList.remove('hidden');
            adminToggleBtn.innerHTML = '<i class="fa-solid fa-lock-open"></i> Close Dashboard';
            adminToggleBtn.classList.add('btn-gold');
            adminToggleBtn.classList.remove('btn-outline-gold');
            
            // Scroll to dashboard
            adminSection.scrollIntoView({ behavior: 'smooth' });
            
            // Render lead listings
            updateAdminMetrics();
            renderLeadsTable();
            showToast("Authenticated. Welcome back, Owner!", "success");
        } else {
            // Access denied - increment failed attempts
            failedAttempts++;
            console.log('PIN incorrect. After increment: failedAttempts =', failedAttempts);
            localStorage.setItem('portal_failed_attempts', failedAttempts.toString());
            console.log('localStorage saved:', localStorage.getItem('portal_failed_attempts'));
            
            adminPinInput.value = '';
            pinError.style.color = 'var(--color-error)';
            pinError.textContent = `Incorrect PIN. Try again.`;
            pinError.style.display = 'block';
            
            const attemptsLeft = MAX_ATTEMPTS - failedAttempts;
            
            if (failedAttempts >= MAX_ATTEMPTS) {
                // Portal is now disabled
                portalDisabled = true;
                adminToggleBtn.disabled = true;
                adminToggleBtn.style.opacity = '0.5';
                adminToggleBtn.style.cursor = 'not-allowed';
                adminToggleBtn.title = 'Owner Portal disabled due to too many failed login attempts';
                
                // Close the modal and show error
                setTimeout(() => {
                    pinModal.classList.add('hidden');
                    showToast('Owner Portal disabled! Too many failed login attempts.', 'error');
                }, 500);
            } else {
                showToast(`Invalid PIN. ${attemptsLeft} attempt${attemptsLeft > 1 ? 's' : ''} remaining.`, "error");
                // Update the error message with attempts left
                pinError.textContent = `Incorrect PIN. Attempts remaining: ${attemptsLeft}`;
            }
        }
    });

    // Reset error when typing
    adminPinInput.addEventListener('input', () => {
        // Don't hide the attempts counter message
        if (!pinError.textContent.includes('remaining')) {
            pinError.style.display = 'none';
        }
    });

    closeAdminBtn.addEventListener('click', () => {
        adminSection.classList.add('hidden');
        adminToggleBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Owner Portal';
        adminToggleBtn.classList.remove('btn-gold');
        adminToggleBtn.classList.add('btn-outline-gold');
    });

    // -------------------------------------------------------------------------
    // Admin Lead Dashboard Management (CRUD & Views)
    // -------------------------------------------------------------------------
    function updateAdminMetrics() {
        metricTotal.textContent = leads.length;
        metricNew.textContent = leads.filter(l => l.status === 'New').length;
        metricContacted.textContent = leads.filter(l => l.status === 'Contacted').length;
    }

    function renderLeadsTable() {
        // Clear body
        leadsList.innerHTML = '';

        // Get filter inputs
        const searchQuery = leadSearch.value.toLowerCase().trim();
        const typeSelect = filterType.value;
        const statusSelect = filterStatus.value;

        // Perform filters
        const filteredLeads = leads.filter(lead => {
            // Search query matches client Name, Phone, Email, or Locality
            const matchesSearch = lead.clientName.toLowerCase().includes(searchQuery) ||
                                  lead.clientPhone.includes(searchQuery) ||
                                  lead.clientEmail.toLowerCase().includes(searchQuery) ||
                                  (lead.additionalNotes && lead.additionalNotes.toLowerCase().includes(searchQuery)) ||
                                  (lead.specifications.locality && lead.specifications.locality.toLowerCase().includes(searchQuery));

            // Property type match
            const matchesType = typeSelect === 'All' || lead.propertyType === typeSelect;

            // Status match
            const matchesStatus = statusSelect === 'All' || lead.status === statusSelect;

            return matchesSearch && matchesType && matchesStatus;
        });

        // Handle empty table states
        if (filteredLeads.length === 0) {
            leadsList.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fa-regular fa-folder-open"></i>
                        <p>No requirement submissions match your search/filters.</p>
                    </td>
                </tr>
            `;
            return;
        }

        // Render rows
        filteredLeads.forEach(lead => {
            const tr = document.createElement('tr');
            
            // Style badge depending on type
            let propertyTypeBadge = '';
            if (lead.propertyType === 'Land') {
                propertyTypeBadge = `<span class="badge-property-type land"><i class="fa-solid fa-mountain-sun"></i> Land</span>`;
            } else if (lead.propertyType === 'House') {
                propertyTypeBadge = `<span class="badge-property-type house"><i class="fa-solid fa-house-chimney"></i> House</span>`;
            } else if (lead.propertyType === 'Both') {
                propertyTypeBadge = `<span class="badge-property-type both"><i class="fa-solid fa-trowel-bricks"></i> Both</span>`;
            }

            // Specs text assembly
            let specsHTML = '';
            if (lead.propertyType === 'Land') {
                specsHTML = `
                    <div><strong>Size:</strong> ${lead.specifications.size} ${lead.specifications.unit}</div>
                    <div><strong>Zoning:</strong> ${lead.specifications.zoning}</div>
                    <div><strong>Locality type:</strong> ${lead.specifications.locationPreferences}</div>
                `;
            } else if (lead.propertyType === 'House') {
                specsHTML = `
                    <div><strong>Layout:</strong> ${lead.specifications.bhk}</div>
                    <div><strong>Type:</strong> ${lead.specifications.style}</div>
                    <div><strong>Floors:</strong> ${lead.specifications.floors}</div>
                    <div><strong>Furnishing:</strong> ${lead.specifications.furnishing}</div>
                `;
            } else if (lead.propertyType === 'Both') {
                specsHTML = `
                    <div><strong>Land plot:</strong> ${lead.specifications.landSize} ${lead.specifications.landUnit}</div>
                    <div><strong>Build size:</strong> ${lead.specifications.houseSize} Sq.Ft. (${lead.specifications.bhk})</div>
                    <div><strong>Area pref:</strong> ${lead.specifications.locality}</div>
                `;
            }

            // Status pill
            const statusClass = lead.status.toLowerCase() === 'new' ? 'new' : 'contacted';
            const statusPill = `<span class="status-pill ${statusClass}">${lead.status}</span>`;

            // Action buttons
            let actionButtons = '';
            if (lead.status === 'New') {
                actionButtons += `
                    <button class="action-icon-btn btn-success mark-contacted-btn" data-id="${lead.id}" title="Mark as Contacted">
                        <i class="fa-solid fa-check"></i>
                    </button>
                `;
            }
            actionButtons += `
                <button class="action-icon-btn btn-delete delete-lead-btn" data-id="${lead.id}" title="Delete Lead">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;

            tr.innerHTML = `
                <td>
                    <div style="font-weight: 600; white-space: nowrap;">${lead.date.split(',')[0]}</div>
                    <div style="font-size: 0.75rem; color: var(--color-text-light);">${lead.date.split(',')[1] || ''}</div>
                </td>
                <td>
                    <div class="lead-client-info">
                        <h4>${lead.clientName}</h4>
                        <p><i class="fa-solid fa-phone"></i> ${lead.clientPhone}</p>
                        <p><i class="fa-regular fa-envelope"></i> ${lead.clientEmail}</p>
                        <p style="font-size: 0.7rem; color: var(--color-gold);"><i class="fa-brands fa-whatsapp"></i> Contact: ${lead.contactPref}</p>
                    </div>
                </td>
                <td>${propertyTypeBadge}</td>
                <td>
                    <div class="lead-specs-summary">
                        ${specsHTML}
                        <p title="Additional Notes">${lead.additionalNotes}</p>
                    </div>
                </td>
                <td>
                    <div class="lead-budget-col">
                        <strong>$${formatCurrency(lead.maxBudget)}</strong>
                        <p><i class="fa-regular fa-clock"></i> ${lead.timeline}</p>
                    </div>
                </td>
                <td>${statusPill}</td>
                <td>
                    <div class="row-actions-group">
                        ${actionButtons}
                    </div>
                </td>
            `;

            leadsList.appendChild(tr);
        });

        // Attach action click listeners
        document.querySelectorAll('.mark-contacted-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const leadId = e.currentTarget.getAttribute('data-id');
                markLeadContacted(leadId);
            });
        });

        document.querySelectorAll('.delete-lead-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const leadId = e.currentTarget.getAttribute('data-id');
                deleteLead(leadId);
            });
        });
    }

    function markLeadContacted(id) {
        leads = leads.map(lead => {
            if (lead.id === id) {
                lead.status = 'Contacted';
            }
            return lead;
        });
        localStorage.setItem('srinivasan_leads', JSON.stringify(leads));
        updateAdminMetrics();
        renderLeadsTable();
        showToast("Lead status marked as contacted.", "success");
    }

    function deleteLead(id) {
        if (confirm("Are you sure you want to delete this lead? This action cannot be undone.")) {
            leads = leads.filter(lead => lead.id !== id);
            localStorage.setItem('srinivasan_leads', JSON.stringify(leads));
            updateAdminMetrics();
            renderLeadsTable();
            showToast("Lead requirement deleted successfully.", "success");
        }
    }

    // Filters and Search events
    leadSearch.addEventListener('input', renderLeadsTable);
    filterType.addEventListener('change', renderLeadsTable);
    filterStatus.addEventListener('change', renderLeadsTable);

    // -------------------------------------------------------------------------
    // Leads Export to CSV
    // -------------------------------------------------------------------------
    exportLeadsBtn.addEventListener('click', () => {
        if (leads.length === 0) {
            showToast("No leads available to export.", "error");
            return;
        }

        // Headers
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Date,Client Name,Phone,Email,Property Type,Budget,Timeline,Contact Preference,Additional Notes,Status\n";

        // Map leads to CSV rows
        leads.forEach(lead => {
            // Clean values of commas to avoid breaking columns
            const cleanName = lead.clientName.replace(/,/g, ' ');
            const cleanEmail = lead.clientEmail.replace(/,/g, ' ');
            const cleanNotes = lead.additionalNotes.replace(/,/g, ' ').replace(/\n/g, ' ');
            
            const row = [
                lead.date,
                cleanName,
                lead.clientPhone,
                cleanEmail,
                lead.propertyType,
                lead.maxBudget,
                lead.timeline,
                lead.contactPref,
                cleanNotes,
                lead.status
            ].join(",");
            csvContent += row + "\n";
        });

        // Create download link element and trigger click
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Srinivasan_Realestate_Leads_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link); // Required for FF
        link.click();
        document.body.removeChild(link);
        showToast("Leads database exported to CSV.", "success");
    });

    // -------------------------------------------------------------------------
    // Demo Leads Initialization
    // -------------------------------------------------------------------------
    function initializeDemoLeads() {
        if (leads.length === 0) {
            const demo = [
                {
                    id: 'lead_demo1',
                    date: new Date(Date.now() - 3600000 * 2).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    }),
                    timestamp: Date.now() - 3600000 * 2,
                    clientName: 'Alexander Wright',
                    clientPhone: '+1 (555) 789-0123',
                    clientEmail: 'alex.wright@gmail.com',
                    propertyType: 'House',
                    specifications: {
                        bhk: '3 BHK',
                        style: 'Modern Villa',
                        floors: 'Duplex',
                        furnishing: 'Semi-Furnished'
                    },
                    maxBudget: '650000',
                    timeline: '3-6 Months',
                    contactPref: 'WhatsApp',
                    additionalNotes: 'Requires a double car garage and a small garden plot for children.',
                    status: 'New'
                },
                {
                    id: 'lead_demo2',
                    date: new Date(Date.now() - 3600000 * 12).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    }),
                    timestamp: Date.now() - 3600000 * 12,
                    clientName: 'Sarah Jenkins',
                    clientPhone: '+1 (555) 345-6789',
                    clientEmail: 'sarah.j@outlook.com',
                    propertyType: 'Land',
                    specifications: {
                        size: '12',
                        unit: 'Cents',
                        zoning: 'Residential',
                        locationPreferences: 'Suburban, Scenic View'
                    },
                    maxBudget: '150000',
                    timeline: 'Immediate',
                    contactPref: 'Phone Call',
                    additionalNotes: 'Looking for elevated terrain with clear access road and water connection nearby.',
                    status: 'New'
                },
                {
                    id: 'lead_demo3',
                    date: new Date(Date.now() - 3600000 * 48).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    }),
                    timestamp: Date.now() - 3600000 * 48,
                    clientName: 'Robert Vance',
                    clientPhone: '+1 (555) 234-5678',
                    clientEmail: 'robert@vancecorp.com',
                    propertyType: 'Both',
                    specifications: {
                        landSize: '30',
                        landUnit: 'Cents',
                        houseSize: '3200',
                        bhk: '4 BHK',
                        locality: 'Green Hills, Lake View'
                    },
                    maxBudget: '1200000',
                    timeline: 'Immediate',
                    contactPref: 'Email',
                    additionalNotes: 'Looking for premium custom construction. Modern design with open layout.',
                    status: 'Contacted'
                }
            ];
            leads = demo;
            localStorage.setItem('srinivasan_leads', JSON.stringify(leads));
        }
    }
});
