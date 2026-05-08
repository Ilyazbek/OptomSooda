<?php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;

try {
    $pdo = getDB();

    if ($method === 'GET') {
        if ($id) {
            // Один заказ с позициями
            $stmt = $pdo->prepare('
                SELECT o.*, c.company_name as client_name
                FROM orders o
                LEFT JOIN clients c ON o.client_id = c.id
                WHERE o.id = ?
            ');
            $stmt->execute([$id]);
            $order = $stmt->fetch();
            if (!$order) error('Заказ не найден', 404);

            $stmt = $pdo->prepare('
                SELECT oi.*, p.name as product_name, p.unit
                FROM order_items oi
                LEFT JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = ?
            ');
            $stmt->execute([$id]);
            $order['items'] = $stmt->fetchAll();
            success($order);
        }

        $where  = [];
        $params = [];

        if (!empty($_GET['status'])) {
            $where[]  = 'o.status = ?';
            $params[] = $_GET['status'];
        }
        if (!empty($_GET['search'])) {
            $where[]  = '(o.order_number LIKE ? OR c.company_name LIKE ?)';
            $s        = '%' . $_GET['search'] . '%';
            $params   = array_merge($params, [$s, $s]);
        }

        $sql = '
            SELECT o.*, c.company_name as client_name,
                   GROUP_CONCAT(p.name SEPARATOR ", ") as items_preview
            FROM orders o
            LEFT JOIN clients c ON o.client_id = c.id
            LEFT JOIN order_items oi ON oi.order_id = o.id
            LEFT JOIN products p ON oi.product_id = p.id
        ';
        if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
        $sql .= ' GROUP BY o.id ORDER BY o.created_at DESC';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        success($stmt->fetchAll());
    }

    if ($method === 'POST') {
        $d = getInput();
        if (empty($d['client_id'])) error('Клиент обязателен');
        if (empty($d['items']))     error('Добавьте позиции в заказ');

        // Считаем сумму
        $total = 0;
        foreach ($d['items'] as $item) {
            $total += (float)$item['price'] * (int)$item['quantity'];
        }

        // Генерируем номер заказа
        $stmt = $pdo->query('SELECT COUNT(*) FROM orders');
        $num  = $stmt->fetchColumn() + 1;
        $orderNumber = 'ОРД-' . str_pad($num, 4, '0', STR_PAD_LEFT);

        $pdo->beginTransaction();

        $stmt = $pdo->prepare('INSERT INTO orders (order_number, client_id, total, status, delivery_date) VALUES (?,?,?,?,?)');
        $stmt->execute([
            $orderNumber,
            $d['client_id'],
            $total,
            $d['status']        ?? 'new',
            $d['delivery_date'] ?? null
        ]);
        $orderId = $pdo->lastInsertId();

        foreach ($d['items'] as $item) {
            $stmt = $pdo->prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?,?,?,?)');
            $stmt->execute([$orderId, $item['product_id'], $item['quantity'], $item['price']]);
        }

        $pdo->commit();
        success(['id' => $orderId, 'order_number' => $orderNumber, 'total' => $total]);
    }

    if ($method === 'PUT') {
        if (!$id) error('ID обязателен');
        $d = getInput();

        // Обновляем только статус
        if (isset($d['status'])) {
            $stmt = $pdo->prepare('UPDATE orders SET status=? WHERE id=?');
            $stmt->execute([$d['status'], $id]);
            success(['updated' => true]);
        }
        error('Нечего обновлять');
    }

    if ($method === 'DELETE') {
        if (!$id) error('ID обязателен');
        $stmt = $pdo->prepare('DELETE FROM orders WHERE id = ?');
        $stmt->execute([$id]);
        success(['deleted' => true]);
    }

} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error('Ошибка БД: ' . $e->getMessage(), 500);
}
