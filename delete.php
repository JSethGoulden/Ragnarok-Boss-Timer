<?php
$s = "  ";
@$sql = 'SELECT id FROM accounts WHERE name=\''.mysql_escape_string($s).'\' LIMIT 1';
echo "s is: " . $s . "<br />";
echo "sql is: " . $sql; 

$curl_handle = curl_init('http://death-pulse.ddns.net/account/ajax_accountname.php');

