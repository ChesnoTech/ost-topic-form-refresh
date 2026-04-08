<?php
/**
 * Topic Form Refresh Plugin
 *
 * Enhances the help topic dropdown on the "Open New Ticket" page so that
 * custom form fields dynamically update when the topic changes.
 *
 * @author  ChesnoTech
 * @version 1.2.0
 */

require_once 'config.php';

class TopicFormRefreshPlugin extends Plugin {
    var $config_class = 'TopicFormRefreshConfig';

    static private $bootstrapped = false;

    function isMultiInstance() {
        return false;
    }

    function bootstrap() {
        self::bootstrapStatic();
    }

    function init() {
        // init() is called for all installed plugins regardless of instance count.
        // Use it to bootstrap since this plugin needs no per-instance config.
        if ($this->isActive())
            self::bootstrapStatic();
    }

    static function bootstrapStatic() {
        if (self::$bootstrapped)
            return;
        self::$bootstrapped = true;

        if (!defined('STAFFINC_DIR'))
            return;

        Signal::connect('ajax.scp',
            array('TopicFormRefreshPlugin', 'registerAjaxRoutes'));
        ob_start(array('TopicFormRefreshPlugin', 'injectAssets'));
    }

    static function registerAjaxRoutes($dispatcher) {
        $dir = INCLUDE_DIR . 'plugins/topic-form-refresh/';
        $dispatcher->append(
            url('^/topic-form-refresh/', patterns(
                $dir . 'class.TopicFormRefreshAjax.php:TopicFormRefreshAjax',
                url_get('^assets/js$', 'serveJs'),
                url_get('^assets/admin-js$', 'serveAdminJs'),
                url_get('^topic-forms/(?P<topic_id>\d+)$', 'getTopicForms'),
                url_get('^check-update$', 'checkUpdate'),
                url_post('^do-update$', 'doUpdate')
            ))
        );
    }

    static function injectAssets($buffer) {
        if (!empty($_SERVER['HTTP_X_PJAX']))
            return $buffer;

        if (strpos($buffer, '</head>') === false
                || strpos($buffer, '</body>') === false)
            return $buffer;

        $base = ROOT_PATH . 'scp/ajax.php/topic-form-refresh/assets';

        // Inject admin update UI on this plugin's settings page
        if (strpos($buffer, 'Topic Form Refresh') !== false
                && strpos($buffer, 'Plugin Information') !== false) {
            $jsFile = dirname(__FILE__) . '/assets/topic-form-refresh-admin.js';
            $v = @filemtime($jsFile) ?: time();
            $js = sprintf(
                '<script type="text/javascript" src="%s/admin-js?v=%s"></script>',
                $base, $v);
            $buffer = str_replace('</body>', $js . "\n</body>", $buffer);
        }

        // Inject form refresh JS on new ticket page
        if (strpos($buffer, 'id="dynamic-form"') !== false) {
            $jsFile = dirname(__FILE__) . '/assets/topic-form-refresh.js';
            $v = @filemtime($jsFile) ?: time();
            $js = sprintf(
                '<script type="text/javascript" src="%s/js?v=%s"></script>',
                $base, $v);
            $buffer = str_replace('</body>', $js . "\n</body>", $buffer);
        }

        return $buffer;
    }
}
