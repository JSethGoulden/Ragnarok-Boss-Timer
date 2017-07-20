<?php 
function log_login($username, $user_id, $ip)
{
    $file = file_get_contents('log.txt');
    $file .= $username . " with id " . $user_id . "(IP " . $ip . ") logged in at " . date('r') . PHP_EOL;
    file_put_contents('log.txt', $file);
}