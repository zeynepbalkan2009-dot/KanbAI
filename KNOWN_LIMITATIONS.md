# Known Limitations

1. Docker bu makinede kurulu olmadigi icin container runtime testi yerelde tamamlanamadi.
2. Yeni tablolar `Base.metadata.create_all` ile pilot/dev modda uretilir; production icin Alembic migration seti gerekir.
3. AI inference pilotta mock modda stabil demo uretir; gercek YOLO agirliklari ve kalibrasyon fabrika verisiyle baglanmalidir.
4. Thumbnail su an orijinal object key ile isaretlenir; optimize preview worker sonraki surume alinmali.
5. Mobile Expo runtime testi dependency kurulumu ve cihaz/simulator gerektirir.
