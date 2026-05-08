<?php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;

try {
    $pdo = getDB();

    if ($method === 'GET') {
        if ($id) {
            $stmt = $pdo->prepare('SELECT * FROM clients WHERE id = ?');
            $stmt->execute([$id]);
            $client = $stmt->fetch();
            if (!$client) error('Клиент не найден', 404);
            success($client);
        }

        $where  = [];
        $params = [];

        if (!empty($_GET['search'])) {
            $where[]  = '(company_name LIKE ? OR contact_name LIKE ? OR phone LIKE ?)';
            $s        = '%' . $_GET['search'] . '%';
            $params   = array_merge($params, [$s, $s, $s]);
        }

        $sql = 'SELECT c.*, COUNT(o.id) as orders_count, COALESCE(SUM(o.total),0) as total_sum FROM clients c LEFT JOIN orders o ON o.client_id = c.id';
        if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
        $sql .= ' GROUP BY c.id ORDER BY c.company_name';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        success($stmt->fetchAll());
    }

    if ($method === 'POST') {
        $d = getInput();
        if (empty($d['company_name'])) error('Название компании обязательно');
        $stmt = $pdo->prepare('INSERT INTO clients (company_name, contact_name, phone, email, type, inn) VALUES (?,?,?,?,?,?)');
        $stmt->execute([
            $d['company_name'],
            $d['contact_name'] ?? '',
            $d['phone']        ?? '',
            $d['email']        ?? '',
            $d['type']         ?? 'Опт',
            $d['inn']          ?? ''
        ]);
        success(['id' => $pdo->lastInsertId()]);
    }

    if ($method === 'PUT') {
        if (!$id) error('ID обязателен');
        $d = getInput();
        $stmt = $pdo->prepare('UPDATE clients SET company_name=?, contact_name=?, phone=?, email=?, type=?, inn=? WHERE id=?');
        $stmt->execute([
            $d['company_name'],
            $d['contact_name'] ?? '',
            $d['phone']        ?? '',
            $d['email']        ?? '',
            $d['type']         ?? 'Опт',
            $d['inn']          ?? '',
            $id
        ]);
        success(['updated' => true]);
    }

    if ($method === 'DELETE') {
        if (!$id) error('ID обязателен');
        $stmt = $pdo->prepare('DELETE FROM clients WHERE id = ?');
        $stmt->execute([$id]);
        success(['deleted' => true]);
    }

} catch (PDOException $e) {
    error('Ошибка БД: ' . $e->getMessage(), 500);
}
