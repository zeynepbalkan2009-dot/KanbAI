# İTÜ Çekirdek BİGG Demo Session Guide

## 1. One-line pitch

Kanba QC Platform, fabrikaların telefon/kamera tabanlı kalite kontrol verisini merkezi bir SaaS panelinde toplayan, AI destekli hata tespiti yapan ve model performansını MLOps + HITL döngüsüyle sürekli iyileştiren endüstriyel kalite kontrol altyapısıdır.

## 2. Problem

Fabrikalarda kalite kontrol çoğu zaman parçalı ilerliyor: operatör gözlemi, Excel raporları, manuel fotoğraf arşivleri ve geç fark edilen üretim hataları. Bu durum hurda maliyetini artırıyor, izlenebilirliği düşürüyor ve üretim yöneticisine gerçek zamanlı karar imkânı vermiyor.

## 3. Çözüm

Kanba QC Platform üç parçadan oluşur:

1. Yönetici web paneli: canlı sağlam/hurda metrikleri, cihaz yönetimi, MLOps ekranı.
2. Backend: yetkilendirme, veri toplama, PostgreSQL/MinIO kayıtları, AI inference, event stream.
3. Mobil uç nokta: yetkili telefon/kamera ile parça görüntüsü gönderme.

## 4. Demo flow

1. Web paneli aç: `http://localhost:3000`
2. Admin ile giriş yap: `admin@demo.com / Admin123!`
3. Dashboard’da üretim kalite metriklerini göster.
4. MLOps ekranına geç.
5. Demo verisi üret:

```bash
curl -X POST "http://localhost:8000/api/v1/mlops/demo/seed?scenario=metal&count=200" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

6. HITL queue bölümünü göster: AI kararından emin olmadığında insan onayı akışı.
7. Model registry alanını göster: production/staging model mantığı.
8. Retraining butonunu göster: operatör düzeltmeleri ve drift sinyalleri yeni model eğitimine girdi olur.
9. Kapanış: Bugün mock inference ile canlı demo; gerçek fabrika datası geldikçe YOLOv8/ONNX modeli aynı mimariye bağlanır.

## 5. Demo konuşma metni

"Bu sistem, fabrikalarda kalite kontrolü sadece anlık bir kontrol noktası olmaktan çıkarıp merkezi, ölçülebilir ve öğrenen bir veri altyapısına dönüştürüyor. Operatör telefondan fotoğraf çekiyor, backend görüntüyü analiz ediyor, sonuç dashboard’a düşüyor. AI emin değilse HITL kuyruğuna alıyoruz. İnsan onayları dataset’e katkı oluyor ve sistem zamanla yeniden eğitiliyor. Böylece her fabrika kendi üretim gerçekliğine göre daha iyi çalışan bir kalite kontrol modeline sahip oluyor."

## 6. Demo riskleri ve cevapları

### Soru: Gerçek YOLO modeli hazır mı?

Cevap: Demo modunda mock inference çalışıyor. Mimari YOLOv8 ve ONNX backend’e hazır. İlk pilotta gerçek fabrika görselleri toplanıp model eğitimi yapılacak.

### Soru: Neden telefon?

Cevap: MVP’de hızlı kurulum için telefon/kamera uç noktası kullanıyoruz. Aynı backend daha sonra endüstriyel kamera, PLC veya edge cihazlara bağlanabilir.

### Soru: B2B SaaS olarak nasıl ölçeklenir?

Cevap: Her fabrika tenant olarak ayrılıyor. Cihaz, kullanıcı, inspection ve model deployment kayıtları factory_id ile izole ediliyor. Altyapı Docker Compose demo seviyesinde, Kubernetes’e taşınabilir.

### Soru: Rekabet avantajı ne?

Cevap: Sadece görüntü analizi değil; veri toplama, kalite paneli, HITL, model registry, drift ve retraining döngüsü tek platformda.

