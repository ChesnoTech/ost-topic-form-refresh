<?php
/**
 * Topic Form Refresh Plugin
 *
 * Enhances the help topic dropdown on the "Open New Ticket" page so that
 * custom form fields dynamically update when the topic changes.
 *
 * @author  ChesnoTech
 * @version 1.0.0
 */

require_once 'config.php';

class TopicFormRefreshPlugin extends Plugin {
    var $config_class = 'TopicFormRefreshConfig';

    static private $bootstrapped = false;

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
                url_get('^topic-forms/(?P<topic_id>\d+)$', 'getTopicForms')
            ))
        );
    }

    static function injectAssets($buffer) {
        if (!empty($_SERVER['HTTP_X_PJAX']))
            return $buffer;

        if (strpos($buffer, '</head>') === false
                || strpos($buffer, '</body>') === false)
            return $buffer;

        // Only inject on pages that have the dynamic-form target
        if (strpos($buffer, 'id="dynamic-form"') === false)
            return $buffer;

        $base = ROOT_PATH . 'scp/ajax.php/topic-form-refresh/assets';
        $jsFile = dirname(__FILE__) . '/assets/topic-form-refresh.js';
        $v = @filemtime($jsFile) ?: time();

        $js = sprintf(
            '<script type="text/javascript" src="%s/js?v=%s"></script>',
            $base, $v);

        $buffer = str_replace('</body>', $js . "\n</body>", $buffer);
        return $buffer;
    }
}
