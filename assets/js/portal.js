(function(){
  function $(id){ return document.getElementById(id); }
  let portalMap = null;

  function setStatus(msg){
    const el = $('psp-portal-status');
    if (el) el.textContent = msg;
  }
  
  // SLA & Priority Helper Functions
  function calculateTicketAge(createdDate) {
    if (!createdDate) return null;
    const created = new Date(createdDate);
    const now = new Date();
    const diffMs = now - created;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return 'Just now';
  }
  
  function isTicketOverdue(createdDate, priority, status) {
    if (!createdDate || status === 'closed' || status === 'resolved') return false;
    
    const created = new Date(createdDate);
    const now = new Date();
    const diffHours = Math.floor((now - created) / (1000 * 60 * 60));
    
    // SLA thresholds by priority (in hours)
    const slaThresholds = (PSP_PORTAL && PSP_PORTAL.sla) ? PSP_PORTAL.sla : {
      'urgent': 4,
      'high': 24,
      'medium': 72,
      'low': 168
    };
    
    const threshold = slaThresholds[priority] || slaThresholds['medium'];
    return diffHours > threshold;
  }
  
  function getOverdueLabel(createdDate, priority) {
    const created = new Date(createdDate);
    const now = new Date();
    const diffHours = Math.floor((now - created) / (1000 * 60 * 60));
    
    const slaThresholds = (PSP_PORTAL && PSP_PORTAL.sla) ? PSP_PORTAL.sla : {
      'urgent': 4,
      'high': 24,
      'medium': 72,
      'low': 168
    };
    
    const threshold = slaThresholds[priority] || slaThresholds['medium'];
    const overdueHours = diffHours - threshold;
    const overdueDays = Math.floor(overdueHours / 24);
    
    if (overdueDays > 0) return `${overdueDays} day${overdueDays !== 1 ? 's' : ''} overdue`;
    return `${overdueHours} hour${overdueHours !== 1 ? 's' : ''} overdue`;
  }

  async function checkHealth(){
    try {
      const res = await fetch(PSP_PORTAL.rest.base + '/health', { headers: { 'X-WP-Nonce': PSP_PORTAL.rest.nonce } });
      const data = await res.json();
      setStatus('API health: ' + (data && data.ok ? 'OK' : 'Unavailable') + ' (v' + (data && data.version || 'n/a') + ')');
    } catch (e) {
      setStatus('API health: Unavailable');
    }
  }

  async function fetchTickets(){
    try {
      const res = await fetch(PSP_PORTAL.rest.base + '/tickets', { headers: { 'X-WP-Nonce': PSP_PORTAL.rest.nonce } });
      if (!res.ok) throw new Error('Failed to load tickets');
      const items = await res.json();
      const list = $('psp-ticket-list');
      if (!list) return;
      
      // Store all tickets for filtering
      allTickets = items || [];
      
      // Apply current filters (or show all if no filters)
      applyFilters();
    } catch (e) {
      const list = $('psp-ticket-list');
      if (list){ list.innerHTML = '<li class="psp-list-item">Failed to load tickets.</li>'; }
    }
  }

  function partnerLabel(v){ return (v === true || v === '1' || v === 1 || v === 'true') ? 'Yes' : 'No'; }

  function normalizeTopColour(val){
    if (!val) return 'Custom';
    const s = String(val).trim().toLowerCase();
    if (s.includes('calm')) return 'Calm Blue';
    if (s.includes('#3aa6b9')) return 'Calm Blue';
    if (s.includes('accent')) return 'Bright Accent';
    if (s.includes('#25d0ee')) return 'Bright Accent';
    if (s.includes('navy') || s === '#000080') return 'Navy Blue';
    if (s.includes('ducati')) return 'Ducati Red';
    if (s.includes('classic')) return 'Classic Blue';
    if (s.includes('ice')) return 'Ice Blue';
    if (s.includes('yellow')) return 'Yellow';
    return 'Custom';
  }

  function renderPartnerItem(p){
    const li = document.createElement('li');
    li.className = 'psp-list-item psp-partner-item';
    li.setAttribute('data-partner-id', p.id);
    const addr = [p.streetAddress, p.city, p.state, p.zip].filter(Boolean).join(', ');
    const country = p.country ? `, ${p.country}` : '';
    const units = (p.units != null ? p.units : p.numberOfLoungeUnits);
    
    // Installation & operation info
    const installDate = p.installationDate || p.installation_date;
    const operationType = p.operationType || p.operation_type;
    const isActive = p.isActive || p.is_active;
    const seasonalOpen = p.seasonalOpenDate || p.seasonal_open_date;
    const seasonalClose = p.seasonalCloseDate || p.seasonal_close_date;
    
    li.innerHTML = `
      <div class="psp-partner-title">
        <strong>${p.companyName || 'Partner'}</strong>
        ${p.managementCompany ? ` ΓÇö ${p.managementCompany}` : ''}
        ${isActive ? '<span class="psp-badge-active">Active</span>' : '<span class="psp-badge-inactive">Inactive</span>'}
      </div>
      
      <div class="psp-partner-row">
        <span class="psp-label">Units:</span> ${units ?? 'n/a'}
        ${p.topColour ? ` ΓÇó <span class="psp-label">Top Colour:</span> ${normalizeTopColour(p.topColour)}${normalizeTopColour(p.topColour)==='Custom' ? ` (${p.topColour})` : ''}` : ''}
      </div>
      
      <div class="psp-partner-row">${addr}${country}</div>
      
      ${p.phoneNumber ? `<div class="psp-partner-row"><span class="psp-label">Phone:</span> ${p.phoneNumber}</div>` : ''}
      ${p.companyEmail ? `<div class="psp-partner-row"><span class="psp-label">Email:</span> ${p.companyEmail}</div>` : ''}
      
      ${installDate || operationType ? `
        <div class="psp-partner-section">
          <strong>≡ƒôà Installation & Operation</strong>
        </div>
        ${installDate ? `<div class="psp-partner-row"><span class="psp-label">Installed:</span> ${installDate}</div>` : ''}
        ${operationType ? `<div class="psp-partner-row"><span class="psp-label">Operation:</span> ${operationType === 'year_round' ? 'Year Round' : 'Seasonal'}</div>` : ''}
        ${operationType === 'seasonal' && (seasonalOpen || seasonalClose) ? `<div class="psp-partner-row"><span class="psp-label">Season:</span> ${seasonalOpen || '?'} to ${seasonalClose || '?'}</div>` : ''}
      ` : ''}
      
      <div class="psp-partner-section">
        <strong>≡ƒöº Amenities</strong>
      </div>
      <div class="psp-partner-row">
        F&B: ${partnerLabel(p.hasFbCallButton)} ΓÇó USB: ${partnerLabel(p.hasUsbCharging)} ΓÇó Safe Lock: ${partnerLabel(p.hasSafeLock)}
      </div>
      
      ${(p.lockMake || p.masterCode || p.subMasterCode || p.lockPart || p.key) ? `
        <div class="psp-partner-section psp-lock-section">
          <strong>≡ƒöÉ Lock Information (Support/Admin Only)</strong>
        </div>
        <div class="psp-partner-row psp-lock-info">
          <span class="psp-label">Lock:</span> ${p.lockMake || 'N/A'}
        </div>
        <div class="psp-partner-row psp-lock-info">
          <span class="psp-label">Master Code:</span> <code>${p.masterCode || 'N/A'}</code>
        </div>
        <div class="psp-partner-row psp-lock-info">
          <span class="psp-label">Sub-Master Code:</span> <code>${p.subMasterCode || 'N/A'}</code>
        </div>
        ${p.lockPart ? `<div class="psp-partner-row psp-lock-info"><span class="psp-label">Part #:</span> ${p.lockPart}</div>` : ''}
        ${p.key ? `<div class="psp-partner-row psp-lock-info"><span class="psp-label">Key:</span> ${p.key}</div>` : ''}
      ` : ''}
      
      ${(typeof p.latitude === 'number' && typeof p.longitude === 'number' && p.latitude !== 0 && p.longitude !== 0) ? `
        <div class="psp-partner-section">
          <strong>≡ƒôì Location</strong>
        </div>
        <div class="psp-partner-row"><span class="psp-label">Coordinates:</span> ${p.latitude.toFixed(6)}, ${p.longitude.toFixed(6)}</div>
      ` : ''}
      
      ${PSP_PORTAL.ui && PSP_PORTAL.ui.isSupport ? `<div class="psp-partner-row"><button type="button" class="psp-button psp-set-coords" data-id="${p.id}">Set Coordinates on Map</button></div>` : ''}
    `;
    if (PSP_PORTAL.ui && PSP_PORTAL.ui.isSupport){
      const btn = li.querySelector('.psp-set-coords');
      if (btn){ btn.addEventListener('click', function(){ enableCoordinateCapture(p.id); }); }
    }
    // Click to open profile
    li.addEventListener('click', function(e){
      // Avoid triggering when clicking the coordinate button specifically
      if (e.target && e.target.classList.contains('psp-set-coords')) return;
      openPartnerProfile(p.id);
    });
    return li;
  }

  async function fetchPartners(){
    const list = $('psp-partner-list');
    const hint = $('psp-partner-hint');
    if (!list) return;
    try {
      const res = await fetch(PSP_PORTAL.rest.base + '/partners', { headers: { 'X-WP-Nonce': PSP_PORTAL.rest.nonce } });
      if (res.status === 401 || res.status === 403){
        if (hint) hint.textContent = 'Partner details are available to Support/Admin users.';
        return;
      }
      if (!res.ok) throw new Error('Failed to load partners');
      const items = await res.json();
      list.innerHTML = '';
      (items || []).forEach(p => list.appendChild(renderPartnerItem(p)));
      if (!items || items.length === 0){
        const li = document.createElement('li');
        li.className = 'psp-list-item psp-empty-state';
        const isSupport = PSP_PORTAL.ui && PSP_PORTAL.ui.isSupport;
        li.innerHTML = `
          <div style="text-align:center;padding:40px 20px;color:#666;">
            <div style="font-size:48px;margin-bottom:16px;">≡ƒôì</div>
            <div style="font-size:18px;font-weight:600;margin-bottom:8px;">No partners found</div>
            ${isSupport ? `
              <div style="font-size:14px;color:#6b7280;margin-bottom:12px;">Import partners via CSV or add them manually in WordPress admin.</div>
              <div style="margin-top:16px;font-size:13px;color:#999;">Go to: <strong>Pool Safe ΓåÆ Import</strong> (in WordPress admin)</div>
            ` : `
              <div style="font-size:14px;color:#6b7280;">Please contact support to add your partner account.</div>
            `}
          </div>
        `;
        list.appendChild(li);
      }
    } catch (e) {
      if (hint) hint.textContent = 'Unable to load partners at this time.';
    }
  }

  // ===========================
  // Partner Profile View
  // ===========================
  async function openPartnerProfile(id){
    const profile = $('psp-partner-profile');
    const titleEl = $('psp-profile-title');
    const metaEl = $('psp-profile-meta');
    const ticketsEl = $('psp-profile-tickets');
    const servicesEl = $('psp-profile-services');
    const contactsEl = $('psp-profile-contacts');
    const statusEl = $('psp-profile-status');
    if (!profile) return;
    profile.style.display='block';
    if (statusEl){ statusEl.textContent='Loading profileΓÇª'; statusEl.style.color='#666'; }

    try {
      // Fetch fresh partner list to get latest data for this partner
      const partnerRes = await fetch(PSP_PORTAL.rest.base + '/partners', { headers: { 'X-WP-Nonce': PSP_PORTAL.rest.nonce } });
      const partners = partnerRes.ok ? await partnerRes.json() : [];
      const partner = partners.find(p => parseInt(p.id) === parseInt(id));
      if (!partner){ throw new Error('partner not found'); }
      if (titleEl){ titleEl.textContent = (partner.companyName||'Partner') + ' (#' + partner.id + ')'; }
      if (metaEl){
        metaEl.innerHTML = `
          <div><strong>Units:</strong> ${partner.units||partner.numberOfLoungeUnits||'n/a'}</div>
          <div><strong>Address:</strong> ${[partner.streetAddress, partner.city, partner.state, partner.zip].filter(Boolean).join(', ')} ${partner.country?(', '+partner.country):''}</div>
          <div><strong>Top Colour:</strong> ${partner.topColour||'ΓÇö'}</div>
          <div><strong>Amenities:</strong> F&B: ${partner.hasFbCallButton?'Yes':'No'} ΓÇó USB: ${partner.hasUsbCharging?'Yes':'No'} ΓÇó Safe Lock: ${partner.hasSafeLock?'Yes':'No'}</div>
        `;
      }

      // Tickets filtered by partner
      const ticketRes = await fetch(PSP_PORTAL.rest.base + '/tickets?partner_id=' + id, { headers: { 'X-WP-Nonce': PSP_PORTAL.rest.nonce } });
      const tickets = ticketRes.ok ? await ticketRes.json() : [];
      if (ticketsEl){
        ticketsEl.innerHTML = tickets.length ? tickets.slice(0,10).map(t => `<li class='psp-mini-item'><strong>#${t.id}</strong> ${t.title} <span class='psp-mini-meta'>${t.status||'open'} ΓÇó ${t.priority||'medium'}</span></li>`).join('') : '<li class="psp-mini-item" style="color:#6b7280;font-style:italic;text-align:center;padding:12px;">No tickets yet for this partner</li>';
      }

      // Service records filtered by partner
      const svcRes = await fetch(PSP_PORTAL.rest.base + '/service-records?partner_id=' + id, { headers: { 'X-WP-Nonce': PSP_PORTAL.rest.nonce } });
      const services = svcRes.ok ? await svcRes.json() : [];
      if (servicesEl){
        servicesEl.innerHTML = services.length ? services.slice(0,10).map(sr => `<li class='psp-mini-item'><strong>${sr.service_date||'Date'}</strong> ${sr.service_type||sr.type||'Service'} <span class='psp-mini-meta'>${(sr.technician||'')} ${(sr.duration_minutes?('ΓÇó '+sr.duration_minutes+'m'):'')}</span></li>`).join('') : '<li class="psp-mini-item" style="color:#6b7280;font-style:italic;text-align:center;padding:12px;">No service records yet</li>';
      }

      // Contacts (support/admin only)
      if (contactsEl && (PSP_PORTAL.user.isSupport || PSP_PORTAL.user.isAdmin)){
        const contactRes = await fetch(PSP_PORTAL.rest.base + '/partners/' + id + '/contacts', { headers: { 'X-WP-Nonce': PSP_PORTAL.rest.nonce } });
        const contacts = contactRes.ok ? await contactRes.json() : [];
        if (contacts.length){
          const primary = contacts.find(c => c.is_primary);
          const others = contacts.filter(c => !c.is_primary);
          contactsEl.innerHTML = (primary ? [`<li class='psp-mini-item psp-contact-primary'><strong>Γ¡É ${primary.name}</strong> ${primary.role?'('+primary.role+')':''} <span class='psp-mini-meta'>${primary.email||''} ${primary.phone?'ΓÇó '+primary.phone:''}</span> <button class='psp-contact-delete' data-id='${primary.id}' style='float:right;background:none;border:none;color:#dc2626;cursor:pointer;font-size:12px;'>&times;</button></li>`] : []).concat(others.map(c => `<li class='psp-mini-item'><strong>${c.name}</strong> ${c.role?'('+c.role+')':''} <span class='psp-mini-meta'>${c.email||''} ${c.phone?'ΓÇó '+c.phone:''}</span> <button class='psp-contact-delete' data-id='${c.id}' style='float:right;background:none;border:none;color:#dc2626;cursor:pointer;font-size:12px;'>&times;</button></li>`)).join('');
          
          // Attach delete handlers
          contactsEl.querySelectorAll('.psp-contact-delete').forEach(btn => {
            btn.addEventListener('click', () => deletePartnerContact(id, btn.dataset.id));
          });
        } else {
          contactsEl.innerHTML = '<li class="psp-mini-item" style="color:#6b7280;font-style:italic;text-align:center;padding:12px;">No contacts added yet</li>';
        }
        
        // Set partner ID for contact form
        const partnerIdInput = $('psp-contact-partner-id');
        if (partnerIdInput) partnerIdInput.value = id;
      }

      // Company Users (login accounts) - support/admin only
      if (PSP_PORTAL.user.isSupport || PSP_PORTAL.user.isAdmin){
        await loadCompanyUsers(id);
      }

      if (statusEl){ statusEl.textContent='Profile loaded.'; statusEl.style.color='#065f46'; }
    } catch (e){
      if (statusEl){ statusEl.textContent='Failed to load profile.'; statusEl.style.color='#991b1b'; }
    }
    const closeBtn = $('psp-close-profile');
    if (closeBtn){
      closeBtn.onclick = function(){ profile.style.display='none'; };
    }
  }

  async function loadCompanyUsers(partnerId){
    const wrap = $('psp-profile-company-users');
    const status = $('psp-company-users-status');
    const linkBtn = $('psp-link-user-btn');
    if (!wrap) return;
    if (status){ status.textContent = 'Loading authorized accountsΓÇª'; status.style.color='#666'; }
    try {
      const res = await fetch(PSP_PORTAL.rest.base + '/partners/' + partnerId + '/company-users', { headers: { 'X-WP-Nonce': PSP_PORTAL.rest.nonce } });
      const users = res.ok ? await res.json() : [];
      renderCompanyUsers(partnerId, users);
      if (status){ status.textContent = users.length ? (users.length + ' user' + (users.length===1?'':'s') + ' linked.') : 'No users linked yet.'; status.style.color = users.length?'#065f46':'#6b7280'; }
      if (linkBtn && !linkBtn._linked){
        linkBtn._linked = true;
        linkBtn.addEventListener('click', async () => {
          const idInput = $('psp-link-user-id');
          const uid = parseInt((idInput&&idInput.value)||'0');
            if (!uid){ if (status){ status.textContent='Enter a user ID to link.'; status.style.color='#dc2626'; } return; }
            if (status){ status.textContent='Linking userΓÇª'; status.style.color='#666'; }
            const res2 = await fetch(PSP_PORTAL.rest.base + '/partners/' + partnerId + '/company-users/link', {
              method:'POST',
              headers:{ 'Content-Type':'application/json','X-WP-Nonce':PSP_PORTAL.rest.nonce },
              body: JSON.stringify({ user_id: uid })
            });
            if (!res2.ok){ if (status){ status.textContent='Failed to link user.'; status.style.color='#dc2626'; } return; }
            if (idInput) idInput.value='';
            await loadCompanyUsers(partnerId);
        });
      }
    } catch(e){
      if (status){ status.textContent='Failed to load company users.'; status.style.color='#dc2626'; }
    }
  }

  function renderCompanyUsers(partnerId, users){
    const wrap = $('psp-profile-company-users');
    if (!wrap) return;
    if (!users || users.length===0){ wrap.innerHTML = '<div style="padding:16px;font-size:13px;color:#6b7280;text-align:center;">No login users linked yet.</div>'; return; }
    const categories = ['tickets','service_records','alerts','announcements'];
    const channels = ['portal','email'];
    let html = '<table class="psp-table" style="width:100%;border-collapse:collapse;font-size:12px;">';
    html += '<thead><tr style="background:#f3f4f6;text-align:left;"><th style="padding:8px;border-bottom:1px solid #e5e7eb;">User</th><th style="padding:8px;border-bottom:1px solid #e5e7eb;">Primary</th><th style="padding:8px;border-bottom:1px solid #e5e7eb;">Enabled</th><th style="padding:8px;border-bottom:1px solid #e5e7eb;">Categories</th><th style="padding:8px;border-bottom:1px solid #e5e7eb;">Channels</th><th style="padding:8px;border-bottom:1px solid #e5e7eb;">Actions</th></tr></thead><tbody>';
    users.forEach(u => {
      html += '<tr data-user-id="'+u.id+'" style="border-bottom:1px solid #e5e7eb;">';
      html += '<td style="padding:8px;">'+(u.displayName||('User #'+u.id))+'<div style="color:#6b7280;font-size:11px;">'+(u.email||'')+'</div></td>';
      html += '<td style="padding:8px;">'+(u.isPrimary?'<span style="color:#b45309;font-weight:600;">Primary</span>':'<button type="button" class="psp-make-primary psp-button psp-button-secondary" style="font-size:11px;padding:4px 8px;">Make Primary</button>')+'</td>';
      html += '<td style="padding:8px;"><label style="display:flex;align-items:center;gap:4px;font-size:11px;"><input type="checkbox" class="psp-notify-enabled" '+(u.notifyEnabled?'checked':'')+'> <span>'+(u.notifyEnabled?'On':'Off')+'</span></label></td>';
      html += '<td style="padding:8px;">'+categories.map(c => '<label style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px 2px 0;">'<+'input type="checkbox" class="psp-cat" value="'+c+'" '+(u.notifyCategories.includes(c)?'checked':'')+'> <span>'+c.replace('_',' ')+'</span></label>').join('')+'</td>';
      html += '<td style="padding:8px;">'+channels.map(ch => '<label style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px 2px 0;">'<+'input type="checkbox" class="psp-channel" value="'+ch+'" '+(u.notifyChannels.includes(ch)?'checked':'')+'> <span>'+ch+'</span></label>').join('')+'</td>';
      html += '<td style="padding:8px;"><button type="button" class="psp-save-prefs psp-button psp-button-primary" style="font-size:11px;padding:4px 10px;">Save</button></td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
    wrap.innerHTML = html;

    wrap.querySelectorAll('.psp-make-primary').forEach(btn => {
      btn.addEventListener('click', async () => {
        const tr = btn.closest('tr');
        const uid = parseInt(tr.dataset.userId);
        await setPrimaryUser(partnerId, uid);
        await loadCompanyUsers(partnerId);
      });
    });

    wrap.querySelectorAll('.psp-notify-enabled').forEach(cb => {
      cb.addEventListener('change', () => {
        const span = cb.parentElement.querySelector('span');
        if (span) span.textContent = cb.checked ? 'On' : 'Off';
      });
    });

    wrap.querySelectorAll('.psp-save-prefs').forEach(btn => {
      btn.addEventListener('click', async () => {
        const tr = btn.closest('tr');
        const uid = parseInt(tr.dataset.userId);
        const enabled = tr.querySelector('.psp-notify-enabled').checked;
        const cats = Array.from(tr.querySelectorAll('.psp-cat:checked')).map(n => n.value);
        const chans = Array.from(tr.querySelectorAll('.psp-channel:checked')).map(n => n.value);
        btn.disabled = true; btn.textContent='SavingΓÇª';
        const ok = await saveUserNotifyPrefs(uid, { enabled, categories: cats, channels: chans });
        btn.textContent = ok ? 'Saved' : 'Retry';
        setTimeout(()=>{ btn.disabled=false; btn.textContent='Save'; }, 1500);
      });
    });
  }

  async function setPrimaryUser(partnerId, userId){
    try {
      const res = await fetch(PSP_PORTAL.rest.base + '/partners/' + partnerId + '/company-users/primary', {
        method:'PATCH',
        headers:{ 'Content-Type':'application/json','X-WP-Nonce':PSP_PORTAL.rest.nonce },
        body: JSON.stringify({ user_id: userId })
      });
      return res.ok;
    } catch(e){ return false; }
  }

  async function saveUserNotifyPrefs(userId, data){
    try {
      const res = await fetch(PSP_PORTAL.rest.base + '/users/' + userId + '/notification-prefs', {
        method:'PATCH',
        headers:{ 'Content-Type':'application/json','X-WP-Nonce':PSP_PORTAL.rest.nonce },
        body: JSON.stringify(data)
      });
      return res.ok;
    } catch(e){ return false; }
  }

  async function addPartnerContact(){
    const partnerId = ($('psp-contact-partner-id')||{}).value;
    const name = ($('psp-contact-name')||{}).value || '';
    const role = ($('psp-contact-role')||{}).value || '';
    const email = ($('psp-contact-email')||{}).value || '';
    const phone = ($('psp-contact-phone')||{}).value || '';
    const isPrimary = ($('psp-contact-is-primary')||{}).checked || false;
    const status = $('psp-contact-status');

    if (!partnerId || !name || !email){
      if (status){ status.textContent='Name and Email are required.'; status.style.color='#dc2626'; }
      return;
    }

    try {
      if (status){ status.textContent='Adding contact...'; status.style.color='#666'; }
      const res = await fetch(PSP_PORTAL.rest.base + '/partners/' + partnerId + '/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': PSP_PORTAL.rest.nonce,
        },
        body: JSON.stringify({ name, role, email, phone, is_primary: isPrimary })
      });
      if (!res.ok) throw new Error('Failed to add contact');
      
      if (status){ status.textContent='Contact added successfully!'; status.style.color='#065f46'; }
      
      // Clear form
      if ($('psp-contact-name')) $('psp-contact-name').value = '';
      if ($('psp-contact-role')) $('psp-contact-role').value = '';
      if ($('psp-contact-email')) $('psp-contact-email').value = '';
      if ($('psp-contact-phone')) $('psp-contact-phone').value = '';
      if ($('psp-contact-is-primary')) $('psp-contact-is-primary').checked = false;
      
      // Refresh profile to show new contact
      openPartnerProfile(partnerId);
    } catch (e){
      if (status){ status.textContent='Failed to add contact.'; status.style.color='#dc2626'; }
    }
  }

  async function deletePartnerContact(partnerId, contactId){
    if (!confirm('Remove this contact?')) return;
    try {
      const res = await fetch(PSP_PORTAL.rest.base + '/partners/' + partnerId + '/contacts/' + contactId, {
        method: 'DELETE',
        headers: { 'X-WP-Nonce': PSP_PORTAL.rest.nonce }
      });
      if (!res.ok) throw new Error('Failed to delete');
      openPartnerProfile(partnerId); // Refresh
    } catch (e){
      console.error('Failed to delete contact', e);
    }
  }

  async function fetchMyPartner(){
    const list = $('psp-partner-list');
    const hint = $('psp-partner-hint');
    if (!list) return;
    try {
      const res = await fetch(PSP_PORTAL.rest.base + '/partners/me', { headers: { 'X-WP-Nonce': PSP_PORTAL.rest.nonce } });
      if (!res.ok) throw new Error('Failed to load partner');
      const p = await res.json();
      list.innerHTML = '';
      if (!p){
        const li = document.createElement('li');
        li.className = 'psp-list-item';
        li.textContent = 'No partner record linked to your account yet.';
        list.appendChild(li);
        return;
      }
      list.appendChild(renderPartnerItem(p));
    } catch (e) {
      if (hint) hint.textContent = 'Unable to load your company details at this time.';
    }
  }

  async function createTicket(){
    const firstName = ($('psp-ticket-first-name')||{}).value || '';
    const lastName = ($('psp-ticket-last-name')||{}).value || '';
    const position = ($('psp-ticket-position')||{}).value || '';
    const contactEmail = ($('psp-ticket-email')||{}).value || '';
    const contactNumber = ($('psp-ticket-number')||{}).value || '';
    const unitsAffected = ($('psp-ticket-units-affected')||{}).value || '';
    const title = ($('psp-ticket-title')||{}).value || '';
    const content = ($('psp-ticket-content')||{}).value || '';
    const filesInput = $('psp-ticket-attachments');
    const status = $('psp-ticket-create-status');

    // Validate required fields
    if (!firstName || !lastName || !contactEmail || !contactNumber || !title) {
      status.textContent = 'Please fill in all required fields (marked with *)';
      status.style.color = '#d32f2f';
      return;
    }

    try {
      status.textContent = 'Creating ticket...';
      status.style.color = '#666';
      
      // Create the ticket
      const res = await fetch(PSP_PORTAL.rest.base + '/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': PSP_PORTAL.rest.nonce,
        },
        body: JSON.stringify({ 
          title, 
          content,
          first_name: firstName,
          last_name: lastName,
          position,
          contact_email: contactEmail,
          contact_number: contactNumber,
          units_affected: unitsAffected
        })
      });
      if (!res.ok) throw new Error('Create failed');
      const ticketData = await res.json();
      const ticketId = ticketData.id;

      // Upload files if any
      if (filesInput && filesInput.files && filesInput.files.length > 0) {
        status.textContent = 'Uploading attachments...';
        
        for (let i = 0; i < filesInput.files.length; i++) {
          const formData = new FormData();
          formData.append('file', filesInput.files[i]);
          formData.append('ticket_id', ticketId);
          
          const uploadRes = await fetch(PSP_PORTAL.api.base + '/attachments', {
            method: 'POST',
            headers: {
              'X-WP-Nonce': PSP_PORTAL.api.nonce,
            },
            body: formData
          });
          
          if (!uploadRes.ok) {
            console.error('Failed to upload file:', filesInput.files[i].name);
          }
        }
        
        status.textContent = 'Ticket created successfully with attachments!';
        status.style.color = '#4caf50';
      } else {
        status.textContent = 'Ticket created successfully!';
        status.style.color = '#4caf50';
      }

      // Clear form
      if ($('psp-ticket-first-name')) $('psp-ticket-first-name').value = '';
      if ($('psp-ticket-last-name')) $('psp-ticket-last-name').value = '';
      if ($('psp-ticket-position')) $('psp-ticket-position').value = '';
      if ($('psp-ticket-email')) $('psp-ticket-email').value = '';
      if ($('psp-ticket-number')) $('psp-ticket-number').value = '';
      if ($('psp-ticket-units-affected')) $('psp-ticket-units-affected').value = '';
      if ($('psp-ticket-title')) $('psp-ticket-title').value = '';
      if ($('psp-ticket-content')) $('psp-ticket-content').value = '';
      if (filesInput) filesInput.value = '';
      if ($('psp-attachment-previews')) $('psp-attachment-previews').innerHTML = '';
      
      fetchTickets();
    } catch (e) {
      status.textContent = 'Failed to create ticket. Please try again.';
      status.style.color = '#d32f2f';
    }
  }

  function setupCreateForm(){
    if (PSP_PORTAL.ui && PSP_PORTAL.ui.canCreateTickets){
      const box = $('psp-ticket-create');
      if (box) box.hidden = false;
      const btn = $('psp-ticket-submit');
      if (btn) btn.addEventListener('click', createTicket);

      // Setup file preview with thumbnails
      const filesInput = $('psp-ticket-attachments');
      const filesPreview = $('psp-attachment-previews');
      if (filesInput && filesPreview) {
        filesInput.addEventListener('change', function() {
          filesPreview.innerHTML = '';
          if (this.files && this.files.length > 0) {
            const container = document.createElement('div');
            container.className = 'psp-attachments-grid';
            
            for (let i = 0; i < this.files.length; i++) {
              const file = this.files[i];
              const item = document.createElement('div');
              item.className = 'psp-attachment-item';
              
              // Create thumbnail for images
              if (file.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.className = 'psp-attachment-thumb';
                const reader = new FileReader();
                reader.onload = function(e) {
                  img.src = e.target.result;
                };
                reader.readAsDataURL(file);
                item.appendChild(img);
              } else {
                // Show file icon for non-images
                const icon = document.createElement('div');
                icon.className = 'psp-file-icon';
                const ext = file.name.split('.').pop().toUpperCase();
                icon.textContent = ext;
                item.appendChild(icon);
              }
              
              const info = document.createElement('div');
              info.className = 'psp-attachment-info';
              info.innerHTML = `
                <div class="psp-attachment-name">${file.name}</div>
                <div class="psp-attachment-size">${(file.size / 1024).toFixed(1)} KB</div>
              `;
              item.appendChild(info);
              
              container.appendChild(item);
            }
            filesPreview.appendChild(container);
          }
        });
      }
    }
  }

  function initMap(markers){
    const container = $('psp-portal-map');
    if (!container || typeof L === 'undefined') return;
    const map = L.map(container, { scrollWheelZoom: false });
    L.tileLayer(PSP_PORTAL.map.tileUrl, { attribution: PSP_PORTAL.map.attribution }).addTo(map);
    const bounds = [];
    (markers || []).forEach(m => {
      // Only plot valid, non-zero coordinates
      if (Number.isFinite(m.latitude) && Number.isFinite(m.longitude) && !(m.latitude === 0 && m.longitude === 0)){
        const marker = L.marker([m.latitude, m.longitude]).addTo(map);
        marker.bindPopup(`<strong>${(m.companyName||'Partner')}</strong>`);
        bounds.push([m.latitude, m.longitude]);
      }
    });
    if (bounds.length) {
      map.fitBounds(bounds, { padding: [20,20] });
    } else {
      // No valid coordinates yet - show helpful message and default view
      map.setView([39.8283, -98.5795], 4); // Center of USA
      const notice = document.createElement('div');
      notice.className = 'psp-map-notice';
      notice.innerHTML = `
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:30px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);text-align:center;max-width:400px;z-index:1000;">
          <div style="font-size:48px;margin-bottom:16px;">≡ƒù║∩╕Å</div>
          <div style="font-size:18px;font-weight:600;margin-bottom:8px;">No partners plotted yet</div>
          <div style="font-size:14px;color:#666;line-height:1.6;">
            Partners will appear on the map once they have valid addresses.<br/>
            <strong>After importing:</strong> Partners with complete addresses will auto-geocode and appear here.
          </div>
        </div>
      `;
      container.appendChild(notice);
    }
    portalMap = map;
  }

  async function fetchMap(){
    try {
      const res = await fetch(PSP_PORTAL.rest.base + '/partners/map', { headers: { 'X-WP-Nonce': PSP_PORTAL.rest.nonce } });
      if (!res.ok) throw new Error('Failed to load map data');
      const data = await res.json();
      initMap(data);
    } catch (e) {
      // keep silent in UI
    }
  }
  
  // Search and Filter Functionality
  let allTickets = []; // Store all tickets for filtering
  
  function setupSearchAndFilters() {
    const searchInput = $('psp-ticket-search');
    const statusFilter = $('psp-filter-status');
    const priorityFilter = $('psp-filter-priority');
    const clearButton = $('psp-clear-filters');
    
    if (!searchInput || !statusFilter || !priorityFilter) return;
    
    // Search input handler with debounce
    let searchTimeout;
    searchInput.addEventListener('input', function() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        applyFilters();
      }, 300);
    });
    
    // Filter dropdowns
    statusFilter.addEventListener('change', applyFilters);
    priorityFilter.addEventListener('change', applyFilters);
    
    // Clear filters
    if (clearButton) {
      clearButton.addEventListener('click', function() {
        searchInput.value = '';
        statusFilter.value = '';
        priorityFilter.value = '';
        applyFilters();
      });
    }
  }
  
  function applyFilters() {
    const searchInput = $('psp-ticket-search');
    const statusFilter = $('psp-filter-status');
    const priorityFilter = $('psp-filter-priority');
    
    if (!searchInput || !statusFilter || !priorityFilter) return;
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    const statusValue = statusFilter.value;
    const priorityValue = priorityFilter.value;
    
    let filtered = allTickets.filter(ticket => {
      // Search filter
      if (searchTerm) {
        const titleMatch = (ticket.title || '').toLowerCase().includes(searchTerm);
        const idMatch = (ticket.id || '').toString().includes(searchTerm);
        const categoryMatch = (ticket.category || '').toLowerCase().includes(searchTerm);
        const contactMatch = ((ticket.firstName || '') + ' ' + (ticket.lastName || '')).toLowerCase().includes(searchTerm);
        
        if (!titleMatch && !idMatch && !categoryMatch && !contactMatch) {
          return false;
        }
      }
      
      // Status filter
      if (statusValue && ticket.status !== statusValue) {
        return false;
      }
      
      // Priority filter
      if (priorityValue && ticket.priority !== priorityValue) {
        return false;
      }
      
      return true;
    });
    
    renderTickets(filtered);
  }
  
  function renderTickets(tickets) {
    const list = $('psp-ticket-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    if (tickets.length === 0) {
      const li = document.createElement('li');
      li.className = 'psp-list-item psp-empty-state';
      li.innerHTML = `
        <div style="text-align:center;padding:40px 20px;color:#666;">
          <div style="font-size:48px;margin-bottom:16px;">≡ƒöì</div>
          <div style="font-size:18px;font-weight:600;margin-bottom:8px;">No tickets found</div>
          <div style="font-size:14px;">Try adjusting your search or filters.</div>
        </div>
      `;
      list.appendChild(li);
      return;
    }
    
    // Sort tickets: overdue + urgent first, then by creation date
    const sortedItems = tickets.sort((a, b) => {
      const aOverdue = isTicketOverdue(a.createdAt, a.priority, a.status);
      const bOverdue = isTicketOverdue(b.createdAt, b.priority, b.status);
      const aUrgent = a.priority === 'urgent';
      const bUrgent = b.priority === 'urgent';
      
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      if (aUrgent && !bUrgent) return -1;
      if (!aUrgent && bUrgent) return 1;
      
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    sortedItems.forEach(t => {
      const li = document.createElement('li');
      li.className = 'psp-list-item psp-ticket-item';
      
      const statusClass = t.status ? `status-${t.status}` : '';
      const priorityClass = t.priority ? `priority-${t.priority}` : '';
      const isOverdue = isTicketOverdue(t.createdAt, t.priority, t.status);
      const ticketAge = calculateTicketAge(t.createdAt);
      
      if (isOverdue) {
        li.classList.add('ticket-overdue');
      }
      
      li.innerHTML = `
        <div class="psp-ticket-header">
          <strong class="psp-ticket-id">#${t.id}</strong>
          <span class="psp-ticket-title">${t.title || '(no subject)'}</span>
          ${isOverdue ? `<span class="psp-badge-overdue">ΓÜá∩╕Å ${getOverdueLabel(t.createdAt, t.priority)}</span>` : ''}
        </div>
        <div class="psp-ticket-meta">
          <span class="psp-badge ${statusClass}">${t.status || 'open'}</span>
          <span class="psp-badge ${priorityClass}">${t.priority || 'medium'}</span>
          ${t.firstName || t.lastName ? `<span class="psp-ticket-contact">≡ƒæñ ${[t.firstName, t.lastName].filter(Boolean).join(' ')}</span>` : ''}
          ${t.category ? `<span class="psp-ticket-category">≡ƒôü ${t.category}</span>` : ''}
          ${ticketAge ? `<span class="psp-ticket-age">≡ƒòÆ ${ticketAge}</span>` : ''}
        </div>
      `;
      list.appendChild(li);
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    checkHealth();
    setupCreateForm();
    setupSearchAndFilters();
    if (PSP_PORTAL.ui && PSP_PORTAL.ui.isSupport) { fetchPartners(); } else { fetchMyPartner(); }
    fetchTickets();
    if (PSP_PORTAL.ui && PSP_PORTAL.ui.isSupport) { fetchMap(); }
    fetchNotifications();
    setupNotificationPolling();
    setupSupportTools();
    setupContactForm();
    setupUserManagement();
  });

  async function fetchNotifications(){
    try {
      const res = await fetch(PSP_PORTAL.rest.base + '/notifications', { headers: { 'X-WP-Nonce': PSP_PORTAL.rest.nonce } });
      if (!res.ok) throw new Error('Failed to load notifications');
      const items = await res.json();
      const list = $('psp-notification-list');
      if (!list) return;
      list.innerHTML = '';
      if (!items || items.length === 0){
        const li = document.createElement('li');
        li.className = 'psp-notification-item psp-notification-empty';
        li.textContent = 'No notifications';
        list.appendChild(li);
        return;
      }
      items.forEach(n => {
        const li = document.createElement('li');
        li.className = 'psp-notification-item' + (n.read ? ' psp-notification-read' : ' psp-notification-unread');
        li.innerHTML = `
          <div class="psp-notification-content">
            <strong class="psp-notification-title">${escapeHtml(n.title)}</strong>
            <div class="psp-notification-message">${n.content || ''}</div>
            <div class="psp-notification-time">${new Date(n.createdAt).toLocaleString()}</div>
          </div>
          ${!n.read ? `<button class="psp-notification-mark-read" data-id="${n.id}">Mark Read</button>` : ''}
        `;
        list.appendChild(li);
      });
      
      // Add event listeners to mark read buttons
      document.querySelectorAll('.psp-notification-mark-read').forEach(btn => {
        btn.addEventListener('click', () => markNotificationRead(btn.dataset.id));
      });
      
      // Update unread badge if exists
      updateNotificationBadge(items.filter(n => !n.read).length);
    } catch (e) {
      const list = $('psp-notification-list');
      if (list){ list.innerHTML = '<li class="psp-notification-item">Failed to load notifications.</li>'; }
    }
  }

  async function markNotificationRead(notificationId){
    try {
      await fetch(PSP_PORTAL.rest.base + `/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: { 'X-WP-Nonce': PSP_PORTAL.rest.nonce }
      });
      fetchNotifications(); // Refresh list
    } catch (e) {
      console.error('Failed to mark notification as read', e);
    }
  }

  function updateNotificationBadge(count){
    const badge = document.querySelector('.psp-notification-badge');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
  }

  function setupNotificationPolling(){
    // Poll for new notifications every 30 seconds
    setInterval(fetchNotifications, 30000);
  }

  function escapeHtml(text){
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Knowledge Base functions
  async function fetchKBCategories(){
    try {
      const res = await fetch(PSP_PORTAL.rest.base + '/kb/articles', { headers: { 'X-WP-Nonce': PSP_PORTAL.rest.nonce } });
      if (!res.ok) throw new Error('Failed to load articles');
      const data = await res.json();
      const categoriesEl = $('psp-kb-categories-list');
      if (!categoriesEl) return;

      // Extract unique categories from articles
      const categories = {};
      (data.articles || []).forEach(article => {
        (article.categories || []).forEach(cat => {
          categories[cat.id] = cat.name;
        });
      });

      categoriesEl.innerHTML = '';
      if (Object.keys(categories).length === 0) {
        categoriesEl.innerHTML = '<p>No categories found.</p>';
        return;
      }

      Object.entries(categories).forEach(([id, name]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'psp-button psp-kb-category-btn';
        btn.textContent = name;
        btn.onclick = () => fetchKBArticles(id);
        categoriesEl.appendChild(btn);
      });

      // Add "All" button
      const allBtn = document.createElement('button');
      allBtn.type = 'button';
      allBtn.className = 'psp-button psp-kb-category-btn psp-button-primary';
      allBtn.textContent = 'All Articles';
      allBtn.onclick = () => fetchKBArticles();
      categoriesEl.insertBefore(allBtn, categoriesEl.firstChild);
    } catch (e) {
      const categoriesEl = $('psp-kb-categories-list');
      if (categoriesEl) categoriesEl.innerHTML = '<p>Failed to load categories.</p>';
    }
  }

  async function fetchKBArticles(categoryId = null){
    try {
      let url = PSP_PORTAL.rest.base + '/kb/articles';
      if (categoryId) url += '?category=' + categoryId;
      
      const res = await fetch(url, { headers: { 'X-WP-Nonce': PSP_PORTAL.rest.nonce } });
      if (!res.ok) throw new Error('Failed to load articles');
      const data = await res.json();
      const articlesEl = $('psp-kb-articles-list');
      if (!articlesEl) return;

      articlesEl.innerHTML = '';
      if (!data.articles || data.articles.length === 0) {
        articlesEl.innerHTML = '<p>No articles found.</p>';
        return;
      }

      const ul = document.createElement('ul');
      ul.className = 'psp-kb-article-list';
      data.articles.forEach(article => {
        const li = document.createElement('li');
        li.className = 'psp-kb-article-item';
        
        const title = document.createElement('h4');
        title.textContent = article.title;
        title.className = 'psp-kb-article-title';
        title.style.cursor = 'pointer';
        title.onclick = () => viewKBArticle(article.id);
        
        const excerpt = document.createElement('p');
        excerpt.textContent = article.excerpt || '';
        excerpt.className = 'psp-kb-article-excerpt';
        
        li.appendChild(title);
        li.appendChild(excerpt);
        ul.appendChild(li);
      });
      articlesEl.appendChild(ul);
    } catch (e) {
      const articlesEl = $('psp-kb-articles-list');
      if (articlesEl) articlesEl.innerHTML = '<p>Failed to load articles.</p>';
    }
  }

  async function viewKBArticle(articleId){
    try {
      const res = await fetch(PSP_PORTAL.rest.base + '/kb/articles/' + articleId, { headers: { 'X-WP-Nonce': PSP_PORTAL.rest.nonce } });
      if (!res.ok) throw new Error('Failed to load article');
      const article = await res.json();

      const contentEl = $('psp-kb-article-content');
      const viewEl = $('psp-kb-article-view');
      const articlesEl = $('psp-kb-articles');
      const categoriesEl = document.querySelector('.psp-kb-categories');
      const searchEl = document.querySelector('.psp-kb-search');

      if (!contentEl || !viewEl) return;

      contentEl.innerHTML = `
        <h2>${escapeHtml(article.title)}</h2>
        <div class="psp-kb-article-meta">
          ${article.categories && article.categories.length > 0 ? 
            '<span class="psp-kb-categories">' + article.categories.map(c => escapeHtml(c.name)).join(', ') + '</span>' : ''}
        </div>
        <div class="psp-kb-article-body">${article.content}</div>
      `;

      viewEl.style.display = 'block';
      if (articlesEl) articlesEl.style.display = 'none';
      if (categoriesEl) categoriesEl.style.display = 'none';
      if (searchEl) searchEl.style.display = 'none';
    } catch (e) {
      const contentEl = $('psp-kb-article-content');
      if (contentEl) contentEl.innerHTML = '<p>Failed to load article.</p>';
    }
  }

  async function searchKBArticles(query){
    try {
      const res = await fetch(PSP_PORTAL.rest.base + '/kb/search?q=' + encodeURIComponent(query), { headers: { 'X-WP-Nonce': PSP_PORTAL.rest.nonce } });
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      const articlesEl = $('psp-kb-articles-list');
      if (!articlesEl) return;

      articlesEl.innerHTML = '';
      if (!data.articles || data.articles.length === 0) {
        articlesEl.innerHTML = '<p>No articles found for "' + escapeHtml(query) + '".</p>';
        return;
      }

      const ul = document.createElement('ul');
      ul.className = 'psp-kb-article-list';
      data.articles.forEach(article => {
        const li = document.createElement('li');
        li.className = 'psp-kb-article-item';
        
        const title = document.createElement('h4');
        title.textContent = article.title;
        title.className = 'psp-kb-article-title';
        title.style.cursor = 'pointer';
        title.onclick = () => viewKBArticle(article.id);
        
        const excerpt = document.createElement('p');
        excerpt.textContent = article.excerpt || '';
        excerpt.className = 'psp-kb-article-excerpt';
        
        li.appendChild(title);
        li.appendChild(excerpt);
        ul.appendChild(li);
      });
      articlesEl.appendChild(ul);
    } catch (e) {
      const articlesEl = $('psp-kb-articles-list');
      if (articlesEl) articlesEl.innerHTML = '<p>Search failed.</p>';
    }
  }

  function enableCoordinateCapture(partnerId){
    if (!portalMap){ setStatus('Open the map below, then click to set coordinates...'); return; }
    setStatus('Click on the map to set new coordinates for this partner...');
    const once = (e) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      setStatus(`Saving coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)} ...`);
      portalMap.off('click', once);
      fetch(PSP_PORTAL.rest.base + `/partners/${partnerId}/coords`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': PSP_PORTAL.rest.nonce },
        body: JSON.stringify({ latitude: lat, longitude: lng })
      }).then(r => {
        if (!r.ok) throw new Error('Save failed');
        setStatus('Coordinates updated.');
        if (PSP_PORTAL.ui && PSP_PORTAL.ui.isSupport) { fetchPartners(); }
        fetchMap();
      }).catch(() => setStatus('Failed to update coordinates.'));
    };
    portalMap.once('click', once);
  }

  // Knowledge Base event listeners
  document.addEventListener('DOMContentLoaded', function(){
    const kbSearchBtn = $('psp-kb-search-btn');
    const kbSearchInput = $('psp-kb-search-input');
    const kbBackBtn = $('psp-kb-back-btn');

    if (kbSearchBtn && kbSearchInput) {
      kbSearchBtn.onclick = () => {
        const query = kbSearchInput.value.trim();
        if (query) searchKBArticles(query);
      };
      kbSearchInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
          const query = kbSearchInput.value.trim();
          if (query) searchKBArticles(query);
        }
      };
    }

    if (kbBackBtn) {
      kbBackBtn.onclick = () => {
        const viewEl = $('psp-kb-article-view');
        const articlesEl = $('psp-kb-articles');
        const categoriesEl = document.querySelector('.psp-kb-categories');
        const searchEl = document.querySelector('.psp-kb-search');

        if (viewEl) viewEl.style.display = 'none';
        if (articlesEl) articlesEl.style.display = 'block';
        if (categoriesEl) categoriesEl.style.display = 'block';
        if (searchEl) searchEl.style.display = 'block';
      };
    }

    // Initialize KB if on KB page
    if ($('psp-kb-categories-list')) {
      fetchKBCategories();
      fetchKBArticles();
    }
  });

  // ===========================
  // Service Records
  // ===========================
  
  // Service Records pagination state
  const serviceState = { page: 1, perPage: 25, totalPages: 1, records: [], partnerId: null, loading: false };

  function fetchServiceRecords(page = 1) {
    const timeline = $('psp-service-timeline');
    if (!timeline || serviceState.loading) return;

    // Read defaults from data attributes on first load
    if (serviceState.partnerId === null) {
      const pidAttr = timeline.getAttribute('data-partner-id');
      const perAttr = timeline.getAttribute('data-per-page');
      serviceState.partnerId = pidAttr ? parseInt(pidAttr) || null : null;
      serviceState.perPage = perAttr ? parseInt(perAttr) || 25 : 25;
    }

    let url = `${PSP_PORTAL.api.base}/service-records?page=${page}&per_page=${serviceState.perPage}`;
    if (serviceState.partnerId) {
      url += `&partner_id=${serviceState.partnerId}`;
    }

    serviceState.loading = true;
    const loadMoreBtn = $('psp-service-load-more');
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';

    fetch(url, {
      headers: { 'X-WP-Nonce': PSP_PORTAL.api.nonce }
    })
    .then(res => res.json())
    .then(data => {
      const records = (data && data.records) ? data.records : [];
      if (page === 1) {
        serviceState.records = records;
      } else {
        serviceState.records = serviceState.records.concat(records);
      }
      serviceState.page = data.page || page;
      serviceState.totalPages = data.total_pages || 1;
      renderServiceRecords(serviceState.records);

      if (loadMoreBtn) {
        if (serviceState.page < serviceState.totalPages) {
          loadMoreBtn.style.display = 'inline-block';
        } else {
          loadMoreBtn.style.display = 'none';
        }
      }
    })
    .catch(err => {
      console.error('Error fetching service records:', err);
      timeline.innerHTML = '<div class="psp-notice psp-notice--error">Failed to load service records.</div>';
    })
    .finally(() => {
      serviceState.loading = false;
    });
  }

  function renderServiceRecords(records) {
    const timeline = $('psp-service-timeline');
    if (!timeline) return;

    if (!records || records.length === 0) {
      timeline.innerHTML = '<div class="psp-no-records">No service records found.</div>';
      return;
    }

    // Already returned newest-first; if not, ensure sort
    records.sort((a, b) => new Date(b.service_date) - new Date(a.service_date));

    const html = records.map(record => {
      const date = new Date(record.service_date);
      const formattedDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      
      const typeLabels = {
        'phone': 'Phone Support',
        'email': 'Email Support',
        'remote': 'Remote Support',
        'onsite_maintenance': 'On-Site Maintenance',
        'onsite_installation': 'On-Site Installation',
        'onsite_repair': 'On-Site Repair',
        'onsite_inspection': 'On-Site Inspection'
      };

      const typeLabel = typeLabels[record.service_type] || record.service_type;
      const typeClass = record.service_type.startsWith('onsite') ? 'onsite' : 'remote';

      return `
        <div class="psp-service-item" data-type="${record.service_type}">
          <div class="psp-service-marker ${typeClass}"></div>
          <div class="psp-service-content">
            <div class="psp-service-header">
              <span class="psp-service-type-badge ${typeClass}">${typeLabel}</span>
              <span class="psp-service-date">${formattedDate}</span>
            </div>
            <div class="psp-service-partner">${record.partner_name || 'Unknown Partner'}</div>
            ${record.notes ? `<div class="psp-service-notes">${record.notes}</div>` : ''}
            <div class="psp-service-meta">
              ${record.technician ? `<span class="psp-meta-item">Technician: ${record.technician}</span>` : ''}
              ${record.duration_minutes ? `<span class="psp-meta-item">Duration: ${record.duration_minutes} min</span>` : ''}
              ${record.issue_resolved ? '<span class="psp-badge psp-badge-success">Resolved</span>' : ''}
              ${record.followup_required ? '<span class="psp-badge psp-badge-warning">Follow-up Required</span>' : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    timeline.innerHTML = html;
  }

  function createServiceRecord(formData) {
    const form = $('psp-service-record-form');
    const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
    
    if (submitBtn) submitBtn.disabled = true;

    fetch(`${PSP_PORTAL.api.base}/service-records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': PSP_PORTAL.api.nonce
      },
      body: JSON.stringify(formData)
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert('Service record created successfully!');
        form.reset();
        $('psp-service-form').style.display = 'none';
        fetchServiceRecords();
      } else {
        alert('Error: ' + (data.message || 'Failed to create service record'));
      }
    })
    .catch(err => {
      console.error('Error creating service record:', err);
      alert('Failed to create service record. Please try again.');
    })
    .finally(() => {
      if (submitBtn) submitBtn.disabled = false;
    });
  }

  // Service Records event listeners
  document.addEventListener('DOMContentLoaded', function() {
    const addServiceBtn = $('psp-add-service-btn');
    const cancelServiceBtn = $('psp-cancel-service-btn');
    const serviceForm = $('psp-service-record-form');
    const serviceFilterType = $('psp-service-filter-type');
    const serviceLoadMoreBtn = $('psp-service-load-more');

    if (addServiceBtn) {
      addServiceBtn.addEventListener('click', function() {
        $('psp-service-form').style.display = 'block';
        // Set default date to today
        const dateInput = $('psp-service-date');
        if (dateInput && !dateInput.value) {
          dateInput.value = new Date().toISOString().split('T')[0];
        }
      });
    }

    if (cancelServiceBtn) {
      cancelServiceBtn.addEventListener('click', function() {
        $('psp-service-form').style.display = 'none';
        if (serviceForm) serviceForm.reset();
      });
    }

    if (serviceForm) {
      serviceForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = {
          partner_id: parseInt($('psp-service-partner').value),
          service_date: $('psp-service-date').value,
          service_type: $('psp-service-type').value,
          technician: $('psp-service-technician').value || '',
          duration_minutes: parseInt($('psp-service-duration').value) || 0,
          notes: $('psp-service-notes').value || '',
          issue_resolved: $('psp-service-resolved').checked,
          followup_required: $('psp-service-followup').checked
        };

        createServiceRecord(formData);
      });
    }

    if (serviceFilterType) {
      serviceFilterType.addEventListener('change', function() {
        const selectedType = this.value;
        const items = document.querySelectorAll('.psp-service-item');
        
        items.forEach(item => {
          if (selectedType === '' || item.dataset.type === selectedType) {
            item.style.display = 'flex';
          } else {
            item.style.display = 'none';
          }
        });
      });
    }

    // Auto-load service records if timeline exists
    if ($('psp-service-timeline')) {
      fetchServiceRecords(1);
    }

    if (serviceLoadMoreBtn) {
      serviceLoadMoreBtn.addEventListener('click', function(){
        if (serviceState.page < serviceState.totalPages) {
          fetchServiceRecords(serviceState.page + 1);
        }
      });
    }
  });

  // ===========================
  // Dashboard Stats
  // ===========================
  
  function loadDashboardStats() {
    const openStat = $('psp-stat-open-tickets');
    const assignedStat = $('psp-stat-assigned-tickets');
    const urgentStat = $('psp-stat-urgent-tickets');
    const partnersStat = $('psp-stat-total-partners');

    if (!openStat) return; // Dashboard not on page

    // Fetch tickets
    fetch(`${PSP_PORTAL.api.base}/tickets`, {
      headers: { 'X-WP-Nonce': PSP_PORTAL.api.nonce }
    })
    .then(res => res.json())
    .then(tickets => {
      // Count open tickets (not closed/resolved)
      const openTickets = tickets.filter(t => t.status !== 'closed' && t.status !== 'resolved');
      if (openStat) openStat.textContent = openTickets.length;

      // Count assigned to current user
      const currentUserId = PSP_PORTAL.user ? PSP_PORTAL.user.id : 0;
      const assignedTickets = tickets.filter(t => parseInt(t.assigned_to) === currentUserId);
      if (assignedStat) assignedStat.textContent = assignedTickets.length;

      // Count urgent tickets
      const urgentTickets = tickets.filter(t => t.priority === 'urgent' && t.status !== 'closed');
      if (urgentStat) urgentStat.textContent = urgentTickets.length;

      // Show recent tickets
      const dashboardTickets = $('psp-dashboard-tickets');
      if (dashboardTickets && tickets.length > 0) {
        const recentTickets = tickets.slice(0, 5);
        const html = recentTickets.map(ticket => `
          <div class="psp-dashboard-ticket-item">
            <div class="psp-ticket-title-row">
              <strong>#${ticket.id}</strong> - ${ticket.title}
            </div>
            <div class="psp-ticket-meta-row">
              <span class="psp-badge psp-badge-${ticket.status}">${ticket.status}</span>
              <span class="psp-badge psp-badge-priority-${ticket.priority}">${ticket.priority}</span>
              <span>${new Date(ticket.date).toLocaleDateString()}</span>
            </div>
          </div>
        `).join('');
        dashboardTickets.innerHTML = html;
      }
    })
    .catch(err => {
      console.error('Error loading dashboard stats:', err);
      if (openStat) openStat.textContent = '!';
      if (assignedStat) assignedStat.textContent = '!';
      if (urgentStat) urgentStat.textContent = '!';
    });

    // Fetch partners count
    fetch(`${PSP_PORTAL.api.base}/partners`, {
      headers: { 'X-WP-Nonce': PSP_PORTAL.api.nonce }
    })
    .then(res => res.json())
    .then(partners => {
      if (partnersStat) partnersStat.textContent = partners.length;
    })
    .catch(err => {
      console.error('Error loading partners:', err);
      if (partnersStat) partnersStat.textContent = '!';
    });
  }

  // Dashboard event listeners
  document.addEventListener('DOMContentLoaded', function() {
    if ($('psp-dashboard')) {
      loadDashboardStats();
    }
  });

  // ===========================
  // Support Tools (Branding & Partner Edits)
  // ===========================
  function applyBranding(primary, hover, lockBg, lockBorder){
    let style = document.getElementById('psp-branding-style');
    const css = `.psp-button-primary{background:${primary}!important;color:#fff}.psp-button-primary:hover{background:${hover}!important}.psp-login-footer a{color:${primary}}.psp-kb-article-title{color:${primary}}.psp-lock-section{background:${lockBg}!important;border-color:${lockBorder}!important}.psp-lock-info code{background:${lockBg}!important;border-color:${lockBorder}!important}`;
    if (!style){
      style = document.createElement('style');
      style.id = 'psp-branding-style';
      document.head.appendChild(style);
    }
    style.textContent = css;
  }

  function setupSupportTools(){
    const container = $('psp-support-tools');
    if (!container) return;

    // Prefill with localized branding
    if (PSP_PORTAL && PSP_PORTAL.branding) {
      applyBranding(PSP_PORTAL.branding.primary, PSP_PORTAL.branding.primaryHover, PSP_PORTAL.branding.lockBg, PSP_PORTAL.branding.lockBorder);
    }

    // Load partners into select
    const sel = $('psp-partner-select');
    if (sel) {
      fetch(PSP_PORTAL.rest.base + '/partners', { headers: { 'X-WP-Nonce': PSP_PORTAL.rest.nonce } })
        .then(r => r.ok ? r.json() : [])
        .then(items => {
          sel.innerHTML = '<option value="">Select partnerΓÇª</option>' + (items||[]).map(p => `<option value="${p.id}">${(p.companyName||'Partner')}</option>`).join('');
        }).catch(()=>{});

      sel.addEventListener('change', function(){
        const id = parseInt(this.value||'0');
        if (!id) return;
        // Load lock info
        fetch(`${PSP_PORTAL.rest.base}/partners/${id}/lock-info`, { headers: { 'X-WP-Nonce': PSP_PORTAL.rest.nonce } })
          .then(r => r.json())
          .then(data => {
            if ($('psp-lock-make')) $('psp-lock-make').value = data.lock_make || '';
            if ($('psp-lock-part')) $('psp-lock-part').value = data.lock_part || '';
            if ($('psp-master-code')) $('psp-master-code').value = data.master_code || '';
            if ($('psp-sub-master-code')) $('psp-sub-master-code').value = data.sub_master_code || '';
            if ($('psp-lock-key')) $('psp-lock-key').value = data.key || '';
          });
        // Load partner to get topColour (use partners list endpoint single fetch for simplicity)
        fetch(PSP_PORTAL.rest.base + '/partners', { headers: { 'X-WP-Nonce': PSP_PORTAL.rest.nonce } })
          .then(r => r.json()).then(list => {
            const p = (list||[]).find(x => parseInt(x.id) === id);
            if (p){
              const selColour = normalizeTopColour(p.topColour || '');
              const selEl = $('psp-partner-top-colour-select');
              const customEl = $('psp-partner-top-colour');
              if (selEl){
                if (selColour === 'Custom'){
                  selEl.value = 'custom';
                  if (customEl){ customEl.style.display='block'; customEl.value = p.topColour || ''; }
                } else {
                  selEl.value = selColour;
                  if (customEl){ customEl.style.display='none'; customEl.value=''; }
                }
              }
            }
          });
      });
    }

    const brandingBtn = $('psp-save-branding');
    if (brandingBtn){
      brandingBtn.addEventListener('click', function(){
        const status = $('psp-branding-status');
        const primary = ($('psp-color-primary')||{}).value || '#3b82f6';
        const hover = ($('psp-color-primary-hover')||{}).value || '#2563eb';
        const lockBg = ($('psp-color-lock-bg')||{}).value || '#fef3c7';
        const lockBorder = ($('psp-color-lock-border')||{}).value || '#fbbf24';
        if (status){ status.textContent = 'SavingΓÇª'; status.style.color = '#666'; }
        fetch(PSP_PORTAL.rest.base + '/ui-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': PSP_PORTAL.rest.nonce },
          body: JSON.stringify({
            primary_color: primary,
            primary_hover_color: hover,
            lock_highlight_bg: lockBg,
            lock_highlight_border: lockBorder
          })
        }).then(r => {
          if (!r.ok) throw new Error('save failed');
          applyBranding(primary, hover, lockBg, lockBorder);
          if (status){ status.textContent = 'Saved. Colors updated.'; status.style.color = '#065f46'; }
        }).catch(() => {
          if (status){ status.textContent = 'Failed to save colors.'; status.style.color = '#991b1b'; }
        });
      });
    }

    const saveLockBtn = $('psp-save-partner-lock');
    if (saveLockBtn){
      saveLockBtn.addEventListener('click', function(){
        const id = parseInt(($('psp-partner-select')||{}).value||'0');
        const status = $('psp-partner-edit-status');
        if (!id){ if (status){ status.textContent = 'Select a partner first.'; status.style.color = '#991b1b'; } return; }
        const payload = {
          lock_make: ($('psp-lock-make')||{}).value || '',
          lock_part: ($('psp-lock-part')||{}).value || '',
          master_code: ($('psp-master-code')||{}).value || '',
          sub_master_code: ($('psp-sub-master-code')||{}).value || '',
          key: ($('psp-lock-key')||{}).value || ''
        };
        if (status){ status.textContent = 'Saving lock infoΓÇª'; status.style.color = '#666'; }
        fetch(`${PSP_PORTAL.rest.base}/partners/${id}/lock-info`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': PSP_PORTAL.rest.nonce },
          body: JSON.stringify(payload)
        }).then(r => {
          if (!r.ok) throw new Error('save failed');
          if (status){ status.textContent = 'Lock info saved.'; status.style.color = '#065f46'; }
          // Refresh partner list render if present
          if (PSP_PORTAL.ui && PSP_PORTAL.ui.isSupport) { fetchPartners(); }
        }).catch(() => {
          if (status){ status.textContent = 'Failed to save lock info.'; status.style.color = '#991b1b'; }
        });
      });
    }

    const saveTopColourBtn = $('psp-save-partner-topcolour');
    if (saveTopColourBtn){
      saveTopColourBtn.addEventListener('click', function(){
        const id = parseInt(($('psp-partner-select')||{}).value||'0');
        const status = $('psp-partner-edit-status');
        if (!id){ if (status){ status.textContent = 'Select a partner first.'; status.style.color = '#991b1b'; } return; }
        const sel = $('psp-partner-top-colour-select');
        const custom = $('psp-partner-top-colour');
        let topColour = '';
        if (sel){
          if (sel.value === 'custom'){
            topColour = (custom&&custom.value)||'';
          } else {
            topColour = sel.value; // store label
            // Convert label to hex for new palette where applicable
            const labelMap = {
              'Calm Blue':'#3AA6B9',
              'Bright Accent':'#25D0EE',
              'Navy Blue':'#000080'
            };
            if (labelMap[topColour]) topColour = labelMap[topColour];
          }
        }
        if (status){ status.textContent = 'Saving top colourΓÇª'; status.style.color = '#666'; }
        fetch(`${PSP_PORTAL.rest.base}/partners/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': PSP_PORTAL.rest.nonce },
          body: JSON.stringify({ top_colour: topColour })
        }).then(r => {
          if (!r.ok) throw new Error('save failed');
          if (status){ status.textContent = 'Top colour saved.'; status.style.color = '#065f46'; }
          if (PSP_PORTAL.ui && PSP_PORTAL.ui.isSupport) { fetchPartners(); }
        }).catch(() => {
          if (status){ status.textContent = 'Failed to save top colour.'; status.style.color = '#991b1b'; }
        });
      });
    }

    // Dropdown show/hide custom input logic
    const topSel = $('psp-partner-top-colour-select');
    const topCustom = $('psp-partner-top-colour');
    if (topSel){
      topSel.addEventListener('change', function(){
        if (this.value === 'custom'){
          if (topCustom){ topCustom.style.display='block'; topCustom.focus(); }
        } else {
          if (topCustom){ topCustom.style.display='none'; topCustom.value=''; }
        }
      });
    }
  }

  // ===========================
  // User Management (Support/Admin only)
  // ===========================
  function setupUserManagement(){
    const box = $('psp-user-management');
    if (!box) return;
    const partnerSel = $('psp-user-partner');
    if (partnerSel){
      fetch(PSP_PORTAL.rest.base + '/partners', { headers: { 'X-WP-Nonce': PSP_PORTAL.rest.nonce } })
        .then(r => r.ok ? r.json() : [])
        .then(list => {
          const opts = (list||[]).map(p => `<option value="${p.id}">${p.companyName||'Partner'}</option>`).join('');
          partnerSel.insertAdjacentHTML('beforeend', opts);
        }).catch(()=>{});
    }
    loadUsers();
    const createBtn = $('psp-user-create');
    if (createBtn){ createBtn.addEventListener('click', createUser); }
  }

  async function loadUsers(){
    const listEl = $('psp-user-list');
    const hint = $('psp-user-list-hint');
    if (!listEl) return;
    try {
      const res = await fetch(PSP_PORTAL.rest.base + '/users', { headers: { 'X-WP-Nonce': PSP_PORTAL.rest.nonce } });
      if (!res.ok) throw new Error('fail');
      const users = await res.json();
      listEl.innerHTML = '';
      if (!users.length){ 
        listEl.innerHTML = '<li class="psp-list-item" style="text-align:center;padding:20px;color:#6b7280;background:#f9fcfd;border-radius:8px;"><div style="font-size:14px;margin-bottom:8px;">No users created yet</div><div style="font-size:12px;">Use the form above to create your first partner account!</div></li>'; 
        return; 
      }
      users.forEach(u => {
        const li = document.createElement('li');
        li.className = 'psp-list-item';
        li.innerHTML = `<strong>${u.displayName||u.username}</strong> ΓÇö ${u.email} <span style=\"color:#6b7280\">(${u.roles.join(',')})</span>` +
          (u.partnerId ? ` <span style=\"background:#3AA6B9;color:#fff;border-radius:12px;padding:2px 8px;font-size:11px;margin-left:8px\">Partner #${u.partnerId}</span>` : '') +
          ` <button type=\"button\" data-id=\"${u.id}\" class=\"psp-button psp-button-secondary psp-reset-pass\" style=\"margin-left:8px;padding:4px 10px;font-size:12px\">Reset Password</button>`;
        listEl.appendChild(li);
      });
      listEl.querySelectorAll('.psp-reset-pass').forEach(btn => {
        btn.addEventListener('click', () => resetPassword(parseInt(btn.getAttribute('data-id'))));
      });
    } catch (e){
      if (hint){ hint.textContent = 'Failed to load users.'; }
    }
  }

  async function createUser(){
    const email = ($('psp-user-email')||{}).value || '';
    const first = ($('psp-user-first-name')||{}).value || '';
    const last = ($('psp-user-last-name')||{}).value || '';
    const role = ($('psp-user-role')||{}).value || 'psp_partner';
    const partnerId = parseInt(($('psp-user-partner')||{}).value||'0');
    const status = $('psp-user-create-status');
    if (!email){ if (status){ status.textContent='Email required.'; status.style.color='#991b1b'; } return; }
    try {
      if (status){ status.textContent='Creating userΓÇª'; status.style.color='#666'; }
      const res = await fetch(PSP_PORTAL.rest.base + '/users', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'X-WP-Nonce': PSP_PORTAL.rest.nonce },
        body: JSON.stringify({ email, first_name:first, last_name:last, role, partner_id: partnerId||undefined })
      });
      if (!res.ok){ throw new Error('failed'); }
      const data = await res.json();
      if (status){ status.textContent = 'User created. Password: ' + data.password_generated; status.style.color='#065f46'; }
      if ($('psp-user-email')) $('psp-user-email').value='';
      if ($('psp-user-first-name')) $('psp-user-first-name').value='';
      if ($('psp-user-last-name')) $('psp-user-last-name').value='';
      if ($('psp-user-partner')) $('psp-user-partner').value='';
      if ($('psp-user-role')) $('psp-user-role').value='psp_partner';
      loadUsers();
    } catch (e){
      if (status){ status.textContent='Failed to create user.'; status.style.color='#991b1b'; }
    }
  }

  async function resetPassword(id){
    const listHint = $('psp-user-list-hint');
    try {
      if (listHint){ listHint.textContent='Resetting passwordΓÇª'; listHint.style.color='#666'; }
      const res = await fetch(PSP_PORTAL.rest.base + '/users/' + id, {
        method: 'PUT',
        headers: { 'Content-Type':'application/json', 'X-WP-Nonce': PSP_PORTAL.rest.nonce },
        body: JSON.stringify({ reset_password: true })
      });
      if (!res.ok) throw new Error('failed');
      if (listHint){ listHint.textContent='Password reset and emailed.'; listHint.style.color='#065f46'; }
    } catch (e){
      if (listHint){ listHint.textContent='Failed to reset password.'; listHint.style.color='#991b1b'; }
    }
  }

  // Contact Form Setup
  function setupContactForm(){
    const addBtn = $('psp-contact-add');
    if (addBtn) addBtn.addEventListener('click', addPartnerContact);
  }

  // CSV Import Setup
  function setupCSVImport(){
    const btn = $('psp-csv-import-btn');
    const fileInput = $('psp-csv-upload');
    const status = $('psp-csv-status');
    
    if (!btn || !fileInput) return;
    
    btn.addEventListener('click', async function(){
      const file = fileInput.files && fileInput.files[0];
      if (!file){
        if (status){ status.textContent = 'Please select a CSV file first.'; status.style.color = '#dc2626'; }
        return;
      }
      
      if (status){ status.textContent = 'Reading CSV file...'; status.style.color = '#666'; }
      
      try {
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2){
          if (status){ status.textContent = 'CSV file is empty or invalid.'; status.style.color = '#dc2626'; }
          return;
        }
        
        // Parse header
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const requiredCols = ['company_name'];
        const missing = requiredCols.filter(col => !headers.includes(col));
        if (missing.length){
          if (status){ status.textContent = 'Missing required columns: ' + missing.join(', '); status.style.color = '#dc2626'; }
          return;
        }
        
        if (status){ status.textContent = `Importing ${lines.length - 1} partners...`; status.style.color = '#666'; }
        
        let imported = 0;
        let failed = 0;
        
        for (let i = 1; i < lines.length; i++){
          const values = lines[i].split(',').map(v => v.trim());
          const row = {};
          headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
          
          if (!row.company_name) {
            failed++;
            continue;
          }
          
          try {
            const res = await fetch(PSP_PORTAL.rest.base + '/partners/import', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': PSP_PORTAL.rest.nonce,
              },
              body: JSON.stringify({
                company_name: row.company_name,
                street_address: row.street_address || '',
                city: row.city || '',
                state: row.state || '',
                zip: row.zip || '',
                country: row.country || '',
                units: parseInt(row.units) || 0,
                top_colour: row.top_colour || ''
              })
            });
            
            if (res.ok) {
              imported++;
            } else {
              failed++;
            }
          } catch (e) {
            failed++;
          }
        }
        
        if (status){ 
          status.textContent = `Γ£ô Imported ${imported} partners. ${failed > 0 ? failed + ' failed.' : ''}`;
          status.style.color = failed > 0 ? '#d97706' : '#065f46';
        }
        
        // Clear file input
        fileInput.value = '';
        
        // Refresh partner list
        if (PSP_PORTAL.ui && PSP_PORTAL.ui.isSupport) { fetchPartners(); }
        
      } catch (e){
        if (status){ status.textContent = 'Failed to import CSV: ' + e.message; status.style.color = '#dc2626'; }
      }
    });
  }

  // Boot user management and CSV import after DOM ready
  document.addEventListener('DOMContentLoaded', function(){
    setupUserManagement();
    setupCSVImport();
  });
})();
