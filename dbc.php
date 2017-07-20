<?php
try
{
    $pdo = new PDO('mysql:dbname=mvp;host=127.0.0.1', 'root', '');
}
catch(Exception $e)
{
    die("ABORT !! ABORT !!");
} 