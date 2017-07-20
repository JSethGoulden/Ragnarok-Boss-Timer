<?php 
session_start();
if(isset($_SESSION['logged_in']))
{
  include('dbc.php');
}
if(isset($_SESSION['logged_in']))
{
    $mvps = $pdo->query('SELECT * FROM redditro_mvpminiboss ORDER BY name');
    $mvp_list = $mvps->fetchAll();
    for($i=0;$i<count($mvp_list);$i++)
    {
        $time_dead = (time() * 1000) - $mvp_list[$i]['last_death'];
        if($time_dead < $mvp_list[$i]['max_spawn_time'] * 60 * 1000)
        {
            $mvp_list[$i]['time_dead'] = $time_dead;
        }
        else
        {
            $mvp_list[$i]['time_dead'] = 0;
        }
    }
    echo json_encode($mvp_list);
}
else
{
    $error = array();
    $error['error'] = "The session timed out or you are not logged in.";
    echo json_encode($error);
}