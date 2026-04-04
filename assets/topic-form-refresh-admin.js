/**
 * Topic Form Refresh — Admin Self-Update UI
 *
 * Adds a "Check for Updates" panel on the plugin settings page.
 * Queries GitHub releases API and can download + install new versions.
 *
 * @version 1.1.0
 */
(function($) {
    'use strict';

    function init() {
        // Build update UI
        var sectionHtml =
            '<div id="tfr-updater" style="margin:10px 5px 15px;padding:12px 15px;' +
            'background:#f8f9fa;border:1px solid #ddd;border-radius:4px;">' +
            '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
            '  <strong style="font-size:13px;">Plugin Updates</strong>' +
            '  <button type="button" id="tfr-check-btn" class="button"' +
            '    style="padding:4px 14px;font-size:12px;">Check for Updates</button>' +
            '  <span id="tfr-status"></span>' +
            '</div>' +
            '<div id="tfr-result" style="margin-top:8px;display:none;"></div>' +
            '</div>';

        var inserted = false;

        // Strategy 1: Standard osTicket — h2 "Plugin Information" followed by table
        var $h2 = $('h2').filter(function() {
            return $.trim($(this).text()) === 'Plugin Information';
        }).first();
        if ($h2.length) {
            var $tbl = $h2.next('table');
            ($tbl.length ? $tbl : $h2).after(sectionHtml);
            inserted = true;
        }

        // Strategy 2: osTicketAwesome / table-based layout — find "Plugin Settings"
        //             row and insert a <tr> before it
        if (!inserted) {
            var $settingsRow = $('tr').filter(function() {
                var t = $.trim($(this).text());
                return t === 'Plugin Settings' || t === 'Plugin Settings:';
            }).first();
            if ($settingsRow.length) {
                $('<tr><td colspan="2" style="padding:0">' + sectionHtml + '</td></tr>')
                    .insertBefore($settingsRow);
                inserted = true;
            }
        }

        // Strategy 3: Last resort — insert before save buttons
        if (!inserted) {
            var $form = $('form').has('button[type="submit"]').first();
            if (!$form.length) return;
            var $table = $form.find('table').first();
            if ($table.length) {
                $table.after(sectionHtml);
            } else {
                $form.prepend(sectionHtml);
            }
        }

        $('#tfr-check-btn').on('click', checkForUpdates);
    }

    function csrfToken() {
        return $('meta[name="csrf_token"]').attr('content')
            || $('input[name="__CSRFToken__"]').val()
            || '';
    }

    function box(type, html) {
        var colors = {
            success: 'background:#d4edda;border-color:#28a745;color:#155724',
            warning: 'background:#fff3cd;border-color:#ffc107;color:#856404',
            danger:  'background:#f8d7da;border-color:#dc3545;color:#721c24'
        };
        return '<div style="padding:10px;border:1px solid;border-radius:4px;' +
               (colors[type] || '') + '">' + html + '</div>';
    }

    function checkForUpdates() {
        var $btn = $('#tfr-check-btn').prop('disabled', true).text('Checking\u2026');
        var $status = $('#tfr-status').html(
            '<i class="icon-spinner icon-spin"></i> Querying GitHub\u2026');
        var $result = $('#tfr-result').hide();

        $.ajax({
            url: 'ajax.php/topic-form-refresh/check-update',
            dataType: 'json',
            success: function(d) {
                $btn.prop('disabled', false).text('Check for Updates');
                $status.empty();

                if (d.error) {
                    $result.html(box('danger', d.error)).show();
                    return;
                }

                if (d.update_available) {
                    var notes = d.release_notes
                        ? '<br><small style="white-space:pre-wrap;opacity:.85">' +
                          $('<span>').text(d.release_notes).html() + '</small>'
                        : '';
                    $result.html(
                        box('warning',
                            '<strong>Update available:</strong> v' + d.current +
                            ' &rarr; <strong>v' + d.latest + '</strong>' + notes +
                            '<br><br><button type="button" id="tfr-update-btn" ' +
                            'style="padding:5px 16px;background:#28a745;color:#fff;' +
                            'border:1px solid #218838;border-radius:3px;cursor:pointer;' +
                            'font-size:12px;">Update Now</button>')
                    ).show();
                    $('#tfr-update-btn').on('click', doUpdate);
                } else {
                    $result.html(
                        box('success',
                            '<strong>&#10003; Up to date</strong> &mdash; v' + d.current)
                    ).show();
                }
            },
            error: function() {
                $btn.prop('disabled', false).text('Check for Updates');
                $result.html(box('danger', 'Network error &mdash; could not reach server')).show();
            }
        });
    }

    function doUpdate() {
        if (!confirm('Download and install the latest version?\n\nPlugin files will be replaced.'))
            return;

        var $btn = $('#tfr-update-btn').prop('disabled', true).text('Updating\u2026');

        $.ajax({
            url:  'ajax.php/topic-form-refresh/do-update',
            type: 'POST',
            data: { __CSRFToken__: csrfToken() },
            dataType: 'json',
            success: function(d) {
                var $result = $('#tfr-result');
                if (d.success) {
                    $result.html(box('success',
                        '<strong>&#10003; Updated to v' + d.new_version + '</strong>' +
                        '<br>Refresh this page to load the new version.'));
                } else {
                    $result.html(box('danger',
                        '<strong>Update failed:</strong> ' +
                        (d.error || 'Unknown error')));
                }
            },
            error: function(xhr) {
                var msg = 'Server error';
                try { msg = JSON.parse(xhr.responseText).error || msg; } catch(e) {}
                $('#tfr-result').html(box('danger',
                    '<strong>Update failed:</strong> ' + msg));
            }
        });
    }

    $(init);
})(jQuery);
