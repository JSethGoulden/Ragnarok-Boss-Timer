<?php
session_start();
include('dbc.php');
if(isset($_SESSION['logged_in']))
{
   if(empty($_GET['data']))
   {
       echo "no data";
       exit;
   }
   $dataJSON = json_decode($_GET['data'], true);
   $dataJSON['id'] = intval($dataJSON['id']);
   $query = $pdo->prepare("INSERT INTO activity_log (user_id, dateposted, data) VALUES (:user_id, :timestamp, :data)");
   $res = $query->execute(array(
       ':user_id' => $_SESSION['user_info']['id'],
       ':timestamp' => time() * 1000,
       ':data' => json_encode($dataJSON)
   ));
    echo $res;
} 