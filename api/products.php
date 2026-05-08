<?php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;

try {
    $pdo = getDB();

    // GET — список или один товар
    if ($method === 'GET') {
        if ($id) {
            $stmt = $pdo->prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?');
            $stmt->execute([$id]);
            $product = $stmt->fetch();
            if (!$product) error('Товар не найден', 404);
            success($product);
        }

        $where  = [];
        $params = [];

        if (!empty($_GET['category_id'])) {
            $where[]  = 'p.category_id = ?';
            $params[] = (int)$_GET['category_id'];
        }
        if (!empty($_GET['status'])) {
            $where[]  = 'p.status = ?';
            $params[] = $_GET['status'];
        }
        if (!empty($_GET['search'])) {
            $where[]  = '(p.name LIKE ? OR p.sku LIKE ?)';
            $params[] = '%' . $_GET['search'] . '%';
            $params[] = '%' . $_GET['search'] . '%';
        }

        $sql = 'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id';
        if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);

        $sort = $_GET['sort'] ?? 'name';
        $sql .= match($sort) {
            'stock' => ' ORDER BY p.stock DESC',
            'price' => ' ORDER BY p.price_1 ASC',
            default => ' ORDER BY p.name ASC',
        };

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        success($stmt->fetchAll());
    }

    // POST — создать товар
    if ($method === 'POST') {
        $d = getInput();
        if (empty($d['name'])) error('Название обязательно');

        $stock  = (int)($d['stock'] ?? 0);
        $status = $stock === 0 ? 'out' : ($stock < 20 ? 'low' : 'active');

        $stmt = $pdo->prepare('INSERT INTO products (name, category_id, sku, stock, unit, price_1, price_10, price_100, status) VALUES (?,?,?,?,?,?,?,?,?)');
        $stmt->execute([
            $d['name'],
            $d['category_id'] ?? null,
            $d['sku']         ?? null,
            $stock,
            $d['unit']        ?? 'шт.',
            $d['price_1']     ?? 0,
            $d['price_10']    ?? 0,
            $d['price_100']   ?? 0,
            $status
        ]);
        $id = $pdo->lastInsertId();
        $stmt = $pdo->prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?');
        $stmt->execute([$id]);
        success($stmt->fetch());
    }

    // PUT — обновить товар
    if ($method === 'PUT') {
        if (!$id) error('ID обязателен');
        $d = getInput();

        $stock  = (int)($d['stock'] ?? 0);
        $status = $stock === 0 ? 'out' : ($stock < 20 ? 'low' : 'active');

        $stmt = $pdo->prepare('UPDATE products SET name=?, category_id=?, sku=?, stock=?, unit=?, price_1=?, price_10=?, price_100=?, status=? WHERE id=?');
        $stmt->execute([
            $d['name'],
            $d['category_id'] ?? null,
            $d['sku']         ?? null,
            $stock,
            $d['unit']        ?? 'шт.',
            $d['price_1']     ?? 0,
            $d['price_10']    ?? 0,
            $d['price_100']   ?? 0,
            $status,
            $id
        ]);
        success(['updated' => true]);
    }

    // DELETE — удалить товар
    if ($method === 'DELETE') {
        if (!$id) error('ID обязателен');
        $stmt = $pdo->prepare('DELETE FROM products WHERE id = ?');
        $stmt->execute([$id]);
        success(['deleted' => true]);
    }

} catch (PDOException $e) {
    error('Ошибка БД: ' . $e->getMessage(), 500);
}
