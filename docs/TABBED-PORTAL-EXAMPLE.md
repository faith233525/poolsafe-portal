# Tabbed Portal Example (Drop-In)

Use this minimal HTML wrapper with existing shortcodes to create a tabbed interface on any WordPress page. Paste into the page editor (switch to HTML) and ensure the shortcodes remain unmodified.

```html
<div class="psp-tabbed-portal">
  <div class="psp-tab-nav">
    <button class="psp-tab-btn active" data-tab="dashboard">📊 Dashboard</button>
    <button class="psp-tab-btn" data-tab="tickets">🎫 Tickets</button>
    <button class="psp-tab-btn" data-tab="service">🛠 Service Records</button>
    <button class="psp-tab-btn" data-tab="kb">📚 Knowledge Base</button>
    <button class="psp-tab-btn" data-tab="calendar">📅 Calendar</button>
    <button class="psp-tab-btn" data-tab="notifications">🔔 Notifications</button>
    <button class="psp-tab-btn" data-tab="users">👥 User Mgmt</button>
    <button class="psp-tab-btn" data-tab="tools">🧰 Support Tools</button>
  </div>

  <div class="psp-tab-panels">
    <div id="dashboard" class="psp-tab-panel active">[poolsafe_dashboard]</div>
    <div id="tickets" class="psp-tab-panel">[poolsafe_tickets]</div>
    <div id="service" class="psp-tab-panel">[poolsafe_service_records]</div>
    <div id="kb" class="psp-tab-panel">[poolsafe_kb]</div>
    <div id="calendar" class="psp-tab-panel">[poolsafe_calendar]</div>
    <div id="notifications" class="psp-tab-panel">[poolsafe_notifications]</div>
    <div id="users" class="psp-tab-panel">[poolsafe_user_management]</div>
    <div id="tools" class="psp-tab-panel">[poolsafe_support_tools]</div>
  </div>
</div>

<script>
document.addEventListener('DOMContentLoaded',()=>{
  const btns=[...document.querySelectorAll('.psp-tab-btn')];
  const panels=[...document.querySelectorAll('.psp-tab-panel')];
  btns.forEach(b=>b.addEventListener('click',()=>{
    const t=b.getAttribute('data-tab');
    btns.forEach(x=>x.classList.remove('active'));
    panels.forEach(p=>p.classList.remove('active'));
    b.classList.add('active');
    document.getElementById(t).classList.add('active');
  }));
});
</script>

<style>
.psp-tab-nav{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px;border-bottom:2px solid #ddd}
.psp-tab-btn{background:#f5f5f5;border:none;padding:10px 16px;cursor:pointer;font-size:14px;font-weight:500;border-radius:5px 5px 0 0;transition:.25s}
.psp-tab-btn.active{background:#fff;color:#2563eb;border-bottom:3px solid #2563eb}
.psp-tab-btn:hover{background:#e9e9e9}
.psp-tab-panel{display:none;animation:fadeIn .25s ease}
.psp-tab-panel.active{display:block}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@media(max-width:780px){.psp-tab-btn{flex:1 1 calc(50% - 6px)}}
</style>
```

## Notes
- Tabs rely purely on client-side JS; no additional plugin code required.
- Shortcodes render only when their panel is visible after initial load (WordPress parses all shortcodes on page render—acceptable for current scale).
- For performance with very large datasets you can convert panels to AJAX-on-demand by wrapping content areas and replacing shortcode output with dynamic fetch calls.

## Accessibility Enhancements (Optional)
Add ARIA attributes for screen readers:
```html
<button class="psp-tab-btn" role="tab" aria-selected="true" aria-controls="dashboard" id="tab-dashboard">📊 Dashboard</button>
<div id="dashboard" role="tabpanel" aria-labelledby="tab-dashboard">[poolsafe_dashboard]</div>
```

## Extending
- Add a partner map tab using `[poolsafe_map]` (support/admin roles only) if desired.
- Reorder or remove buttons to tailor partner vs support views.

## Version
This example matches plugin version 1.3.1.
