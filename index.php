<?php 
session_start();
include('dbc.php');
if(!isset($_SESSION['logged_in']))
{
	header('Location: login.php');
	die;
}
echo file_get_contents('templates/index.html');