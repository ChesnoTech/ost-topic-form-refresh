/**
 * Topic Form Refresh — Admin Self-Update UI
 *
 * Adds an update panel on the plugin settings page with separate
 * minor and major update channels.
 *
 * @version 1.2.0
 */
(function($) {
    'use strict';

    var BASE = 'ajax.php/topic-form-refresh/';

    function init() {
        var html =
            '<div id="tfr-updater">' +
            '  <div class="tfr-header">' +
            '    <span class="tfr-title">Plugin Updates</span>' +
            '    <button type="button" id="tfr-check-btn" class="button">Check for Updates</button>' +
            '    <span id="tfr-status"></span>' +
            '  </div>' +
            '  <div id="tfr-panels" style="display:none;"></div>' +
            '</div>';

        // Inject stylesheet
        $('head').append(
            '<style>' +
            '#tfr-updater{margin:10px 5px 15px;border:1px solid #d0d5dd;border-radius:6px;' +
            '  background:#f9fafb;font-size:13px;overflow:hidden}' +
            '.tfr-header{display:flex;align-items:center;gap:10px;flex-wrap:wrap;' +
            '  padding:12px 16px;border-bottom:1px solid #e5e7eb;background:#fff}' +
            '.tfr-title{font-weight:600;font-size:14px;color:#111}' +
            '#tfr-status{font-size:12px;color:#666}' +

            '#tfr-panels{padding:14px 16px}' +
            '.tfr-current{font-size:12px;color:#555;margin-bottom:12px}' +
            '.tfr-current strong{color:#111}' +

            /* Channel cards */
            '.tfr-channel{border:1px solid #d0d5dd;border-radius:6px;' +
            '  margin-bottom:12px;overflow:hidden;background:#fff}' +
            '.tfr-channel:last-child{margin-bottom:0}' +
            '.tfr-ch-head{display:flex;align-items:center;gap:8px;' +
            '  padding:10px 14px;font-weight:600;font-size:13px}' +
            '.tfr-ch-body{padding:10px 14px;border-top:1px solid #e5e7eb}' +

            /* Minor = blue/green */
            '.tfr-channel.tfr-minor .tfr-ch-head{background:#eef6ff;color:#1d4ed8;' +
            '  border-bottom:1px solid #bfdbfe}' +
            '.tfr-badge-minor{display:inline-block;padding:1px 8px;border-radius:10px;' +
            '  font-size:10px;font-weight:700;background:#dbeafe;color:#1e40af}' +

            /* Major = amber/orange */
            '.tfr-channel.tfr-major .tfr-ch-head{background:#fffbeb;color:#92400e;' +
            '  border-bottom:1px solid #fde68a}' +
            '.tfr-badge-major{display:inline-block;padding:1px 8px;border-radius:10px;' +
            '  font-size:10px;font-weight:700;background:#fef3c7;color:#92400e}' +

            /* Arrow */
            '.tfr-arrow{font-size:14px;color:#888;margin:0 2px}' +

            /* Version chips */
            '.tfr-ver{font-family:monospace;font-weight:600}' +
            '.tfr-ver-old{color:#666}' +
            '.tfr-ver-new{color:#059669}' +
            '.tfr-channel.tfr-major .tfr-ver-new{color:#d97706}' +

            /* Notes */
            '.tfr-notes{margin:8px 0 0;font-size:12px;color:#555;' +
            '  white-space:pre-wrap;line-height:1.5;max-height:120px;' +
            '  overflow-y:auto;padding:8px;background:#f9fafb;border-radius:4px}' +
            '.tfr-notes:empty{display:none}' +

            /* Toggle to see all versions */
            '.tfr-toggle{font-size:11px;color:#2563eb;cursor:pointer;' +
            '  text-decoration:underline;margin-top:6px;display:inline-block}' +
            '.tfr-toggle:hover{color:#1d4ed8}' +
            '.tfr-all-versions{margin-top:6px;font-size:12px;color:#555;display:none}' +
            '.tfr-all-versions span{font-family:monospace;margin-right:8px}' +

            /* Warning text for major */
            '.tfr-warn{display:flex;align-items:flex-start;gap:6px;margin:8px 0 0;' +
            '  padding:8px 10px;background:#fffbeb;border:1px solid #fde68a;' +
            '  border-radius:4px;font-size:12px;color:#92400e;line-height:1.4}' +

            /* Buttons */
            '.tfr-btn{padding:6px 18px;border-radius:4px;border:none;' +
            '  cursor:pointer;font-size:12px;font-weight:600;margin-top:10px;' +
            '  display:inline-block;transition:opacity .15s}' +
            '.tfr-btn:disabled{opacity:.5;cursor:not-allowed}' +
            '.tfr-btn-minor{background:#2563eb;color:#fff}' +
            '.tfr-btn-minor:hover:not(:disabled){background:#1d4ed8}' +
            '.tfr-btn-major{background:#d97706;color:#fff}' +
            '.tfr-btn-major:hover:not(:disabled){background:#b45309}' +

            /* Status boxes */
            '.tfr-box{padding:10px 12px;border-radius:5px;border:1px solid;margin-top:10px}' +
            '.tfr-box-ok{background:#d1fae5;border-color:#10b981;color:#065f46}' +
            '.tfr-box-err{background:#fee2e2;border-color:#ef4444;color:#991b1b}' +
            '.tfr-box-ok strong,.tfr-box-err strong{font-weight:700}' +

            /* Up-to-date state */
            '.tfr-uptodate{display:flex;align-items:center;gap:8px;padding:4px 0;' +
            '  font-size:13px;color:#065f46}' +
            '.tfr-uptodate-icon{font-size:18px;color:#10b981}' +
            '</style>'
        );

        var inserted = false;

        // Strategy 1: Standard osTicket h2
        var $h2 = $('h2').filter(function() {
            return $.trim($(this).text()) === 'Plugin Information';
        }).first();
        if ($h2.length) {
            var $tbl = $h2.next('table');
            ($tbl.length ? $tbl : $h2).after(html);
            inserted = true;
        }

        // Strategy 2: osTicketAwesome table layout
        if (!inserted) {
            var $settingsRow = $('tr').filter(function() {
                var t = $.trim($(this).text());
                return t === 'Plugin Settings' || t === 'Plugin Settings:';
            }).first();
            if ($settingsRow.length) {
                $('<tr><td colspan="2" style="padding:0">' + html + '</td></tr>')
                    .insertBefore($settingsRow);
                inserted = true;
            }
        }

        // Strategy 3: Fallback
        if (!inserted) {
            var $form = $('form').has('button[type="submit"]').first();
            if (!$form.length) return;
            var $table = $form.find('table').first();
            if ($table.length) $table.after(html);
            else $form.prepend(html);
        }

        $('#tfr-check-btn').on('click', checkForUpdates);
    }

    function csrfToken() {
        return $('meta[name="csrf_token"]').attr('content')
            || $('input[name="__CSRFToken__"]').val()
            || '';
    }

    function esc(text) {
        return $('<span>').text(text || '').html();
    }

    function fmtDate(iso) {
        if (!iso) return '';
        var d = new Date(iso);
        return d.toLocaleDateString(undefined, {year:'numeric',month:'short',day:'numeric'});
    }

    /* ── Check for Updates ────────────────────────── */

    function checkForUpdates() {
        var $btn = $('#tfr-check-btn').prop('disabled', true).text('Checking\u2026');
        var $status = $('#tfr-status').html('Querying GitHub\u2026');
        var $panels = $('#tfr-panels').hide().empty();

        $.ajax({
            url: BASE + 'check-update',
            dataType: 'json',
            success: function(d) {
                $btn.prop('disabled', false).text('Check for Updates');
                $status.empty();

                if (d.error) {
                    $panels.html(
                        '<div class="tfr-box tfr-box-err"><strong>Error:</strong> ' +
                        esc(d.error) + '</div>'
                    ).show();
                    return;
                }

                renderUpdatePanels(d);
            },
            error: function() {
                $btn.prop('disabled', false).text('Check for Updates');
                $panels.html(
                    '<div class="tfr-box tfr-box-err"><strong>Network error</strong> ' +
                    '— could not reach server</div>'
                ).show();
            }
        });
    }

    /* ── Render results ───────────────────────────── */

    function renderUpdatePanels(data) {
        var $panels = $('#tfr-panels').empty();
        var current = data.current;
        var hasMinor = data.minor_update !== null;
        var hasMajor = data.major_update !== null;

        // Current version header
        $panels.append(
            '<div class="tfr-current">Installed version: ' +
            '<strong>v' + esc(current) + '</strong></div>'
        );

        if (!hasMinor && !hasMajor) {
            $panels.append(
                '<div class="tfr-uptodate">' +
                '<span class="tfr-uptodate-icon">&#10003;</span>' +
                '<span><strong>Up to date</strong> — no newer versions available</span>' +
                '</div>'
            );
            $panels.show();
            return;
        }

        // Minor update channel
        if (hasMinor) {
            var m = data.minor_update;
            var minorList = data.minor_available || [];
            var card =
                '<div class="tfr-channel tfr-minor">' +
                '  <div class="tfr-ch-head">' +
                '    <span class="tfr-badge-minor">RECOMMENDED</span>' +
                '    Minor / Patch Update' +
                '  </div>' +
                '  <div class="tfr-ch-body">' +
                '    <div>' +
                '      <span class="tfr-ver tfr-ver-old">v' + esc(current) + '</span>' +
                '      <span class="tfr-arrow">&rarr;</span>' +
                '      <span class="tfr-ver tfr-ver-new">v' + esc(m.version) + '</span>' +
                (m.published ? ' <span style="font-size:11px;color:#888;margin-left:6px">' + fmtDate(m.published) + '</span>' : '') +
                '    </div>' +
                '    <div class="tfr-notes">' + esc(m.body) + '</div>';

            // Show all available minor versions if more than 1
            if (minorList.length > 1) {
                card += '<span class="tfr-toggle" data-target="tfr-minor-all">' +
                        'Show all ' + minorList.length + ' available versions</span>' +
                        '<div class="tfr-all-versions" id="tfr-minor-all">';
                for (var i = 0; i < minorList.length; i++) {
                    card += '<span>v' + esc(minorList[i].version) + '</span>';
                }
                card += '</div>';
            }

            card += '    <button type="button" class="tfr-btn tfr-btn-minor" ' +
                    '      data-tag="' + esc(m.tag) + '" data-ver="' + esc(m.version) + '">' +
                    '      Update to v' + esc(m.version) +
                    '    </button>' +
                    '  </div>' +
                    '</div>';
            $panels.append(card);
        }

        // Major update channel
        if (hasMajor) {
            var M = data.major_update;
            var majorList = data.major_available || [];
            var card2 =
                '<div class="tfr-channel tfr-major">' +
                '  <div class="tfr-ch-head">' +
                '    <span class="tfr-badge-major">MAJOR</span>' +
                '    Major Update' +
                '  </div>' +
                '  <div class="tfr-ch-body">' +
                '    <div>' +
                '      <span class="tfr-ver tfr-ver-old">v' + esc(current) + '</span>' +
                '      <span class="tfr-arrow">&rarr;</span>' +
                '      <span class="tfr-ver tfr-ver-new">v' + esc(M.version) + '</span>' +
                (M.published ? ' <span style="font-size:11px;color:#888;margin-left:6px">' + fmtDate(M.published) + '</span>' : '') +
                '    </div>' +
                '    <div class="tfr-warn">' +
                '      <span style="font-size:16px">&#9888;</span>' +
                '      <span>Major updates may include breaking changes. ' +
                '      Review the release notes before updating.</span>' +
                '    </div>' +
                '    <div class="tfr-notes">' + esc(M.body) + '</div>';

            if (majorList.length > 1) {
                card2 += '<span class="tfr-toggle" data-target="tfr-major-all">' +
                         'Show all ' + majorList.length + ' available versions</span>' +
                         '<div class="tfr-all-versions" id="tfr-major-all">';
                for (var j = 0; j < majorList.length; j++) {
                    card2 += '<span>v' + esc(majorList[j].version) + '</span>';
                }
                card2 += '</div>';
            }

            card2 += '    <button type="button" class="tfr-btn tfr-btn-major" ' +
                     '      data-tag="' + esc(M.tag) + '" data-ver="' + esc(M.version) + '">' +
                     '      Update to v' + esc(M.version) +
                     '    </button>' +
                     '  </div>' +
                     '</div>';
            $panels.append(card2);
        }

        // Wire events
        $panels.on('click', '.tfr-toggle', function() {
            var $target = $('#' + $(this).data('target'));
            $target.toggle();
            $(this).text($target.is(':visible')
                ? 'Hide versions'
                : $(this).text());
        });

        $panels.on('click', '.tfr-btn-minor, .tfr-btn-major', function() {
            doUpdate($(this));
        });

        $panels.show();
    }

    /* ── Execute Update ───────────────────────────── */

    function doUpdate($btn) {
        var tag = $btn.data('tag');
        var ver = $btn.data('ver');
        var isMajor = $btn.hasClass('tfr-btn-major');

        var msg = isMajor
            ? 'Install MAJOR update v' + ver + '?\n\nThis may include breaking changes. ' +
              'Make sure you have a backup before proceeding.'
            : 'Install update v' + ver + '?\n\nPlugin files will be replaced.';

        if (!confirm(msg)) return;

        $btn.prop('disabled', true).text('Updating\u2026');

        // Disable all update buttons during install
        $('.tfr-btn-minor, .tfr-btn-major').prop('disabled', true);

        $.ajax({
            url:  BASE + 'do-update',
            type: 'POST',
            data: { __CSRFToken__: csrfToken(), target_tag: tag },
            dataType: 'json',
            success: function(d) {
                var $body = $btn.closest('.tfr-ch-body');
                if (d.success) {
                    $body.append(
                        '<div class="tfr-box tfr-box-ok">' +
                        '<strong>&#10003; Updated to v' + esc(d.new_version) + '</strong>' +
                        '<br>Refresh this page to load the new version.' +
                        '</div>'
                    );
                    $btn.remove();
                } else {
                    $body.append(
                        '<div class="tfr-box tfr-box-err">' +
                        '<strong>Update failed:</strong> ' +
                        esc(d.error || 'Unknown error') +
                        '</div>'
                    );
                    $('.tfr-btn-minor, .tfr-btn-major').prop('disabled', false);
                }
            },
            error: function(xhr) {
                var msg = 'Server error';
                try { msg = JSON.parse(xhr.responseText).error || msg; } catch(e) {}
                $btn.closest('.tfr-ch-body').append(
                    '<div class="tfr-box tfr-box-err">' +
                    '<strong>Update failed:</strong> ' + esc(msg) +
                    '</div>'
                );
                $('.tfr-btn-minor, .tfr-btn-major').prop('disabled', false);
            }
        });
    }

    $(init);
})(jQuery);
