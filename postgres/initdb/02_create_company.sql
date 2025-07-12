-- companyテーブルの作成
CREATE TABLE IF NOT EXISTS company (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255)
);

-- テストデータの挿入
INSERT INTO company (company_name, address, phone, email) VALUES
('株式会社テクノロジー', '東京都渋谷区渋谷1-1-1', '03-1234-5678', 'info@technology.co.jp'),
('グローバル商事', '大阪府大阪市中央区本町2-3-4', '06-9876-5432', 'contact@global-trading.com'),
('イノベーション株式会社', '神奈川県横浜市西区みなとみらい3-5-6', '045-111-2222', 'hello@innovation.jp'),
('デジタルソリューションズ', '愛知県名古屋市中区栄4-7-8', '052-333-4444', 'support@digital-solutions.co.jp'),
('フューチャーエンタープライズ', '福岡県福岡市博多区博多駅前1-9-10', '092-555-6666', 'info@future-enterprise.com'),
('クリエイティブデザイン', '京都府京都市下京区烏丸通四条下ル', '075-777-8888', 'design@creative.kyoto.jp'),
('ネクストジェネレーション', '北海道札幌市中央区大通西11-12', '011-999-0000', 'next@generation.hokkaido.jp'),
('スマートビジネス', '広島県広島市中区紙屋町2-13-14', '082-123-4567', 'smart@business.hiroshima.jp'),
('アドバンストシステムズ', '宮城県仙台市青葉区一番町3-15-16', '022-789-0123', 'advanced@systems.sendai.jp'),
('プロフェッショナルサービス', '沖縄県那覇市久茂地1-17-18', '098-456-7890', 'pro@service.okinawa.jp');
