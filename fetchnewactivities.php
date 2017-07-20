<?php 
session_start();
include('dbc.php');
$query = $pdo->prepare("SELECT
                            users.level, users.username, activity_log.id, activity_log.dateposted, activity_log.data
                        FROM
                            activity_log, users
                        WHERE
                            activity_log.id > :id
                        AND
                            activity_log.user_id = users.id
                        ORDER BY
                            activity_log.id
                        DESC");
$success = $query->execute(array(
    ":id" => $_GET['lastid']
));
echo json_encode(array_reverse($query->fetchAll()));