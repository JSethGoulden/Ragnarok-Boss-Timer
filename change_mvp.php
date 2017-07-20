<?php 
include('dbc.php');
if(!isset($_GET['id']) || !isset($_GET['valuetochange']) || !isset($_GET['newvalue']))
{
   echo "goaway";
}
//THE NAME IS A LIE LOLOLOL
//UPDATE `mvp`.`mvps` SET `last_death` = '112' WHERE `mvps`.`id` =5;
$query = $pdo->prepare("UPDATE redditro_mvpminiboss SET last_death = :newvalue WHERE id= :id");
if($_GET['newvalue'] == 1)
{
    $time = 1;
}
else if ($_GET['newvalue'] == "now")
{
    $time = time() * 1000;
}
else
{
    $time = time() * 1000 - (int)$_GET['newvalue'];
}
$success = $query->execute(array(
    ':newvalue' => $time,
    ':id' => $_GET['id']
));
if($success)
{
    echo "success";
}
else var_dump($pdo->errorInfo());