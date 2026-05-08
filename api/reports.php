<?php
require_once 'db.php';

try {
    $pdo = getDB();

    // Общая статистика
    $stats = [];

    $stats['total_orders']   = $pdo->query('SELECT COUNT(*) FROM orders')->fetchColumn();
    $stats['total_revenue']  = $pdo->query("SELECT COALESCE(SUM(total),0) FROM orders WHERE status != 'cancelled'")->fetchColumn();
    $stats['total_clients']  = $pdo->query('SELECT COUNT(*) FROM clients')->fetchColumn();
    $stats['total_products'] = $pdo->query('SELECT COUNT(*) FROM products')->fetchColumn();
    $stats['low_stock']      = $pdo->query("SELECT COUNT(*) FROM products WHERE status = 'low' OR status = 'out'")->fetchColumn();

    // Продажи по категориям
    $catRows = $pdo->query('
        SELECT c.name, COUNT(DISTINCT o.id) as orders_count,
               COALESCE(SUM(oi.quantity * oi.price), 0) as revenue
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id
        LEFT JOIN order_items oi ON oi.product_id = p.id
        LEFT JOIN orders o ON oi.order_id = o.id AND o.status != "cancelled"
        GROUP BY c.id
        ORDER BY revenue DESC
    ')->fetchAll();

    $totalRevenue = array_sum(array_column($catRows, 'revenue'));
    foreach ($catRows as &$row) {
        $row['percent'] = $totalRevenue > 0 ? round($row['revenue'] / $totalRevenue * 100) : 0;
    }

    // Топ-5 товаров
    $topProducts = $pdo->query('
        SELECT p.name, SUM(oi.quantity) as sold, SUM(oi.quantity * oi.price) as revenue
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.status != "cancelled"
        GROUP BY p.id
        ORDER BY revenue DESC
        LIMIT 5
    ')->fetchAll();

    // Выручка по месяцам (последние 6 месяцев)
    $monthly = $pdo->query('
        SELECT DATE_FORMAT(created_at, "%Y-%m") as month,
               DATE_FORMAT(created_at, "%b %Y") as label,
               COALESCE(SUM(total), 0) as revenue
        FROM orders
        WHERE status != "cancelled"
          AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY month
        ORDER BY month ASC
    ')->fetchAll();

    // Топ клиентов
    $topClients = $pdo->query('
        SELECT c.company_name, COUNT(o.id) as orders_count,
               COALESCE(SUM(o.total), 0) as total_sum,
               MAX(o.created_at) as last_order
        FROM clients c
        LEFT JOIN orders o ON o.client_id = c.id AND o.status != "cancelled"
        GROUP BY c.id
        ORDER BY total_sum DESC
        LIMIT 5
    ')->fetchAll();

    success([
        'stats'       => $stats,
        'categories'  => $catRows,
        'top_products'=> $topProducts,
        'monthly'     => $monthly,
        'top_clients' => $topClients,
    ]);

} catch (PDOException $e) {
    error('Ошибка БД: ' . $e->getMessage(), 500);
}
