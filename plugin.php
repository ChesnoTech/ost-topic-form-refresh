<?php
return array(
    'id'          => 'osticket:topic-form-refresh',
    'version'     => '1.1.0',
    'name'        => 'Topic Form Refresh',
    'author'      => 'ChesnoTech',
    'description' => 'Dynamically refreshes custom form fields when the help topic changes during new ticket creation. Replaces the default inline handler with a robust AJAX handler that reinitializes widgets and preserves entered data.',
    'url'         => 'https://github.com/ChesnoTech/ost-topic-form-refresh',
    'ost_version' => '1.18',
    'plugin'      => 'class.TopicFormRefreshPlugin.php:TopicFormRefreshPlugin',
);
