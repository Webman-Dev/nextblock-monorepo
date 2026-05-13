jQuery(document).ready(function($) {
    let typesToProcess = [];
    let currentTypeIndex = 0;
    let isCancelled = false;

    $('#nme-cancel-export').on('click', function(e) {
        e.preventDefault();
        isCancelled = true;
        logMsg('🛑 Aborting transmission sequence... waiting for current chunk to finish.');
        $(this).prop('disabled', true).text('Cancelling...');
    });

    $('#nme-download-redirects').on('click', function(e) {
        e.preventDefault();
        window.location.href = nmeConfig.ajax_url + '?action=nme_generate_redirects&nonce=' + nmeConfig.nonce;
    });

    $('#nme-start-export').on('click', function(e) {
        e.preventDefault();
        
        // Execute synchronous save of configuration inputs prior to batch initiation
        const url = $('#nme_supabase_url').val();
        const key = $('#nme_supabase_key').val();

        $.post(nmeConfig.ajax_url, {
            action: 'nme_save_settings',
            nonce: nmeConfig.nonce,
            supabase_url: url,
            supabase_key: key,
            r2_account_id: $('#nme_r2_account_id').val(),
            r2_access_key: $('#nme_r2_access_key').val(),
            r2_secret_key: $('#nme_r2_secret_key').val(),
            r2_bucket: $('#nme_r2_bucket').val(),
            r2_public_domain: $('#nme_r2_public_domain').val()
        }, function() {
            // Aggregate user-selected entity queues
            typesToProcess = [];
            $('.nme-type-toggle:checked').each(function() {
                typesToProcess.push($(this).val());
            });

            if (typesToProcess.length === 0) {
                alert('An entity array must be specified for extraction.');
                return;
            }

            const testLimit = parseInt($('#nme_test_limit').val(), 10) || 0;
            const limitLabel = testLimit > 0 ? `(limit: ${testLimit} per type)` : '(full migration)';

            $('#nme-progress-container').fadeIn();
            $('#nme-start-export').prop('disabled', true);
            $('#nme-cancel-export').show().prop('disabled', false).text('Cancel');
            
            $('#nme-log-output').empty();
            logMsg(`Verifying Edge Function connection... ${limitLabel}`);
            
            isCancelled = false;
            currentTypeIndex = 0;

            // Ping connection before starting
            $.post(nmeConfig.ajax_url, {
                action: 'nme_test_connection',
                nonce: nmeConfig.nonce
            }).done(function(res) {
                if (res.success) {
                    logMsg('✅ Connection Established. Spooling queue...');
                    processNextType();
                } else {
                    logMsg(`❌ Connection Failed: ${res.data.message || 'Server unresponsive'}`);
                    $('#nme-start-export').prop('disabled', false);
                    $('#nme-cancel-export').hide();
                }
            }).fail(function() {
                logMsg('❌ Connection Ping completely failed (network error).');
                $('#nme-start-export').prop('disabled', false);
                $('#nme-cancel-export').hide();
            });
        });
    });

    function processNextType() {
        if (isCancelled) {
            cleanupAfterCancel();
            return;
        }

        if (currentTypeIndex >= typesToProcess.length) {
            logMsg('✅ Migration Export Finalized.');
            $('#nme-start-export').prop('disabled', false);
            $('#nme-cancel-export').hide();
            return;
        }

        let type = typesToProcess[currentTypeIndex];
        logMsg(`Engaging extraction matrix for entity type: ${type}`);
        $('#nme-progress-bar').css('width', '0%');
        
        executeBatch(type, 0);
    }

    function executeBatch(type, offset) {
        if (isCancelled) {
            cleanupAfterCancel();
            return;
        }

        const testLimit = parseInt($('#nme_test_limit').val(), 10) || 0;

        $.post(nmeConfig.ajax_url, {
            action: 'nme_process_batch',
            nonce: nmeConfig.nonce,
            post_type: type,
            offset: offset,
            test_limit: testLimit
        }).done(function(res) {
            if (!res.success) {
                logMsg(`❌ Chunk failure detected: ${res.data}`);
                return;
            }

            let data = res.data;
            let code = data.api_status && data.api_status.code ? data.api_status.code : 'N/A';
            
            if (data.api_status && data.api_status.status === 'error') {
                logMsg(`❌ Supabase Error: ${data.api_status.message}`);
                // Stop the loop completely instead of silently continuing
                $('#nme-start-export').prop('disabled', false);
                $('#nme-cancel-export').hide();
                return;
            } else {
                logMsg(`>>> Transmitted data packet | Working... (Success)`);
            }

            if (data.total > 0) {
                let percent = Math.min(100, Math.round((data.offset / data.total) * 100));
                $('#nme-progress-bar').css('width', percent + '%');
                $('#nme-progress-text').text(`Extraction Progress: ${percent}% (${data.offset} / ${data.total})`);
            }

            if (data.done) {
                logMsg(`Entity type [${type}] successfully unspooled.`);
                currentTypeIndex++;
                processNextType();
            } else {
                // Recursively fire the next chunk to maintain synchronous UI feedback
                executeBatch(type, data.offset);
            }
        }).fail(function(xhr) {
            // Self-healing mechanism mitigates edge-case gateway drops
            logMsg(`💥 Network Disconnect: ${xhr.statusText}. Retrying offset vector ${offset} in 3.0s...`);
            setTimeout(() => executeBatch(type, offset), 3000);
        });
    }

    function logMsg(msg) {
        let ul = $('#nme-log-output');
        ul.append(`<li>${msg}</li>`);
        ul.scrollTop(ul[0].scrollHeight);
    }

    function cleanupAfterCancel() {
        logMsg('✅ Export process was terminated.');
        $('#nme-start-export').prop('disabled', false);
        $('#nme-cancel-export').hide();
    }
});
