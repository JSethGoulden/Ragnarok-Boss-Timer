<?php 
session_start();
include('dbc.php');
include('log.php');
if(isset($_SESSION['logged_in']))
{
	header('Location: /index.php');
	die;
}

if(!empty($_POST))
{
    $login_query = $pdo->prepare('SELECT * FROM users WHERE username = :username AND password = :password AND guild = :guild');
    $hashed_password = sha1($_POST['password']);
    $login_query->execute(array(
        ':username' => trim($_POST['username']),
        ':password' => $hashed_password,
        ':guild'    => $_POST['guild']
    ));
    $user_info = $login_query->fetchAll();
    if(!empty($user_info))
    {
        log_login($user_info[0]['username'], $user_info[0]['id'], $_SERVER['REMOTE_ADDR']);
        $_SESSION['user_info'] = $user_info[0];
        $_SESSION['logged_in'] = true;
        header('Location: http://' . $_SERVER['HTTP_HOST'] . '/' .rtrim(dirname($_SERVER['PHP_SELF']), '/\\') . '/index.php');
        die;
    }
    else
    {
        $error = "Incorrect username and password combination";
    }
}

$login_form = file_get_contents('templates/login.html');
$guild_list = $pdo->query('SELECT name FROM guilds');
$options = "";
foreach($guild_list->fetchAll() as $guild_name)
{
    $options .= "<option>" . $guild_name[0] . "</option>";
}
$login_form = preg_replace('/%GUILDS%/', $options, $login_form);
$header = (isset($error)) ? $error : "Please login";
$login_form = preg_replace('/%HEADER%/', $header, $login_form);
die($login_form);

