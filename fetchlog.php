<?php 
session_start();
include('dbc.php');
if(isset($_SESSION['logged_in']))
{
    $query = $pdo->query("SELECT
                            users.level, users.username, activity_log.id, activity_log.msg, activity_log.dateposted, activity_log.data
                        FROM
                            activity_log, users
                        WHERE
                            activity_log.user_id = users.id
                        ORDER BY
                            activity_log.id
                        DESC
                        LIMIT
                            10");
    echo json_encode(array_reverse($query->fetchAll()));
}