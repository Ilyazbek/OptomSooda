<?php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;

try {
    $pdo = getDB();

    if ($method === 'GET') {
        $stmt = $pdo->query('
            SELECT c.*, COUNT(p.id) as product_count
            FROM categories c
            LEFT JOIN products p ON p.category_id = c.id
            GROUP BY c.id
            ORDER BY c.name
        ');
        success($stmt->fetchAll());
    }

    if ($method === 'POST') {
        $d = getInput();
        if (empty($d['name'])) error('Название обязательно');
        $stmt = $pdo->prepare('INSERT INTO categories (name, description, icon) VALUES (?,?,?)');
        $stmt->execute([$d['name'], $d['description'] ?? '', $d['icon'] ?? 'ti-box']);
        success(['id' => $pdo->lastInsertId(), 'name' => $d['name']]);
    }

    if ($method === 'PUT') {
        if (!$id) error('ID обязателен');
        $d = getInput();
        $stmt = $pdo->prepare('UPDATE categories SET name=?, description=?, icon=? WHERE id=?');
        $stmt->execute([$d['name'], $d['description'] ?? '', $d['icon'] ?? 'ti-box', $id]);
        success(['updated' => true]);
    }

    if ($method === 'DELETE') {
        if (!$id) error('ID обязателен');
        $stmt = $pdo->prepare('DELETE FROM categories WHERE id = ?');
        $stmt->execute([$id]);
        success(['deleted' => true]);
    }

} catch (PDOException $e) {
    error('Ошибка БД: ' . $e->getMessage(), 500);
}
