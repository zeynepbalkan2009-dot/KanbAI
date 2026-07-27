# Known Limitations

1. Docker runtime testi tamamlandi; yine de rebuild stabilitesi icin hostta yeterli bos disk alani tutulmalidir.
2. Ilk Alembic migration eklendi; production oncesi migration stratejisi her yeni sema degisikliginde surdurulmelidir.
3. AI inference pilotta mock modda stabil demo uretir; gercek YOLO agirliklari ve kalibrasyon fabrika verisiyle baglanmalidir.
4. Thumbnail su an orijinal object key ile isaretlenir; optimize preview worker sonraki surume alinmali.
5. Mobile Expo runtime testi dependency kurulumu ve cihaz/simulator gerektirir.
