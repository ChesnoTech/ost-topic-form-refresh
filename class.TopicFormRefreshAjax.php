<?php

require_once INCLUDE_DIR . 'class.topic.php';
require_once INCLUDE_DIR . 'class.dynamic_forms.php';

class TopicFormRefreshAjax extends AjaxController {

    /**
     * Proxy endpoint for loading help topic forms.
     * Duplicates DynamicFormsAjaxAPI::getFormsForHelpTopic() logic
     * but WITHOUT the HTTP_REFERER check that blocks AJAX on some servers.
     */
    function getTopicForms($topic_id) {
        // Verify staff is logged in (AjaxController parent handles this,
        // but double-check for safety)
        global $thisstaff;
        if (!$thisstaff)
            Http::response(403, 'Login required');

        if (!($topic = Topic::lookup($topic_id)))
            Http::response(404, 'No such help topic');

        // Preserve form data in session (same as original handler)
        if ($_GET || isset($_SESSION[':form-data'])) {
            if (!is_array($_SESSION[':form-data']))
                $_SESSION[':form-data'] = array();
            $_SESSION[':form-data'] = array_merge(
                $_SESSION[':form-data'],
                Format::htmlchars($_GET)
            );
        }

        $html = '';
        $media = '';
        foreach ($topic->getForms() as $form) {
            if ($form->isDeleted() || !$form->hasAnyVisibleFields())
                continue;

            ob_start();
            $form->getForm($_SESSION[':form-data'])->render(array(
                'staff' => true,
                'mode' => 'create'));
            $html .= ob_get_clean();

            ob_start();
            print $form->getMedia();
            $media .= ob_get_clean();
        }

        return $this->encode(array(
            'media' => $media,
            'html' => $html,
        ));
    }

    private function serveFile($file, $contentType) {
        if (!file_exists($file))
            Http::response(404, 'Not found');

        $etag = '"tfr-' . md5($file) . '-' . filemtime($file) . '"';
        header('Content-Type: ' . $contentType);
        header('Cache-Control: public, max-age=86400');
        header('ETag: ' . $etag);
        if (isset($_SERVER['HTTP_IF_NONE_MATCH'])
                && trim($_SERVER['HTTP_IF_NONE_MATCH']) === $etag) {
            Http::response(304, '');
            exit;
        }
        readfile($file);
        exit;
    }

    function serveJs() {
        $this->serveFile(dirname(__FILE__) . '/assets/topic-form-refresh.js',
            'application/javascript; charset=UTF-8');
    }
}
