<?php

require_once INCLUDE_DIR . 'class.topic.php';
require_once INCLUDE_DIR . 'class.dynamic_forms.php';

class TopicFormRefreshAjax extends AjaxController {

    const GITHUB_REPO = 'ChesnoTech/ost-topic-form-refresh';

    /**
     * Proxy endpoint for loading help topic forms.
     * Duplicates DynamicFormsAjaxAPI::getFormsForHelpTopic() logic
     * but WITHOUT the HTTP_REFERER check that blocks AJAX on some servers.
     */
    function getTopicForms($topic_id) {
        global $thisstaff;
        if (!$thisstaff)
            Http::response(403, 'Login required');

        if (!($topic = Topic::lookup($topic_id)))
            Http::response(404, 'No such help topic');

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

    /* ── Self-Update ─────────────────────────────── */

    function checkUpdate() {
        global $thisstaff;
        if (!$thisstaff || !$thisstaff->isAdmin())
            Http::response(403, 'Admin access required');

        $pluginInfo = include(dirname(__FILE__) . '/plugin.php');
        $current = $pluginInfo['version'];

        $releases = self::getAllReleases();
        if (isset($releases['error']))
            return $this->encode(array('error' => $releases['error']));

        $updates = self::categorizeUpdates($releases, $current);
        $updates['current'] = $current;
        return $this->encode($updates);
    }

    function doUpdate() {
        global $thisstaff;
        if (!$thisstaff || !$thisstaff->isAdmin())
            Http::response(403, 'Admin access required');

        $pluginDir  = dirname(__FILE__);
        $pluginInfo = include($pluginDir . '/plugin.php');
        $targetTag  = isset($_POST['target_tag']) ? trim($_POST['target_tag']) : '';

        if (!$targetTag)
            return $this->encode(array(
                'success' => false,
                'error'   => 'No target version specified'));

        // Fetch the specific release by tag
        $release = self::getReleaseByTag($targetTag);
        if (isset($release['error']))
            return $this->encode(array(
                'success' => false, 'error' => $release['error']));

        if (!version_compare($release['version'], $pluginInfo['version'], '>'))
            return $this->encode(array(
                'success' => false, 'error' => 'Already up to date'));

        // Download zipball
        $zipData = self::curlGet($release['zipball_url']);
        if (!$zipData)
            return $this->encode(array(
                'success' => false,
                'error'   => 'Failed to download update package'));

        $tempZip = tempnam(sys_get_temp_dir(), 'tfr') . '.zip';
        $tempDir = sys_get_temp_dir() . '/tfr-' . uniqid();

        file_put_contents($tempZip, $zipData);

        // Extract
        $zip = new ZipArchive();
        if ($zip->open($tempZip) !== true) {
            @unlink($tempZip);
            return $this->encode(array(
                'success' => false,
                'error'   => 'Failed to open update package'));
        }

        @mkdir($tempDir, 0755, true);
        $zip->extractTo($tempDir);
        $zip->close();
        @unlink($tempZip);

        // GitHub zips contain one root dir: Owner-Repo-hash/
        $rootDir = null;
        foreach (scandir($tempDir) as $e) {
            if ($e === '.' || $e === '..') continue;
            if (is_dir("$tempDir/$e")) {
                $rootDir = "$tempDir/$e";
                break;
            }
        }

        if (!$rootDir || !file_exists("$rootDir/plugin.php")) {
            self::rmdirRecursive($tempDir);
            return $this->encode(array(
                'success' => false,
                'error'   => 'Invalid update package structure'));
        }

        // Replace files (skip .git)
        self::copyDir($rootDir, $pluginDir);
        self::rmdirRecursive($tempDir);

        // Clear opcache so PHP sees the new files
        if (function_exists('opcache_invalidate')) {
            $iter = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($pluginDir,
                    RecursiveDirectoryIterator::SKIP_DOTS));
            foreach ($iter as $f) {
                if (pathinfo($f, PATHINFO_EXTENSION) === 'php')
                    opcache_invalidate($f->getPathname(), true);
            }
        }

        return $this->encode(array(
            'success'     => true,
            'new_version' => $release['version'],
        ));
    }

    /* ── GitHub helpers ──────────────────────────── */

    /**
     * Fetch all published (non-draft, non-prerelease) releases from GitHub.
     */
    private static function getAllReleases() {
        $url = 'https://api.github.com/repos/'
             . self::GITHUB_REPO . '/releases?per_page=50';
        $body = self::curlGet($url, false);

        if (!$body)
            return array('error' =>
                'Failed to reach GitHub — check server connectivity');

        $data = json_decode($body, true);
        if (!is_array($data))
            return array('error' =>
                'Invalid response from GitHub');

        if (empty($data))
            return array('error' =>
                'No releases found — create a GitHub release first');

        $releases = array();
        foreach ($data as $rel) {
            if (!empty($rel['draft']) || !empty($rel['prerelease']))
                continue;
            if (empty($rel['tag_name']))
                continue;

            $releases[] = array(
                'version'     => ltrim($rel['tag_name'], 'v'),
                'tag'         => $rel['tag_name'],
                'body'        => isset($rel['body']) ? $rel['body'] : '',
                'zipball_url' => $rel['zipball_url'],
                'published'   => isset($rel['published_at'])
                                   ? $rel['published_at'] : '',
            );
        }

        if (empty($releases))
            return array('error' =>
                'No published releases found');

        return $releases;
    }

    /**
     * Fetch a single release by its git tag.
     */
    private static function getReleaseByTag($tag) {
        $url = 'https://api.github.com/repos/'
             . self::GITHUB_REPO . '/releases/tags/' . urlencode($tag);
        $body = self::curlGet($url, false);

        if (!$body)
            return array('error' =>
                'Failed to reach GitHub — release not found');

        $data = json_decode($body, true);
        if (!$data || empty($data['tag_name']))
            return array('error' =>
                'Release not found: ' . $tag);

        return array(
            'version'     => ltrim($data['tag_name'], 'v'),
            'tag'         => $data['tag_name'],
            'body'        => isset($data['body']) ? $data['body'] : '',
            'zipball_url' => $data['zipball_url'],
        );
    }

    /**
     * Split available releases into minor (same major) and major (new major)
     * update paths relative to the current installed version.
     *
     * Returns: { minor_update: {...}|null, major_update: {...}|null }
     */
    private static function categorizeUpdates($releases, $currentVersion) {
        $curParts   = explode('.', $currentVersion);
        $curMajor   = (int)$curParts[0];

        $minorUpdate = null;   // latest within same major version
        $majorUpdate = null;   // latest with a higher major version
        $minorAll    = array(); // all available minor/patch versions
        $majorAll    = array(); // all available major versions

        foreach ($releases as $rel) {
            $ver = $rel['version'];
            if (!version_compare($ver, $currentVersion, '>'))
                continue;

            $parts = explode('.', $ver);
            $major = (int)$parts[0];

            if ($major === $curMajor) {
                $minorAll[] = $rel;
                if (!$minorUpdate
                        || version_compare($ver, $minorUpdate['version'], '>'))
                    $minorUpdate = $rel;
            } else {
                $majorAll[] = $rel;
                if (!$majorUpdate
                        || version_compare($ver, $majorUpdate['version'], '>'))
                    $majorUpdate = $rel;
            }
        }

        // Sort version lists descending for display
        usort($minorAll, function($a, $b) {
            return version_compare($b['version'], $a['version']);
        });
        usort($majorAll, function($a, $b) {
            return version_compare($b['version'], $a['version']);
        });

        return array(
            'minor_update'    => $minorUpdate,
            'minor_available' => $minorAll,
            'major_update'    => $majorUpdate,
            'major_available' => $majorAll,
        );
    }

    private static function curlGet($url, $followRedirects = true) {
        $ch = curl_init($url);
        curl_setopt_array($ch, array(
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_USERAGENT      => 'osTicket-Plugin-Updater/1.0',
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_FOLLOWLOCATION => $followRedirects,
            CURLOPT_SSL_VERIFYPEER => true,
        ));
        $resp = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return ($code === 200) ? $resp : false;
    }

    /* ── File-system helpers ─────────────────────── */

    private static function copyDir($src, $dst) {
        foreach (scandir($src) as $e) {
            if ($e === '.' || $e === '..' || $e === '.git') continue;
            $s = "$src/$e";
            $d = "$dst/$e";
            if (is_dir($s)) {
                if (!is_dir($d)) @mkdir($d, 0755, true);
                self::copyDir($s, $d);
            } else {
                @copy($s, $d);
            }
        }
    }

    private static function rmdirRecursive($dir) {
        if (!is_dir($dir)) return;
        foreach (scandir($dir) as $e) {
            if ($e === '.' || $e === '..') continue;
            $p = "$dir/$e";
            is_dir($p) ? self::rmdirRecursive($p) : @unlink($p);
        }
        @rmdir($dir);
    }

    /* ── Asset serving ───────────────────────────── */

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

    function serveAdminJs() {
        $this->serveFile(dirname(__FILE__) . '/assets/topic-form-refresh-admin.js',
            'application/javascript; charset=UTF-8');
    }
}
