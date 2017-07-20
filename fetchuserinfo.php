<?php 
session_start();
$user_info = array();
$user_info['id'] = $_SESSION['user_info']['id'];
$user_info['level'] = $_SESSION['user_info']['level'];
$user_info['name'] = $_SESSION['user_info']['username'];
echo json_encode($user_info);
