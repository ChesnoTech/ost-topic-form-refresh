/**
 * Topic Form Refresh Plugin
 *
 * Replaces the default inline onchange handler on the help topic dropdown
 * with a robust AJAX handler that properly reinitializes form widgets
 * after dynamically updating custom form fields.
 *
 * @version 1.0.0
 */
(function($) {
    'use strict';

    var pendingXhr = null;
    var dpConfig = null;

    // Cache datepicker config from osTicket's getConfig()
    if (typeof getConfig === 'function') {
        getConfig().then(function(c) {
            dpConfig = {
                numberOfMonths: 2,
                showButtonPanel: true,
                buttonImage: './images/cal.png',
                showOn: 'both',
                dateFormat: (c && c.date_format) || 'm/d/Y'
            };
        });
    }

    function getDpConfig() {
        return dpConfig || {
            numberOfMonths: 2,
            showButtonPanel: true,
            buttonImage: './images/cal.png',
            showOn: 'both',
            dateFormat: 'm/d/Y'
        };
    }

    function init() {
        var $select = $('select[name="topicId"]');
        if (!$select.length) return;

        // Remove the inline onchange to prevent double-firing
        $select.removeAttr('onchange');

        // Unbind any previous handler (idempotent for PJAX reloads)
        $select.off('change.topicFormRefresh');

        // Attach the enhanced handler
        $select.on('change.topicFormRefresh', handleTopicChange);
    }

    function handleTopicChange() {
        var topicId = $(this).val();
        var $container = $('#dynamic-form');

        // Abort any in-flight request (prevents race conditions)
        if (pendingXhr && pendingXhr.readyState !== 4) {
            pendingXhr.abort();
            pendingXhr = null;
        }

        if (!topicId) {
            $container.empty();
            return;
        }

        // Serialize current field values to preserve entered data
        var data = $(':input[name]', $container).serialize();

        // Show loading state
        $container.css('opacity', '0.5').css('pointer-events', 'none');
        var $spinner = $(
            '<tr class="tfr-spinner"><td colspan="2" style="text-align:center;padding:20px;">' +
            '<i class="icon-spinner icon-spin" style="font-size:24px;"></i>' +
            '</td></tr>'
        );
        $container.prepend($spinner);

        // Use the plugin's proxy endpoint instead of the default
        // ajax.php/form/help-topic/ endpoint. The default endpoint
        // checks HTTP_REFERER and returns 403 when it's missing
        // (common with certain server configs or Referrer-Policy headers).
        // Our proxy provides the same functionality without that check.
        pendingXhr = $.ajax({
            url: 'ajax.php/topic-form-refresh/topic-forms/' + topicId,
            data: data,
            dataType: 'json',
            success: function(json) {
                // Clear and replace content
                $container.empty();

                if (json.html) {
                    // Use a temporary container so inline <script> tags execute
                    // after all HTML elements are in the DOM
                    var $temp = $('<tbody>').html(json.html);
                    $container.append($temp.contents());
                }

                // Append media (CSS/JS) to head if provided
                if (json.media) {
                    $(document.head).append(json.media);
                }

                // Reinitialize widgets on the new DOM elements
                reinitializeWidgets($container);

                // Restore interaction
                $container.css('opacity', '1').css('pointer-events', '');
            },
            error: function(xhr, status) {
                // Don't show error for intentionally aborted requests
                if (status === 'abort') return;

                $container.find('.tfr-spinner').remove();
                $container.css('opacity', '1').css('pointer-events', '');

                var msg = 'Unable to load form fields for this help topic. Please try again.';
                if (xhr.status === 404)
                    msg = 'Help topic not found.';
                else if (xhr.status === 403)
                    msg = 'Access denied. Please refresh the page and try again.';

                $container.prepend(
                    '<tr class="tfr-error"><td colspan="2">' +
                    '<div style="background:#ffeaea;border:1px solid #d9534f;color:#a94442;' +
                    'padding:10px;margin:5px 0;border-radius:3px;">' +
                    '<i class="icon-warning-sign"></i> ' + msg +
                    '</div></td></tr>'
                );
            }
        });
    }

    function reinitializeWidgets($container) {
        // 1. Datepickers — destroy any stale instances, then re-init
        var $dps = $container.find('.dp');
        if ($dps.length && $.fn.datepicker) {
            $dps.each(function() {
                var $el = $(this);
                // Remove any previously attached datepicker state
                if ($el.hasClass('hasDatepicker')) {
                    $el.datepicker('destroy');
                }
                $el.datepicker(getDpConfig());
            });
        }

        // 2. Select2 — reinit if present
        if ($.fn.select2) {
            $container.find('select.select2-offscreen').each(function() {
                $(this).select2();
            });
        }

        // 3. File upload drop zones — inline <script> tags from the AJAX
        //    response handle these via jQuery .append() script execution.
        //    No additional action needed.

        // 4. Trigger change on inputs after a short delay to recalculate
        //    field visibility conditions (emitted by Form::emitJavascript)
        setTimeout(function() {
            $container.find('select, input[type="checkbox"], input[type="radio"]')
                .trigger('change');
        }, 150);
    }

    // Initialize on DOM ready
    $(function() {
        init();
    });

    // Reinitialize after PJAX page transitions
    $(document).on('pjax:end', function() {
        init();
    });

})(jQuery);
