/**
 * Setup Wizard JavaScript
 */
(function($) {
    'use strict';
    
    const wizard = {
        init: function() {
            this.bindEvents();
            this.updateWebhookUrls();
        },
        
        bindEvents: function() {
            // Tab switching
            $('.psp-tab').on('click', this.switchTab);
            
            // Generate token
            $('#generate-token').on('click', this.generateToken);
            
            // Copy buttons
            $('.copy-url, #copy-token').on('click', this.copyToClipboard);
            
            // Test connections
            $('#test-azure').on('click', this.testAzure);
            $('#test-hubspot').on('click', this.testHubSpot);
            
            // Save settings
            $('#save-settings').on('click', this.saveSettings);
            
            // Complete setup
            $('#complete-setup').on('click', this.completeSetup);
            
            // Auto-update webhook URLs when token changes
            $('#email-token').on('change', this.updateWebhookUrls);
        },
        
        switchTab: function(e) {
            e.preventDefault();
            const $tab = $(this);
            const tabId = $tab.data('tab');
            
            // Update tabs
            $('.psp-tab').removeClass('active');
            $tab.addClass('active');
            
            // Update panels
            $('.psp-panel').removeClass('active');
            $('#tab-' + tabId).addClass('active');
        },
        
        generateToken: function(e) {
            e.preventDefault();
            const $btn = $(this);
            const originalText = $btn.text();
            
            $btn.prop('disabled', true).text('⏳ Generating...');
            
            $.ajax({
                url: pspSetup.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'psp_generate_token',
                    nonce: pspSetup.nonce
                },
                success: function(response) {
                    if (response.success) {
                        $('#email-token').val(response.data.token);
                        $('#webhook-inbound').val(response.data.webhookInbound);
                        $('#webhook-response').val(response.data.webhookResponse);
                        wizard.showNotice('Token generated successfully!', 'success');
                    } else {
                        wizard.showNotice(response.data.message || 'Failed to generate token', 'error');
                    }
                },
                error: function() {
                    wizard.showNotice('Error generating token', 'error');
                },
                complete: function() {
                    $btn.prop('disabled', false).text(originalText);
                }
            });
        },
        
        updateWebhookUrls: function() {
            const token = $('#email-token').val();
            if (token) {
                const inboundUrl = pspSetup.webhookUrl + '?token=' + token;
                const responseUrl = pspSetup.responseUrl + '?token=' + token;
                
                $('#webhook-inbound').val(inboundUrl);
                $('#webhook-response').val(responseUrl);
            }
        },
        
        copyToClipboard: function(e) {
            e.preventDefault();
            const $btn = $(this);
            const targetId = $btn.data('target') || $btn.attr('id').replace('copy-', '');
            const $input = $('#' + targetId);
            
            if ($input.length) {
                $input.select();
                document.execCommand('copy');
                
                const originalText = $btn.text();
                $btn.text('✓ Copied!');
                setTimeout(function() {
                    $btn.text(originalText);
                }, 2000);
            }
        },
        
        testAzure: function(e) {
            e.preventDefault();
            const $btn = $(this);
            const $status = $('#azure-status');
            
            const clientId = $('#azure-client-id').val();
            const tenantId = $('#azure-tenant-id').val();
            
            if (!clientId || !tenantId) {
                $status.removeClass('success').addClass('error').text('⚠️ Please fill in Client ID and Tenant ID');
                return;
            }
            
            $btn.prop('disabled', true).text('🔄 Testing...');
            $status.removeClass('success error').addClass('loading').text('Testing connection...');
            
            $.ajax({
                url: pspSetup.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'psp_test_azure',
                    nonce: pspSetup.nonce,
                    client_id: clientId,
                    tenant_id: tenantId
                },
                success: function(response) {
                    if (response.success) {
                        $status.removeClass('loading error').addClass('success').text('✅ ' + response.data.message);
                    } else {
                        $status.removeClass('loading success').addClass('error').text('❌ ' + response.data.message);
                    }
                },
                error: function() {
                    $status.removeClass('loading success').addClass('error').text('❌ Connection failed');
                },
                complete: function() {
                    $btn.prop('disabled', false).text('🧪 Test Azure AD Connection');
                }
            });
        },
        
        testHubSpot: function(e) {
            e.preventDefault();
            const $btn = $(this);
            const $status = $('#hubspot-status');
            
            const apiKey = $('#hubspot-api-key').val();
            
            if (!apiKey) {
                $status.removeClass('success').addClass('error').text('⚠️ Please enter API Key');
                return;
            }
            
            $btn.prop('disabled', true).text('🔄 Testing...');
            $status.removeClass('success error').addClass('loading').text('Testing connection...');
            
            $.ajax({
                url: pspSetup.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'psp_test_hubspot',
                    nonce: pspSetup.nonce,
                    api_key: apiKey
                },
                success: function(response) {
                    if (response.success) {
                        const message = response.data.message + ' (Portal ID: ' + response.data.portalId + ')';
                        $status.removeClass('loading error').addClass('success').text('✅ ' + message);
                        
                        // Auto-fill portal ID if returned
                        if (response.data.portalId && !$('#hubspot-portal-id').val()) {
                            $('#hubspot-portal-id').val(response.data.portalId);
                        }
                    } else {
                        $status.removeClass('loading success').addClass('error').text('❌ ' + response.data.message);
                    }
                },
                error: function() {
                    $status.removeClass('loading success').addClass('error').text('❌ Connection failed');
                },
                complete: function() {
                    $btn.prop('disabled', false).text('🧪 Test HubSpot Connection');
                }
            });
        },
        
        saveSettings: function(e) {
            e.preventDefault();
            const $btn = $(this);
            const $status = $('#save-status');
            
            const settings = {
                email_token: $('#email-token').val(),
                azure_client_id: $('#azure-client-id').val(),
                azure_client_secret: $('#azure-client-secret').val(),
                azure_tenant_id: $('#azure-tenant-id').val(),
                hubspot_api_key: $('#hubspot-api-key').val(),
                hubspot_portal_id: $('#hubspot-portal-id').val(),
                hubspot_sync_enabled: $('#hubspot-sync-enabled').is(':checked') ? '1' : '0',
                hubspot_sync_frequency: $('#hubspot-sync-frequency').val()
            };
            
            $btn.prop('disabled', true).text('💾 Saving...');
            $status.removeClass('saved error').addClass('saving').text('Saving settings...');
            
            $.ajax({
                url: pspSetup.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'psp_save_settings',
                    nonce: pspSetup.nonce,
                    settings: settings
                },
                success: function(response) {
                    if (response.success) {
                        $status.removeClass('saving error').addClass('saved').text('✅ Settings saved successfully!');
                        wizard.updateSummaryCards();
                        
                        setTimeout(function() {
                            $status.fadeOut();
                        }, 3000);
                    } else {
                        $status.removeClass('saving saved').addClass('error').text('❌ ' + response.data.message);
                    }
                },
                error: function() {
                    $status.removeClass('saving saved').addClass('error').text('❌ Save failed');
                },
                complete: function() {
                    $btn.prop('disabled', false).text('💾 Save Settings');
                }
            });
        },
        
        completeSetup: function(e) {
            e.preventDefault();
            const $btn = $(this);
            
            if (confirm('Mark setup as complete? You can always reconfigure settings later.')) {
                $.ajax({
                    url: pspSetup.ajaxUrl,
                    type: 'POST',
                    data: {
                        action: 'psp_save_settings',
                        nonce: pspSetup.nonce,
                        settings: {
                            setup_completed: '1'
                        }
                    },
                    success: function() {
                        wizard.showNotice('Setup completed! Redirecting to dashboard...', 'success');
                        setTimeout(function() {
                            window.location.href = pspSetup.siteUrl + '/wp-admin/';
                        }, 2000);
                    }
                });
            }
        },
        
        updateSummaryCards: function() {
            const hasToken = $('#email-token').val().length > 0;
            const hasAzure = $('#azure-client-id').val().length > 0;
            const hasHubSpot = $('#hubspot-api-key').val().length > 0;
            
            $('#status-email .psp-card-status').html(hasToken ? '✅ Token Generated' : '⚠️ Token Not Generated');
            $('#status-azure .psp-card-status').html(hasAzure ? '✅ Configured' : '⚠️ Not Configured');
            $('#status-hubspot .psp-card-status').html(hasHubSpot ? '✅ Configured' : '⚠️ Not Configured');
        },
        
        showNotice: function(message, type) {
            const noticeClass = type === 'success' ? 'notice-success' : 'notice-error';
            const notice = $('<div class="notice ' + noticeClass + ' is-dismissible"><p>' + message + '</p></div>');
            
            $('.psp-setup-wizard > h1').after(notice);
            
            setTimeout(function() {
                notice.fadeOut(function() {
                    $(this).remove();
                });
            }, 5000);
        }
    };
    
    // Initialize on document ready
    $(document).ready(function() {
        wizard.init();
    });
    
})(jQuery);
